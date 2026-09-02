import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

import type {
  CreateEntryInput,
  ListEntriesQuery,
  UpdateEntryInput,
} from "./entry.schema.js";

export class AccountNotFoundError extends Error {
  constructor() {
    super("Conta não encontrada.");
    this.name = "AccountNotFoundError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoria não encontrada.");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryTypeMismatchError extends Error {
  constructor() {
    super(
      "O tipo da categoria não corresponde ao tipo do lançamento.",
    );

    this.name = "CategoryTypeMismatchError";
  }
}

export class EntryNotFoundError extends Error {
  constructor() {
    super("Lançamento não encontrado.");
    this.name = "EntryNotFoundError";
  }
}

type EntryDatabaseClient = Pick<
  Prisma.TransactionClient,
  "account" | "category" | "entry"
>;

export type CreateEntryServiceInput = Omit<
  CreateEntryInput,
  "accountId"
> & {
  accountId?: string | null;
};

interface CreateEntryParams {
  userId: string;
  input: CreateEntryServiceInput;
  client?: EntryDatabaseClient;
  source?: "WEB" | "WHATSAPP" | "IMPORT";
  externalId?: string;
  now?: Date;
}

export async function createEntry({
  userId,
  input,
  client = prisma,
  source = "WEB",
  externalId,
  now = new Date(),
}: CreateEntryParams) {
  if (input.accountId) {
    const account = await client.account.findFirst({
      where: {
        id: input.accountId,
        userId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      throw new AccountNotFoundError();
    }
  }

  if (input.categoryId) {
    const category = await client.category.findFirst({
      where: {
        id: input.categoryId,
        userId,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!category) {
      throw new CategoryNotFoundError();
    }

    if (category.type !== input.type) {
      throw new CategoryTypeMismatchError();
    }
  }

  const completedAt =
    input.status === "COMPLETED"
      ? now
      : null;

  const entry = await client.entry.create({
    data: {
      userId,
      accountId: input.accountId ?? null,
      categoryId: input.categoryId ?? null,
      description: input.description,
      amount: input.amount,
      type: input.type,
      status: input.status,
      source,
      dueDate: input.dueDate,
      completedAt,
      notes: input.notes ?? null,
      externalId,
    },
    select: entrySelect,
  });

  return serializeEntry(entry);
}

interface ListEntriesParams {
  userId: string;
  query: ListEntriesQuery;
}

export async function listEntries({
  userId,
  query,
}: ListEntriesParams) {
  let dateFilter:
    | {
        gte: Date;
        lt: Date;
      }
    | undefined;

  if (query.month && query.year) {
    dateFilter = {
      gte: new Date(
        query.year,
        query.month - 1,
        1,
      ),

      lt: new Date(
        query.year,
        query.month,
        1,
      ),
    };
  }

  const entries = await prisma.entry.findMany({
    where: {
      userId,
      type: query.type,
      status: query.status,
      accountId: query.accountId,
      categoryId: query.categoryId,
      dueDate: dateFilter,
    },

    select: entrySelect,

    orderBy: [
      {
        dueDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return entries.map(serializeEntry);
}

interface GetEntryParams {
  userId: string;
  entryId: string;
}

export async function getEntry({
  userId,
  entryId,
}: GetEntryParams) {
  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      userId,
    },
    select: entrySelect,
  });

  if (!entry) {
    throw new EntryNotFoundError();
  }

  return serializeEntry(entry);
}

interface UpdateEntryParams {
  userId: string;
  entryId: string;
  input: UpdateEntryInput;
}

export async function updateEntry({
  userId,
  entryId,
  input,
}: UpdateEntryParams) {
  const existingEntry =
    await prisma.entry.findFirst({
      where: {
        id: entryId,
        userId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        accountId: true,
        categoryId: true,
        completedAt: true,
      },
    });

  if (!existingEntry) {
    throw new EntryNotFoundError();
  }

  const nextType =
    input.type ?? existingEntry.type;

  const nextAccountId =
    input.accountId !== undefined
      ? input.accountId
      : existingEntry.accountId;

  const nextCategoryId =
    input.categoryId !== undefined
      ? input.categoryId
      : existingEntry.categoryId;

  if (nextAccountId) {
    const account =
      await prisma.account.findFirst({
        where: {
          id: nextAccountId,
          userId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

    if (!account) {
      throw new AccountNotFoundError();
    }
  }

  if (nextCategoryId) {
    const category =
      await prisma.category.findFirst({
        where: {
          id: nextCategoryId,
          userId,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
        },
      });

    if (!category) {
      throw new CategoryNotFoundError();
    }

    if (category.type !== nextType) {
      throw new CategoryTypeMismatchError();
    }
  }

  const nextStatus =
    input.status ?? existingEntry.status;

  let completedAt = existingEntry.completedAt;

  if (nextStatus === "COMPLETED") {
    completedAt =
      existingEntry.completedAt ?? new Date();
  } else {
    completedAt = null;
  }

  const entry = await prisma.entry.update({
    where: {
      id: existingEntry.id,
    },
    data: {
      description: input.description,
      amount: input.amount,
      type: input.type,
      status: input.status,
      dueDate: input.dueDate,
      accountId: input.accountId,
      categoryId: input.categoryId,
      notes: input.notes,
      completedAt,
    },
    select: entrySelect,
  });

  return serializeEntry(entry);
}

interface DeleteEntryParams {
  userId: string;
  entryId: string;
}

export async function deleteEntry({
  userId,
  entryId,
}: DeleteEntryParams) {
  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!entry) {
    throw new EntryNotFoundError();
  }

  await prisma.entry.delete({
    where: {
      id: entry.id,
    },
  });
}

const entrySelect = {
  id: true,
  description: true,
  amount: true,
  type: true,
  status: true,
  source: true,
  dueDate: true,
  completedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,

  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },

  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true,
    },
  },
} as const;

interface SerializableEntry {
  id: string;
  description: string;

  amount: {
    toNumber(): number;
  };

  type: string;
  status: string;
  source: string;
  dueDate: Date;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  account: {
    id: string;
    name: string;
    type: string;
  } | null;

  category: {
    id: string;
    name: string;
    type: string;
    icon: string | null;
    color: string | null;
  } | null;
}

function serializeEntry(
  entry: SerializableEntry,
) {
  return {
    ...entry,
    amount: entry.amount.toNumber(),
  };
}
