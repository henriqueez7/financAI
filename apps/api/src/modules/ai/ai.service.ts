import {
  AiInvalidResponseError,
} from "../../lib/ai/ai.errors.js";
import { createAiProvider } from "../../lib/ai/openai.provider.js";
import type { AiProvider } from "../../lib/ai/ai.types.js";
import {
  createFinancialInsightsOverview,
} from "../insights/insight.service.js";
import type { FinancialInsight } from "../insights/insight.types.js";
import { getReportOverview } from "../reports/report.service.js";
import type { AiAnalyzeRequest } from "./ai.schema.js";
import {
  aiGeneratedAnalysisSchema,
} from "./ai.schema.js";
import {
  buildFinanceAnalysisInput,
  financeAnalysisSystemPrompt,
} from "./ai.prompt.js";

type ReportOverview = Awaited<
  ReturnType<typeof getReportOverview>
>;

type ReportLoader = typeof getReportOverview;

interface GenerateAiAnalysisParams {
  userId: string;
  input: AiAnalyzeRequest;
}

interface AiAnalysisDependencies {
  reportLoader?: ReportLoader;
  provider?: AiProvider;
  providerFactory?: () => AiProvider;
  now?: () => Date;
}

export class UnsafeAiQuestionError extends Error {
  constructor() {
    super(
      "Faça uma pergunta sobre seus dados financeiros, sem instruções para alterar o assistente.",
    );
    this.name = "UnsafeAiQuestionError";
  }
}

export async function generateAiAnalysis(
  { userId, input }: GenerateAiAnalysisParams,
  dependencies: AiAnalysisDependencies = {},
) {
  if (input.question && hasUnsafeInstructions(input.question)) {
    throw new UnsafeAiQuestionError();
  }

  const reportLoader =
    dependencies.reportLoader ?? getReportOverview;

  const report = await reportLoader({
    userId,
    query: input.filters,
  });

  const insightsOverview =
    createFinancialInsightsOverview(report);

  const generatedAt = (
    dependencies.now?.() ?? new Date()
  ).toISOString();

  if (!hasUsefulFinancialContext(report)) {
    return {
      status: "INSUFFICIENT_DATA" as const,
      analysis: null,
      sourceInsights: insightsOverview.insights,
      period: report.period,
      generatedAt,
    };
  }

  const provider =
    dependencies.provider ??
    dependencies.providerFactory?.() ??
    createAiProvider();

  const context = buildAiFinancialContext({
    report,
    insights: insightsOverview.insights,
  });

  const startedAt = Date.now();
  const generated = await provider.generateStructured({
    instructions: financeAnalysisSystemPrompt,
    input: buildFinanceAnalysisInput({
      context,
      question: input.question,
    }),
    schema: aiGeneratedAnalysisSchema,
    schemaName: "finance_ai_analysis",
    maxOutputTokens: 1_800,
  });

  const validation =
    aiGeneratedAnalysisSchema.safeParse(generated);

  if (!validation.success) {
    throw new AiInvalidResponseError();
  }

  const authoritativeInsightTypes = new Set(
    insightsOverview.insights.map((insight) => insight.type),
  );
  const analysis = {
    ...validation.data,
    priorities: validation.data.priorities.map(
      (priority) => ({
        ...priority,
        sourceInsightTypes:
          priority.sourceInsightTypes.filter((type) =>
            authoritativeInsightTypes.has(type),
          ),
      }),
    ),
  };

  console.info("[ai] analysis_completed", {
    provider: provider.metadata.provider,
    model: provider.metadata.model,
    durationMs: Date.now() - startedAt,
    sourceInsightCount:
      insightsOverview.insights.length,
  });

  return {
    status: "GENERATED" as const,
    analysis,
    sourceInsights: insightsOverview.insights,
    period: report.period,
    generatedAt,
  };
}

export function buildAiFinancialContext({
  report,
  insights,
}: {
  report: ReportOverview;
  insights: FinancialInsight[];
}) {
  const accountName = report.appliedFilters.accountId
    ? report.filterOptions.accounts.find(
        (account) =>
          account.id === report.appliedFilters.accountId,
      )?.name ?? null
    : null;

  const categoryName = report.appliedFilters.categoryId
    ? report.filterOptions.categories.find(
        (category) =>
          category.id === report.appliedFilters.categoryId,
      )?.name ?? null
    : null;

  return {
    period: report.period,
    filters: {
      accountName,
      categoryName,
      entryType: report.appliedFilters.type,
    },
    summary: {
      totalIncome: report.overview.totalIncome,
      totalExpense: report.overview.totalExpense,
      netResult: report.overview.netResult,
      savingsRate: report.overview.savingsRate,
      transactionCount:
        report.overview.transactionCount,
      averageExpense: report.overview.averageExpense,
      largestExpense: report.overview.largestExpense,
      comparison: report.overview.comparison,
    },
    topExpenseCategories: report.categories
      .slice(0, 5)
      .map((category) => ({
        name: category.name,
        amount: category.amount,
        percentage: category.percentage,
        transactionCount: category.transactionCount,
      })),
    deterministicInsights: insights
      .slice(0, 6)
      .map((insight) => ({
        type: insight.type,
        severity: insight.severity,
        title: insight.title,
        message: insight.message,
        metric: insight.metric ?? null,
        value: insight.value ?? null,
        comparisonValue:
          insight.comparisonValue ?? null,
        percentage: insight.percentage ?? null,
        entityType: insight.entityType ?? null,
      })),
    budgets: report.budgets.items
      .slice(0, 5)
      .map((budget) => ({
        categoryName: budget.category.name,
        amount: budget.amount,
        spentAmount: budget.spentAmount,
        remainingAmount: budget.remainingAmount,
        percentageUsed: budget.percentageUsed,
        exceeded: budget.exceeded,
        nearLimit: budget.nearLimit,
      })),
    goals: prioritizeGoals(report.goals.items)
      .slice(0, 5)
      .map((goal) => ({
        name: goal.name,
        status: goal.status,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        remainingAmount: goal.remainingAmount,
        percentageCompleted:
          goal.percentageCompleted,
        targetDate: goal.targetDate
          ? goal.targetDate.toISOString().slice(0, 10)
          : null,
        completed: goal.completed,
        overdue: goal.overdue,
      })),
  };
}

function hasUsefulFinancialContext(
  report: ReportOverview,
) {
  return (
    report.overview.transactionCount > 0 ||
    report.budgets.items.length > 0 ||
    report.goals.items.length > 0
  );
}

function prioritizeGoals(
  goals: ReportOverview["goals"]["items"],
) {
  return [...goals].sort((first, second) => {
    const score = (goal: (typeof goals)[number]) => {
      if (goal.overdue) return 4;
      if (goal.status === "ACTIVE") return 3;
      if (goal.completed) return 2;
      return 1;
    };

    return (
      score(second) - score(first) ||
      second.percentageCompleted -
        first.percentageCompleted
    );
  });
}

export function hasUnsafeInstructions(question: string) {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const triesToChangeRules =
    ["ignore", "desconsidere"].some((term) =>
      normalized.includes(term),
    ) &&
    ["instru", "regra", "prompt"].some((term) =>
      normalized.includes(term),
    );

  return triesToChangeRules || [
    /revele .{0,30}(prompt|segredo|token|chave)/,
    /system prompt/,
    /developer message/,
    /dados? de outr[oa]s? usuari[oa]s?/,
    /api[ -]?key/,
    /jwt/,
  ].some((pattern) => pattern.test(normalized));
}
