export type PendingFinancialActionType =
  | "CREATE_EXPENSE"
  | "CREATE_INCOME";

export type PendingFinancialActionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export interface PendingFinancialActionPayload {
  amount: number;
  description?: string;
  date?: string;
  categoryHint?: string;
  accountHint?: string;
}
