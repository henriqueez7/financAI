import {
  findVerifiedWhatsAppConnectionByWaId,
} from "../connections/connection.service.js";
import {
  consumeWhatsAppLinkCode,
  WhatsAppLinkCodeInvalidError,
} from "../linking/link.service.js";
import { normalizeWhatsAppLinkCode } from "../linking/link-code.js";
import type { MessageProvider } from "../messaging/message.provider.js";
import {
  markClaimedWhatsAppMessageFailed,
  markClaimedWhatsAppMessageProcessed,
  registerInboundWhatsAppMessage,
} from "../messages/message.service.js";
import { WhatsAppService } from "../whatsapp.service.js";
import {
  extractWhatsAppWebhookMessages,
  type WhatsAppWebhookPayload,
  type WhatsAppWebhookTextMessage,
} from "./whatsapp-webhook.schema.js";

export const WHATSAPP_LINK_SUCCESS_MESSAGE =
  "WhatsApp conectado com sucesso ao Finance AI.";
export const WHATSAPP_NOT_LINKED_MESSAGE =
  "Este WhatsApp ainda não está conectado ao Finance AI. Gere um código de vinculação na sua conta e envie por aqui.";
export const WHATSAPP_INVALID_LINK_CODE_MESSAGE =
  "Não foi possível validar esse código. Gere um novo código de vinculação na sua conta e tente novamente.";

type ConnectionFinder =
  typeof findVerifiedWhatsAppConnectionByWaId;
type LinkCodeConsumer = typeof consumeWhatsAppLinkCode;
type InboundRegistrar =
  typeof registerInboundWhatsAppMessage;
type StatusMarker =
  typeof markClaimedWhatsAppMessageProcessed;

interface WhatsAppWebhookServiceDependencies {
  connectionFinder?: ConnectionFinder;
  inboundRegistrar?: InboundRegistrar;
  linkCodeConsumer?: LinkCodeConsumer;
  markFailed?: StatusMarker;
  markProcessed?: StatusMarker;
  now?: () => Date;
  whatsAppService?: WhatsAppService;
}

export interface WhatsAppWebhookProcessor {
  process(payload: WhatsAppWebhookPayload): Promise<{
    duplicateCount: number;
    processedCount: number;
    statusCount: number;
    unsupportedMessageCount: number;
  }>;
}

export class WhatsAppWebhookService
  implements WhatsAppWebhookProcessor
{
  private readonly connectionFinder: ConnectionFinder;
  private readonly inboundRegistrar: InboundRegistrar;
  private readonly linkCodeConsumer: LinkCodeConsumer;
  private readonly markFailed: StatusMarker;
  private readonly markProcessed: StatusMarker;
  private readonly now: () => Date;
  private readonly whatsAppService: WhatsAppService;

  constructor(
    private readonly messageProvider: MessageProvider,
    dependencies: WhatsAppWebhookServiceDependencies = {},
  ) {
    this.connectionFinder =
      dependencies.connectionFinder ??
      findVerifiedWhatsAppConnectionByWaId;
    this.inboundRegistrar =
      dependencies.inboundRegistrar ??
      registerInboundWhatsAppMessage;
    this.linkCodeConsumer =
      dependencies.linkCodeConsumer ?? consumeWhatsAppLinkCode;
    this.markFailed =
      dependencies.markFailed ??
      markClaimedWhatsAppMessageFailed;
    this.markProcessed =
      dependencies.markProcessed ??
      markClaimedWhatsAppMessageProcessed;
    this.now = dependencies.now ?? (() => new Date());
    this.whatsAppService =
      dependencies.whatsAppService ??
      new WhatsAppService(messageProvider, {
        now: this.now,
      });
  }

  async process(payload: WhatsAppWebhookPayload) {
    const extracted = extractWhatsAppWebhookMessages(payload);
    let duplicateCount = 0;
    let processedCount = 0;

    for (const message of extracted.textMessages) {
      const result = await this.processTextMessage(message);

      if (result === "DUPLICATE") {
        duplicateCount += 1;
      } else {
        processedCount += 1;
      }
    }

    return {
      duplicateCount,
      processedCount,
      statusCount: extracted.statusCount,
      unsupportedMessageCount:
        extracted.unsupportedMessageCount,
    };
  }

  private async processTextMessage(
    message: WhatsAppWebhookTextMessage,
  ) {
    const connection = await this.connectionFinder(
      message.waId,
    );
    const registered = await this.inboundRegistrar({
      messageId: message.messageId,
      connectionId: connection?.id ?? null,
      receivedAt: message.receivedAt,
    });

    if (registered.isDuplicate) {
      return "DUPLICATE" as const;
    }

    if (connection) {
      await this.whatsAppService.processClaimedIncomingText(
        message,
        {
          connection,
          recordId: registered.message.id,
        },
      );

      return "PROCESSED" as const;
    }

    try {
      const reply = await this.replyForUnlinkedMessage(message);

      await this.messageProvider.sendText({
        recipient: message.waId,
        text: reply,
      });
      await this.markProcessed({
        recordId: registered.message.id,
      });

      return "PROCESSED" as const;
    } catch (error) {
      await this.markFailed({
        recordId: registered.message.id,
      });
      throw error;
    }
  }

  private async replyForUnlinkedMessage(
    message: WhatsAppWebhookTextMessage,
  ) {
    if (!normalizeWhatsAppLinkCode(message.text)) {
      return WHATSAPP_NOT_LINKED_MESSAGE;
    }

    try {
      await this.linkCodeConsumer({
        waId: message.waId,
        code: message.text,
        now: this.now(),
      });

      return WHATSAPP_LINK_SUCCESS_MESSAGE;
    } catch (error) {
      if (error instanceof WhatsAppLinkCodeInvalidError) {
        return WHATSAPP_INVALID_LINK_CODE_MESSAGE;
      }

      throw error;
    }
  }
}
