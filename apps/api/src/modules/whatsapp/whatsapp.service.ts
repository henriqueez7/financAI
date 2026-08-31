import { executeWhatsAppCommand } from "./commands/command.service.js";
import { getVerifiedWhatsAppConnectionByWaId } from "./connections/connection.service.js";
import { interpretFoundationCommandIntent } from "./intents/intent.service.js";
import type { MessageProvider } from "./messaging/message.provider.js";
import {
  markWhatsAppMessageFailed,
  markWhatsAppMessageProcessed,
  registerInboundWhatsAppMessage,
} from "./messages/message.service.js";
import type {
  IncomingWhatsAppText,
  WhatsAppProcessingResult,
} from "./whatsapp.types.js";

export class WhatsAppService {
  constructor(
    private readonly messageProvider: MessageProvider,
  ) {}

  async processIncomingText(
    input: IncomingWhatsAppText,
  ): Promise<WhatsAppProcessingResult> {
    const connection =
      await getVerifiedWhatsAppConnectionByWaId(
        input.waId,
      );

    const registered =
      await registerInboundWhatsAppMessage({
        messageId: input.messageId,
        connectionId: connection.id,
        receivedAt: input.receivedAt,
      });

    if (registered.isDuplicate) {
      return {
        status: "DUPLICATE",
        messageId: registered.message.messageId,
      };
    }

    try {
      const interpretation = interpretFoundationCommandIntent(
        input.text,
      );
      const command = await executeWhatsAppCommand({
        userId: connection.userId,
        interpretation,
      });

      await this.messageProvider.sendText({
        recipient: connection.waId,
        text: command.message,
      });

      await markWhatsAppMessageProcessed({
        userId: connection.userId,
        messageId: registered.message.messageId,
      });

      return {
        status: "PROCESSED",
        messageId: registered.message.messageId,
        interpretation,
        command,
      };
    } catch (error) {
      await markWhatsAppMessageFailed({
        userId: connection.userId,
        messageId: registered.message.messageId,
      });

      throw error;
    }
  }
}
