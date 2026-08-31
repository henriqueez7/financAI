import {
  removeRelativeDateWords,
  resolvePeriodHint,
  resolveRelativeDate,
} from "./date.parser.js";
import { intentResultSchema } from "./intent.schema.js";
import {
  normalizeForMatching,
  normalizeRawText,
} from "./intent.normalization.js";
import { containsUnsafeInstruction } from "./intent.safety.js";
import type {
  FinancialEntities,
  IntentConfidence,
  IntentResult,
  WhatsAppIntent,
} from "./intent.types.js";
import { MAX_FINANCIAL_MESSAGE_LENGTH } from "./intent.types.js";
import { extractBrazilianMoney } from "./money.parser.js";

const exactIntents = new Map<string, WhatsAppIntent>([
  ["saldo", "GET_BALANCE"],
  ["qual meu saldo", "GET_BALANCE"],
  ["qual e meu saldo", "GET_BALANCE"],
  ["meu saldo", "GET_BALANCE"],
  ["gastos", "GET_EXPENSES"],
  ["quanto gastei", "GET_EXPENSES"],
  ["meus gastos", "GET_EXPENSES"],
  ["orcamento", "GET_BUDGETS"],
  ["orcamentos", "GET_BUDGETS"],
  ["como estao meus orcamentos", "GET_BUDGETS"],
  ["metas", "GET_GOALS"],
  ["minhas metas", "GET_GOALS"],
  ["insights", "GET_INSIGHTS"],
  ["meus insights", "GET_INSIGHTS"],
  ["confirmar", "CONFIRM"],
  ["sim", "CONFIRM"],
  ["confirmo", "CONFIRM"],
  ["cancelar", "CANCEL"],
  ["nao", "CANCEL"],
  ["cancela", "CANCEL"],
  ["ajuda", "HELP"],
  ["help", "HELP"],
  ["o que voce faz", "HELP"],
]);

const financeQuestionPatterns = [
  /\bcomo (?:estao|andam) minhas financas\b/,
  /\bonde (?:eu )?posso economizar\b/,
  /\bcomo posso economizar\b/,
  /\b(?:analise|avalie) minhas financas\b/,
  /\b(?:tenho|estou com) algum risco financeiro\b/,
  /\bestou gastando demais\b/,
  /\bo que merece minha atencao\b/,
  /\bminha situacao melhorou\b/,
];

const categoryRules: ReadonlyArray<{
  pattern: RegExp;
  label: string;
}> = [
  {
    pattern: /\b(?:mercado|supermercado|alimentacao|restaurante|lanche)\b/,
    label: "Alimentação",
  },
  {
    pattern: /\b(?:uber|taxi|99|transporte|onibus|metro)\b/,
    label: "Transporte",
  },
  {
    pattern: /\b(?:aluguel|moradia|condominio)\b/,
    label: "Moradia",
  },
  {
    pattern: /\b(?:salario|ordenado)\b/,
    label: "Salário",
  },
];

const accountRules: ReadonlyArray<{
  pattern: RegExp;
  label: string;
}> = [
  { pattern: /\bnubank\b/, label: "Nubank" },
  { pattern: /\binter\b/, label: "Inter" },
  { pattern: /\bitau\b/, label: "Itaú" },
  { pattern: /\bbradesco\b/, label: "Bradesco" },
  { pattern: /\bsantander\b/, label: "Santander" },
];

export function interpretWhatsAppIntent(
  input: string,
  referenceDate: Date,
): IntentResult {
  const normalizedRawText = normalizeRawText(input);
  const rawText = normalizedRawText.slice(
    0,
    MAX_FINANCIAL_MESSAGE_LENGTH,
  );

  if (
    !normalizedRawText ||
    normalizedRawText.length > MAX_FINANCIAL_MESSAGE_LENGTH ||
    containsUnsafeInstruction(rawText)
  ) {
    return createResult("UNKNOWN", "NONE", rawText);
  }

  const normalizedText = normalizeForMatching(rawText);
  const exactIntent = exactIntents.get(normalizedText);

  if (exactIntent) {
    return createResult(exactIntent, "EXACT", rawText);
  }

  const queryIntent = parseQueryIntent(rawText);

  if (queryIntent) {
    return createResult(
      queryIntent.intent,
      "PATTERN",
      rawText,
      queryIntent.entities,
    );
  }

  if (
    financeQuestionPatterns.some((pattern) =>
      pattern.test(normalizedText),
    )
  ) {
    return createResult("ASK_FINANCE_AI", "PATTERN", rawText);
  }

  const creationIntent = parseCreationIntent(
    rawText,
    referenceDate,
  );

  if (creationIntent) {
    return createResult(
      creationIntent.intent,
      "PATTERN",
      rawText,
      creationIntent.entities,
    );
  }

  return createResult("UNKNOWN", "NONE", rawText);
}

export function inferSafeCategoryHint(text: string) {
  const normalized = normalizeForMatching(text);

  return categoryRules.find(({ pattern }) =>
    pattern.test(normalized),
  )?.label;
}

export function inferSafeAccountHint(text: string) {
  const normalized = normalizeForMatching(text);

  return accountRules.find(({ pattern }) =>
    pattern.test(normalized),
  )?.label;
}

function parseQueryIntent(text: string) {
  const normalized = normalizeForMatching(text);
  const periodHint = resolvePeriodHint(text);

  if (
    /\b(?:quanto (?:eu )?gastei|gastei quanto|meus gastos|gastos|despesas)\b/.test(
      normalized,
    )
  ) {
    return {
      intent: "GET_EXPENSES" as const,
      entities: periodHint ? { periodHint } : {},
    };
  }

  if (
    /\b(?:qual|quanto|como esta).{0,20}\bsaldo\b/.test(normalized) ||
    /\bquanto (?:eu )?tenho\b/.test(normalized)
  ) {
    return {
      intent: "GET_BALANCE" as const,
      entities: {},
    };
  }

  if (/\borcamentos?\b/.test(normalized)) {
    return {
      intent: "GET_BUDGETS" as const,
      entities: {},
    };
  }

  if (/\bmetas?\b/.test(normalized)) {
    return {
      intent: "GET_GOALS" as const,
      entities: {},
    };
  }

  if (/\binsights?\b/.test(normalized)) {
    return {
      intent: "GET_INSIGHTS" as const,
      entities: {},
    };
  }

  return null;
}

function parseCreationIntent(
  text: string,
  referenceDate: Date,
) {
  const comparableText = text.replace(/[!?]+$/g, "").trim();
  const verbMatch = comparableText.match(
    /^(gastei|paguei|comprei|recebi|ganhei|entrou)\b/i,
  );

  if (!verbMatch?.[1]) {
    return null;
  }

  const normalizedVerb = normalizeForMatching(verbMatch[1]);
  const intent = ["recebi", "ganhei", "entrou"].includes(
    normalizedVerb,
  )
    ? ("CREATE_INCOME" as const)
    : ("CREATE_EXPENSE" as const);
  const money = extractBrazilianMoney(comparableText);
  const date = resolveRelativeDate(comparableText, referenceDate);
  const description = extractDescription(
    comparableText,
    verbMatch[0].length,
    money,
  );
  const categoryHint = inferSafeCategoryHint(
    description ?? comparableText,
  );
  const accountHint = inferSafeAccountHint(comparableText);

  return {
    intent,
    entities: {
      ...(money ? { amount: money.amount } : {}),
      ...(description ? { description } : {}),
      ...(date ? { date } : {}),
      ...(categoryHint ? { categoryHint } : {}),
      ...(accountHint ? { accountHint } : {}),
    },
  };
}

function extractDescription(
  text: string,
  verbEndIndex: number,
  money: ReturnType<typeof extractBrazilianMoney>,
) {
  const withoutVerb = text.slice(verbEndIndex);
  let candidate = withoutVerb;

  if (money) {
    const relativeStart = Math.max(0, money.index - verbEndIndex);
    const relativeEnd = Math.max(0, money.endIndex - verbEndIndex);
    candidate = `${withoutVerb.slice(0, relativeStart)} ${withoutVerb.slice(relativeEnd)}`;
  }

  candidate = removeRelativeDateWords(candidate)
    .replace(/\b(?:reais?|contos?)\b/giu, " ")
    .replace(/^(?:de|do|da|dos|das|com|em|no|na|nos|nas|por)\s+/iu, "")
    .replace(/\s+(?:de|do|da|dos|das|com|em|no|na|nos|nas|por)$/iu, "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-]+|[,;:\-]+$/g, "")
    .trim()
    .slice(0, 100);

  return candidate || undefined;
}

function createResult(
  intent: WhatsAppIntent,
  confidence: IntentConfidence,
  rawText: string,
  entities: FinancialEntities = {},
) {
  return intentResultSchema.parse({
    intent,
    source: "DETERMINISTIC",
    confidence,
    rawText,
    entities,
  });
}
