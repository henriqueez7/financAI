import type { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";

import { pendingFinancialActionPayloadSchema } from "./pending-action.schema.js";
import type {
  PendingFinancialActionPayload,
  PendingFinancialActionStatus,
  PendingFinancialActionType,
} from "./pending-action.types.js";

export const PENDING_FINANCIAL_ACTION_TTL_MS =
  15 * 60 * 1_000;

export class PendingFinancialActionNotFoundError extends Error {
  constructor() {
    super("Ação financeira pendente não encontrada.");
    this.name = "PendingFinancialActionNotFoundError";
  }
}

export class PendingFinancialActionUnavailableError extends Error {
  constructor(
    public readonly status: PendingFinancialActionStatus,
  ) {
    super("A ação financeira não está mais disponível para alteração.");
    this.name = "PendingFinancialActionUnavailableError";
  }
}

interface CreatePendingFinancialActionParams {
  userId: string;
  type: PendingFinancialActionType;
  payload: PendingFinancialActionPayload;
  now?: Date;
}

export async function createPendingFinancialAction({
  userId,
  type,
  payload,
  now = new Date(),
}: CreatePendingFinancialActionParams) {
  const validatedPayload =
    pendingFinancialActionPayloadSchema.parse(payload);
  const expiresAt = new Date(
    now.getTime() + PENDING_FINANCIAL_ACTION_TTL_MS,
  );

  return prisma.$transaction(async (transaction) => {
    await transaction.pendingFinancialAction.updateMany({
      where: {
        userId,
        status: "PENDING",
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    await transaction.pendingFinancialAction.updateMany({
      where: {
        userId,
        status: "PENDING",
        expiresAt: {
          gt: now,
        },
      },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
      },
    });

    return transaction.pendingFinancialAction.create({
      data: {
        userId,
        type,
        payload:
          validatedPayload as unknown as Prisma.InputJsonObject,
        expiresAt,
      },
    });
  });
}

interface PendingFinancialActionParams {
  userId: string;
  actionId: string;
  now?: Date;
}

export async function getPendingFinancialAction({
  userId,
  actionId,
  now = new Date(),
}: PendingFinancialActionParams) {
  const action =
    await prisma.pendingFinancialAction.findFirst({
      where: {
        id: actionId,
        userId,
      },
    });

  if (!action) {
    throw new PendingFinancialActionNotFoundError();
  }

  if (
    action.status === "PENDING" &&
    action.expiresAt <= now
  ) {
    await prisma.pendingFinancialAction.updateMany({
      where: {
        id: action.id,
        userId,
        status: "PENDING",
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return prisma.pendingFinancialAction.findUniqueOrThrow({
      where: {
        id: action.id,
      },
    });
  }

  return action;
}

export async function getActivePendingFinancialAction({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}) {
  await expirePendingFinancialActions(userId, now);

  return prisma.pendingFinancialAction.findFirst({
    where: {
      userId,
      status: "PENDING",
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function cancelPendingFinancialAction(
  params: PendingFinancialActionParams,
) {
  return transitionPendingFinancialAction(params);
}

export async function cancelLatestPendingFinancialAction({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}) {
  const action = await getActivePendingFinancialAction({
    userId,
    now,
  });

  if (!action) {
    return null;
  }

  return cancelPendingFinancialAction({
    userId,
    actionId: action.id,
    now,
  });
}

async function transitionPendingFinancialAction({
  userId,
  actionId,
  now = new Date(),
}: PendingFinancialActionParams) {
  const action = await getPendingFinancialAction({
    userId,
    actionId,
    now,
  });

  if (action.status !== "PENDING") {
    throw new PendingFinancialActionUnavailableError(
      action.status,
    );
  }

  const transition =
    await prisma.pendingFinancialAction.updateMany({
      where: {
        id: action.id,
        userId,
        status: "PENDING",
        expiresAt: {
          gt: now,
        },
      },
      data: {
        status: "CANCELLED",
        confirmedAt: null,
        cancelledAt: now,
      },
    });

  if (transition.count === 0) {
    const current = await getPendingFinancialAction({
      userId,
      actionId,
      now,
    });

    throw new PendingFinancialActionUnavailableError(
      current.status,
    );
  }

  return prisma.pendingFinancialAction.findUniqueOrThrow({
    where: {
      id: action.id,
    },
  });
}

async function expirePendingFinancialActions(
  userId: string,
  now: Date,
) {
  await prisma.pendingFinancialAction.updateMany({
    where: {
      userId,
      status: "PENDING",
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });
}
