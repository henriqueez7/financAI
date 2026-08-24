import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";

import { getClientIpRateLimitKey } from "./rate-limit.middleware.js";

test("a identidade de IP usa request.ip e ignora header arbitrário", () => {
  const request = {
    ip: "203.0.113.10",
    headers: {
      "x-forwarded-for": "198.51.100.25",
    },
  } as unknown as Request;

  assert.equal(
    getClientIpRateLimitKey(request),
    "ip:203.0.113.10",
  );
});

test("IP ausente compartilha uma identidade conservadora", () => {
  const request = {
    headers: {},
  } as unknown as Request;

  assert.equal(
    getClientIpRateLimitKey(request),
    "ip:unknown",
  );
});
