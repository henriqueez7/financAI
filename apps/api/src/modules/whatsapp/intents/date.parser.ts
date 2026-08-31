import type { PeriodHint } from "./intent.types.js";
import { normalizeForMatching } from "./intent.normalization.js";

export function formatDateOnly(date: Date) {
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("A data de referência é inválida.");
  }

  return date.toISOString().slice(0, 10);
}

export function resolveRelativeDate(
  text: string,
  referenceDate: Date,
) {
  const normalized = normalizeForMatching(text);

  if (/\banteontem\b/.test(normalized)) {
    return shiftUtcDate(referenceDate, -2);
  }

  if (/\bontem\b/.test(normalized)) {
    return shiftUtcDate(referenceDate, -1);
  }

  if (/\bhoje\b/.test(normalized)) {
    return formatDateOnly(referenceDate);
  }

  return undefined;
}

export function resolvePeriodHint(
  text: string,
): PeriodHint | undefined {
  const normalized = normalizeForMatching(text);

  if (/\bhoje\b/.test(normalized)) {
    return "TODAY";
  }

  if (/\b(?:mes passado|ultimo mes)\b/.test(normalized)) {
    return "PREVIOUS_MONTH";
  }

  if (
    /\b(?:este mes|esse mes|deste mes|desse mes|nesse mes|neste mes|mes atual)\b/.test(
      normalized,
    )
  ) {
    return "CURRENT_MONTH";
  }

  if (
    /\b(?:este ano|esse ano|deste ano|desse ano|nesse ano|neste ano|ano atual)\b/.test(
      normalized,
    )
  ) {
    return "CURRENT_YEAR";
  }

  return undefined;
}

export function removeRelativeDateWords(text: string) {
  return text
    .replace(/\b(?:anteontem|ontem|hoje)\b/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shiftUtcDate(referenceDate: Date, days: number) {
  const shifted = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate() + days,
    ),
  );

  return formatDateOnly(shifted);
}
