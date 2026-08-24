import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeRateLimits,
  InMemoryFixedWindowRateLimiter,
} from "./in-memory-rate-limiter.js";

const baseOptions = {
  windowMs: 1_000,
  maximumRequests: 2,
  maximumEntries: 3,
  cleanupIntervalMs: 100,
};

test("permite requisições abaixo do limite e bloqueia o excesso", () => {
  const limiter = new InMemoryFixedWindowRateLimiter(baseOptions);

  assert.equal(limiter.consume("ip:a", 0).allowed, true);
  assert.equal(limiter.consume("ip:a", 10).allowed, true);

  const blocked = limiter.consume("ip:a", 20);

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
});

test("a janela expira e reinicia sem herdar o contador anterior", () => {
  const limiter = new InMemoryFixedWindowRateLimiter(baseOptions);

  limiter.consume("ip:a", 0);
  limiter.consume("ip:a", 10);

  assert.equal(limiter.consume("ip:a", 999).allowed, false);
  assert.equal(limiter.consume("ip:a", 1_000).allowed, true);
});

test("identidades diferentes possuem contadores independentes", () => {
  const limiter = new InMemoryFixedWindowRateLimiter(baseOptions);

  limiter.consume("ip:a", 0);
  limiter.consume("ip:a", 1);

  assert.equal(limiter.consume("ip:a", 2).allowed, false);
  assert.equal(limiter.consume("ip:b", 2).allowed, true);
});

test("entradas expiradas são removidas e a memória permanece limitada", () => {
  const limiter = new InMemoryFixedWindowRateLimiter({
    ...baseOptions,
    maximumEntries: 2,
  });

  limiter.consume("ip:a", 0);
  limiter.consume("ip:b", 0);

  assert.equal(limiter.size, 2);
  assert.equal(limiter.consume("ip:c", 10).allowed, false);
  assert.equal(limiter.size, 2);

  assert.equal(limiter.cleanupExpired(1_000), 2);
  assert.equal(limiter.consume("ip:c", 1_000).allowed, true);
  assert.equal(limiter.size, 1);
});

test("um bloqueio combinado não consome cotas das outras regras", () => {
  const userLimiter = new InMemoryFixedWindowRateLimiter({
    ...baseOptions,
    maximumRequests: 1,
  });
  const globalLimiter = new InMemoryFixedWindowRateLimiter({
    ...baseOptions,
    maximumRequests: 1,
    maximumEntries: 1,
  });

  globalLimiter.consume("instance", 0);

  const decision = consumeRateLimits(
    [
      { limiter: userLimiter, key: "user:a" },
      { limiter: globalLimiter, key: "instance" },
    ],
    1,
  );

  assert.equal(decision.allowed, false);
  assert.equal(userLimiter.size, 0);
});
