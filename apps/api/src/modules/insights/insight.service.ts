import type { ReportQuery } from "../reports/report.schema.js";
import { getReportOverview } from "../reports/report.service.js";
import { buildFinancialInsights } from "./insight.engine.js";
import type {
  FinancialInsightsOverview,
  InsightEngineReport,
} from "./insight.types.js";

interface GetFinancialInsightsParams {
  userId: string;
  query: ReportQuery;
}

export async function getFinancialInsights({
  userId,
  query,
}: GetFinancialInsightsParams): Promise<FinancialInsightsOverview> {
  const report = await getReportOverview({
    userId,
    query,
  });

  return createFinancialInsightsOverview(report);
}

export function createFinancialInsightsOverview(
  report: InsightEngineReport,
): FinancialInsightsOverview {
  const insights = buildFinancialInsights(report);

  return {
    period: report.period,
    summary: {
      totalIncome: report.overview.totalIncome,
      totalExpense: report.overview.totalExpense,
      netResult: report.overview.netResult,
      savingsRate: report.overview.savingsRate,
      insightCount: insights.length,
    },
    insights,
  };
}
