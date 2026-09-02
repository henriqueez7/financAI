import { prisma } from "../../lib/prisma.js";

import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "./account.schema.js";

export class AccountNotFoundError extends Error {
  constructor() {
    super("Conta não encontrada.");
    this.name = "AccountNotFoundError";
  }
}

export class AccountAlreadyExistsError extends Error {
  constructor() {
    super("Já existe uma conta com esse nome.");
    this.name = "AccountAlreadyExistsError";
  }
}

export class AccountHasEntriesError extends Error {
  constructor() {
    super(
      "Esta conta possui lançamentos vinculados e não pode ser excluída.",
    );

    this.name = "AccountHasEntriesError";
  }
}

interface CreateAccountParams {
  userId: string;
  input: CreateAccountInput;
}

export async function createAccount({
  userId,
  input,
}: CreateAccountParams) {
  const existingAccount =
    await prisma.account.findFirst({
      where: {
        userId,
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

  if (existingAccount) {
    throw new AccountAlreadyExistsError();
  }

  const account = await prisma.account.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      initialBalance: input.initialBalance,
      isActive: input.isActive,
    },
    select: accountSelect,
  });

  return serializeAccount(account);
}

interface ListAccountsParams {
  userId: string;
}

export async function findUniqueActiveAccountByName({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const matches = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
    },
    take: 2,
  });

  return matches.length === 1 ? matches[0] : null;
}

export async function listAccounts({
  userId,
}: ListAccountsParams) {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
    },
    select: accountSelect,
    orderBy: [
      {
        isActive: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return accounts.map((account) =>
    serializeAccount(account),
  );
}

interface GetAccountParams {
  userId: string;
  accountId: string;
}

export async function getAccount({
  userId,
  accountId,
}: GetAccountParams) {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    select: accountSelect,
  });

  if (!account) {
    throw new AccountNotFoundError();
  }

  return serializeAccount(account);
}

interface UpdateAccountParams {
  userId: string;
  accountId: string;
  input: UpdateAccountInput;
}

export async function updateAccount({
  userId,
  accountId,
  input,
}: UpdateAccountParams) {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!account) {
    throw new AccountNotFoundError();
  }

  if (
    input.name &&
    input.name.toLocaleLowerCase("pt-BR") !==
      account.name.toLocaleLowerCase("pt-BR")
  ) {
    const accountWithSameName =
      await prisma.account.findFirst({
        where: {
          userId,
          id: {
            not: account.id,
          },
          name: {
            equals: input.name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

    if (accountWithSameName) {
      throw new AccountAlreadyExistsError();
    }
  }

  const updatedAccount =
    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        name: input.name,
        type: input.type,
        initialBalance: input.initialBalance,
        isActive: input.isActive,
      },
      select: accountSelect,
    });

  return serializeAccount(updatedAccount);
}

interface DeleteAccountParams {
  userId: string;
  accountId: string;
}

export async function deleteAccount({
  userId,
  accountId,
}: DeleteAccountParams) {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    select: {
      id: true,
      _count: {
        select: {
          entries: true,
        },
      },
    },
  });

  if (!account) {
    throw new AccountNotFoundError();
  }

  if (account._count.entries > 0) {
    throw new AccountHasEntriesError();
  }

  await prisma.account.delete({
    where: {
      id: account.id,
    },
  });
}

const accountSelect = {
  id: true,
  name: true,
  type: true,
  initialBalance: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,

  entries: {
    where: {
      status: "COMPLETED",
    },
    select: {
      amount: true,
      type: true,
    },
  },

  _count: {
    select: {
      entries: true,
    },
  },
} as const;

interface SerializableAccount {
  id: string;
  name: string;
  type: string;

  initialBalance: {
    toNumber(): number;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  entries: Array<{
    amount: {
      toNumber(): number;
    };
    type: string;
  }>;

  _count: {
    entries: number;
  };
}

function serializeAccount(
  account: SerializableAccount,
) {
  const initialBalance =
    account.initialBalance.toNumber();

  const currentBalance =
    account.entries.reduce(
      (balance, entry) => {
        const amount =
          entry.amount.toNumber();

        if (entry.type === "INCOME") {
          return balance + amount;
        }

        if (entry.type === "EXPENSE") {
          return balance - amount;
        }

        return balance;
      },
      initialBalance,
    );

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance,
    currentBalance,
    isActive: account.isActive,
    entriesCount: account._count.entries,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
