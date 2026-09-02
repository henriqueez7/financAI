export type WhatsAppCommandCode =
  | "PENDING_ACTION_CREATED"
  | "INCOMPLETE_ACTION"
  | "ENTRY_CREATED"
  | "ACTION_CANCELLED"
  | "ACTION_EXPIRED"
  | "ACTION_INVALID"
  | "NO_PENDING_ACTION"
  | "WRITE_ERROR"
  | "QUERY_RESULT"
  | "AI_ANALYSIS"
  | "QUERY_ERROR"
  | "AI_ERROR"
  | "HELP"
  | "UNKNOWN";

export interface WhatsAppCommandResult {
  code: WhatsAppCommandCode;
  message: string;
}
