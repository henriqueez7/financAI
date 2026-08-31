import "dotenv/config";

import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import { prisma } from "../../lib/prisma.js";
import {
  PENDING_FINANCIAL_ACTION_TTL_MS,
  PendingFinancialActionNotFoundError,
  PendingFinancialActionUnavailableError,
  cancelPendingFinancialAction,
  confirmPendingFinancialAction,
  createPendingFinancialAction,
  getPendingFinancialAction,
} from "./actions/pending-action.service.js";
import {
  WHATSAPP_HELP_MESSAGE,
  executeWhatsAppCommand,
} from "./commands/command.service.js";
import {
  WhatsAppConnectionAlreadyExistsError,
  WhatsAppConnectionNotFoundError,
  createWhatsAppConnection,
  getVerifiedWhatsAppConnectionByWaId,
  getWhatsAppConnection,
  revokeWhatsAppConnection,
  verifyWhatsAppConnection,
} from "./connections/connection.service.js";
import { getConversationState } from "./conversations/conversation.service.js";
import { interpretWhatsAppIntent } from "./intents/intent.service.js";
import { FakeWhatsAppProvider } from "./messaging/fake-whatsapp.provider.js";
import {
  WhatsAppMessageNotFoundError,
  markWhatsAppMessageProcessed,
  registerInboundWhatsAppMessage,
} from "./messages/message.service.js";
import { WhatsAppService } from "./whatsapp.service.js";

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;
const emailA = `whatsapp-a-${suffix}@example.com`;
const emailB = `whatsapp-b-${suffix}@example.com`;

let userAId = "";
let userBId = "";

before(async () => {
  const [userA, userB] = await Promise.all([
    prisma.user.create({
      data: {
        name: "WhatsApp User A",
        email: emailA,
        passwordHash: "not-used-in-test",
      },
    }),
    prisma.user.create({
      data: {
        name: "WhatsApp User B",
        email: emailB,
        passwordHash: "not-used-in-test",
      },
    }),
  ]);

  userAId = userA.id;
  userBId = userB.id;
});

beforeEach(async () => {
  await cleanWhatsAppFixtures();
});

after(async () => {
  await cleanWhatsAppFixtures();
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [userAId, userBId],
      },
    },
  });
  await prisma.$disconnect();
});

test("cria ação pendente com payload e TTL centralizado", async () => {
  const now = new Date();
  const action = await createExpenseAction(userAId, now);

  assert.equal(action.status, "PENDING");
  assert.equal(action.type, "CREATE_EXPENSE");
  assert.deepEqual(action.payload, {
    amount: 48,
    description: "almoço",
  });
  assert.equal(
    action.expiresAt.getTime() - now.getTime(),
    PENDING_FINANCIAL_ACTION_TTL_MS,
  );
});

test("confirma ação sem criar lançamento financeiro", async () => {
  const action = await createExpenseAction(userAId);

  const confirmed = await confirmPendingFinancialAction({
    userId: userAId,
    actionId: action.id,
  });

  assert.equal(confirmed.status, "CONFIRMED");
  assert.ok(confirmed.confirmedAt);
  assert.equal(confirmed.cancelledAt, null);
  assert.equal(
    await prisma.entry.count({
      where: { userId: userAId },
    }),
    0,
  );
});

test("cancela ação pendente", async () => {
  const action = await createExpenseAction(userAId);

  const cancelled = await cancelPendingFinancialAction({
    userId: userAId,
    actionId: action.id,
  });

  assert.equal(cancelled.status, "CANCELLED");
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.confirmedAt, null);
});

test("expira ação de forma lazy e impede confirmação", async () => {
  const now = new Date();
  const action = await createExpenseAction(userAId, now);
  const afterExpiration = new Date(
    now.getTime() + PENDING_FINANCIAL_ACTION_TTL_MS,
  );

  const expired = await getPendingFinancialAction({
    userId: userAId,
    actionId: action.id,
    now: afterExpiration,
  });

  assert.equal(expired.status, "EXPIRED");
  await assert.rejects(
    () =>
      confirmPendingFinancialAction({
        userId: userAId,
        actionId: action.id,
        now: afterExpiration,
      }),
    (error: unknown) =>
      error instanceof
        PendingFinancialActionUnavailableError &&
      error.status === "EXPIRED",
  );
});

test("não confirma ação cancelada", async () => {
  const action = await createExpenseAction(userAId);
  await cancelPendingFinancialAction({
    userId: userAId,
    actionId: action.id,
  });

  await assert.rejects(
    () =>
      confirmPendingFinancialAction({
        userId: userAId,
        actionId: action.id,
      }),
    (error: unknown) =>
      error instanceof
        PendingFinancialActionUnavailableError &&
      error.status === "CANCELLED",
  );
});

test("ownership impede confirmação e cancelamento por outro usuário", async () => {
  const action = await createExpenseAction(userAId);

  await assert.rejects(
    () =>
      confirmPendingFinancialAction({
        userId: userBId,
        actionId: action.id,
      }),
    PendingFinancialActionNotFoundError,
  );
  await assert.rejects(
    () =>
      cancelPendingFinancialAction({
        userId: userBId,
        actionId: action.id,
      }),
    PendingFinancialActionNotFoundError,
  );

  const unchanged =
    await prisma.pendingFinancialAction.findUniqueOrThrow({
      where: { id: action.id },
    });
  assert.equal(unchanged.status, "PENDING");
});

test("estado da conversa é derivado da ação pendente", async () => {
  const idle = await getConversationState({
    userId: userAId,
  });
  assert.equal(idle.state, "IDLE");

  const action = await createExpenseAction(userAId);
  const waiting = await getConversationState({
    userId: userAId,
  });
  assert.equal(waiting.state, "WAITING_CONFIRMATION");
  assert.equal(waiting.pendingAction?.id, action.id);

  await cancelPendingFinancialAction({
    userId: userAId,
    actionId: action.id,
  });
  const idleAgain = await getConversationState({
    userId: userAId,
  });
  assert.equal(idleAgain.state, "IDLE");
});

test("cria conexão pendente e exige verificação explícita", async () => {
  const connection = await createConnection(userAId);

  assert.equal(connection.status, "PENDING");
  assert.equal(connection.verifiedAt, null);
  await assert.rejects(
    () =>
      getVerifiedWhatsAppConnectionByWaId(
        connection.waId,
      ),
    WhatsAppConnectionNotFoundError,
  );

  const verified = await verifyWhatsAppConnection({
    userId: userAId,
    connectionId: connection.id,
  });

  assert.equal(verified.status, "VERIFIED");
  assert.ok(verified.verifiedAt);
  assert.equal(
    (
      await getVerifiedWhatsAppConnectionByWaId(
        connection.waId,
      )
    ).userId,
    userAId,
  );
});

test("unicidade protege usuário, telefone e waId", async () => {
  const connection = await createConnection(userAId);

  await assert.rejects(
    () =>
      createWhatsAppConnection({
        userId: userBId,
        phoneNumber: connection.phoneNumber,
        waId: "5511888888888",
      }),
    WhatsAppConnectionAlreadyExistsError,
  );
  await assert.rejects(
    () =>
      createWhatsAppConnection({
        userId: userAId,
        phoneNumber: "+5511777777777",
        waId: "5511777777777",
      }),
    WhatsAppConnectionAlreadyExistsError,
  );
  await assert.rejects(
    () =>
      createWhatsAppConnection({
        userId: userBId,
        phoneNumber: "+5511888888888",
        waId: connection.waId,
      }),
    WhatsAppConnectionAlreadyExistsError,
  );
});

test("ownership protege leitura, verificação e revogação da conexão", async () => {
  const connection = await createConnection(userAId);

  await assert.rejects(
    () =>
      getWhatsAppConnection({
        userId: userBId,
        connectionId: connection.id,
      }),
    WhatsAppConnectionNotFoundError,
  );
  await assert.rejects(
    () =>
      verifyWhatsAppConnection({
        userId: userBId,
        connectionId: connection.id,
      }),
    WhatsAppConnectionNotFoundError,
  );
  await assert.rejects(
    () =>
      revokeWhatsAppConnection({
        userId: userBId,
        connectionId: connection.id,
      }),
    WhatsAppConnectionNotFoundError,
  );

  const revoked = await revokeWhatsAppConnection({
    userId: userAId,
    connectionId: connection.id,
  });
  assert.equal(revoked.status, "REVOKED");
});

test("messageId único torna o registro idempotente", async () => {
  const connection = await createConnection(userAId);
  const messageId = `test-${suffix}-idempotency`;

  const first = await registerInboundWhatsAppMessage({
    messageId,
    connectionId: connection.id,
  });
  const duplicate = await registerInboundWhatsAppMessage({
    messageId,
    connectionId: connection.id,
  });

  assert.equal(first.isDuplicate, false);
  assert.equal(duplicate.isDuplicate, true);
  assert.equal(duplicate.message.id, first.message.id);
  assert.equal(
    await prisma.whatsAppMessage.count({
      where: { messageId },
    }),
    1,
  );
});

test("ownership protege a atualização de status da mensagem", async () => {
  const connection = await createConnection(userAId);
  const messageId = `test-${suffix}-message-owner`;
  await registerInboundWhatsAppMessage({
    messageId,
    connectionId: connection.id,
  });

  await assert.rejects(
    () =>
      markWhatsAppMessageProcessed({
        userId: userBId,
        messageId,
      }),
    WhatsAppMessageNotFoundError,
  );
});

test("command service responde ajuda e unknown sem efeitos", async () => {
  const help = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent("ajuda"),
  });
  const unknown = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent(
      "mensagem desconhecida",
    ),
  });

  assert.equal(help.code, "HELP");
  assert.equal(help.message, WHATSAPP_HELP_MESSAGE);
  assert.equal(unknown.code, "UNKNOWN");
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    0,
  );
});

test("command service cria somente uma proposta pendente", async () => {
  const result = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent(
      "Gastei 48 reais no almoço",
    ),
  });

  assert.equal(result.code, "PENDING_ACTION_CREATED");
  assert.ok(result.pendingActionId);

  const action =
    await prisma.pendingFinancialAction.findUniqueOrThrow({
      where: { id: result.pendingActionId },
    });
  assert.equal(action.status, "PENDING");
  assert.deepEqual(action.payload, {
    amount: 48,
    description: "almoço",
  });
  assert.equal(
    await prisma.entry.count({
      where: { userId: userAId },
    }),
    0,
  );
});

test("command service confirma e cancela somente pending actions", async () => {
  const confirmAction = await createExpenseAction(userAId);
  const confirmation = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent("confirmar"),
  });

  assert.equal(confirmation.code, "ACTION_CONFIRMED");
  assert.equal(
    confirmation.pendingActionId,
    confirmAction.id,
  );

  const cancelAction = await createExpenseAction(userAId);
  const cancellation = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent("cancelar"),
  });

  assert.equal(cancellation.code, "ACTION_CANCELLED");
  assert.equal(cancellation.pendingActionId, cancelAction.id);
});

test("orquestrador usa conexão verificada, fake provider e deduplicação", async () => {
  const connection = await createConnection(userAId);
  await verifyWhatsAppConnection({
    userId: userAId,
    connectionId: connection.id,
  });

  const provider = new FakeWhatsAppProvider();
  const service = new WhatsAppService(provider);
  const input = {
    messageId: `test-${suffix}-orchestrator`,
    waId: connection.waId,
    text: "ajuda",
  };

  const processed = await service.processIncomingText(input);
  const duplicate = await service.processIncomingText(input);

  assert.equal(processed.status, "PROCESSED");
  assert.equal(duplicate.status, "DUPLICATE");
  assert.equal(provider.getSentMessages().length, 1);
  assert.equal(
    provider.getSentMessages()[0]?.text,
    WHATSAPP_HELP_MESSAGE,
  );

  const stored =
    await prisma.whatsAppMessage.findUniqueOrThrow({
      where: { messageId: input.messageId },
    });
  assert.equal(stored.status, "PROCESSED");
  assert.ok(stored.processedAt);
});

test("orquestrador rejeita conexão não verificada", async () => {
  const connection = await createConnection(userAId);
  const service = new WhatsAppService(
    new FakeWhatsAppProvider(),
  );

  await assert.rejects(
    () =>
      service.processIncomingText({
        messageId: `test-${suffix}-unverified`,
        waId: connection.waId,
        text: "saldo",
      }),
    WhatsAppConnectionNotFoundError,
  );
  assert.equal(
    await prisma.whatsAppMessage.count({
      where: {
        messageId: `test-${suffix}-unverified`,
      },
    }),
    0,
  );
});

async function createExpenseAction(
  userId: string,
  now = new Date(),
) {
  return createPendingFinancialAction({
    userId,
    type: "CREATE_EXPENSE",
    payload: {
      amount: 48,
      description: "almoço",
    },
    now,
  });
}

async function createConnection(userId: string) {
  return createWhatsAppConnection({
    userId,
    phoneNumber: "+5511999999999",
    waId: "5511999999999",
  });
}

async function cleanWhatsAppFixtures() {
  await prisma.whatsAppMessage.deleteMany({
    where: {
      messageId: {
        startsWith: `test-${suffix}`,
      },
    },
  });
  await prisma.whatsAppConnection.deleteMany({
    where: {
      userId: {
        in: [userAId, userBId].filter(Boolean),
      },
    },
  });
  await prisma.pendingFinancialAction.deleteMany({
    where: {
      userId: {
        in: [userAId, userBId].filter(Boolean),
      },
    },
  });
}
