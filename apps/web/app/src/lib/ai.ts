import { api } from "./api";
import type {
  FinancialInsight,
  InsightFilters,
  InsightSeverity,
  InsightType,
} from "./insights";
import type { CashFlowGranularity } from "./reports";

export interface AiAnalysisFact {
  title: string;
  description: string;
  severity: InsightSeverity;
}

export interface AiAnalysisPriority {
  title: string;
  rationale: string;
  severity: InsightSeverity;
  sourceInsightTypes: InsightType[];
}

export interface AiRecommendation {
  title: string;
  suggestion: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface AiGeneratedAnalysis {
  headline: string;
  summary: string;
  facts: AiAnalysisFact[];
  priorities: AiAnalysisPriority[];
  recommendations: AiRecommendation[];
  warnings: string[];
  answer: string | null;
}

export interface AiAnalysisResponse {
  status: "GENERATED" | "INSUFFICIENT_DATA";
  analysis: AiGeneratedAnalysis | null;
  sourceInsights: FinancialInsight[];
  period: {
    dateFrom: string;
    dateTo: string;
    granularity: CashFlowGranularity;
    comparisonLabel: string;
  };
  generatedAt: string;
}

export const suggestedAiQuestions = [
  "Onde posso reduzir gastos neste período?",
  "Qual deve ser minha prioridade agora?",
  "Como estou em relação aos meus orçamentos?",
] as const;

export async function requestAiAnalysis({
  filters,
  question,
  signal,
}: {
  filters: InsightFilters;
  question?: string;
  signal?: AbortSignal;
}) {
  return api<AiAnalysisResponse>("/ai/analyze", {
    method: "POST",
    body: JSON.stringify({
      filters,
      question: question?.trim() || undefined,
    }),
    signal,
  });
}
