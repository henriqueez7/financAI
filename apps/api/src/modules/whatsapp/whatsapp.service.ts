import { getVerifiedWhatsAppConnectionByWaId } from "./connections/connection.service.js";
import { FinancialLanguageInterpreter } from "./intents/financial-language-interpreter.js";
import { LazyOpenAiIntentProvider } from "./intents/openai-intent.provider.js";
import type { MessageProvider } from "./messaging/message.provider.js";
import {
  markWhatsAppMessageFailed,
  markWhatsAppMessageProcessed,
  registerInboundWhatsAppMessage,
} from "./messages/message.service.js";
import { WhatsAppQueryService } from "./queries/query.service.js";
import type {
  IncomingWhatsAppText,
  WhatsAppProcessingResult,
} from "./whatsapp.types.js";

interface LanguageInterpreter {
  interpret(
    input: string,
    referenceDate: Date,
  ): ReturnType<FinancialLanguageInterpreter["interpret"]>;
}

interface QueryRouter {
  execute: WhatsAppQueryService["execute"];
}

interface WhatsAppServiceDependencies {
  languageInterpreter?: LanguageInterpreter;
  queryRouter?: QueryRouter;
  now?: () => Date;
}

export class WhatsAppService {
  private readonly languageInterpreter: LanguageInterpreter;
  private readonly queryRouter: QueryRouter;
  private readonly now: () => Date;

  constructor(
    private readonly messageProvider: MessageProvider,
    dependencies: WhatsAppServiceDependencies = {},
  ) {
    this.languageInterpreter =
      dependencies.languageInterpreter ??
      new FinancialLanguageInterpreter(
        new LazyOpenAiIntentProvider(),
      );
    this.queryRouter =
      dependencies.queryRouter ?? new WhatsAppQueryService();
    this.now = dependencies.now ?? (() => new Date());
  }

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
      const referenceDate = this.now();
      const interpretation = await this.languageInterpreter.interpret(
        input.text,
        referenceDate,
      );
      const command = await this.queryRouter.execute({
        userId: connection.userId,
        interpretation,
        referenceDate,
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
