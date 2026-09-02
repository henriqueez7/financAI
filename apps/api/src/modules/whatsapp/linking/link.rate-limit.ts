import { createHash } from "node:crypto";

import { rateLimitPolicies } from "../../../config/rate-limit.config.js";
import {
  consumeRateLimits,
  InMemoryFixedWindowRateLimiter,
} from "../../../lib/rate-limit/in-memory-rate-limiter.js";
import {
  createRateLimitMiddleware,
  getClientIpRateLimitKey,
} from "../../../middlewares/rate-limit.middleware.js";

const generationByUser = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.whatsappLink.generation.user,
);
const generationByIp = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.whatsappLink.generation.ip,
);
const generationGlobal = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.whatsappLink.generation.global,
);
const consumptionByWaId = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.whatsappLink.consumption.waId,
);
const consumptionGlobal = new InMemoryFixedWindowRateLimiter(
  rateLimitPolicies.whatsappLink.consumption.global,
);

export const whatsappLinkGenerationRateLimitMiddleware =
  createRateLimitMiddleware({
    rules: [
      {
        limiter: generationByUser,
        getKey: (request) =>
          request.userId
            ? `user:${request.userId}`
            : null,
      },
      {
        limiter: generationByIp,
        getKey: getClientIpRateLimitKey,
      },
      {
        limiter: generationGlobal,
        getKey: () => "instance",
      },
    ],
    limitedResponse: {
      code: "WHATSAPP_LINK_RATE_LIMITED",
      message:
        "Muitas solicitações de vinculação. Aguarde alguns minutos e tente novamente.",
    },
    missingIdentityResponse: {
      status: 401,
      body: {
        message: "Usuário não autenticado.",
      },
    },
  });

export function consumeWhatsAppLinkRateLimit(
  waId: string,
  now = Date.now(),
) {
  const identityHash = createHash("sha256")
    .update(waId, "utf8")
    .digest("hex");

  return consumeRateLimits(
    [
      {
        limiter: consumptionByWaId,
        key: `wa:${identityHash}`,
      },
      {
        limiter: consumptionGlobal,
        key: "instance",
      },
    ],
    now,
  );
}

export function resetWhatsAppLinkRateLimitsForTests() {
  generationByUser.clear();
  generationByIp.clear();
  generationGlobal.clear();
  consumptionByWaId.clear();
  consumptionGlobal.clear();
}
