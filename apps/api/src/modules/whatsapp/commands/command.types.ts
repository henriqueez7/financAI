export type WhatsAppCommandCode =
  | "PENDING_ACTION_CREATED"
  | "ACTION_CONFIRMED"
  | "ACTION_CANCELLED"
  | "NO_PENDING_ACTION"
  | "NOT_IMPLEMENTED"
  | "HELP"
  | "UNKNOWN";

export interface WhatsAppCommandResult {
  code: WhatsAppCommandCode;
  message: string;
  pendingActionId?: string;
}
