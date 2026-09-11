import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const SIGNATURE_PATTERN = /^sha256=([a-f\d]{64})$/i;

export function verifyWhatsAppWebhookSignature({
  appSecret,
  rawBody,
  signature,
}: {
  appSecret: string;
  rawBody: Buffer;
  signature: string | undefined;
}) {
  const match = signature
    ? SIGNATURE_PATTERN.exec(signature)
    : null;

  if (!match?.[1]) {
    return false;
  }

  const received = Buffer.from(match[1], "hex");
  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest();

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}
