import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import type { AiAnalyzeRequest } from "../../ai/ai.schema.js";
import type { getReportOverview } from "../../reports/report.service.js";
import type { IntentResult } from "../intents/intent.types.js";
import {
  WHATSAPP_AI_ERROR_MESSAGE,
  WHATSAPP_QUERY_ERROR_MESSAGE,
} from "../responses/response.constants.js";
import { WhatsAppQueryService } from "./query.service.js";

const referenceDate = new Date("2026-08-30T12:00:00.000Z");

test("retorna estados vazios para consultas sem dados", async () => {
  const service = new WhatsAppQueryService({
    accountsLoader: async () => [],
    budgetsLoader: async () => [],
    goalsLoader: async () => [],
    insightsLoader: async () => ({
      period: {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        comparisonLabel: "vs. mês anterior",
        granularity: "DAY",
      },
      summary: {
        totalIncome: 0,
        totalExpense: 0,
        netResult: 0,
        savingsRate: null,
        insightCount: 0,
      },
      insights: [],
    }),
  });

  assert.equal(
    (await execute(service, createIntent("GET_BALANCE"))).message,
    "Você ainda não possui contas cadastradas.",
  );
  assert.equal(
    (await execute(service, createIntent("GET_BUDGETS"))).message,
    "Você ainda não possui orçamentos ativos neste mês.",
  );
  assert.equal(
    (await execute(service, createIntent("GET_GOALS"))).message,
    "Você ainda não possui metas ativas.",
  );
  assert.equal(
    (await execute(service, createIntent("GET_INSIGHTS"))).message,
    "Não encontrei nenhum alerta ou insight relevante para este período.",
  );
});

test("GET_EXPENSES envia periodHint e ownership ao Reports", async () => {
  let receivedUserId = "";
  let receivedQuery: unknown;
  const service = new WhatsAppQueryService({
    reportLoader: async ({ userId, query }) => {
      receivedUserId = userId;
      receivedQuery = query;

      return createExpenseReport();
    },
  });
  const result = await execute(
    service,
    createIntent("GET_EXPENSES", {
      periodHint: "PREVIOUS_MONTH",
    }),
  );

  assert.equal(receivedUserId, "verified-user-id");
  assert.deepEqual(receivedQuery, {
    month: 7,
    year: 2026,
    type: "EXPENSE",
  });
  assert.match(result.message, /R\$ 320,00 no mês passado/);
});

test("ASK_FINANCE_AI preserva pergunta e filtros sem identificadores", async () => {
  let received:
    | {
        userId: string;
        input: AiAnalyzeRequest;
      }
    | undefined;
  const service = new WhatsAppQueryService({
    aiAnalysisRunner: async (input) => {
      received = input;

      return {
        status: "INSUFFICIENT_DATA" as const,
        analysis: null,
        sourceInsights: [],
        period: {
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
          granularity: "DAY" as const,
          comparisonLabel: "vs. mês anterior",
        },
        generatedAt: "2026-08-30T12:00:00.000Z",
      };
    },
  });
  const result = await execute(
    service,
    createIntent(
      "ASK_FINANCE_AI",
      { periodHint: "CURRENT_MONTH" },
      "Onde posso economizar?",
    ),
  );

  assert.deepEqual(received, {
    userId: "verified-user-id",
    input: {
      filters: { month: 8, year: 2026 },
      question: "Onde posso economizar?",
    },
  });
  assert.equal(result.code, "AI_ANALYSIS");
  assert.equal(
    result.message,
    "Ainda não há dados financeiros suficientes para gerar uma análise.",
  );
});

test("CREATE é encaminhado ao command service sem consultar Reports", async () => {
  let queryCalls = 0;
  let commandCalls = 0;
  const service = new WhatsAppQueryService({
    reportLoader: async () => {
      queryCalls += 1;
      return createExpenseReport();
    },
    commandExecutor: async () => {
      commandCalls += 1;

      return {
        code: "PENDING_ACTION_CREATED",
        message: "Proposta criada.",
      };
    },
  });
  const result = await execute(
    service,
    createIntent("CREATE_INCOME", {
      amount: 2_500,
      description: "freela",
    }),
  );

  assert.equal(result.code, "PENDING_ACTION_CREATED");
  assert.equal(queryCalls, 0);
  assert.equal(commandCalls, 1);
});

test("falhas de consulta e análise retornam mensagens genéricas", async () => {
  const events: Array<{
    intent: IntentResult["intent"];
    errorName: string;
  }> = [];
  const service = new WhatsAppQueryService({
    accountsLoader: async () => {
      throw new Error("detalhe privado de banco");
    },
    aiAnalysisRunner: async () => {
      throw new Error("detalhe privado do provider");
    },
    errorReporter: (event) => events.push(event),
  });
  const balance = await execute(
    service,
    createIntent("GET_BALANCE"),
  );
  const analysis = await execute(
    service,
    createIntent(
      "ASK_FINANCE_AI",
      {},
      "Como estão minhas finanças?",
    ),
  );

  assert.deepEqual(balance, {
    code: "QUERY_ERROR",
    message: WHATSAPP_QUERY_ERROR_MESSAGE,
  });
  assert.deepEqual(analysis, {
    code: "AI_ERROR",
    message: WHATSAPP_AI_ERROR_MESSAGE,
  });
  assert.deepEqual(events, [
    { intent: "GET_BALANCE", errorName: "Error" },
    { intent: "ASK_FINANCE_AI", errorName: "Error" },
  ]);
});

function execute(
  service: WhatsAppQueryService,
  interpretation: IntentResult,
) {
  return service.execute({
    userId: "verified-user-id",
    interpretation,
    referenceDate,
  });
}

function createIntent(
  intent: IntentResult["intent"],
  entities: IntentResult["entities"] = {},
  rawText: string = intent,
): IntentResult {
  return {
    intent,
    source: "DETERMINISTIC",
    confidence: "PATTERN",
    rawText,
    entities,
  };
}

function createExpenseReport(): Awaited<
  ReturnType<typeof getReportOverview>
> {
  return {
    period: {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      granularity: "DAY",
      comparisonLabel: "vs. mês anterior",
    },
    appliedFilters: {
      accountId: null,
      categoryId: null,
      type: "EXPENSE",
    },
    filterOptions: {
      accounts: [],
      categories: [],
    },
    overview: {
      totalIncome: 0,
      totalExpense: 320,
      netResult: -320,
      savingsRate: null,
      transactionCount: 2,
      averageExpense: 160,
      largestExpense: 200,
      largestIncome: null,
      comparison: null,
    },
    cashFlow: {
      granularity: "DAY",
      series: [],
    },
    categories: [
      {
        categoryId: null,
        name: "Alimentação",
        icon: null,
        color: "#000000",
        amount: 320,
        percentage: 100,
        transactionCount: 2,
      },
    ],
    accounts: [],
    budgets: {
      totalBudgeted: 0,
      totalSpent: 0,
      remaining: 0,
      percentageUsed: null,
      exceededBudgets: 0,
      budgetsNearLimit: 0,
      items: [],
    },
    goals: {
      activeGoals: 0,
      completedGoals: 0,
      totalTargetAmount: 0,
      totalContributed: 0,
      overallProgressPercentage: 0,
      overdueGoals: 0,
      items: [],
    },
  };
}
