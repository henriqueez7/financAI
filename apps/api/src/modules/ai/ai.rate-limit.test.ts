import assert from "node:assert/strict";
import test from "node:test";

import { rateLimitPolicies } from "../../config/rate-limit.config.js";
import {
  consumeRateLimits,
  InMemoryFixedWindowRateLimiter,
} from "../../lib/rate-limit/in-memory-rate-limiter.js";

test("IA mantém o limite por usuário independente", () => {
  const limiters = createAiLimiters();

  for (
    let request = 0;
    request < rateLimitPolicies.ai.user.maximumRequests;
    request += 1
  ) {
    assert.equal(
      consumeAi(limiters, "user:a", "ip:a").allowed,
      true,
    );
  }

  assert.equal(
    consumeAi(limiters, "user:a", "ip:a").allowed,
    false,
  );
  assert.equal(
    consumeAi(limiters, "user:b", "ip:b").allowed,
    true,
  );
});

test("contas diferentes no mesmo IP compartilham a proteção da IA", () => {
  const limiters = createAiLimiters();

  for (let request = 0; request < 6; request += 1) {
    assert.equal(
      consumeAi(limiters, "user:a", "ip:shared").allowed,
      true,
    );
    assert.equal(
      consumeAi(limiters, "user:b", "ip:shared").allowed,
      true,
    );
  }

  assert.equal(
    consumeAi(limiters, "user:c", "ip:shared").allowed,
    false,
  );
});

test("limite global interrompe explosão de chamadas na instância", () => {
  const limiters = createAiLimiters();

  for (
    let request = 0;
    request < rateLimitPolicies.ai.global.maximumRequests;
    request += 1
  ) {
    assert.equal(
      consumeAi(
        limiters,
        `user:${request}`,
        `ip:${request}`,
      ).allowed,
      true,
    );
  }

  assert.equal(
    consumeAi(limiters, "user:overflow", "ip:overflow")
      .allowed,
    false,
  );
});

function createAiLimiters() {
  return {
    user: new InMemoryFixedWindowRateLimiter(
      rateLimitPolicies.ai.user,
    ),
    ip: new InMemoryFixedWindowRateLimiter(
      rateLimitPolicies.ai.ip,
    ),
    global: new InMemoryFixedWindowRateLimiter(
      rateLimitPolicies.ai.global,
    ),
  };
}

function consumeAi(
  limiters: ReturnType<typeof createAiLimiters>,
  userId: string,
  ip: string,
) {
  return consumeRateLimits(
    [
      { limiter: limiters.user, key: userId },
      { limiter: limiters.ip, key: ip },
      { limiter: limiters.global, key: "instance" },
    ],
    1_000,
  );
}
