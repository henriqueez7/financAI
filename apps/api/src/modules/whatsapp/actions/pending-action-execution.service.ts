import type { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
  AccountNotFoundError,
  CategoryNotFoundError,
  CategoryTypeMismatchError,
  createEntry,
} from "../../entries/entry.service.js";
import { pendingFinancialActionPayloadSchema } from "./pending-action.schema.js";

type EntryCreator = typeof createEntry;

interface ExecutePendingActionDependencies {
  entryCreator?: EntryCreator;
}

export type PendingActionExecutionResult =
  | {
      status: "CREATED";
      type: "CREATE_EXPENSE" | "CREATE_INCOME";
      amount: number;
      description: string;
    }
  | {
      status:
        | "NO_PENDING"
        | "EXPIRED"
        | "INVALID_PAYLOAD"
        | "INVALID_REFERENCE";
    };

export async function executeLatestPendingFinancialAction(
  {
    userId,
    now = new Date(),
  }: {
    userId: string;
    now?: Date;
  },
  dependencies: ExecutePendingActionDependencies = {},
): Promise<PendingActionExecutionResult> {
  const entryCreator = dependencies.entryCreator ?? createEntry;

  return prisma.$transaction(async (transaction) => {
    const expiration =
      await transaction.pendingFinancialAction.updateMany({
        where: {
          userId,
          status: "PENDING",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      });
    const action =
      await transaction.pendingFinancialAction.findFirst({
        where: {
          userId,
          status: "PENDING",
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });

    if (!action) {
      return {
        status:
          expiration.count > 0 ? "EXPIRED" : "NO_PENDING",
      };
    }

    const payload =
      pendingFinancialActionPayloadSchema.safeParse(
        action.payload,
      );

    if (!payload.success) {
      await cancelInvalidAction({
        actionId: action.id,
        userId,
        now,
        transaction,
      });

      return { status: "INVALID_PAYLOAD" };
    }

    const externalId = `whatsapp:${action.id}`;
    const existingEntry = await transaction.entry.findUnique({
      where: { externalId },
      select: {
        userId: true,
        accountId: true,
        categoryId: true,
        description: true,
        amount: true,
        type: true,
        status: true,
        source: true,
        dueDate: true,
      },
    });

    if (existingEntry) {
      if (
        !matchesPendingAction({
          actionType: action.type,
          existingEntry,
          payload: payload.data,
          userId,
        })
      ) {
        await cancelInvalidAction({
          actionId: action.id,
          userId,
          now,
          transaction,
        });

        return { status: "INVALID_PAYLOAD" };
      }

      const reconciled = await claimPendingAction({
        actionId: action.id,
        userId,
        now,
        transaction,
      });

      return reconciled
        ? {
            status: "CREATED",
            type: action.type,
            amount: payload.data.amount,
            description: payload.data.description,
          }
        : { status: "NO_PENDING" };
    }

    const claimed = await claimPendingAction({
      actionId: action.id,
      userId,
      now,
      transaction,
    });

    if (!claimed) {
      return { status: "NO_PENDING" };
    }

    try {
      await entryCreator({
        userId,
        input: {
          amount: payload.data.amount,
          description: payload.data.description,
          dueDate: new Date(
            `${payload.data.date}T00:00:00.000Z`,
          ),
          type:
            action.type === "CREATE_EXPENSE"
              ? "EXPENSE"
              : "INCOME",
          status: "COMPLETED",
          accountId: payload.data.accountId,
          categoryId: payload.data.categoryId,
          notes: null,
        },
        client: transaction,
        source: "WHATSAPP",
        externalId,
        now,
      });
    } catch (error) {
      if (isInvalidReferenceError(error)) {
        await transaction.pendingFinancialAction.updateMany({
          where: {
            id: action.id,
            userId,
            status: "CONFIRMED",
          },
          data: {
            status: "CANCELLED",
            confirmedAt: null,
            cancelledAt: now,
          },
        });

        return { status: "INVALID_REFERENCE" };
      }

      throw error;
    }

    return {
      status: "CREATED",
      type: action.type,
      amount: payload.data.amount,
      description: payload.data.description,
    };
  });
}

async function claimPendingAction({
  actionId,
  userId,
  now,
  transaction,
}: {
  actionId: string;
  userId: string;
  now: Date;
  transaction: Prisma.TransactionClient;
}) {
  const claim =
    await transaction.pendingFinancialAction.updateMany({
      where: {
        id: actionId,
        userId,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        cancelledAt: null,
      },
    });

  return claim.count === 1;
}

async function cancelInvalidAction({
  actionId,
  userId,
  now,
  transaction,
}: {
  actionId: string;
  userId: string;
  now: Date;
  transaction: Prisma.TransactionClient;
}) {
  await transaction.pendingFinancialAction.updateMany({
    where: {
      id: actionId,
      userId,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
    },
  });
}

function isInvalidReferenceError(error: unknown) {
  return (
    error instanceof AccountNotFoundError ||
    error instanceof CategoryNotFoundError ||
    error instanceof CategoryTypeMismatchError
  );
}

function matchesPendingAction({
  actionType,
  existingEntry,
  payload,
  userId,
}: {
  actionType: "CREATE_EXPENSE" | "CREATE_INCOME";
  existingEntry: {
    userId: string;
    accountId: string | null;
    categoryId: string | null;
    description: string;
    amount: { toNumber(): number };
    type: "EXPENSE" | "INCOME";
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    source: "WEB" | "WHATSAPP" | "IMPORT";
    dueDate: Date;
  };
  payload: {
    amount: number;
    description: string;
    date: string;
    accountId?: string;
    categoryId?: string;
  };
  userId: string;
}) {
  return (
    existingEntry.userId === userId &&
    existingEntry.accountId === (payload.accountId ?? null) &&
    existingEntry.categoryId === (payload.categoryId ?? null) &&
    existingEntry.description === payload.description &&
    existingEntry.amount.toNumber() === payload.amount &&
    existingEntry.type ===
      (actionType === "CREATE_EXPENSE" ? "EXPENSE" : "INCOME") &&
    existingEntry.status === "COMPLETED" &&
    existingEntry.source === "WHATSAPP" &&
    existingEntry.dueDate.toISOString().slice(0, 10) ===
      payload.date
  );
}
