import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  RateLimitError,
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

import {
  AiInvalidResponseError,
  AiNotConfiguredError,
  AiProviderRateLimitError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from "./ai.errors.js";
import type {
  AiProvider,
  AiStructuredRequest,
} from "./ai.types.js";

const defaultModel = "gpt-5.4-mini";
const defaultTimeoutMs = 20_000;

interface OpenAiProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export class OpenAiProvider implements AiProvider {
  readonly metadata;
  private readonly client: OpenAI;

  constructor(options: OpenAiProviderOptions = {}) {
    const apiKey = options.apiKey?.trim();

    if (!apiKey) {
      throw new AiNotConfiguredError();
    }

    const model = options.model?.trim() || defaultModel;

    this.metadata = {
      provider: "openai",
      model,
    };

    this.client = new OpenAI({
      apiKey,
      timeout: options.timeoutMs ?? defaultTimeoutMs,
      maxRetries: 1,
    });
  }

  async generateStructured<TSchema extends z.ZodType>(
    request: AiStructuredRequest<TSchema>,
  ): Promise<z.infer<TSchema>> {
    try {
      const response = await this.client.responses.parse({
        model: this.metadata.model,
        instructions: request.instructions,
        input: request.input,
        text: {
          format: zodTextFormat(
            request.schema,
            request.schemaName,
          ),
        },
        max_output_tokens:
          request.maxOutputTokens ?? 1_800,
        reasoning: {
          effort: "low",
        },
        store: false,
      });

      if (!response.output_parsed) {
        throw new AiInvalidResponseError();
      }

      const validation = request.schema.safeParse(
        response.output_parsed,
      );

      if (!validation.success) {
        throw new AiInvalidResponseError();
      }

      return validation.data as z.infer<TSchema>;
    } catch (error) {
      if (error instanceof AiInvalidResponseError) {
        throw error;
      }

      if (error instanceof APIConnectionTimeoutError) {
        throw new AiProviderTimeoutError();
      }

      if (error instanceof RateLimitError) {
        throw new AiProviderRateLimitError();
      }

      if (error instanceof APIError) {
        throw new AiProviderUnavailableError();
      }

      throw new AiProviderUnavailableError();
    }
  }
}

export function createAiProvider() {
  return new OpenAiProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
  });
}
