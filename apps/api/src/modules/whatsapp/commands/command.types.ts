export type WhatsAppCommandCode =
  | "ACTION_CONFIRMED"
  | "ACTION_CANCELLED"
  | "NO_PENDING_ACTION"
  | "WRITE_NOT_ENABLED"
  | "QUERY_RESULT"
  | "AI_ANALYSIS"
  | "QUERY_ERROR"
  | "AI_ERROR"
  | "HELP"
  | "UNKNOWN";

export interface WhatsAppCommandResult {
  code: WhatsAppCommandCode;
  message: string;
  pendingActionId?: string;
}
