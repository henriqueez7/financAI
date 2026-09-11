import assert from "node:assert/strict";
import test from "node:test";

import type { MetaWhatsAppConfig } from "../../../config/whatsapp-meta.config.js";
import {
  MetaWhatsAppProvider,
  MetaWhatsAppProviderError,
} from "./meta-whatsapp.provider.js";

const config: MetaWhatsAppConfig = {
  accessToken: "test-access-token-not-a-real-secret",
  appSecret: "test-app-secret-not-a-real-secret-000",
  graphApiVersion: "v26.0",
  phoneNumberId: "123456789012345",
  verifyToken: "test-verify-token-not-a-real-secret",
};

test("Meta provider envia texto no endpoint e payload oficiais", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const fetchImplementation = (async (
    input: URL | RequestInfo,
    init?: RequestInit,
  ) => {
    requestedUrl = String(input);
    requestedInit = init;
    return jsonResponse({
      messaging_product: "whatsapp",
      messages: [{ id: "wamid.test-outbound" }],
    });
  }) as typeof fetch;
  const provider = new MetaWhatsAppProvider(config, {
    fetchImplementation,
  });

  const result = await provider.sendText({
    recipient: "5511999999999",
    text: "Resposta segura",
  });

  assert.equal(result.messageId, "wamid.test-outbound");
  assert.equal(
    requestedUrl,
    "https://graph.facebook.com/v26.0/123456789012345/messages",
  );
  assert.equal(requestedInit?.method, "POST");
  assert.deepEqual(
    JSON.parse(String(requestedInit?.body)),
    {
      messaging_product: "whatsapp",
      to: "5511999999999",
      type: "text",
      text: { body: "Resposta segura" },
    },
  );
  const headers = new Headers(requestedInit?.headers);
  assert.equal(
    headers.get("Authorization"),
    `Bearer ${config.accessToken}`,
  );
  assert.equal(
    headers.get("Content-Type"),
    "application/json",
  );
});

for (const [status, code] of [
  [400, "CLIENT_ERROR"],
  [429, "RATE_LIMITED"],
  [503, "SERVER_ERROR"],
] as const) {
  test(`Meta provider converte HTTP ${status} em erro tipado`, async () => {
    const provider = new MetaWhatsAppProvider(config, {
      fetchImplementation: (async () =>
        jsonResponse({ error: { message: "omitted" } }, status)) as typeof fetch,
    });

    await assert.rejects(
      provider.sendText({ recipient: "5511999999999", text: "x" }),
      (error: unknown) => {
        assert.ok(error instanceof MetaWhatsAppProviderError);
        assert.equal(error.code, code);
        assert.equal(error.statusCode, status);
        assert.doesNotMatch(error.message, /access-token|Bearer/i);
        return true;
      },
    );
  });
}

test("Meta provider aplica timeout com AbortController", async () => {
  const fetchImplementation = ((_input: URL | RequestInfo, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      );
    })) as typeof fetch;
  const provider = new MetaWhatsAppProvider(config, {
    fetchImplementation,
    timeoutMs: 5,
  });

  await assertProviderError(provider, "TIMEOUT");
});

test("Meta provider trata falha de transporte sem vazar configuração", async () => {
  const provider = new MetaWhatsAppProvider(config, {
    fetchImplementation: (async () => {
      throw new Error("network unavailable");
    }) as typeof fetch,
  });

  await assertProviderError(provider, "TRANSPORT_ERROR");
});

test("Meta provider rejeita resposta 2xx malformada", async () => {
  const provider = new MetaWhatsAppProvider(config, {
    fetchImplementation: (async () =>
      jsonResponse({ messages: [] })) as typeof fetch,
  });

  await assertProviderError(provider, "MALFORMED_RESPONSE");
});

test("Meta provider rejeita corpo 2xx que não é JSON", async () => {
  const provider = new MetaWhatsAppProvider(config, {
    fetchImplementation: (async () =>
      new Response("not-json", { status: 200 })) as typeof fetch,
  });

  await assertProviderError(provider, "MALFORMED_RESPONSE");
});

async function assertProviderError(
  provider: MetaWhatsAppProvider,
  code: MetaWhatsAppProviderError["code"],
) {
  await assert.rejects(
    provider.sendText({ recipient: "5511999999999", text: "x" }),
    (error: unknown) => {
      assert.ok(error instanceof MetaWhatsAppProviderError);
      assert.equal(error.code, code);
      return true;
    },
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
