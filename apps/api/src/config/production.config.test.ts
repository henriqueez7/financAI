import assert from "node:assert/strict";
import { test } from "node:test";

import {
  resolveFrontendOrigin,
  validateProductionConfig,
} from "./production.config.js";

const validProductionEnvironment = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(32),
  WHATSAPP_LINK_SECRET: "b".repeat(32),
  WHATSAPP_PROVIDER: "meta",
  WHATSAPP_VERIFY_TOKEN: "c".repeat(32),
  WHATSAPP_APP_SECRET: "d".repeat(32),
  WHATSAPP_ACCESS_TOKEN: "test-access-token-without-real-value",
  WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
  WHATSAPP_GRAPH_API_VERSION: "v26.0",
  FRONTEND_URL: "https://app.finance-ai.example",
} as NodeJS.ProcessEnv;

test("configuração de produção aceita segredo forte e origem HTTPS", () => {
  assert.doesNotThrow(() =>
    validateProductionConfig(
      validProductionEnvironment,
    ),
  );

  assert.equal(
    resolveFrontendOrigin(
      validProductionEnvironment,
    ),
    "https://app.finance-ai.example",
  );
});

test("configuração de produção rejeita segredo curto", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        JWT_SECRET: "short-secret",
      }),
    /pelo menos 32 caracteres/,
  );
});

test("configuração de produção exige segredo exclusivo para vinculação", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_LINK_SECRET: "short-secret",
      }),
    /WHATSAPP_LINK_SECRET.*32 caracteres/,
  );

  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_LINK_SECRET: undefined,
      }),
    /WHATSAPP_LINK_SECRET.*32 caracteres/,
  );

  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_LINK_SECRET:
          validProductionEnvironment.JWT_SECRET,
      }),
    /diferente de JWT_SECRET/,
  );
});

test("configuração de produção exige provider Meta e credenciais completas", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_PROVIDER: "fake",
      }),
    /WHATSAPP_PROVIDER.*meta/,
  );

  for (const name of [
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_GRAPH_API_VERSION",
  ] as const) {
    assert.throws(
      () =>
        validateProductionConfig({
          ...validProductionEnvironment,
          [name]: undefined,
        }),
      new RegExp(name),
    );
  }
});

test("configuração Meta valida versão, phone number id e força de secrets", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_GRAPH_API_VERSION: "26",
      }),
    /formato vN\.N/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_PHONE_NUMBER_ID: "phone-id",
      }),
    /somente dígitos/,
  );
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        WHATSAPP_APP_SECRET: "short",
      }),
    /WHATSAPP_APP_SECRET.*32 caracteres/,
  );
});

test("configuração de produção rejeita frontend ausente, HTTP ou localhost", () => {
  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        FRONTEND_URL: undefined,
      }),
    /obrigatória/,
  );

  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        FRONTEND_URL: "http://app.finance-ai.example",
      }),
    /HTTPS/,
  );

  assert.throws(
    () =>
      validateProductionConfig({
        ...validProductionEnvironment,
        FRONTEND_URL: "https://localhost",
      }),
    /localhost/,
  );
});

test("FRONTEND_URL rejeita credenciais, caminhos e protocolos não web", () => {
  assert.throws(
    () =>
      resolveFrontendOrigin({
        FRONTEND_URL:
          "https://user:password@app.finance-ai.example",
      }),
    /somente a origem/,
  );

  assert.throws(
    () =>
      resolveFrontendOrigin({
        FRONTEND_URL:
          "https://app.finance-ai.example/app",
      }),
    /somente a origem/,
  );

  assert.throws(
    () =>
      resolveFrontendOrigin({
        FRONTEND_URL: "ftp://app.finance-ai.example",
      }),
    /HTTP ou HTTPS/,
  );
});

test("desenvolvimento preserva o fallback local sem HSTS ou HTTPS obrigatório", () => {
  assert.doesNotThrow(() =>
    validateProductionConfig({
      NODE_ENV: "development",
    }),
  );
  assert.equal(
    resolveFrontendOrigin({
      NODE_ENV: "development",
    }),
    "http://localhost:3000",
  );
});
