import {
  DEFAULT_WHATSAPP_HTTP_TIMEOUT_MS,
  type MetaWhatsAppConfig,
} from "../../../config/whatsapp-meta.config.js";
import type { MessageProvider } from "./message.provider.js";
import type { TextMessageInput } from "./message.types.js";

export type MetaWhatsAppProviderErrorCode =
  | "CLIENT_ERROR"
  | "MALFORMED_RESPONSE"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "TRANSPORT_ERROR";

export class MetaWhatsAppProviderError extends Error {
  constructor(
    message: string,
    readonly code: MetaWhatsAppProviderErrorCode,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "MetaWhatsAppProviderError";
  }
}

interface MetaWhatsAppProviderDependencies {
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export class MetaWhatsAppProvider
  implements MessageProvider
{
  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: MetaWhatsAppConfig,
    dependencies: MetaWhatsAppProviderDependencies = {},
  ) {
    this.fetchImplementation =
      dependencies.fetchImplementation ?? fetch;
    this.timeoutMs =
      dependencies.timeoutMs ??
      DEFAULT_WHATSAPP_HTTP_TIMEOUT_MS;

    if (
      !Number.isInteger(this.timeoutMs) ||
      this.timeoutMs < 1
    ) {
      throw new Error(
        "O timeout do provider Meta deve ser positivo.",
      );
    }
  }

  async sendText(input: TextMessageInput) {
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      this.timeoutMs,
    );
    timeout.unref?.();

    let response: Response;

    try {
      response = await this.fetchImplementation(
        this.messagesEndpoint(),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: input.recipient,
            type: "text",
            text: {
              body: input.text,
            },
          }),
          signal: abortController.signal,
        },
      );
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new MetaWhatsAppProviderError(
          "A Meta excedeu o tempo limite de resposta.",
          "TIMEOUT",
        );
      }

      throw new MetaWhatsAppProviderError(
        "Não foi possível conectar à Meta.",
        "TRANSPORT_ERROR",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw providerHttpError(response.status);
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw malformedResponseError();
    }

    const messageId = extractMessageId(payload);

    if (!messageId) {
      throw malformedResponseError();
    }

    return { messageId };
  }

  private messagesEndpoint() {
    return `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.phoneNumberId}/messages`;
  }
}

function providerHttpError(statusCode: number) {
  if (statusCode === 429) {
    return new MetaWhatsAppProviderError(
      "A Meta limitou temporariamente os envios.",
      "RATE_LIMITED",
      statusCode,
    );
  }

  if (statusCode >= 500) {
    return new MetaWhatsAppProviderError(
      "A Meta não conseguiu processar o envio.",
      "SERVER_ERROR",
      statusCode,
    );
  }

  return new MetaWhatsAppProviderError(
    "A Meta rejeitou o envio.",
    "CLIENT_ERROR",
    statusCode,
  );
}

function malformedResponseError() {
  return new MetaWhatsAppProviderError(
    "A Meta retornou uma resposta inesperada.",
    "MALFORMED_RESPONSE",
  );
}

function extractMessageId(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("messages" in payload) ||
    !Array.isArray(payload.messages)
  ) {
    return null;
  }

  const firstMessage = payload.messages[0];

  if (
    typeof firstMessage !== "object" ||
    firstMessage === null ||
    !("id" in firstMessage) ||
    typeof firstMessage.id !== "string" ||
    firstMessage.id.length === 0
  ) {
    return null;
  }

  return firstMessage.id;
}
