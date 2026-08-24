import { api } from "./api";

export type ReportEntryType =
  | "INCOME"
  | "EXPENSE";

export type CashFlowGranularity =
  | "DAY"
  | "MONTH";

export interface ReportFilters {
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  type?: ReportEntryType;
}

export interface ReportFilterAccount {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface ReportFilterCategory {
  id: string;
  name: string;
  type: ReportEntryType;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

export interface ReportComparison {
  label: string;
  incomeChangePercentage: number | null;
  expenseChangePercentage: number | null;
  netResultChangePercentage: number | null;
}

export interface ReportOverview {
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  savingsRate: number | null;
  transactionCount: number;
  averageExpense: number | null;
  largestExpense: number | null;
  largestIncome: number | null;
  comparison: ReportComparison | null;
}

export interface CashFlowPoint {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface ReportCategoryBreakdown {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface ReportAccountBreakdown {
  accountId: string | null;
  name: string;
  type: string | null;
  totalIncome: number;
  totalExpense: number;
  netMovement: number;
  transactionCount: number;
}

export interface ReportBudgetItem {
  id: string;
  month: number;
  year: number;
  amount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  exceeded: boolean;
  nearLimit: boolean;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

export interface ReportBudgetOverview {
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number | null;
  exceededBudgets: number;
  budgetsNearLimit: number;
  items: ReportBudgetItem[];
}

export interface ReportGoalsOverview {
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalContributed: number;
  overallProgressPercentage: number;
  overdueGoals: number;
}

export interface ReportsData {
  period: {
    dateFrom: string;
    dateTo: string;
    granularity: CashFlowGranularity;
    comparisonLabel: string;
  };
  appliedFilters: {
    accountId: string | null;
    categoryId: string | null;
    type: ReportEntryType | null;
  };
  filterOptions: {
    accounts: ReportFilterAccount[];
    categories: ReportFilterCategory[];
  };
  overview: ReportOverview;
  cashFlow: {
    granularity: CashFlowGranularity;
    series: CashFlowPoint[];
  };
  categories: ReportCategoryBreakdown[];
  accounts: ReportAccountBreakdown[];
  budgets: ReportBudgetOverview;
  goals: ReportGoalsOverview;
}

interface ReportsResponse {
  report: ReportsData;
}

export async function getReportsOverview(
  filters: ReportFilters = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(
    filters,
  )) {
    if (
      value !== undefined &&
      value !== ""
    ) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  const response = await api<ReportsResponse>(
    `/reports/overview${
      query ? `?${query}` : ""
    }`,
  );

  return response.report;
}

export function formatReportPeriod(
  dateFrom: string,
  dateTo: string,
) {
  const formatter = new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  );

  return `${formatter.format(
    new Date(`${dateFrom}T00:00:00.000Z`),
  )} a ${formatter.format(
    new Date(`${dateTo}T00:00:00.000Z`),
  )}`;
}

export function formatCashFlowPeriod(
  period: string,
  granularity: CashFlowGranularity,
) {
  const date = new Date(
    `${period}${
      granularity === "MONTH"
        ? "-01"
        : ""
    }T00:00:00.000Z`,
  );

  return new Intl.DateTimeFormat("pt-BR", {
    day:
      granularity === "DAY"
        ? "2-digit"
        : undefined,
    month: "short",
    year:
      granularity === "MONTH"
        ? "2-digit"
        : undefined,
    timeZone: "UTC",
  }).format(date);
}

export function formatReportPercentage(
  value: number,
) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatSignedPercentage(
  value: number,
) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatReportPercentage(value)}`;
}
