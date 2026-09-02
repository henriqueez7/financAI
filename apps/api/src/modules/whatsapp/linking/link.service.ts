import type { Prisma } from "../../../../generated/prisma/client.js";
import { requireWhatsAppLinkSecret } from "../../../config/whatsapp-link.config.js";
import { prisma } from "../../../lib/prisma.js";
import { whatsappConnectionInputSchema } from "../connections/connection.schema.js";
import {
  generateWhatsAppLinkCode,
  hashWhatsAppLinkCode,
  hashWhatsAppLinkSelector,
  normalizeWhatsAppLinkCode,
  safelyMatchesWhatsAppLinkCode,
} from "./link-code.js";
import { consumeWhatsAppLinkRateLimit } from "./link.rate-limit.js";

export const WHATSAPP_LINK_CHALLENGE_TTL_MS =
  10 * 60 * 1_000;
export const WHATSAPP_LINK_MAX_ATTEMPTS = 5;

const MAX_CODE_GENERATION_RETRIES = 5;
const INVALID_LINK_CODE_MESSAGE =
  "Código inválido ou expirado.";

export class WhatsAppLinkAlreadyConnectedError extends Error {
  constructor() {
    super(
      "O WhatsApp já está conectado. Desconecte-o antes de vincular outro número.",
    );
    this.name = "WhatsAppLinkAlreadyConnectedError";
  }
}

export class WhatsAppLinkCodeInvalidError extends Error {
  constructor() {
    super(INVALID_LINK_CODE_MESSAGE);
    this.name = "WhatsAppLinkCodeInvalidError";
  }
}

interface LinkServiceDependencies {
  codeGenerator?: () => string;
  secret?: string;
}

export async function createWhatsAppLinkChallenge(
  {
    userId,
    now = new Date(),
  }: {
    userId: string;
    now?: Date;
  },
  dependencies: LinkServiceDependencies = {},
) {
  const secret =
    dependencies.secret ?? requireWhatsAppLinkSecret();
  const codeGenerator =
    dependencies.codeGenerator ?? generateWhatsAppLinkCode;

  for (
    let retry = 0;
    retry < MAX_CODE_GENERATION_RETRIES;
    retry += 1
  ) {
    const code = codeGenerator();
    const normalized = normalizeWhatsAppLinkCode(code);

    if (!normalized) {
      throw new Error(
        "O gerador produziu um código de vinculação inválido.",
      );
    }

    const codeHash = hashWhatsAppLinkCode(
      normalized.canonical,
      secret,
    );
    const lookupKey = hashWhatsAppLinkSelector(
      normalized.selector,
      secret,
    );
    const expiresAt = new Date(
      now.getTime() + WHATSAPP_LINK_CHALLENGE_TTL_MS,
    );

    try {
      const challenge = await prisma.$transaction(
        async (transaction) => {
          const connection =
            await transaction.whatsAppConnection.findUnique({
              where: { userId },
              select: { status: true },
            });

          if (connection?.status === "VERIFIED") {
            throw new WhatsAppLinkAlreadyConnectedError();
          }

          await expireActiveChallenges({
            userId,
            now,
            transaction,
          });
          await transaction.whatsAppLinkChallenge.updateMany({
            where: {
              userId,
              status: "PENDING",
              expiresAt: { gt: now },
            },
            data: {
              status: "CANCELLED",
              activeUserKey: null,
              cancelledAt: now,
            },
          });

          return transaction.whatsAppLinkChallenge.create({
            data: {
              userId,
              lookupKey,
              codeHash,
              status: "PENDING",
              attempts: 0,
              maxAttempts: WHATSAPP_LINK_MAX_ATTEMPTS,
              expiresAt,
              activeUserKey: userId,
              createdAt: now,
            },
            select: {
              expiresAt: true,
            },
          });
        },
      );

      return {
        code: normalized.canonical,
        expiresAt: challenge.expiresAt,
      };
    } catch (error) {
      if (
        hasPrismaErrorCode(error, "P2002") &&
        retry < MAX_CODE_GENERATION_RETRIES - 1
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Não foi possível gerar uma challenge de vinculação única.",
  );
}

export async function consumeWhatsAppLinkCode(
  {
    waId,
    phoneNumber,
    code,
    now = new Date(),
  }: {
    waId: string;
    phoneNumber?: string;
    code: string;
    now?: Date;
  },
  dependencies: Pick<LinkServiceDependencies, "secret"> = {},
) {
  const normalizedWaId = waId.trim();
  const rateLimit = consumeWhatsAppLinkRateLimit(
    normalizedWaId,
    now.getTime(),
  );

  if (!rateLimit.allowed) {
    throw new WhatsAppLinkCodeInvalidError();
  }

  const normalizedCode = normalizeWhatsAppLinkCode(code);
  const connectionInput =
    whatsappConnectionInputSchema.safeParse({
      waId: normalizedWaId,
      phoneNumber:
        phoneNumber?.trim() ?? `+${normalizedWaId}`,
    });

  if (!normalizedCode || !connectionInput.success) {
    throw new WhatsAppLinkCodeInvalidError();
  }

  const secret =
    dependencies.secret ?? requireWhatsAppLinkSecret();
  const candidateHash = hashWhatsAppLinkCode(
    normalizedCode.canonical,
    secret,
  );
  const lookupKey = hashWhatsAppLinkSelector(
    normalizedCode.selector,
    secret,
  );

  try {
    const outcome = await prisma.$transaction(
      async (transaction) => {
        const challenge =
          await transaction.whatsAppLinkChallenge.findUnique({
            where: {
              lookupKey,
            },
          });

        if (!challenge || challenge.status !== "PENDING") {
          return "INVALID" as const;
        }

        if (challenge.expiresAt <= now) {
          await transaction.whatsAppLinkChallenge.updateMany({
            where: {
              id: challenge.id,
              status: "PENDING",
              expiresAt: { lte: now },
            },
            data: {
              status: "EXPIRED",
              activeUserKey: null,
            },
          });

          return "INVALID" as const;
        }

        if (
          !safelyMatchesWhatsAppLinkCode(
            candidateHash,
            challenge.codeHash,
          )
        ) {
          await registerFailedAttempt({
            challengeId: challenge.id,
            maxAttempts: challenge.maxAttempts,
            now,
            transaction,
          });

          return "INVALID" as const;
        }

        const [connectionByUser, connectionByWaId] =
          await Promise.all([
            transaction.whatsAppConnection.findUnique({
              where: { userId: challenge.userId },
            }),
            transaction.whatsAppConnection.findUnique({
              where: { waId: connectionInput.data.waId },
            }),
          ]);

        if (
          connectionByUser?.status === "VERIFIED" ||
          (connectionByWaId &&
            connectionByWaId.userId !== challenge.userId)
        ) {
          return "INVALID" as const;
        }

        const claimed =
          await transaction.whatsAppLinkChallenge.updateMany({
            where: {
              id: challenge.id,
              userId: challenge.userId,
              status: "PENDING",
              expiresAt: { gt: now },
              attempts: { lt: challenge.maxAttempts },
              codeHash: challenge.codeHash,
            },
            data: {
              status: "CONSUMED",
              activeUserKey: null,
              consumedAt: now,
            },
          });

        if (claimed.count !== 1) {
          return "INVALID" as const;
        }

        if (connectionByUser) {
          await transaction.whatsAppConnection.update({
            where: { id: connectionByUser.id },
            data: {
              waId: connectionInput.data.waId,
              phoneNumber:
                connectionInput.data.phoneNumber,
              status: "VERIFIED",
              verifiedAt: now,
            },
          });
        } else {
          await transaction.whatsAppConnection.create({
            data: {
              userId: challenge.userId,
              waId: connectionInput.data.waId,
              phoneNumber:
                connectionInput.data.phoneNumber,
              status: "VERIFIED",
              verifiedAt: now,
            },
          });
        }

        return "LINKED" as const;
      },
    );

    if (outcome !== "LINKED") {
      throw new WhatsAppLinkCodeInvalidError();
    }

    return { status: "LINKED" as const };
  } catch (error) {
    if (
      error instanceof WhatsAppLinkCodeInvalidError
    ) {
      throw error;
    }

    if (hasPrismaErrorCode(error, "P2002")) {
      throw new WhatsAppLinkCodeInvalidError();
    }

    throw error;
  }
}

async function registerFailedAttempt({
  challengeId,
  maxAttempts,
  now,
  transaction,
}: {
  challengeId: string;
  maxAttempts: number;
  now: Date;
  transaction: Prisma.TransactionClient;
}) {
  const incremented =
    await transaction.whatsAppLinkChallenge.updateMany({
      where: {
        id: challengeId,
        status: "PENDING",
        expiresAt: { gt: now },
        attempts: { lt: maxAttempts },
      },
      data: {
        attempts: { increment: 1 },
      },
    });

  if (incremented.count !== 1) {
    return;
  }

  await transaction.whatsAppLinkChallenge.updateMany({
    where: {
      id: challengeId,
      status: "PENDING",
      attempts: { gte: maxAttempts },
    },
    data: {
      status: "BLOCKED",
      activeUserKey: null,
    },
  });
}

async function expireActiveChallenges({
  userId,
  now,
  transaction,
}: {
  userId: string;
  now: Date;
  transaction: Prisma.TransactionClient;
}) {
  await transaction.whatsAppLinkChallenge.updateMany({
    where: {
      userId,
      status: "PENDING",
      expiresAt: { lte: now },
    },
    data: {
      status: "EXPIRED",
      activeUserKey: null,
    },
  });
}

function hasPrismaErrorCode(
  error: unknown,
  code: string,
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
