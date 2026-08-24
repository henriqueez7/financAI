import { api } from "./api";
import type {
  CashFlowGranularity,
  ReportEntryType,
} from "./reports";

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

export interface InsightFilters {
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  type?: ReportEntryType;
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
  action?: {
    label: string;
    href: string;
  };
}

export interface FinancialInsightsOverview {
  period: {
    dateFrom: string;
    dateTo: string;
    comparisonLabel: string;
    granularity: CashFlowGranularity;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    savingsRate: number | null;
    insightCount: number;
  };
  insights: FinancialInsight[];
}

export async function getFinancialInsightsOverview(
  filters: InsightFilters = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();

  return api<FinancialInsightsOverview>(
    `/insights/overview${query ? `?${query}` : ""}`,
  );
}
