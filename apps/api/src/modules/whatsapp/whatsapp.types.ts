import type { WhatsAppCommandResult } from "./commands/command.types.js";
import type { IntentResult } from "./intents/intent.types.js";

export interface IncomingWhatsAppText {
  messageId: string;
  waId: string;
  text: string;
  receivedAt?: Date;
}

export type WhatsAppProcessingResult =
  | {
      status: "DUPLICATE";
      messageId: string;
    }
  | {
      status: "PROCESSED";
      messageId: string;
      interpretation: IntentResult;
      command: WhatsAppCommandResult;
    };
