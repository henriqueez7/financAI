import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyWhatsAppWebhookSignature } from "./whatsapp-webhook.signature.js";

const appSecret = "test-app-secret-with-sufficient-length";
const rawBody = Buffer.from('{"test":"á"}', "utf8");

test("valida HMAC-SHA256 calculado sobre bytes brutos", () => {
  assert.equal(
    verifyWhatsAppWebhookSignature({
      appSecret,
      rawBody,
      signature: sign(rawBody),
    }),
    true,
  );
});

test("rejeita assinatura ausente, malformada, errada ou de bytes distintos", () => {
  for (const signature of [
    undefined,
    "sha1=abc",
    "sha256=abc",
    `sha256=${"0".repeat(64)}`,
    sign(Buffer.from('{"test":"a"}', "utf8")),
  ]) {
    assert.equal(
      verifyWhatsAppWebhookSignature({
        appSecret,
        rawBody,
        signature,
      }),
      false,
    );
  }
});

function sign(body: Buffer) {
  return `sha256=${createHmac("sha256", appSecret)
    .update(body)
    .digest("hex")}`;
}
