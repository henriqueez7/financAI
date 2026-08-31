import { intentResultSchema } from "./intent.schema.js";
import type {
  FinancialEntities,
  IntentConfidence,
  IntentResult,
  WhatsAppIntent,
} from "./intent.types.js";

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

export function interpretWhatsAppIntent(
  input: string,
): IntentResult {
  const rawText = input.trim().slice(0, 1_000);
  const normalizedText = normalizeForMatching(rawText);
  const exactIntent = exactIntents.get(normalizedText);

  if (exactIntent) {
    return createResult(
      exactIntent,
      "EXACT",
      rawText,
    );
  }

  const creationIntent = parseCreationIntent(rawText);

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

function parseCreationIntent(text: string) {
  const comparableText = text
    .replace(/[!?]+$/g, "")
    .trim();

  const expenseMatch = comparableText.match(
    /^(?:gastei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)(.*)$/i,
  );

  if (expenseMatch) {
    return buildCreationIntent(
      "CREATE_EXPENSE",
      expenseMatch[1],
      expenseMatch[2],
      /^(?:reais?)?\s*(?:(?:com|em|no|na)\s+)?/i,
    );
  }

  const incomeMatch = comparableText.match(
    /^(?:recebi|ganhei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)(.*)$/i,
  );

  if (incomeMatch) {
    return buildCreationIntent(
      "CREATE_INCOME",
      incomeMatch[1],
      incomeMatch[2],
      /^(?:reais?)?\s*(?:(?:de|do|da|por|com)\s+)?/i,
    );
  }

  return null;
}

function buildCreationIntent(
  intent: "CREATE_EXPENSE" | "CREATE_INCOME",
  amountText: string | undefined,
  descriptionText: string | undefined,
  descriptionPrefix: RegExp,
) {
  if (!amountText) {
    return null;
  }

  const amount = Number(amountText.replace(",", "."));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const description = descriptionText
    ?.trim()
    .replace(descriptionPrefix, "")
    .trim()
    .slice(0, 100);

  return {
    intent,
    entities: {
      amount,
      ...(description ? { description } : {}),
    },
  };
}

function createResult(
  intent: WhatsAppIntent,
  confidence: IntentConfidence,
  rawText: string,
  entities: FinancialEntities = {},
) {
  return intentResultSchema.parse({
    intent,
    confidence,
    rawText,
    entities,
  });
}

function normalizeForMatching(text: string) {
  return removeDiacritics(text)
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeDiacritics(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
