import { rateLimitPolicies } from "../../config/rate-limit.config.js";
import { InMemoryFixedWindowRateLimiter } from "../../lib/rate-limit/in-memory-rate-limiter.js";
import {
  createRateLimitMiddleware,
  getClientIpRateLimitKey,
} from "../../middlewares/rate-limit.middleware.js";

const loginRateLimiter = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.auth.login,
);

const registerRateLimiter = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.auth.register,
);

export const loginRateLimitMiddleware =
  createRateLimitMiddleware({
    rules: [
      {
        limiter: loginRateLimiter,
        getKey: getClientIpRateLimitKey,
      },
    ],
    limitedResponse: {
      message:
        "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
    },
  });

export const registerRateLimitMiddleware =
  createRateLimitMiddleware({
    rules: [
      {
        limiter: registerRateLimiter,
        getKey: getClientIpRateLimitKey,
      },
    ],
    limitedResponse: {
      message:
        "Muitas tentativas de cadastro. Aguarde e tente novamente mais tarde.",
    },
  });

export function resetAuthRateLimitsForTests() {
  loginRateLimiter.clear();
  registerRateLimiter.clear();
}
