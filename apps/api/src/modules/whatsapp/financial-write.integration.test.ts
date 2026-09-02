import "dotenv/config";

import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import { prisma } from "../../lib/prisma.js";
import { createEntrySchema } from "../entries/entry.schema.js";
import { createEntry } from "../entries/entry.service.js";
import { executeLatestPendingFinancialAction } from "./actions/pending-action-execution.service.js";
import {
  PENDING_FINANCIAL_ACTION_TTL_MS,
  createPendingFinancialAction,
} from "./actions/pending-action.service.js";
import { executeWhatsAppCommand } from "./commands/command.service.js";
import {
  createWhatsAppConnection,
  verifyWhatsAppConnection,
} from "./connections/connection.service.js";
import { interpretWhatsAppIntent } from "./intents/intent.service.js";
import { FakeWhatsAppProvider } from "./messaging/fake-whatsapp.provider.js";
import { WhatsAppService } from "./whatsapp.service.js";

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;
const phoneSuffix = String(Date.now()).slice(-6);
const referenceDate = new Date("2026-08-30T12:00:00.000Z");

let userAId = "";
let userBId = "";
let messageSequence = 0;

before(async () => {
  const [userA, userB] = await Promise.all([
    prisma.user.create({
      data: {
        name: "WhatsApp Write A",
        email: `whatsapp-write-a-${suffix}@example.com`,
        passwordHash: "not-used-in-test",
      },
    }),
    prisma.user.create({
      data: {
        name: "WhatsApp Write B",
        email: `whatsapp-write-b-${suffix}@example.com`,
        passwordHash: "not-used-in-test",
      },
    }),
  ]);

  userAId = userA.id;
  userBId = userB.id;
});

beforeEach(async () => {
  messageSequence = 0;
  await cleanFixtures();
});

after(async () => {
  await cleanFixtures();
  await prisma.user.deleteMany({
    where: { id: { in: [userAId, userBId] } },
  });
  await prisma.$disconnect();
});

test("expense exige confirmação e resolve referências somente do usuário verificado", async () => {
  const referencesA = await createOwnedReferences(userAId);
  const referencesB = await createOwnedReferences(userBId);
  const harness = await createHarness(userAId, "1");

  const proposal = await send(
    harness,
    "Gastei 89 reais no mercado ontem no Nubank",
    "expense-proposal",
  );
  const pending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });

  assert.equal(proposal.command.code, "PENDING_ACTION_CREATED");
  assert.match(proposal.command.message, /Encontrei esta despesa/);
  assert.match(proposal.command.message, /29\/08\/2026/);
  assert.match(proposal.command.message, /Alimentação/);
  assert.match(proposal.command.message, /Nubank/);
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
  assert.deepEqual(pending.payload, {
    amount: 89,
    description: "mercado no Nubank",
    date: "2026-08-29",
    categoryId: referencesA.categoryId,
    accountId: referencesA.accountId,
  });
  assert.equal(
    JSON.stringify(pending.payload).includes(referencesB.categoryId),
    false,
  );
  assert.equal(
    JSON.stringify(pending.payload).includes(referencesB.accountId),
    false,
  );
  assert.deepEqual(
    Object.keys(pending.payload as object).sort(),
    ["accountId", "amount", "categoryId", "date", "description"],
  );

  const confirmation = await send(
    harness,
    "sim",
    "expense-confirm",
  );
  const entry = await prisma.entry.findFirstOrThrow({
    where: { userId: userAId },
  });

  assert.equal(confirmation.command.code, "ENTRY_CREATED");
  assert.equal(entry.amount.toNumber(), 89);
  assert.equal(entry.description, "mercado no Nubank");
  assert.equal(entry.dueDate.toISOString().slice(0, 10), "2026-08-29");
  assert.equal(entry.type, "EXPENSE");
  assert.equal(entry.status, "COMPLETED");
  assert.equal(entry.source, "WHATSAPP");
  assert.equal(entry.categoryId, referencesA.categoryId);
  assert.equal(entry.accountId, referencesA.accountId);
  assert.equal(entry.externalId, `whatsapp:${pending.id}`);
  assert.doesNotMatch(
    confirmation.command.message,
    new RegExp([pending.id, entry.id, userAId].join("|")),
  );
});

test("income cria um único Entry somente depois da confirmação", async () => {
  const harness = await createHarness(userAId, "1");

  const proposal = await send(
    harness,
    "Recebi 2500 do freela hoje",
    "income-proposal",
  );
  const pending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });

  assert.equal(proposal.command.code, "PENDING_ACTION_CREATED");
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );

  const first = await send(harness, "sim", "income-confirm-1");
  const second = await send(harness, "sim", "income-confirm-2");
  const entries = await prisma.entry.findMany({
    where: { userId: userAId },
  });

  assert.equal(first.command.code, "ENTRY_CREATED");
  assert.equal(second.command.code, "NO_PENDING_ACTION");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.amount.toNumber(), 2_500);
  assert.equal(entries[0]?.description, "freela");
  assert.equal(entries[0]?.type, "INCOME");
  assert.equal(entries[0]?.source, "WHATSAPP");
  assert.equal(entries[0]?.status, "COMPLETED");
  assert.equal(entries[0]?.externalId, `whatsapp:${pending.id}`);
});

test("mensagem incompleta não cria pending e data ausente usa hoje", async () => {
  const harness = await createHarness(userAId, "1");

  const missingAmount = await send(
    harness,
    "Gastei no mercado",
    "missing-amount",
  );
  const missingDescription = await send(
    harness,
    "Gastei 89",
    "missing-description",
  );

  assert.equal(missingAmount.command.code, "INCOMPLETE_ACTION");
  assert.match(missingAmount.command.message, /identificar o valor/);
  assert.equal(missingDescription.command.code, "INCOMPLETE_ACTION");
  assert.match(
    missingDescription.command.message,
    /identificar a descrição/,
  );
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    0,
  );

  await send(
    harness,
    "Gastei 89 no mercado",
    "default-date",
  );
  const pending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId },
    });

  assert.equal(
    (pending.payload as { date: string }).date,
    "2026-08-30",
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
});

test("nova proposta cancela a anterior e somente a mais recente é executada", async () => {
  await createOwnedReferences(userAId);
  const harness = await createHarness(userAId, "1");

  await send(
    harness,
    "Gastei 50 no mercado hoje",
    "replacement-first",
  );
  const first =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });
  await send(
    harness,
    "Gastei 20 no Uber hoje",
    "replacement-second",
  );
  const second =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });

  assert.notEqual(first.id, second.id);
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: first.id },
      })
    ).status,
    "CANCELLED",
  );

  await send(harness, "sim", "replacement-confirm");
  const entries = await prisma.entry.findMany({
    where: { userId: userAId },
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.amount.toNumber(), 20);
});

test("cancelamento e expiração impedem criação de Entry", async () => {
  const harness = await createHarness(userAId, "1");

  await send(
    harness,
    "Gastei 30 no mercado hoje",
    "cancel-proposal",
  );
  const pending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });
  const cancelled = await send(harness, "cancelar", "cancel-1");
  const cancelledAgain = await send(
    harness,
    "cancelar",
    "cancel-2",
  );
  const confirmAfterCancel = await send(
    harness,
    "sim",
    "confirm-after-cancel",
  );

  assert.equal(cancelled.command.code, "ACTION_CANCELLED");
  assert.equal(cancelledAgain.command.code, "NO_PENDING_ACTION");
  assert.equal(confirmAfterCancel.command.code, "NO_PENDING_ACTION");
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: pending.id },
      })
    ).status,
    "CANCELLED",
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );

  await send(
    harness,
    "Recebi 100 do freela hoje",
    "expired-proposal",
  );
  harness.setNow(
    new Date(
      referenceDate.getTime() +
        PENDING_FINANCIAL_ACTION_TTL_MS,
    ),
  );
  const expired = await send(harness, "sim", "expired-confirm");

  assert.equal(expired.command.code, "ACTION_EXPIRED");
  assert.match(expired.command.message, /operação expirou/);
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId, status: "EXPIRED" },
    }),
    1,
  );
});

test("duas confirmações concorrentes criam exatamente um Entry", async () => {
  await createExpenseAction(userAId);

  const results = await Promise.all([
    executeLatestPendingFinancialAction({
      userId: userAId,
      now: referenceDate,
    }),
    executeLatestPendingFinancialAction({
      userId: userAId,
      now: referenceDate,
    }),
  ]);

  assert.deepEqual(
    results.map((result) => result.status).sort(),
    ["CREATED", "NO_PENDING"],
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    1,
  );
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId, status: "CONFIRMED" },
    }),
    1,
  );
});

test("falha do EntryService reverte claim e mantém pending segura para retry", async () => {
  const action = await createExpenseAction(userAId);
  const confirmation = await executeWhatsAppCommand(
    {
      userId: userAId,
      interpretation: interpretWhatsAppIntent(
        "confirmar",
        referenceDate,
      ),
      now: referenceDate,
    },
    {
      pendingExecutor: (input) =>
        executeLatestPendingFinancialAction(input, {
          entryCreator: async () => {
            throw new Error("simulated-entry-failure");
          },
        }),
    },
  );

  assert.equal(confirmation.code, "WRITE_ERROR");
  assert.doesNotMatch(
    confirmation.message,
    /simulated|Prisma|SQL|externalId/i,
  );
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: action.id },
      })
    ).status,
    "PENDING",
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
});

test("externalId preexistente é reconciliado sem segundo Entry", async () => {
  const action = await createExpenseAction(userAId);
  await prisma.entry.create({
    data: {
      userId: userAId,
      description: "almoço",
      amount: 48,
      type: "EXPENSE",
      status: "COMPLETED",
      source: "WHATSAPP",
      dueDate: new Date("2026-08-30T00:00:00.000Z"),
      completedAt: referenceDate,
      externalId: `whatsapp:${action.id}`,
    },
  });

  const result = await executeLatestPendingFinancialAction({
    userId: userAId,
    now: referenceDate,
  });

  assert.equal(result.status, "CREATED");
  assert.equal(
    await prisma.entry.count({
      where: { externalId: `whatsapp:${action.id}` },
    }),
    1,
  );
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: action.id },
      })
    ).status,
    "CONFIRMED",
  );
});

test("externalId incompatível cancela a pending sem expor erro de banco", async () => {
  const action = await createExpenseAction(userAId);
  await prisma.entry.create({
    data: {
      userId: userAId,
      description: "conteúdo incompatível",
      amount: 99,
      type: "EXPENSE",
      status: "COMPLETED",
      source: "WHATSAPP",
      dueDate: new Date("2026-08-30T00:00:00.000Z"),
      completedAt: referenceDate,
      externalId: `whatsapp:${action.id}`,
    },
  });

  const confirmation = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent(
      "confirmar",
      referenceDate,
    ),
    now: referenceDate,
  });

  assert.equal(confirmation.code, "ACTION_INVALID");
  assert.doesNotMatch(
    confirmation.message,
    /Prisma|SQL|constraint|externalId|pendingId/i,
  );
  assert.equal(
    await prisma.entry.count({
      where: { externalId: `whatsapp:${action.id}` },
    }),
    1,
  );
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: action.id },
      })
    ).status,
    "CANCELLED",
  );
});

test("payload corrompido é invalidado sem criar Entry", async () => {
  const corrupted = await prisma.pendingFinancialAction.create({
    data: {
      userId: userAId,
      type: "CREATE_EXPENSE",
      payload: { amount: "inválido" },
      status: "PENDING",
      createdAt: referenceDate,
      expiresAt: new Date(
        referenceDate.getTime() +
          PENDING_FINANCIAL_ACTION_TTL_MS,
      ),
    },
  });
  const corruptedResult = await executeLatestPendingFinancialAction({
    userId: userAId,
    now: referenceDate,
  });

  assert.equal(corruptedResult.status, "INVALID_PAYLOAD");
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: corrupted.id },
      })
    ).status,
    "CANCELLED",
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
});

test("categoria e conta removidas são revalidadas separadamente", async () => {
  const references = await createOwnedReferences(userAId);
  const harness = await createHarness(userAId, "1");
  await send(
    harness,
    "Gastei 40 no mercado hoje",
    "deleted-category-proposal",
  );
  const categoryPending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });
  await prisma.category.delete({
    where: { id: references.categoryId },
  });

  const categoryConfirmation = await send(
    harness,
    "sim",
    "deleted-category-confirm",
  );

  assert.equal(
    categoryConfirmation.command.code,
    "ACTION_INVALID",
  );
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: categoryPending.id },
      })
    ).status,
    "CANCELLED",
  );

  await send(
    harness,
    "Paguei 40 no Nubank hoje",
    "deleted-account-proposal",
  );
  const accountPending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });
  await prisma.account.delete({
    where: { id: references.accountId },
  });
  const accountConfirmation = await send(
    harness,
    "sim",
    "deleted-account-confirm",
  );

  assert.equal(
    accountConfirmation.command.code,
    "ACTION_INVALID",
  );
  assert.equal(
    (
      await prisma.pendingFinancialAction.findUniqueOrThrow({
        where: { id: accountPending.id },
      })
    ).status,
    "CANCELLED",
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
});

test("resolução ambígua ou ausente não escolhe categoria nem conta", async () => {
  await prisma.category.createMany({
    data: [
      {
        userId: userAId,
        name: "Alimentação",
        type: "EXPENSE",
      },
      {
        userId: userAId,
        name: "alimentação",
        type: "EXPENSE",
      },
    ],
  });
  await prisma.account.createMany({
    data: [
      {
        userId: userAId,
        name: "Nubank",
        type: "CHECKING",
      },
      {
        userId: userAId,
        name: "nubank",
        type: "CHECKING",
      },
    ],
  });
  const harness = await createHarness(userAId, "1");

  await send(
    harness,
    "Gastei 25 no mercado hoje no Nubank",
    "ambiguous-references",
  );
  const pending =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userAId, status: "PENDING" },
    });

  assert.deepEqual(
    Object.keys(pending.payload as object).sort(),
    ["amount", "date", "description"],
  );

  const harnessB = await createHarness(userBId, "2");
  await send(
    harnessB,
    "Gastei 25 no mercado hoje no Nubank",
    "missing-references",
  );
  const pendingWithoutMatches =
    await prisma.pendingFinancialAction.findFirstOrThrow({
      where: { userId: userBId, status: "PENDING" },
    });

  assert.deepEqual(
    Object.keys(pendingWithoutMatches.payload as object).sort(),
    ["amount", "date", "description"],
  );
});

test("idempotência de inbound protege CREATE e CONFIRM", async () => {
  const harness = await createHarness(userAId, "1");
  const createInput = {
    messageId: `test-${suffix}-duplicate-create`,
    waId: harness.connection.waId,
    text: "Gastei 70 no mercado hoje",
    receivedAt: referenceDate,
  };

  const created = await harness.service.processIncomingText(createInput);
  const duplicateCreate =
    await harness.service.processIncomingText(createInput);

  assert.equal(created.status, "PROCESSED");
  assert.equal(duplicateCreate.status, "DUPLICATE");
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    1,
  );

  const confirmInput = {
    messageId: `test-${suffix}-duplicate-confirm`,
    waId: harness.connection.waId,
    text: "sim",
    receivedAt: referenceDate,
  };
  const confirmed =
    await harness.service.processIncomingText(confirmInput);
  const duplicateConfirm =
    await harness.service.processIncomingText(confirmInput);

  assert.equal(confirmed.status, "PROCESSED");
  assert.equal(duplicateConfirm.status, "DUPLICATE");
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    1,
  );
});

test("schema HTTP rejeita source/externalId e criação normal permanece WEB", async () => {
  const account = await prisma.account.create({
    data: {
      userId: userAId,
      name: "Conta Web",
      type: "CHECKING",
    },
  });
  const publicPayload = {
    description: "Lançamento web",
    amount: 15,
    type: "EXPENSE" as const,
    status: "COMPLETED" as const,
    dueDate: referenceDate,
    accountId: account.id,
  };

  assert.equal(
    createEntrySchema.safeParse({
      ...publicPayload,
      source: "WHATSAPP",
      externalId: "attacker-controlled",
      userId: userBId,
    }).success,
    false,
  );

  const entry = await createEntry({
    userId: userAId,
    input: publicPayload,
    now: referenceDate,
  });

  assert.equal(entry.source, "WEB");
  assert.equal(
    (
      await prisma.entry.findFirstOrThrow({
        where: { userId: userAId },
      })
    ).externalId,
    null,
  );
});

async function createOwnedReferences(userId: string) {
  const account = await prisma.account.create({
    data: {
      userId,
      name: "Nubank",
      type: "CHECKING",
    },
  });
  const category = await prisma.category.create({
    data: {
      userId,
      name: "Alimentação",
      type: "EXPENSE",
    },
  });

  return {
    accountId: account.id,
    categoryId: category.id,
  };
}

function createExpenseAction(userId: string) {
  return createPendingFinancialAction({
    userId,
    type: "CREATE_EXPENSE",
    payload: {
      amount: 48,
      description: "almoço",
      date: "2026-08-30",
    },
    now: referenceDate,
  });
}

async function createHarness(userId: string, slot: "1" | "2") {
  const connection = await createWhatsAppConnection({
    userId,
    phoneNumber: `+55118${phoneSuffix}${slot}`,
    waId: `55118${phoneSuffix}${slot}`,
  });
  await verifyWhatsAppConnection({
    userId,
    connectionId: connection.id,
    verifiedAt: referenceDate,
  });
  let currentDate = referenceDate;
  const transport = new FakeWhatsAppProvider(() => currentDate);
  const service = new WhatsAppService(transport, {
    now: () => currentDate,
  });

  return {
    connection,
    service,
    transport,
    setNow(value: Date) {
      currentDate = value;
    },
  };
}

async function send(
  harness: Awaited<ReturnType<typeof createHarness>>,
  text: string,
  label: string,
) {
  messageSequence += 1;
  const result = await harness.service.processIncomingText({
    messageId: `test-${suffix}-${messageSequence}-${label}`,
    waId: harness.connection.waId,
    text,
    receivedAt: referenceDate,
  });

  assert.equal(result.status, "PROCESSED");

  if (result.status !== "PROCESSED") {
    throw new Error("A mensagem deveria ter sido processada.");
  }

  assert.equal(
    harness.transport.getSentMessages().at(-1)?.text,
    result.command.message,
  );

  return result;
}

async function cleanFixtures() {
  const userIds = [userAId, userBId].filter(Boolean);

  await prisma.whatsAppMessage.deleteMany({
    where: {
      messageId: { startsWith: `test-${suffix}` },
    },
  });
  await prisma.whatsAppConnection.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.entry.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.pendingFinancialAction.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.category.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.account.deleteMany({
    where: { userId: { in: userIds } },
  });
}
