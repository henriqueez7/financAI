import assert from "node:assert/strict";
import test from "node:test";

import { resolveTrustProxySetting } from "./trust-proxy.js";

test("trust proxy permanece desabilitado por padrão", () => {
  assert.equal(resolveTrustProxySetting(undefined), false);
  assert.equal(resolveTrustProxySetting("0"), false);
  assert.equal(resolveTrustProxySetting("false"), false);
});

test("trust proxy aceita saltos exatos ou proxies conhecidos", () => {
  assert.equal(resolveTrustProxySetting("1"), 1);
  assert.deepEqual(
    resolveTrustProxySetting("10.0.0.0/8, 192.0.2.10"),
    ["10.0.0.0/8", "192.0.2.10"],
  );
});

test("trust proxy rejeita confiança irrestrita", () => {
  assert.throws(
    () => resolveTrustProxySetting("true"),
    /não é permitido/,
  );
  assert.throws(
    () => resolveTrustProxySetting("10.0.0.1, true"),
    /confiança irrestrita/,
  );
  assert.throws(
    () => resolveTrustProxySetting("11"),
    /entre 1 e 10 saltos/,
  );
});
