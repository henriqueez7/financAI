import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { rateLimitPolicies } from "../../config/rate-limit.config.js";
import { InMemoryFixedWindowRateLimiter } from "../../lib/rate-limit/in-memory-rate-limiter.js";
import {
  createRateLimitMiddleware,
  getClientIpRateLimitKey,
} from "../../middlewares/rate-limit.middleware.js";

const requestsByUser = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.ai.user,
);

const requestsByIp = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.ai.ip,
);

const globalRequests = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.ai.global,
);

const combinedAiRateLimitMiddleware =
  createRateLimitMiddleware({
    rules: [
      {
        limiter: requestsByUser,
        getKey: (request) =>
          request.userId
            ? `user:${request.userId}`
            : null,
      },
      {
        limiter: requestsByIp,
        getKey: getClientIpRateLimitKey,
      },
      {
        limiter: globalRequests,
        getKey: () => "instance",
      },
    ],
    limitedResponse: {
      code: "AI_RATE_LIMITED",
      message:
        "Você fez várias análises em pouco tempo. Tente novamente em alguns minutos.",
    },
    missingIdentityResponse: {
      status: 401,
      body: {
        message: "Usuário não autenticado.",
      },
    },
  });

export function aiRateLimitMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  return combinedAiRateLimitMiddleware(
    request,
    response,
    next,
  );
}

export function resetAiRateLimitForTests() {
  requestsByUser.clear();
  requestsByIp.clear();
  globalRequests.clear();
}
