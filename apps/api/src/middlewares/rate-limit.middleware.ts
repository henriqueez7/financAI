import type {
  Request,
  RequestHandler,
} from "express";

import {
  consumeRateLimits,
  type InMemoryFixedWindowRateLimiter,
} from "../lib/rate-limit/in-memory-rate-limiter.js";

interface RateLimitRule {
  getKey: (request: Request) => string | null;
  limiter: InMemoryFixedWindowRateLimiter;
}

interface RateLimitResponse {
  code?: string;
  message: string;
}

interface CreateRateLimitMiddlewareOptions {
  rules: RateLimitRule[];
  limitedResponse: RateLimitResponse;
  missingIdentityResponse?: {
    status: number;
    body: RateLimitResponse;
  };
  now?: () => number;
}

export function createRateLimitMiddleware({
  rules,
  limitedResponse,
  missingIdentityResponse,
  now = Date.now,
}: CreateRateLimitMiddlewareOptions): RequestHandler {
  return (request, response, next) => {
    const subjects = [];

    for (const rule of rules) {
      const key = rule.getKey(request);

      if (!key) {
        if (missingIdentityResponse) {
          return response
            .status(missingIdentityResponse.status)
            .json(missingIdentityResponse.body);
        }

        return response.status(429).json(limitedResponse);
      }

      subjects.push({
        key,
        limiter: rule.limiter,
      });
    }

    const decision = consumeRateLimits(subjects, now());

    if (!decision.allowed) {
      response.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds),
      );

      return response.status(429).json(limitedResponse);
    }

    return next();
  };
}

export function getClientIpRateLimitKey(
  request: Request,
) {
  return `ip:${request.ip ?? "unknown"}`;
}
