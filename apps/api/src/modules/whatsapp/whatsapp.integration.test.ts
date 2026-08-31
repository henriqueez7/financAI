import "dotenv/config";

import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";
import type { z } from "zod";

import type {
  AiProvider,
  AiStructuredRequest,
} from "../../lib/ai/ai.types.js";
import { AiProviderUnavailableError } from "../../lib/ai/ai.errors.js";
import { prisma } from "../../lib/prisma.js";
import { generateAiAnalysis } from "../ai/ai.service.js";
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
import { FakeIntentAiProvider } from "./intents/fake-intent-ai.provider.js";
import { FinancialLanguageInterpreter } from "./intents/financial-language-interpreter.js";
import { interpretWhatsAppIntent } from "./intents/intent.service.js";
import { FakeWhatsAppProvider } from "./messaging/fake-whatsapp.provider.js";
import {
  WhatsAppMessageNotFoundError,
  markWhatsAppMessageProcessed,
  registerInboundWhatsAppMessage,
} from "./messages/message.service.js";
import { WhatsAppQueryService } from "./queries/query.service.js";
import { WhatsAppService } from "./whatsapp.service.js";

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;
const emailA = `whatsapp-a-${suffix}@example.com`;
const emailB = `whatsapp-b-${suffix}@example.com`;
const referenceDate = new Date("2026-08-30T12:00:00.000Z");

let userAId = "";
let userBId = "";

const validAnalysis = {
  headline: "Sua situação financeira está sob controle",
  summary:
    "Os dados consolidados mostram resultado positivo, com alguns pontos que ainda merecem acompanhamento.",
  facts: [
    {
      title: "Resultado do período",
      description:
        "As receitas registradas superaram as despesas concluídas no período.",
      severity: "POSITIVE" as const,
    },
  ],
  priorities: [
    {
      title: "Acompanhar orçamento",
      rationale:
        "O orçamento com maior utilização merece acompanhamento antes de novos gastos.",
      severity: "WARNING" as const,
      sourceInsightTypes: ["BUDGET_EXCEEDED" as const],
    },
  ],
  recommendations: [
    {
      title: "Revisar despesas",
      suggestion:
        "Revise as categorias de maior participação antes de decidir ajustes.",
      priority: "HIGH" as const,
    },
  ],
  warnings: [],
  answer:
    "Seu resultado está positivo, mas o orçamento mais utilizado merece atenção.",
};

class FakeAnalysisProvider implements AiProvider {
  readonly metadata = {
    provider: "whatsapp-integration-fake",
    model: "fake-model",
  };

  calls = 0;
  lastInput = "";

  constructor(private readonly failure?: Error) {}

  async generateStructured<TSchema extends z.ZodType>(
    request: AiStructuredRequest<TSchema>,
  ): Promise<z.infer<TSchema>> {
    this.calls += 1;
    this.lastInput = request.input;

    if (this.failure) {
      throw this.failure;
    }

    return validAnalysis as z.infer<TSchema>;
  }
}

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
    interpretation: interpretWhatsAppIntent("ajuda", referenceDate),
  });
  const unknown = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent(
      "mensagem desconhecida",
      referenceDate,
    ),
  });

  assert.equal(help.code, "HELP");
  assert.equal(help.message, WHATSAPP_HELP_MESSAGE);
  assert.match(help.message, /saldo/);
  assert.match(help.message, /análise financeira/);
  assert.match(help.message, /ainda não registro lançamentos/);
  assert.equal(unknown.code, "UNKNOWN");
  assert.match(unknown.message, /Não consegui entender/);
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    0,
  );
});

test("interpretação por IA não cria pending action nem Entry", async () => {
  const provider = new FakeIntentAiProvider({
    intent: "CREATE_EXPENSE",
    entities: {
      amount: 120,
      description: "mercado",
      date: "2026-08-29",
      categoryHint: "Alimentação",
      accountHint: null,
      periodHint: null,
    },
  });
  const interpreter = new FinancialLanguageInterpreter(provider);

  const result = await interpreter.interpret(
    "Ontem deixei 120 conto no mercado",
    referenceDate,
  );

  assert.equal(result.intent, "CREATE_EXPENSE");
  assert.equal(provider.requests.length, 1);
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    0,
  );
  assert.equal(
    await prisma.entry.count({ where: { userId: userAId } }),
    0,
  );
});

test("command service não cria proposta nem lançamento na Fase 03", async () => {
  const result = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent(
      "Gastei 48 reais no almoço",
      referenceDate,
    ),
  });

  assert.equal(result.code, "WRITE_NOT_ENABLED");
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    0,
  );
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
    interpretation: interpretWhatsAppIntent(
      "confirmar",
      referenceDate,
    ),
  });

  assert.equal(confirmation.code, "ACTION_CONFIRMED");
  assert.equal(
    confirmation.pendingActionId,
    confirmAction.id,
  );

  const cancelAction = await createExpenseAction(userAId);
  const cancellation = await executeWhatsAppCommand({
    userId: userAId,
    interpretation: interpretWhatsAppIntent(
      "cancelar",
      referenceDate,
    ),
  });

  assert.equal(cancellation.code, "ACTION_CANCELLED");
  assert.equal(cancellation.pendingActionId, cancelAction.id);
});

test("confirmar e cancelar sem pending retornam resposta segura", async () => {
  for (const text of ["confirmar", "cancelar"]) {
    const result = await executeWhatsAppCommand({
      userId: userAId,
      interpretation: interpretWhatsAppIntent(
        text,
        referenceDate,
      ),
      now: referenceDate,
    });

    assert.equal(result.code, "NO_PENDING_ACTION");
    assert.equal(
      result.message,
      "Não há ação pendente para confirmar ou cancelar.",
    );
  }
});

test("consultas reais respeitam ownership, períodos e permanecem read-only", async () => {
  await Promise.all([
    createFinancialFixture(userAId, "A"),
    createFinancialFixture(userBId, "B"),
  ]);
  const [harnessA, harnessB] = await Promise.all([
    createServiceHarness(userAId, "1"),
    createServiceHarness(userBId, "2"),
  ]);
  const before = await Promise.all([
    financialSnapshot(userAId),
    financialSnapshot(userBId),
  ]);

  const balanceA = await sendThroughWhatsApp(
    harnessA,
    "qual meu saldo?",
    "balance-a",
  );
  const currentExpensesA = await sendThroughWhatsApp(
    harnessA,
    "Gastei quanto esse mês?",
    "expenses-current-a",
  );
  const defaultExpensesA = await sendThroughWhatsApp(
    harnessA,
    "meus gastos",
    "expenses-default-a",
  );
  const previousExpensesA = await sendThroughWhatsApp(
    harnessA,
    "quanto gastei mês passado?",
    "expenses-previous-a",
  );
  const todayExpensesA = await sendThroughWhatsApp(
    harnessA,
    "quanto gastei hoje?",
    "expenses-today-a",
  );
  const budgetsA = await sendThroughWhatsApp(
    harnessA,
    "como estão meus orçamentos?",
    "budgets-a",
  );
  const goalsA = await sendThroughWhatsApp(
    harnessA,
    "como estão minhas metas?",
    "goals-a",
  );
  const insightsA = await sendThroughWhatsApp(
    harnessA,
    "quais são meus insights?",
    "insights-a",
  );

  assert.match(balanceA, /Nubank A/);
  assert.doesNotMatch(balanceA, /Inter B/);
  assert.match(currentExpensesA, /R\$ 150,00/);
  assert.match(defaultExpensesA, /R\$ 150,00/);
  assert.match(previousExpensesA, /R\$ 70,00/);
  assert.match(todayExpensesA, /R\$ 30,00/);
  assert.match(budgetsA, /Alimentação A/);
  assert.match(budgetsA, /⚠️ Alimentação A: 150% utilizado/);
  assert.doesNotMatch(budgetsA, /Transporte B/);
  assert.match(goalsA, /Reserva A/);
  assert.match(goalsA, /Reserva A: 72%/);
  assert.doesNotMatch(goalsA, /Viagem B/);
  assert.doesNotMatch(insightsA, /Transporte B|Viagem B/);
  assert.ok(
    (insightsA.match(/^(?:⚠️|✅|ℹ️)/gm) ?? []).length <= 3,
  );

  const balanceB = await sendThroughWhatsApp(
    harnessB,
    "quanto tenho?",
    "balance-b",
  );
  const expensesB = await sendThroughWhatsApp(
    harnessB,
    "quanto eu gastei esse mês?",
    "expenses-b",
  );
  const budgetsB = await sendThroughWhatsApp(
    harnessB,
    "orçamentos",
    "budgets-b",
  );
  const goalsB = await sendThroughWhatsApp(
    harnessB,
    "metas",
    "goals-b",
  );
  const insightsB = await sendThroughWhatsApp(
    harnessB,
    "insights",
    "insights-b",
  );

  assert.match(balanceB, /Inter B/);
  assert.doesNotMatch(balanceB, /Nubank A/);
  assert.match(expensesB, /R\$ 777,00/);
  assert.doesNotMatch(expensesB, /R\$ 150,00/);
  assert.match(budgetsB, /Transporte B/);
  assert.doesNotMatch(budgetsB, /Alimentação A/);
  assert.match(goalsB, /Viagem B/);
  assert.doesNotMatch(goalsB, /Reserva A/);
  assert.doesNotMatch(insightsB, /Alimentação A|Reserva A/);

  assert.deepEqual(
    await Promise.all([
      financialSnapshot(userAId),
      financialSnapshot(userBId),
    ]),
    before,
  );
});

test("consultas reais tratam usuário sem dados", async () => {
  const harness = await createServiceHarness(userBId, "2");

  assert.equal(
    await sendThroughWhatsApp(harness, "saldo", "empty-balance"),
    "Você ainda não possui contas cadastradas.",
  );
  assert.equal(
    await sendThroughWhatsApp(
      harness,
      "quanto gastei esse mês?",
      "empty-expenses",
    ),
    "Você ainda não possui despesas registradas neste mês.",
  );
  assert.equal(
    await sendThroughWhatsApp(
      harness,
      "orçamentos",
      "empty-budgets",
    ),
    "Você ainda não possui orçamentos ativos neste mês.",
  );
  assert.equal(
    await sendThroughWhatsApp(harness, "metas", "empty-goals"),
    "Você ainda não possui metas ativas.",
  );
  assert.equal(
    await sendThroughWhatsApp(
      harness,
      "insights",
      "empty-insights",
    ),
    "Não encontrei nenhum alerta ou insight relevante para este período.",
  );
  assert.equal(
    await sendThroughWhatsApp(
      harness,
      "mensagem sem sentido financeiro",
      "unknown",
    ),
    "Não consegui entender essa mensagem.\n\nVocê pode perguntar sobre saldo, gastos, orçamentos, metas ou insights.",
  );
});

test("ASK_FINANCE_AI reutiliza análise existente com fake e sem dados privados", async () => {
  const fixture = await createFinancialFixture(userAId, "A");
  const analysisProvider = new FakeAnalysisProvider();
  const harness = await createServiceHarness(
    userAId,
    "1",
    analysisProvider,
  );
  const message = await sendThroughWhatsApp(
    harness,
    "como estão minhas finanças?",
    "ai-analysis",
  );

  assert.match(
    message,
    /Sua situação financeira está sob controle/,
  );
  assert.match(message, /Prioridades:/);
  assert.equal(analysisProvider.calls, 1);
  assert.equal(harness.intentProvider.requests.length, 0);
  assert.match(
    analysisProvider.lastInput,
    /como estão minhas finanças\?/,
  );

  for (const privateValue of [
    userAId,
    userBId,
    emailA,
    emailB,
    harness.connection.waId,
    fixture.accountId,
    fixture.categoryId,
    fixture.budgetId,
    fixture.goalId,
  ]) {
    assert.equal(
      analysisProvider.lastInput.includes(privateValue),
      false,
    );
  }
});

test("ASK_FINANCE_AI falha fechado quando o provider fica indisponível", async () => {
  await createFinancialFixture(userAId, "A");
  const analysisProvider = new FakeAnalysisProvider(
    new AiProviderUnavailableError(),
  );
  const harness = await createServiceHarness(
    userAId,
    "1",
    analysisProvider,
  );
  const message = await sendThroughWhatsApp(
    harness,
    "onde posso economizar?",
    "ai-analysis-error",
  );

  assert.equal(
    message,
    "Não consegui gerar a análise agora. Você ainda pode consultar saldo, gastos, orçamentos, metas e insights.",
  );
  assert.equal(analysisProvider.calls, 1);
});

test("CREATE_EXPENSE e CREATE_INCOME não alteram dados nem criam pending", async () => {
  await createFinancialFixture(userAId, "A");
  const harness = await createServiceHarness(userAId, "1");
  const before = await financialSnapshot(userAId);

  const expense = await sendThroughWhatsApp(
    harness,
    "Gastei 89 reais no mercado hoje",
    "write-expense-disabled",
  );
  const income = await sendThroughWhatsApp(
    harness,
    "Recebi 2500 do freela hoje",
    "write-income-disabled",
  );

  assert.match(expense, /registro pelo WhatsApp ainda não/);
  assert.match(income, /registro pelo WhatsApp ainda não/);
  assert.deepEqual(await financialSnapshot(userAId), before);
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId: userAId },
    }),
    0,
  );
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

async function createConnection(
  userId: string,
  slot = userId === userBId ? "2" : "1",
) {
  return createWhatsAppConnection({
    userId,
    phoneNumber: `+551199999999${slot}`,
    waId: `551199999999${slot}`,
  });
}

async function createServiceHarness(
  userId: string,
  slot: string,
  analysisProvider: AiProvider = new FakeAnalysisProvider(),
) {
  const connection = await createConnection(userId, slot);
  await verifyWhatsAppConnection({
    userId,
    connectionId: connection.id,
  });

  const transport = new FakeWhatsAppProvider(
    () => referenceDate,
  );
  const intentProvider = new FakeIntentAiProvider({
    intent: "UNKNOWN",
    entities: {
      amount: null,
      description: null,
      date: null,
      categoryHint: null,
      accountHint: null,
      periodHint: null,
    },
  });
  const queryRouter = new WhatsAppQueryService({
    aiAnalysisRunner: (input) =>
      generateAiAnalysis(input, {
        provider: analysisProvider,
        now: () => referenceDate,
      }),
  });
  const service = new WhatsAppService(transport, {
    languageInterpreter: new FinancialLanguageInterpreter(
      intentProvider,
    ),
    queryRouter,
    now: () => referenceDate,
  });

  return {
    connection,
    intentProvider,
    service,
    transport,
  };
}

async function sendThroughWhatsApp(
  harness: Awaited<ReturnType<typeof createServiceHarness>>,
  text: string,
  label: string,
) {
  const result = await harness.service.processIncomingText({
    messageId: `test-${suffix}-phase3-${label}`,
    waId: harness.connection.waId,
    text,
    receivedAt: referenceDate,
  });

  assert.equal(result.status, "PROCESSED");

  if (result.status !== "PROCESSED") {
    throw new Error("A mensagem deveria ter sido processada.");
  }

  const sent = harness.transport.getSentMessages().at(-1);
  assert.equal(sent?.text, result.command.message);

  return result.command.message;
}

async function createFinancialFixture(
  userId: string,
  label: "A" | "B",
) {
  const account = await prisma.account.create({
    data: {
      userId,
      name: label === "A" ? "Nubank A" : "Inter B",
      type: "CHECKING",
      initialBalance: label === "A" ? 1_000 : 9_000,
    },
  });
  const category = await prisma.category.create({
    data: {
      userId,
      name:
        label === "A"
          ? "Alimentação A"
          : "Transporte B",
      type: "EXPENSE",
    },
  });
  const currentExpense = label === "A" ? 120 : 777;
  const entries: Array<{
    userId: string;
    accountId: string;
    categoryId: string | null;
    description: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    status: "COMPLETED";
    dueDate: Date;
    completedAt: Date;
  }> = [
    {
      userId,
      accountId: account.id,
      categoryId: category.id,
      description: `Despesa atual ${label}`,
      amount: currentExpense,
      type: "EXPENSE" as const,
      status: "COMPLETED" as const,
      dueDate: new Date("2026-08-10T12:00:00.000Z"),
      completedAt: new Date("2026-08-10T12:00:00.000Z"),
    },
  ];

  if (label === "A") {
    entries.push(
      {
        userId,
        accountId: account.id,
        categoryId: category.id,
        description: "Despesa de hoje A",
        amount: 30,
        type: "EXPENSE",
        status: "COMPLETED",
        dueDate: new Date("2026-08-30T08:00:00.000Z"),
        completedAt: new Date("2026-08-30T08:00:00.000Z"),
      },
      {
        userId,
        accountId: account.id,
        categoryId: category.id,
        description: "Despesa anterior A",
        amount: 70,
        type: "EXPENSE",
        status: "COMPLETED",
        dueDate: new Date("2026-07-15T12:00:00.000Z"),
        completedAt: new Date("2026-07-15T12:00:00.000Z"),
      },
      {
        userId,
        accountId: account.id,
        categoryId: null,
        description: "Receita A",
        amount: 500,
        type: "INCOME",
        status: "COMPLETED",
        dueDate: new Date("2026-08-05T12:00:00.000Z"),
        completedAt: new Date("2026-08-05T12:00:00.000Z"),
      },
    );
  }

  await prisma.entry.createMany({ data: entries });

  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: category.id,
      amount: label === "A" ? 100 : 500,
      month: 8,
      year: 2026,
    },
  });
  const goal = await prisma.goal.create({
    data: {
      userId,
      name: label === "A" ? "Reserva A" : "Viagem B",
      targetAmount: label === "A" ? 1_000 : 2_000,
      status: "ACTIVE",
    },
  });
  await prisma.goalContribution.create({
    data: {
      userId,
      goalId: goal.id,
      amount: label === "A" ? 720 : 100,
      date: referenceDate,
    },
  });

  return {
    accountId: account.id,
    categoryId: category.id,
    budgetId: budget.id,
    goalId: goal.id,
  };
}

async function financialSnapshot(userId: string) {
  const [
    accounts,
    entries,
    budgets,
    goals,
    contributions,
    pendingActions,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { id: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    prisma.entry.findMany({
      where: { userId },
      select: { id: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: { id: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: { id: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    prisma.goalContribution.count({ where: { userId } }),
    prisma.pendingFinancialAction.count({ where: { userId } }),
  ]);

  return {
    accounts,
    entries,
    budgets,
    goals,
    contributions,
    pendingActions,
  };
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
  const userIds = [userAId, userBId].filter(Boolean);
  await prisma.goalContribution.deleteMany({
    where: { userId: { in: userIds } },
  });
  await Promise.all([
    prisma.goal.deleteMany({
      where: { userId: { in: userIds } },
    }),
    prisma.budget.deleteMany({
      where: { userId: { in: userIds } },
    }),
    prisma.entry.deleteMany({
      where: { userId: { in: userIds } },
    }),
  ]);
  await Promise.all([
    prisma.category.deleteMany({
      where: { userId: { in: userIds } },
    }),
    prisma.account.deleteMany({
      where: { userId: { in: userIds } },
    }),
  ]);
}
