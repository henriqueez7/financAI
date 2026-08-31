import type { PeriodHint } from "../intents/intent.types.js";
import { WHATSAPP_RESPONSE_LIMITS } from "./response.constants.js";

interface AccountSummary {
  name: string;
  currentBalance: number;
}

interface ExpenseSummary {
  overview: {
    totalExpense: number;
    transactionCount: number;
  };
  categories: Array<{
    name: string;
    amount: number;
  }>;
}

interface BudgetSummary {
  category: {
    name: string;
  };
  percentageUsed: number;
  exceeded: boolean;
}

interface GoalSummary {
  name: string;
  percentageCompleted: number;
}

interface InsightSummary {
  severity: "CRITICAL" | "WARNING" | "POSITIVE" | "INFO";
  message: string;
}

interface AiAnalysisSummary {
  status: "GENERATED" | "INSUFFICIENT_DATA";
  analysis: {
    headline: string;
    summary: string;
    answer: string | null;
    priorities: Array<{
      title: string;
      rationale: string;
    }>;
    recommendations: Array<{
      title: string;
      suggestion: string;
    }>;
  } | null;
}

export function formatBalanceResponse(
  accounts: AccountSummary[],
) {
  if (accounts.length === 0) {
    return "Você ainda não possui contas cadastradas.";
  }

  const total = accounts.reduce(
    (sum, account) => sum + account.currentBalance,
    0,
  );
  const primaryAccounts = [...accounts]
    .sort(
      (first, second) =>
        Math.abs(second.currentBalance) -
        Math.abs(first.currentBalance),
    )
    .slice(0, WHATSAPP_RESPONSE_LIMITS.accounts);
  const lines = primaryAccounts.map(
    (account) =>
      `• ${account.name}: ${formatCurrency(account.currentBalance)}`,
  );

  return limitWhatsAppResponse(
    [
      `Seu saldo total é ${formatCurrency(total)}.`,
      "",
      "Principais contas:",
      ...lines,
    ].join("\n"),
  );
}

export function formatExpensesResponse(
  report: ExpenseSummary,
  periodHint?: PeriodHint,
) {
  const period = describePeriod(periodHint);

  if (report.overview.transactionCount === 0) {
    return `Você ainda não possui despesas registradas ${period}.`;
  }

  const topCategory = report.categories[0];
  const lines = [
    `Você gastou ${formatCurrency(report.overview.totalExpense)} ${period}.`,
  ];

  if (topCategory) {
    lines.push(
      `Maior categoria: ${topCategory.name} — ${formatCurrency(topCategory.amount)}.`,
    );
  }

  return limitWhatsAppResponse(lines.join("\n"));
}

export function formatBudgetsResponse(
  budgets: BudgetSummary[],
) {
  if (budgets.length === 0) {
    return "Você ainda não possui orçamentos ativos neste mês.";
  }

  const prioritized = [...budgets]
    .sort(
      (first, second) =>
        Number(second.exceeded) - Number(first.exceeded) ||
        second.percentageUsed - first.percentageUsed,
    )
    .slice(0, WHATSAPP_RESPONSE_LIMITS.budgets);
  const lines = prioritized.map(
    (budget) =>
      `${budget.exceeded ? "⚠️ " : ""}${budget.category.name}: ${formatPercentage(budget.percentageUsed)} utilizado`,
  );

  return limitWhatsAppResponse(
    [
      `Você possui ${budgets.length} ${pluralize(budgets.length, "orçamento ativo", "orçamentos ativos")}.`,
      "",
      ...lines,
    ].join("\n"),
  );
}

export function formatGoalsResponse(goals: GoalSummary[]) {
  if (goals.length === 0) {
    return "Você ainda não possui metas ativas.";
  }

  const lines = goals
    .slice(0, WHATSAPP_RESPONSE_LIMITS.goals)
    .map(
      (goal) =>
        `• ${goal.name}: ${formatPercentage(goal.percentageCompleted)}`,
    );

  return limitWhatsAppResponse(
    [
      `Você possui ${goals.length} ${pluralize(goals.length, "meta ativa", "metas ativas")}.`,
      "",
      ...lines,
    ].join("\n"),
  );
}

export function formatInsightsResponse(
  insights: InsightSummary[],
) {
  if (insights.length === 0) {
    return "Não encontrei nenhum alerta ou insight relevante para este período.";
  }

  const lines = insights
    .slice(0, WHATSAPP_RESPONSE_LIMITS.insights)
    .map(
      (insight) =>
        `${severityIcon(insight.severity)} ${insight.message}`,
    );

  return limitWhatsAppResponse(
    ["Os principais pontos agora são:", "", ...lines].join(
      "\n",
    ),
  );
}

export function formatAiAnalysisResponse(
  result: AiAnalysisSummary,
) {
  if (result.status === "INSUFFICIENT_DATA" || !result.analysis) {
    return "Ainda não há dados financeiros suficientes para gerar uma análise.";
  }

  const analysis = result.analysis;
  const sections = [
    analysis.headline,
    "",
    analysis.answer ?? analysis.summary,
  ];
  const priorities = analysis.priorities.slice(
    0,
    WHATSAPP_RESPONSE_LIMITS.aiPriorities,
  );

  if (priorities.length > 0) {
    sections.push(
      "",
      "Prioridades:",
      ...priorities.map(
        (priority) =>
          `• ${priority.title}: ${priority.rationale}`,
      ),
    );
  }

  const recommendations = analysis.recommendations.slice(
    0,
    WHATSAPP_RESPONSE_LIMITS.aiRecommendations,
  );

  if (recommendations.length > 0) {
    sections.push(
      "",
      "Recomendação:",
      ...recommendations.map(
        (recommendation) =>
          `• ${recommendation.title}: ${recommendation.suggestion}`,
      ),
    );
  }

  return limitWhatsAppResponse(sections.join("\n"));
}

export function formatWriteNotEnabledResponse({
  intent,
  amount,
  description,
}: {
  intent: "CREATE_EXPENSE" | "CREATE_INCOME";
  amount?: number;
  description?: string;
}) {
  const operation =
    intent === "CREATE_EXPENSE" ? "uma despesa" : "uma receita";
  const details = [
    amount ? ` de ${formatCurrency(amount)}` : "",
    description ? ` em ${description}` : "",
  ].join("");

  return limitWhatsAppResponse(
    `Entendi ${operation}${details}, mas o registro pelo WhatsApp ainda não está habilitado.`,
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(value)
    .replace(/\u00a0/g, " ");
}

export function limitWhatsAppResponse(text: string) {
  const normalized = text.trim();

  if (
    normalized.length <=
    WHATSAPP_RESPONSE_LIMITS.characters
  ) {
    return normalized;
  }

  const available =
    WHATSAPP_RESPONSE_LIMITS.characters - 1;
  const candidate = normalized.slice(0, available);
  const lastBreak = Math.max(
    candidate.lastIndexOf("\n"),
    candidate.lastIndexOf(" "),
  );
  const safeCut = lastBreak >= available * 0.75
    ? lastBreak
    : available;

  return `${candidate.slice(0, safeCut).trimEnd()}…`;
}

function describePeriod(periodHint?: PeriodHint) {
  switch (periodHint) {
    case "TODAY":
      return "hoje";
    case "PREVIOUS_MONTH":
      return "no mês passado";
    case "CURRENT_YEAR":
      return "neste ano";
    case "CURRENT_MONTH":
    default:
      return "neste mês";
  }
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function severityIcon(severity: InsightSummary["severity"]) {
  switch (severity) {
    case "CRITICAL":
    case "WARNING":
      return "⚠️";
    case "POSITIVE":
      return "✅";
    case "INFO":
      return "ℹ️";
  }
}

function pluralize(
  count: number,
  singular: string,
  plural: string,
) {
  return count === 1 ? singular : plural;
}
