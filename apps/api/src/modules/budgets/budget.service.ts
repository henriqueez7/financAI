import { prisma } from "../../lib/prisma.js";

import type {
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
} from "./budget.schema.js";

export class BudgetNotFoundError extends Error {
  constructor() {
    super("Orçamento não encontrado.");
    this.name = "BudgetNotFoundError";
  }
}

export class BudgetAlreadyExistsError extends Error {
  constructor() {
    super(
      "Já existe um orçamento para esta categoria neste período.",
    );
    this.name = "BudgetAlreadyExistsError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoria não encontrada.");
    this.name = "CategoryNotFoundError";
  }
}

export class InvalidBudgetCategoryError extends Error {
  constructor() {
    super(
      "Orçamentos só podem utilizar categorias de despesa.",
    );
    this.name = "InvalidBudgetCategoryError";
  }
}

interface CreateBudgetParams {
  userId: string;
  input: CreateBudgetInput;
}

export async function createBudget({
  userId,
  input,
}: CreateBudgetParams) {
  await validateBudgetCategory(
    userId,
    input.categoryId,
  );

  await ensureBudgetIsUnique({
    userId,
    categoryId: input.categoryId,
    month: input.month,
    year: input.year,
  });

  try {
    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: input.categoryId,
        amount: input.amount,
        month: input.month,
        year: input.year,
      },
      select: budgetSelect,
    });

    return addBudgetProgress(budget);
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      throw new BudgetAlreadyExistsError();
    }

    throw error;
  }
}

interface ListBudgetsParams {
  userId: string;
  query: ListBudgetsQuery;
}

export async function listBudgets({
  userId,
  query,
}: ListBudgetsParams) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      categoryId: query.categoryId,
      month: query.month,
      year: query.year,
    },
    select: budgetSelect,
    orderBy: [
      {
        year: "desc",
      },
      {
        month: "desc",
      },
      {
        category: {
          name: "asc",
        },
      },
    ],
  });

  return addBudgetsProgress(budgets);
}

interface GetBudgetParams {
  userId: string;
  budgetId: string;
}

export async function getBudget({
  userId,
  budgetId,
}: GetBudgetParams) {
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
    select: budgetSelect,
  });

  if (!budget) {
    throw new BudgetNotFoundError();
  }

  return addBudgetProgress(budget);
}

interface UpdateBudgetParams {
  userId: string;
  budgetId: string;
  input: UpdateBudgetInput;
}

export async function updateBudget({
  userId,
  budgetId,
  input,
}: UpdateBudgetParams) {
  const existingBudget =
    await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      select: {
        id: true,
        categoryId: true,
        month: true,
        year: true,
      },
    });

  if (!existingBudget) {
    throw new BudgetNotFoundError();
  }

  const nextCategoryId =
    input.categoryId ??
    existingBudget.categoryId;

  const nextMonth =
    input.month ?? existingBudget.month;

  const nextYear =
    input.year ?? existingBudget.year;

  await validateBudgetCategory(
    userId,
    nextCategoryId,
  );

  await ensureBudgetIsUnique({
    userId,
    categoryId: nextCategoryId,
    month: nextMonth,
    year: nextYear,
    excludeBudgetId: existingBudget.id,
  });

  try {
    const budget = await prisma.budget.update({
      where: {
        id: existingBudget.id,
      },
      data: {
        categoryId: input.categoryId,
        amount: input.amount,
        month: input.month,
        year: input.year,
      },
      select: budgetSelect,
    });

    return addBudgetProgress(budget);
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      throw new BudgetAlreadyExistsError();
    }

    throw error;
  }
}

interface DeleteBudgetParams {
  userId: string;
  budgetId: string;
}

export async function deleteBudget({
  userId,
  budgetId,
}: DeleteBudgetParams) {
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!budget) {
    throw new BudgetNotFoundError();
  }

  await prisma.budget.delete({
    where: {
      id: budget.id,
    },
  });
}

interface UniqueBudgetParams {
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  excludeBudgetId?: string;
}

async function ensureBudgetIsUnique({
  userId,
  categoryId,
  month,
  year,
  excludeBudgetId,
}: UniqueBudgetParams) {
  const existingBudget =
    await prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
        month,
        year,
        id: excludeBudgetId
          ? {
              not: excludeBudgetId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

  if (existingBudget) {
    throw new BudgetAlreadyExistsError();
  }
}

async function validateBudgetCategory(
  userId: string,
  categoryId: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: {
      type: true,
    },
  });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  if (category.type !== "EXPENSE") {
    throw new InvalidBudgetCategoryError();
  }
}

const budgetSelect = {
  id: true,
  userId: true,
  amount: true,
  month: true,
  year: true,
  createdAt: true,
  updatedAt: true,

  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true,
      isActive: true,
    },
  },
} as const;

interface DecimalValue {
  toNumber(): number;
}

interface SerializableBudget {
  id: string;
  userId: string;
  amount: DecimalValue;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;

  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
    isActive: boolean;
  };
}

async function addBudgetProgress(
  budget: SerializableBudget,
) {
  const budgets = await addBudgetsProgress([
    budget,
  ]);
  const budgetWithProgress = budgets[0];

  if (!budgetWithProgress) {
    throw new Error(
      "Não foi possível calcular o progresso do orçamento.",
    );
  }

  return budgetWithProgress;
}

async function addBudgetsProgress(
  budgets: SerializableBudget[],
) {
  if (budgets.length === 0) {
    return [];
  }

  const firstBudget = budgets[0];

  if (!firstBudget) {
    return [];
  }

  const starts = budgets.map((budget) =>
    createPeriodStart(
      budget.month,
      budget.year,
    ),
  );

  const ends = budgets.map((budget) =>
    createPeriodEnd(
      budget.month,
      budget.year,
    ),
  );

  const rangeStart = new Date(
    Math.min(...starts.map((date) => date.getTime())),
  );

  const rangeEnd = new Date(
    Math.max(...ends.map((date) => date.getTime())),
  );

  const categoryIds = [
    ...new Set(
      budgets.map((budget) => budget.category.id),
    ),
  ];

  const entries = await prisma.entry.findMany({
    where: {
      userId: firstBudget.userId,
      categoryId: {
        in: categoryIds,
      },
      type: "EXPENSE",
      status: "COMPLETED",
      dueDate: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    select: {
      categoryId: true,
      dueDate: true,
      amount: true,
    },
  });

  const spentByPeriod = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.categoryId) {
      continue;
    }

    const key = createPeriodKey(
      entry.categoryId,
      entry.dueDate.getUTCMonth() + 1,
      entry.dueDate.getUTCFullYear(),
    );

    const currentAmount =
      spentByPeriod.get(key) ?? 0;

    spentByPeriod.set(
      key,
      roundMoney(
        currentAmount + entry.amount.toNumber(),
      ),
    );
  }

  return budgets.map((budget) => {
    const amount = budget.amount.toNumber();
    const spentAmount =
      spentByPeriod.get(
        createPeriodKey(
          budget.category.id,
          budget.month,
          budget.year,
        ),
      ) ?? 0;

    const remainingAmount = roundMoney(
      amount - spentAmount,
    );

    const percentageUsed = roundPercentage(
      (spentAmount / amount) * 100,
    );

    return {
      id: budget.id,
      amount,
      month: budget.month,
      year: budget.year,
      category: budget.category,
      spentAmount,
      remainingAmount,
      percentageUsed,
      exceeded: spentAmount >= amount,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  });
}

function createPeriodStart(
  month: number,
  year: number,
) {
  return new Date(
    Date.UTC(year, month - 1, 1),
  );
}

function createPeriodEnd(
  month: number,
  year: number,
) {
  return new Date(
    Date.UTC(year, month, 1),
  );
}

function createPeriodKey(
  categoryId: string,
  month: number,
  year: number,
) {
  return `${categoryId}:${year}:${month}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
