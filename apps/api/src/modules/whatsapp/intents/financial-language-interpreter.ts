import {
  formatDateOnly,
  resolvePeriodHint,
  resolveRelativeDate,
} from "./date.parser.js";
import type { IntentAiProvider } from "./intent-ai.provider.js";
import {
  aiIntentOutputSchema,
  intentResultSchema,
  type AiIntentOutput,
} from "./intent.schema.js";
import { isLabelGrounded } from "./intent.normalization.js";
import { containsUnsafeInstruction } from "./intent.safety.js";
import {
  inferSafeAccountHint,
  inferSafeCategoryHint,
  interpretWhatsAppIntent,
} from "./intent.service.js";
import type {
  FinancialEntities,
  IntentResult,
  WhatsAppIntent,
} from "./intent.types.js";
import { MAX_FINANCIAL_MESSAGE_LENGTH } from "./intent.types.js";
import { extractBrazilianMoney } from "./money.parser.js";

export class FinancialLanguageInterpreter {
  constructor(
    private readonly aiProvider?: IntentAiProvider,
  ) {}

  async interpret(
    input: string,
    referenceDate: Date,
  ): Promise<IntentResult> {
    const deterministic = interpretWhatsAppIntent(
      input,
      referenceDate,
    );

    if (deterministic.intent !== "UNKNOWN") {
      return deterministic;
    }

    if (
      !this.aiProvider ||
      !deterministic.rawText ||
      input.replace(/\s+/g, " ").trim().length >
        MAX_FINANCIAL_MESSAGE_LENGTH ||
      containsUnsafeInstruction(deterministic.rawText)
    ) {
      return deterministic;
    }

    try {
      const candidate = await this.aiProvider.interpret({
        message: deterministic.rawText,
        referenceDate: formatDateOnly(referenceDate),
      });
      const parsed = aiIntentOutputSchema.safeParse(candidate);

      if (!parsed.success) {
        return createAiUnknown(deterministic.rawText);
      }

      if (parsed.data.intent === "UNKNOWN") {
        return createAiUnknown(deterministic.rawText);
      }

      return intentResultSchema.parse({
        intent: parsed.data.intent,
        source: "AI",
        confidence: "MODEL",
        rawText: deterministic.rawText,
        entities: groundEntities(
          deterministic.rawText,
          referenceDate,
          parsed.data.entities,
          parsed.data.intent,
        ),
      });
    } catch {
      return createAiUnknown(deterministic.rawText);
    }
  }
}

function groundEntities(
  rawText: string,
  referenceDate: Date,
  candidate: AiIntentOutput["entities"],
  intent: WhatsAppIntent,
): FinancialEntities {
  if (intent === "GET_EXPENSES") {
    const periodHint = resolvePeriodHint(rawText);

    return periodHint && candidate.periodHint !== null
      ? { periodHint }
      : {};
  }

  if (
    intent !== "CREATE_EXPENSE" &&
    intent !== "CREATE_INCOME"
  ) {
    return {};
  }

  const money = extractBrazilianMoney(rawText);
  const date = resolveRelativeDate(rawText, referenceDate);
  const inferredCategory = inferSafeCategoryHint(rawText);
  const inferredAccount = inferSafeAccountHint(rawText);
  const description =
    candidate.description &&
    isLabelGrounded(candidate.description, rawText)
      ? candidate.description
      : undefined;
  const categoryHint =
    inferredCategory ??
    (candidate.categoryHint &&
    isLabelGrounded(candidate.categoryHint, rawText)
      ? candidate.categoryHint
      : undefined);
  const accountHint =
    inferredAccount ??
    (candidate.accountHint &&
    isLabelGrounded(candidate.accountHint, rawText)
      ? candidate.accountHint
      : undefined);

  return {
    ...(money && candidate.amount !== null
      ? { amount: money.amount }
      : {}),
    ...(description ? { description } : {}),
    ...(date && candidate.date !== null ? { date } : {}),
    ...(categoryHint ? { categoryHint } : {}),
    ...(accountHint ? { accountHint } : {}),
  };
}

function createAiUnknown(rawText: string) {
  return intentResultSchema.parse({
    intent: "UNKNOWN",
    source: "AI",
    confidence: "NONE",
    rawText,
    entities: {},
  });
}
