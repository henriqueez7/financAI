export type InsightSeverity =
  | "CRITICAL"
  | "WARNING"
  | "POSITIVE"
  | "INFO";

export type InsightType =
  | "EXPENSE_INCREASE"
  | "EXPENSE_DECREASE"
  | "SAVINGS_RATE_GOOD"
  | "SAVINGS_RATE_LOW"
  | "CATEGORY_CONCENTRATION"
  | "LARGE_EXPENSE"
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "GOAL_NEAR_COMPLETION"
  | "GOAL_COMPLETED"
  | "GOAL_OVERDUE"
  | "NEGATIVE_RESULT"
  | "POSITIVE_RESULT";

export interface InsightAction {
  label: string;
  href: string;
}

export interface FinancialInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  comparisonValue?: number;
  percentage?: number;
  entityType?: "BUDGET" | "CATEGORY" | "GOAL";
  entityId?: string;
  action?: InsightAction;
}

export interface InsightEngineReport {
  period: {
    dateFrom: string;
    dateTo: string;
    comparisonLabel: string;
    granularity: "DAY" | "MONTH";
  };
  overview: {
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    savingsRate: number | null;
    transactionCount: number;
    averageExpense: number | null;
    largestExpense: number | null;
    comparison: {
      expenseChangePercentage: number | null;
    } | null;
  };
  categories: Array<{
    categoryId: string | null;
    name: string;
    amount: number;
    percentage: number;
  }>;
  budgets: {
    items: Array<{
      id: string;
      amount: number;
      spentAmount: number;
      remainingAmount: number;
      percentageUsed: number;
      category: {
        id: string;
        name: string;
      };
    }>;
  };
  goals: {
    items: Array<{
      id: string;
      name: string;
      status: string;
      targetAmount: number;
      currentAmount: number;
      remainingAmount: number;
      percentageCompleted: number;
      completed: boolean;
      overdue: boolean;
    }>;
  };
}

export interface FinancialInsightsOverview {
  period: InsightEngineReport["period"];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    savingsRate: number | null;
    insightCount: number;
  };
  insights: FinancialInsight[];
}
