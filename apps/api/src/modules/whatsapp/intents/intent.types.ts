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

export const intentSources = [
  "DETERMINISTIC",
  "AI",
] as const;

export const periodHints = [
  "TODAY",
  "CURRENT_MONTH",
  "PREVIOUS_MONTH",
  "CURRENT_YEAR",
] as const;

export const MAX_FINANCIAL_MESSAGE_LENGTH = 500;

export type IntentSource =
  (typeof intentSources)[number];

export type PeriodHint =
  (typeof periodHints)[number];

export type IntentConfidence =
  | "EXACT"
  | "PATTERN"
  | "MODEL"
  | "NONE";

export interface FinancialEntities {
  amount?: number;
  description?: string;
  date?: string;
  categoryHint?: string;
  accountHint?: string;
  periodHint?: PeriodHint;
}

export interface IntentResult {
  intent: WhatsAppIntent;
  source: IntentSource;
  confidence: IntentConfidence;
  rawText: string;
  entities: FinancialEntities;
}
