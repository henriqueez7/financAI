import assert from "node:assert/strict";
import test from "node:test";
import type { z } from "zod";

import type {
  AiProvider,
  AiStructuredRequest,
} from "../../../lib/ai/ai.types.js";
import { OpenAiIntentProvider } from "./openai-intent.provider.js";

class CapturingAiProvider implements AiProvider {
  readonly metadata = {
    provider: "fake",
    model: "fake-model",
  };

  request?: AiStructuredRequest<z.ZodType>;

  async generateStructured<TSchema extends z.ZodType>(
    request: AiStructuredRequest<TSchema>,
  ): Promise<z.infer<TSchema>> {
    this.request = request;

    return {
      intent: "UNKNOWN",
      entities: {
        amount: null,
        description: null,
        date: null,
        categoryHint: null,
        accountHint: null,
        periodHint: null,
      },
    } as z.infer<TSchema>;
  }
}

test("provider OpenAI envia somente mensagem e data em Structured Outputs", async () => {
  const aiProvider = new CapturingAiProvider();
  const provider = new OpenAiIntentProvider(aiProvider);

  const result = await provider.interpret({
    message: "Uma mensagem financeira",
    referenceDate: "2026-08-30",
  });

  assert.equal(
    aiProvider.request?.schemaName,
    "whatsapp_financial_intent",
  );
  assert.equal(aiProvider.request?.maxOutputTokens, 350);
  assert.deepEqual(JSON.parse(aiProvider.request?.input ?? "{}"), {
    message: "Uma mensagem financeira",
    referenceDate: "2026-08-30",
  });
  assert.match(
    aiProvider.request?.instructions ?? "",
    /nunca executa ações/,
  );
  assert.deepEqual(result, {
    intent: "UNKNOWN",
    entities: {
      amount: null,
      description: null,
      date: null,
      categoryHint: null,
      accountHint: null,
      periodHint: null,
    },
  });
});
