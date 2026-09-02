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
  assert.equal(
    resolveFrontendOrigin({
      NODE_ENV: "development",
    }),
    "http://localhost:3000",
  );
});
