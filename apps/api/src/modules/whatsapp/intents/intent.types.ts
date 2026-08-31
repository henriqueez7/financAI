export const whatsappIntents = [
  "CREATE_EXPENSE",
  "CREATE_INCOME",
  "GET_BALANCE",
  "GET_EXPENSES",
  "GET_BUDGETS",
  "GET_GOALS",
  "GET_INSIGHTS",
  "ASK_FINANCE_AI",
  "CONFIRM",
  "CANCEL",
  "HELP",
  "UNKNOWN",
] as const;

export type WhatsAppIntent =
  (typeof whatsappIntents)[number];

export type IntentConfidence =
  | "EXACT"
  | "PATTERN"
  | "NONE";

export interface FinancialEntities {
  amount?: number;
  description?: string;
  date?: string;
  categoryHint?: string;
  accountHint?: string;
}

export interface IntentResult {
  intent: WhatsAppIntent;
  confidence: IntentConfidence;
  rawText: string;
  entities: FinancialEntities;
}
