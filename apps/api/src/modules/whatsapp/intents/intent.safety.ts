import { normalizeForMatching } from "./intent.normalization.js";

const unsafePatterns = [
  /\b(?:ignore|desconsidere|esqueca) (?:as |todas as )?(?:instrucoes|regras|orientacoes)\b/,
  /\b(?:agora|finja que|aja como).{0,30}\b(?:admin|administrador|sistema|root)\b/,
  /\b(?:jwt|jwtsecret|jwt secret|userid|user id|accountid|account id|categoryid|category id|openaiapikey|openai api key|databaseurl|database url|apikey|api key|chave da api)\b/,
  /\b(?:system prompt|prompt do sistema|prisma|sql|banco de dados)\b/,
  /\b(?:delete|drop|truncate|apague|exclua).{0,30}\b(?:tabela|banco|dados|conta|usuario)\b/,
];

export function containsUnsafeInstruction(text: string) {
  const normalized = normalizeForMatching(text);

  return unsafePatterns.some((pattern) => pattern.test(normalized));
}
