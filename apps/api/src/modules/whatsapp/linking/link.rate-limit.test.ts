import assert from "node:assert/strict";
import {
  beforeEach,
  test,
} from "node:test";

import {
  consumeWhatsAppLinkRateLimit,
  resetWhatsAppLinkRateLimitsForTests,
} from "./link.rate-limit.js";

beforeEach(() => {
  resetWhatsAppLinkRateLimitsForTests();
});

test("consumo limita por waId sem transferir contador", () => {
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(
      consumeWhatsAppLinkRateLimit("5511999999991", now)
        .allowed,
      true,
    );
  }

  assert.equal(
    consumeWhatsAppLinkRateLimit("5511999999991", now)
      .allowed,
    false,
  );
  assert.equal(
    consumeWhatsAppLinkRateLimit("5511999999992", now)
      .allowed,
    true,
  );
});

test("consumo possui proteção global além da origem", () => {
  const now = Date.now();

  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.equal(
      consumeWhatsAppLinkRateLimit(
        `5511${String(attempt).padStart(8, "0")}`,
        now,
      ).allowed,
      true,
    );
  }

  assert.equal(
    consumeWhatsAppLinkRateLimit(
      "5511999999999",
      now,
    ).allowed,
    false,
  );
});
