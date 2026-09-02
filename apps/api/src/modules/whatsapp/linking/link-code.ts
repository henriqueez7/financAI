import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

const LOOKUP_KEY_ALPHABET =
  "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LOOKUP_KEY_LENGTH = 8;
const PIN_MAX_EXCLUSIVE = 1_000_000;

export interface NormalizedWhatsAppLinkCode {
  canonical: string;
  selector: string;
}

export function generateWhatsAppLinkCode() {
  const lookupKey = Array.from(
    { length: LOOKUP_KEY_LENGTH },
    () =>
      LOOKUP_KEY_ALPHABET[
        randomInt(LOOKUP_KEY_ALPHABET.length)
      ],
  ).join("");
  const pin = String(
    randomInt(PIN_MAX_EXCLUSIVE),
  ).padStart(6, "0");

  return `FIN-${lookupKey}-${pin}`;
}

export function normalizeWhatsAppLinkCode(
  input: string,
): NormalizedWhatsAppLinkCode | null {
  const compact = input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
  const match = new RegExp(
    `^FIN([${LOOKUP_KEY_ALPHABET}]{${LOOKUP_KEY_LENGTH}})(\\d{6})$`,
  ).exec(compact);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    canonical: `FIN-${match[1]}-${match[2]}`,
    selector: match[1],
  };
}

export function hashWhatsAppLinkSelector(
  selector: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(`selector:${selector}`, "utf8")
    .digest("hex");
}

export function hashWhatsAppLinkCode(
  canonicalCode: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(canonicalCode, "utf8")
    .digest("hex");
}

export function safelyMatchesWhatsAppLinkCode(
  candidateHash: string,
  storedHash: string,
) {
  if (
    !/^[a-f\d]{64}$/i.test(candidateHash) ||
    !/^[a-f\d]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  const candidate = Buffer.from(candidateHash, "hex");
  const stored = Buffer.from(storedHash, "hex");

  return (
    candidate.length === stored.length &&
    timingSafeEqual(candidate, stored)
  );
}
