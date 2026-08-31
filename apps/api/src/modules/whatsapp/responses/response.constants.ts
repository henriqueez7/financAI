export const WHATSAPP_RESPONSE_LIMITS = {
  accounts: 5,
  budgets: 5,
  goals: 5,
  insights: 3,
  aiPriorities: 2,
  aiRecommendations: 1,
  characters: 1_500,
} as const;

export const WHATSAPP_QUERY_ERROR_MESSAGE =
  "Não consegui consultar seus dados agora. Tente novamente em instantes.";

export const WHATSAPP_AI_ERROR_MESSAGE =
  "Não consegui gerar a análise agora. Você ainda pode consultar saldo, gastos, orçamentos, metas e insights.";
