import type {
  FinancialInsight,
  InsightEngineReport,
  InsightSeverity,
  InsightType,
} from "./insight.types.js";

export const INSIGHT_THRESHOLDS = {
  expenseChangePercentage: 15,
  savingsRateGoodPercentage: 20,
  savingsRateLowPercentage: 10,
  categoryConcentrationPercentage: 40,
  largeExpenseAverageMultiplier: 2,
  budgetWarningPercentage: 80,
  budgetExceededPercentage: 100,
  goalNearCompletionPercentage: 80,
  goalCompletedPercentage: 100,
  maximumInsights: 6,
} as const;

const severityOrder: Record<
  InsightSeverity,
  number
> = {
  CRITICAL: 0,
  WARNING: 1,
  POSITIVE: 2,
  INFO: 3,
};

const typePriority: Record<InsightType, number> = {
  BUDGET_EXCEEDED: 100,
  NEGATIVE_RESULT: 95,
  GOAL_OVERDUE: 90,
  BUDGET_WARNING: 85,
  EXPENSE_INCREASE: 80,
  SAVINGS_RATE_LOW: 75,
  CATEGORY_CONCENTRATION: 70,
  GOAL_COMPLETED: 65,
  EXPENSE_DECREASE: 60,
  SAVINGS_RATE_GOOD: 55,
  GOAL_NEAR_COMPLETION: 50,
  POSITIVE_RESULT: 45,
  LARGE_EXPENSE: 40,
};

interface InsightCandidate
  extends FinancialInsight {
  deduplicationKey: string;
}

export function buildFinancialInsights(
  report: InsightEngineReport,
): FinancialInsight[] {
  const periodKey = `${report.period.dateFrom}:${report.period.dateTo}`;
  const candidates: InsightCandidate[] = [];

  addExpenseTrendInsight(
    candidates,
    report,
    periodKey,
  );
  addResultInsight(candidates, report, periodKey);
  addCategoryInsight(candidates, report, periodKey);
  addLargeExpenseInsight(
    candidates,
    report,
    periodKey,
  );
  addBudgetInsights(candidates, report);
  addGoalInsights(candidates, report);

  const deduplicated = new Map<
    string,
    InsightCandidate
  >();

  for (const candidate of candidates) {
    const existing = deduplicated.get(
      candidate.deduplicationKey,
    );

    if (
      !existing ||
      compareInsightCandidates(
        candidate,
        existing,
      ) < 0
    ) {
      deduplicated.set(
        candidate.deduplicationKey,
        candidate,
      );
    }
  }

  return Array.from(deduplicated.values())
    .sort(compareInsightCandidates)
    .slice(0, INSIGHT_THRESHOLDS.maximumInsights)
    .map(
      ({ deduplicationKey: _deduplicationKey, ...insight }) =>
        insight,
    );
}

function addExpenseTrendInsight(
  candidates: InsightCandidate[],
  report: InsightEngineReport,
  periodKey: string,
) {
  const change =
    report.overview.comparison
      ?.expenseChangePercentage;

  if (change === null || change === undefined) {
    return;
  }

  if (
    change >=
    INSIGHT_THRESHOLDS.expenseChangePercentage
  ) {
    candidates.push({
      id: `expense-increase:${periodKey}`,
      type: "EXPENSE_INCREASE",
      severity: "WARNING",
      title: "Despesas em alta",
      message: `Suas despesas aumentaram ${formatPercentage(change)} em relação ao período anterior.`,
      metric: "totalExpense",
      value: report.overview.totalExpense,
      percentage: change,
      action: reportsAction,
      deduplicationKey: "expense-trend",
    });
    return;
  }

  if (
    change <=
    -INSIGHT_THRESHOLDS.expenseChangePercentage
  ) {
    candidates.push({
      id: `expense-decrease:${periodKey}`,
      type: "EXPENSE_DECREASE",
      severity: "POSITIVE",
      title: "Despesas em queda",
      message: `Suas despesas caíram ${formatPercentage(Math.abs(change))} em relação ao período anterior.`,
      metric: "totalExpense",
      value: report.overview.totalExpense,
      percentage: change,
      action: reportsAction,
      deduplicationKey: "expense-trend",
    });
  }
}

function addResultInsight(
  candidates: InsightCandidate[],
  report: InsightEngineReport,
  periodKey: string,
) {
  const overview = report.overview;

  if (overview.transactionCount === 0) {
    return;
  }

  if (overview.netResult < 0) {
    candidates.push({
      id: `negative-result:${periodKey}`,
      type: "NEGATIVE_RESULT",
      severity: "CRITICAL",
      title: "Resultado negativo",
      message: `Suas despesas superaram suas receitas em ${formatMoney(Math.abs(overview.netResult))} neste período.`,
      metric: "netResult",
      value: overview.netResult,
      action: reportsAction,
      deduplicationKey: "result-health",
    });
    return;
  }

  const savingsRate = overview.savingsRate;

  if (
    savingsRate !== null &&
    savingsRate >=
      INSIGHT_THRESHOLDS.savingsRateGoodPercentage
  ) {
    candidates.push({
      id: `savings-rate-good:${periodKey}`,
      type: "SAVINGS_RATE_GOOD",
      severity: "POSITIVE",
      title: "Boa taxa de economia",
      message: `Você economizou ${formatPercentage(savingsRate)} das suas receitas neste período.`,
      metric: "savingsRate",
      value: overview.netResult,
      percentage: savingsRate,
      action: reportsAction,
      deduplicationKey: "result-health",
    });
    return;
  }

  if (
    savingsRate !== null &&
    savingsRate >= 0 &&
    savingsRate <
      INSIGHT_THRESHOLDS.savingsRateLowPercentage
  ) {
    candidates.push({
      id: `savings-rate-low:${periodKey}`,
      type: "SAVINGS_RATE_LOW",
      severity: "WARNING",
      title: "Taxa de economia baixa",
      message: `Sua taxa de economia foi de ${formatPercentage(savingsRate)} neste período.`,
      metric: "savingsRate",
      value: overview.netResult,
      percentage: savingsRate,
      action: reportsAction,
      deduplicationKey: "result-health",
    });
    return;
  }

  if (overview.netResult > 0) {
    candidates.push({
      id: `positive-result:${periodKey}`,
      type: "POSITIVE_RESULT",
      severity: "INFO",
      title: "Resultado positivo",
      message: `Seu resultado financeiro foi positivo em ${formatMoney(overview.netResult)} neste período.`,
      metric: "netResult",
      value: overview.netResult,
      percentage: savingsRate ?? undefined,
      action: reportsAction,
      deduplicationKey: "result-health",
    });
  }
}

function addCategoryInsight(
  candidates: InsightCandidate[],
  report: InsightEngineReport,
  periodKey: string,
) {
  if (report.overview.totalExpense <= 0) {
    return;
  }

  const category = [...report.categories].sort(
    (first, second) =>
      second.percentage - first.percentage ||
      (first.categoryId ?? "").localeCompare(
        second.categoryId ?? "",
      ),
  )[0];

  if (
    !category ||
    category.percentage <
      INSIGHT_THRESHOLDS.categoryConcentrationPercentage
  ) {
    return;
  }

  candidates.push({
    id: `category-concentration:${category.categoryId ?? "unassigned"}:${periodKey}`,
    type: "CATEGORY_CONCENTRATION",
    severity: "WARNING",
    title: "Concentração de despesas",
    message: `${category.name} representa ${formatPercentage(category.percentage)} das suas despesas neste período.`,
    metric: "categoryExpenseShare",
    value: category.amount,
    percentage: category.percentage,
    entityType: "CATEGORY",
    entityId: category.categoryId ?? undefined,
    action: reportsAction,
    deduplicationKey: "category-concentration",
  });
}

function addLargeExpenseInsight(
  candidates: InsightCandidate[],
  report: InsightEngineReport,
  periodKey: string,
) {
  const average = report.overview.averageExpense;
  const largest = report.overview.largestExpense;

  if (
    average === null ||
    largest === null ||
    average <= 0 ||
    largest <= average
  ) {
    return;
  }

  const multiplier = largest / average;

  if (
    multiplier <
    INSIGHT_THRESHOLDS.largeExpenseAverageMultiplier
  ) {
    return;
  }

  candidates.push({
    id: `large-expense:${periodKey}`,
    type: "LARGE_EXPENSE",
    severity: "INFO",
    title: "Despesa acima da média",
    message: `Sua maior despesa foi de ${formatMoney(largest)}, equivalente a ${formatDecimal(multiplier)} vezes a despesa média do período.`,
    metric: "largestExpense",
    value: largest,
    comparisonValue: average,
    action: reportsAction,
    deduplicationKey: "large-expense",
  });
}

function addBudgetInsights(
  candidates: InsightCandidate[],
  report: InsightEngineReport,
) {
  for (const budget of report.budgets.items) {
    if (
      budget.percentageUsed >=
      INSIGHT_THRESHOLDS.budgetExceededPercentage
    ) {
      const exceededAmount = Math.max(
        budget.spentAmount - budget.amount,
        0,
      );

      candidates.push({
        id: `budget-exceeded:${budget.id}`,
        type: "BUDGET_EXCEEDED",
        severity: "CRITICAL",
        title: "Orçamento no limite",
        message:
          exceededAmount > 0
            ? `Você ultrapassou o orçamento de ${budget.category.name} em ${formatMoney(exceededAmount)}.`
            : `Você utilizou 100% do orçamento de ${budget.category.name} e atingiu o limite.`,
        metric: "budgetPercentageUsed",
        value: budget.spentAmount,
        comparisonValue: budget.amount,
        percentage: budget.percentageUsed,
        entityType: "BUDGET",
        entityId: budget.id,
        action: {
          label: "Ver orçamento",
          href: `/budgets/${budget.id}`,
        },
        deduplicationKey: `budget:${budget.id}`,
      });
      continue;
    }

    if (
      budget.percentageUsed >=
      INSIGHT_THRESHOLDS.budgetWarningPercentage
    ) {
      candidates.push({
        id: `budget-warning:${budget.id}`,
        type: "BUDGET_WARNING",
        severity: "WARNING",
        title: "Orçamento próximo do limite",
        message: `Você já utilizou ${formatPercentage(budget.percentageUsed)} do orçamento de ${budget.category.name}.`,
        metric: "budgetPercentageUsed",
        value: budget.spentAmount,
        comparisonValue: budget.amount,
        percentage: budget.percentageUsed,
        entityType: "BUDGET",
        entityId: budget.id,
        action: {
          label: "Ver orçamento",
          href: `/budgets/${budget.id}`,
        },
        deduplicationKey: `budget:${budget.id}`,
      });
    }
  }
}

function addGoalInsights(
  candidates: InsightCandidate[],
  report: InsightEngineReport,
) {
  for (const goal of report.goals.items) {
    if (
      goal.completed ||
      goal.percentageCompleted >=
        INSIGHT_THRESHOLDS.goalCompletedPercentage
    ) {
      candidates.push({
        id: `goal-completed:${goal.id}`,
        type: "GOAL_COMPLETED",
        severity: "POSITIVE",
        title: "Meta concluída",
        message: `A meta ${goal.name} foi concluída.`,
        metric: "goalPercentageCompleted",
        value: goal.currentAmount,
        comparisonValue: goal.targetAmount,
        percentage: goal.percentageCompleted,
        entityType: "GOAL",
        entityId: goal.id,
        action: {
          label: "Ver meta",
          href: `/goals/${goal.id}`,
        },
        deduplicationKey: `goal:${goal.id}`,
      });
      continue;
    }

    if (goal.overdue) {
      candidates.push({
        id: `goal-overdue:${goal.id}`,
        type: "GOAL_OVERDUE",
        severity: "WARNING",
        title: "Meta atrasada",
        message: `A meta ${goal.name} está atrasada e ainda faltam ${formatMoney(goal.remainingAmount)}.`,
        metric: "goalRemainingAmount",
        value: goal.remainingAmount,
        percentage: goal.percentageCompleted,
        entityType: "GOAL",
        entityId: goal.id,
        action: {
          label: "Ver meta",
          href: `/goals/${goal.id}`,
        },
        deduplicationKey: `goal:${goal.id}`,
      });
      continue;
    }

    if (
      goal.status === "ACTIVE" &&
      goal.percentageCompleted >=
        INSIGHT_THRESHOLDS.goalNearCompletionPercentage
    ) {
      candidates.push({
        id: `goal-near-completion:${goal.id}`,
        type: "GOAL_NEAR_COMPLETION",
        severity: "POSITIVE",
        title: "Meta próxima da conclusão",
        message: `Faltam ${formatMoney(goal.remainingAmount)} para concluir sua meta ${goal.name}.`,
        metric: "goalPercentageCompleted",
        value: goal.currentAmount,
        comparisonValue: goal.targetAmount,
        percentage: goal.percentageCompleted,
        entityType: "GOAL",
        entityId: goal.id,
        action: {
          label: "Ver meta",
          href: `/goals/${goal.id}`,
        },
        deduplicationKey: `goal:${goal.id}`,
      });
    }
  }
}

function compareInsightCandidates(
  first: InsightCandidate,
  second: InsightCandidate,
) {
  return (
    severityOrder[first.severity] -
      severityOrder[second.severity] ||
    typePriority[second.type] -
      typePriority[first.type] ||
    first.type.localeCompare(second.type) ||
    (first.entityId ?? "").localeCompare(
      second.entityId ?? "",
    ) ||
    first.id.localeCompare(second.id)
  );
}

const reportsAction = {
  label: "Ver relatório",
  href: "/reports",
} as const;

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDecimal(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
