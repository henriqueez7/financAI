import assert from "node:assert/strict";
import test from "node:test";

import {
  INSIGHT_THRESHOLDS,
  buildFinancialInsights,
} from "./insight.engine.js";
import type {
  InsightEngineReport,
  InsightType,
} from "./insight.types.js";

function createReport(): InsightEngineReport {
  return {
    period: {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      comparisonLabel: "vs. mês anterior",
      granularity: "DAY",
    },
    overview: {
      totalIncome: 0,
      totalExpense: 0,
      netResult: 0,
      savingsRate: null,
      transactionCount: 0,
      averageExpense: null,
      largestExpense: null,
      comparison: null,
    },
    categories: [],
    budgets: {
      items: [],
    },
    goals: {
      items: [],
    },
  };
}

function insightTypes(report: InsightEngineReport) {
  return buildFinancialInsights(report).map(
    (insight) => insight.type,
  );
}

function setFinancialResult(
  report: InsightEngineReport,
  {
    income,
    expense,
    savingsRate,
  }: {
    income: number;
    expense: number;
    savingsRate: number | null;
  },
) {
  report.overview.totalIncome = income;
  report.overview.totalExpense = expense;
  report.overview.netResult = income - expense;
  report.overview.savingsRate = savingsRate;
  report.overview.transactionCount = 1;
}

function addBudget(
  report: InsightEngineReport,
  percentageUsed: number,
  id = `budget-${percentageUsed}`,
) {
  report.budgets.items.push({
    id,
    amount: 1000,
    spentAmount: percentageUsed * 10,
    remainingAmount: Math.max(
      1000 - percentageUsed * 10,
      0,
    ),
    percentageUsed,
    category: {
      id: `category-${id}`,
      name: "Moradia",
    },
  });
}

function addGoal(
  report: InsightEngineReport,
  {
    percentageCompleted,
    completed = false,
    overdue = false,
    status = "ACTIVE",
    id = `goal-${percentageCompleted}`,
  }: {
    percentageCompleted: number;
    completed?: boolean;
    overdue?: boolean;
    status?: string;
    id?: string;
  },
) {
  report.goals.items.push({
    id,
    name: "Reserva de emergência",
    status,
    targetAmount: 1000,
    currentAmount: percentageCompleted * 10,
    remainingAmount: Math.max(
      1000 - percentageCompleted * 10,
      0,
    ),
    percentageCompleted,
    completed,
    overdue,
  });
}

test("não gera insight sem fatos financeiros", () => {
  assert.deepEqual(
    buildFinancialInsights(createReport()),
    [],
  );
});

test("somente receita gera boa taxa de economia", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 1000,
    expense: 0,
    savingsRate: 100,
  });

  assert.ok(
    insightTypes(report).includes("SAVINGS_RATE_GOOD"),
  );
});

test("somente despesa gera resultado negativo", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 0,
    expense: 500,
    savingsRate: null,
  });

  assert.equal(
    buildFinancialInsights(report)[0]?.type,
    "NEGATIVE_RESULT",
  );
});

test("resultado negativo tem severidade crítica", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 500,
    expense: 700,
    savingsRate: -40,
  });

  const insight = buildFinancialInsights(report).find(
    (item) => item.type === "NEGATIVE_RESULT",
  );

  assert.equal(insight?.severity, "CRITICAL");
  assert.equal(insight?.value, -200);
});

test("aumento de despesas no limiar gera alerta", () => {
  const report = createReport();
  report.overview.transactionCount = 1;
  report.overview.comparison = {
    expenseChangePercentage:
      INSIGHT_THRESHOLDS.expenseChangePercentage,
  };

  assert.ok(
    insightTypes(report).includes("EXPENSE_INCREASE"),
  );
});

test("aumento de despesas abaixo do limiar não gera alerta", () => {
  const report = createReport();
  report.overview.comparison = {
    expenseChangePercentage:
      INSIGHT_THRESHOLDS.expenseChangePercentage - 0.01,
  };

  assert.ok(
    !insightTypes(report).includes("EXPENSE_INCREASE"),
  );
});

test("queda de despesas no limiar gera insight positivo", () => {
  const report = createReport();
  report.overview.transactionCount = 1;
  report.overview.comparison = {
    expenseChangePercentage:
      -INSIGHT_THRESHOLDS.expenseChangePercentage,
  };

  assert.ok(
    insightTypes(report).includes("EXPENSE_DECREASE"),
  );
});

test("categoria com 40% das despesas gera concentração", () => {
  const report = createReport();
  report.overview.totalExpense = 1000;
  report.categories.push({
    categoryId: "food",
    name: "Alimentação",
    amount: 400,
    percentage: 40,
  });

  assert.ok(
    insightTypes(report).includes("CATEGORY_CONCENTRATION"),
  );
});

test("somente a categoria dominante gera insight", () => {
  const report = createReport();
  report.overview.totalExpense = 1000;
  report.categories.push(
    {
      categoryId: "b",
      name: "Segunda",
      amount: 450,
      percentage: 45,
    },
    {
      categoryId: "a",
      name: "Primeira",
      amount: 550,
      percentage: 55,
    },
  );

  const insights = buildFinancialInsights(report).filter(
    (item) => item.type === "CATEGORY_CONCENTRATION",
  );

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.entityId, "a");
});

test("despesa igual a duas vezes a média é relevante", () => {
  const report = createReport();
  report.overview.averageExpense = 100;
  report.overview.largestExpense = 200;

  assert.ok(
    insightTypes(report).includes("LARGE_EXPENSE"),
  );
});

for (const scenario of [
  { percentage: 79, expected: undefined },
  { percentage: 80, expected: "BUDGET_WARNING" },
  { percentage: 99, expected: "BUDGET_WARNING" },
  { percentage: 100, expected: "BUDGET_EXCEEDED" },
  { percentage: 120, expected: "BUDGET_EXCEEDED" },
] as const) {
  test(`orçamento em ${scenario.percentage}% respeita o limiar`, () => {
    const report = createReport();
    addBudget(report, scenario.percentage);

    const type = buildFinancialInsights(report).find(
      (item) => item.entityType === "BUDGET",
    )?.type;

    assert.equal(type, scenario.expected);
  });
}

test("orçamento acima de 100% informa o excesso real", () => {
  const report = createReport();
  addBudget(report, 120);

  const insight = buildFinancialInsights(report)[0];

  assert.equal(insight?.comparisonValue, 1000);
  assert.match(insight?.message ?? "", /R\$\s?200,00/);
});

test("meta em 79% não gera proximidade", () => {
  const report = createReport();
  addGoal(report, { percentageCompleted: 79 });

  assert.ok(
    !insightTypes(report).includes(
      "GOAL_NEAR_COMPLETION",
    ),
  );
});

test("meta em 80% gera proximidade", () => {
  const report = createReport();
  addGoal(report, { percentageCompleted: 80 });

  assert.ok(
    insightTypes(report).includes(
      "GOAL_NEAR_COMPLETION",
    ),
  );
});

test("meta concluída gera celebração", () => {
  const report = createReport();
  addGoal(report, {
    percentageCompleted: 100,
    completed: true,
    status: "COMPLETED",
  });

  assert.ok(
    insightTypes(report).includes("GOAL_COMPLETED"),
  );
});

test("meta ativa atrasada gera alerta", () => {
  const report = createReport();
  addGoal(report, {
    percentageCompleted: 50,
    overdue: true,
  });

  assert.ok(insightTypes(report).includes("GOAL_OVERDUE"));
});

test("taxa de economia de 20% é considerada boa", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 1000,
    expense: 800,
    savingsRate: 20,
  });

  assert.ok(
    insightTypes(report).includes("SAVINGS_RATE_GOOD"),
  );
});

test("taxa de economia abaixo de 10% gera alerta", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 1000,
    expense: 901,
    savingsRate: 9.9,
  });

  assert.ok(
    insightTypes(report).includes("SAVINGS_RATE_LOW"),
  );
});

test("taxa de economia de 10% não gera falso alerta", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 1000,
    expense: 900,
    savingsRate: 10,
  });

  assert.deepEqual(insightTypes(report), ["POSITIVE_RESULT"]);
});

test("deduplicação mantém apenas o estado mais forte de uma meta", () => {
  const report = createReport();
  addGoal(report, {
    id: "same-goal",
    percentageCompleted: 100,
    completed: true,
    overdue: true,
  });

  const goalInsights = buildFinancialInsights(report).filter(
    (item) => item.entityId === "same-goal",
  );

  assert.deepEqual(
    goalInsights.map((item) => item.type),
    ["GOAL_COMPLETED"],
  );
});

test("resultado negativo não é duplicado por taxa baixa", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 500,
    expense: 700,
    savingsRate: -40,
  });

  const resultInsights = buildFinancialInsights(report).filter(
    (item) =>
      item.type === "NEGATIVE_RESULT" ||
      item.type === "SAVINGS_RATE_LOW" ||
      item.type === "POSITIVE_RESULT",
  );

  assert.deepEqual(
    resultInsights.map((item) => item.type),
    ["NEGATIVE_RESULT"],
  );
});

test("ordena por severidade e limita o volume", () => {
  const report = createReport();
  setFinancialResult(report, {
    income: 500,
    expense: 1000,
    savingsRate: -100,
  });
  report.overview.comparison = {
    expenseChangePercentage: 30,
  };
  report.overview.averageExpense = 100;
  report.overview.largestExpense = 300;
  report.categories.push({
    categoryId: "food",
    name: "Alimentação",
    amount: 500,
    percentage: 50,
  });
  addBudget(report, 120, "budget-b");
  addBudget(report, 110, "budget-a");
  addBudget(report, 85, "budget-warning");
  addGoal(report, {
    id: "goal-overdue",
    percentageCompleted: 40,
    overdue: true,
  });
  addGoal(report, {
    id: "goal-done",
    percentageCompleted: 100,
    completed: true,
  });

  const insights = buildFinancialInsights(report);
  const types = insights.map((item) => item.type);

  assert.equal(
    insights.length,
    INSIGHT_THRESHOLDS.maximumInsights,
  );
  assert.deepEqual(types.slice(0, 3), [
    "BUDGET_EXCEEDED",
    "BUDGET_EXCEEDED",
    "NEGATIVE_RESULT",
  ] satisfies InsightType[]);
  assert.deepEqual(
    insights.map((item) => item.severity),
    [
      "CRITICAL",
      "CRITICAL",
      "CRITICAL",
      "WARNING",
      "WARNING",
      "WARNING",
    ],
  );
});

test("ordenação é estável para entidades do mesmo tipo", () => {
  const report = createReport();
  addBudget(report, 100, "budget-z");
  addBudget(report, 100, "budget-a");

  assert.deepEqual(
    buildFinancialInsights(report).map(
      (item) => item.entityId,
    ),
    ["budget-a", "budget-z"],
  );
});
