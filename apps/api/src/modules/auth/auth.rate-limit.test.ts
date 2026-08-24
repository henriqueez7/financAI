import assert from "node:assert/strict";
import test from "node:test";

import { rateLimitPolicies } from "../../config/rate-limit.config.js";
import { InMemoryFixedWindowRateLimiter } from "../../lib/rate-limit/in-memory-rate-limiter.js";

test("login limita por IP, separa IPs e reinicia após 15 minutos", () => {
  const policy = rateLimitPolicies.auth.login;
  const limiter = new InMemoryFixedWindowRateLimiter(policy);
  const now = 1_000;

  for (
    let attempt = 0;
    attempt < policy.maximumRequests;
    attempt += 1
  ) {
    assert.equal(limiter.consume("ip:a", now).allowed, true);
  }

  assert.equal(limiter.consume("ip:a", now).allowed, false);
  assert.equal(limiter.consume("ip:b", now).allowed, true);
  assert.equal(
    limiter.consume("ip:a", now + policy.windowMs).allowed,
    true,
  );
});

test("cadastro limita por IP, separa IPs e reinicia após uma hora", () => {
  const policy = rateLimitPolicies.auth.register;
  const limiter = new InMemoryFixedWindowRateLimiter(policy);
  const now = 2_000;

  for (
    let attempt = 0;
    attempt < policy.maximumRequests;
    attempt += 1
  ) {
    assert.equal(limiter.consume("ip:a", now).allowed, true);
  }

  assert.equal(limiter.consume("ip:a", now).allowed, false);
  assert.equal(limiter.consume("ip:b", now).allowed, true);
  assert.equal(
    limiter.consume("ip:a", now + policy.windowMs).allowed,
    true,
  );
});
