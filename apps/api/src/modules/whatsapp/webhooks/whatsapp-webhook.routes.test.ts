import "dotenv/config";

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import express from "express";

import type { WhatsAppWebhookPayload } from "./whatsapp-webhook.schema.js";
import { createWhatsAppWebhookRoutes } from "./whatsapp-webhook.routes.js";
import type { WhatsAppWebhookProcessor } from "./whatsapp-webhook.service.js";

const verifyToken = "test-verify-token-with-sufficient-length";
const appSecret = "test-app-secret-with-sufficient-length";
const processedPayloads: WhatsAppWebhookPayload[] = [];
const processor: WhatsAppWebhookProcessor = {
  async process(payload) {
    processedPayloads.push(payload);
    return {
      duplicateCount: 0,
      processedCount: 1,
      statusCount: 0,
      unsupportedMessageCount: 0,
    };
  },
};

let server: Server;
let baseUrl = "";

before(async () => {
  const testApp = express();
  testApp.use(
    "/webhooks/whatsapp",
    createWhatsAppWebhookRoutes({
      appSecret,
      processor,
      verifyToken,
    }),
  );
  testApp.use(express.json());

  server = await new Promise<Server>((resolve) => {
    const listener = testApp.listen(0, "127.0.0.1", () =>
      resolve(listener),
    );
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  processedPayloads.length = 0;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) =>
      error ? reject(error) : resolve(),
    );
  });
});

test("GET confirma challenge apenas com mode e token corretos", async () => {
  const valid = await fetch(
    `${baseUrl}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=123456`,
  );

  assert.equal(valid.status, 200);
  assert.equal(await valid.text(), "123456");

  for (const query of [
    `hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`,
    `hub.mode=invalid&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=123`,
    "",
  ]) {
    const response = await fetch(
      `${baseUrl}/webhooks/whatsapp?${query}`,
    );
    assert.equal(response.status, 403);
  }
});

test("POST aceita assinatura correta e encaminha payload validado", async () => {
  const rawBody = Buffer.from(
    JSON.stringify(textPayload("wamid.valid")),
    "utf8",
  );
  const response = await postRaw(rawBody, sign(rawBody));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(processedPayloads.length, 1);
});

test("POST rejeita assinatura ausente, incorreta e payload alterado", async () => {
  const original = Buffer.from(
    JSON.stringify(textPayload("wamid.original")),
    "utf8",
  );
  const altered = Buffer.from(
    JSON.stringify(textPayload("wamid.altered")),
    "utf8",
  );

  for (const [body, signature] of [
    [original, undefined],
    [original, `sha256=${"0".repeat(64)}`],
    [altered, sign(original)],
  ] as const) {
    const response = await postRaw(body, signature);
    assert.equal(response.status, 401);
  }

  assert.equal(processedPayloads.length, 0);
});

test("assinatura depende dos bytes, não do JSON reserializado", async () => {
  const compact = Buffer.from(
    JSON.stringify(textPayload("wamid.raw")),
    "utf8",
  );
  const semanticallyEqual = Buffer.from(
    JSON.stringify(textPayload("wamid.raw"), null, 2),
    "utf8",
  );

  const response = await postRaw(
    semanticallyEqual,
    sign(compact),
  );

  assert.equal(response.status, 401);
  assert.equal(processedPayloads.length, 0);
});

test("aceita status, ausência de messages, mídia e múltiplas entries", async () => {
  const fixtures = [
    statusPayload(),
    payloadWithValue({}),
    payloadWithValue({
      messages: [baseMessage("image", "wamid.image")],
    }),
    payloadWithValue({
      messages: [baseMessage("audio", "wamid.audio")],
    }),
    {
      ...textPayload("wamid.multi-a"),
      entry: [
        ...textPayload("wamid.multi-a").entry,
        ...textPayload("wamid.multi-b").entry,
      ],
    },
  ];

  for (const fixture of fixtures) {
    const rawBody = Buffer.from(JSON.stringify(fixture), "utf8");
    const response = await postRaw(rawBody, sign(rawBody));
    assert.equal(response.status, 200);
  }

  assert.equal(processedPayloads.length, fixtures.length);
});

test("estrutura inválida falha fechada antes do processor", async () => {
  for (const fixture of [
    { object: "wrong", entry: [] },
    payloadWithValue({
      messages: [
        {
          ...baseMessage("text", "wamid.no-body"),
        },
      ],
    }),
    { object: "whatsapp_business_account", entry: [] },
  ]) {
    const rawBody = Buffer.from(JSON.stringify(fixture), "utf8");
    const response = await postRaw(rawBody, sign(rawBody));
    assert.equal(response.status, 400);
  }

  assert.equal(processedPayloads.length, 0);
});

function textPayload(messageId: string) {
  return payloadWithValue({
    contacts: [{ wa_id: "5511999999999" }],
    messages: [
      {
        ...baseMessage("text", messageId),
        text: { body: "saldo" },
      },
    ],
  });
}

function statusPayload() {
  return payloadWithValue({
    statuses: [
      {
        id: "wamid.outbound",
        status: "delivered",
        timestamp: "1788350400",
        recipient_id: "5511999999999",
      },
    ],
  });
}

function payloadWithValue(value: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-test",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15555555555",
                phone_number_id: "123456789012345",
              },
              ...value,
            },
          },
        ],
      },
    ],
  };
}

function baseMessage(type: string, id: string) {
  return {
    from: "5511999999999",
    id,
    timestamp: "1788350400",
    type,
  };
}

function sign(body: Buffer) {
  return `sha256=${createHmac("sha256", appSecret)
    .update(body)
    .digest("hex")}`;
}

function postRaw(body: Buffer, signature?: string) {
  return fetch(`${baseUrl}/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature
        ? { "x-hub-signature-256": signature }
        : {}),
    },
    body: body.toString("utf8"),
  });
}
