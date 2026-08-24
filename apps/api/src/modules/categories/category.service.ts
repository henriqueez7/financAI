import { prisma } from "../../lib/prisma.js";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schema.js";

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoria não encontrada.");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryAlreadyExistsError extends Error {
  constructor() {
    super(
      "Já existe uma categoria com esse nome e tipo.",
    );

    this.name = "CategoryAlreadyExistsError";
  }
}

export class DefaultCategoryCannotBeDeletedError extends Error {
  constructor() {
    super(
      "Categorias padrão não podem ser excluídas.",
    );

    this.name =
      "DefaultCategoryCannotBeDeletedError";
  }
}

export class CategoryHasEntriesError extends Error {
  constructor() {
    super(
      "Esta categoria possui lançamentos vinculados e não pode ser excluída.",
    );

    this.name = "CategoryHasEntriesError";
  }
}

export class CategoryHasBudgetsError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Esta categoria possui orçamentos vinculados e não pode ser excluída.",
    );

    this.name = "CategoryHasBudgetsError";
  }
}

interface CreateCategoryParams {
  userId: string;
  input: CreateCategoryInput;
}

export async function createCategory({
  userId,
  input,
}: CreateCategoryParams) {
  const existingCategory =
    await prisma.category.findFirst({
      where: {
        userId,
        type: input.type,
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

  if (existingCategory) {
    throw new CategoryAlreadyExistsError();
  }

  const category =
    await prisma.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        icon: input.icon ?? null,
        color: input.color ?? null,
        isActive: input.isActive,
        isDefault: false,
      },
      select: categorySelect,
    });

  return serializeCategory(category);
}

interface ListCategoriesParams {
  userId: string;
}

export async function listCategories({
  userId,
}: ListCategoriesParams) {
  const categories =
    await prisma.category.findMany({
      where: {
        userId,
      },
      select: categorySelect,
      orderBy: [
        {
          isActive: "desc",
        },
        {
          type: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

  return categories.map((category) =>
    serializeCategory(category),
  );
}

interface GetCategoryParams {
  userId: string;
  categoryId: string;
}

export async function getCategory({
  userId,
  categoryId,
}: GetCategoryParams) {
  const category =
    await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: categorySelect,
    });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  return serializeCategory(category);
}

interface UpdateCategoryParams {
  userId: string;
  categoryId: string;
  input: UpdateCategoryInput;
}

export async function updateCategory({
  userId,
  categoryId,
  input,
}: UpdateCategoryParams) {
  const category =
    await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            budgets: true,
          },
        },
      },
    });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  const nextName =
    input.name ?? category.name;

  const nextType =
    input.type ?? category.type;

  const nameChanged =
    nextName.toLocaleLowerCase("pt-BR") !==
    category.name.toLocaleLowerCase("pt-BR");

  const typeChanged =
    nextType !== category.type;

  if (
    typeChanged &&
    category._count.budgets > 0
  ) {
    throw new CategoryHasBudgetsError(
      "Categorias com orçamentos vinculados não podem ter o tipo alterado.",
    );
  }

  if (nameChanged || typeChanged) {
    const existingCategory =
      await prisma.category.findFirst({
        where: {
          userId,
          id: {
            not: category.id,
          },
          type: nextType,
          name: {
            equals: nextName,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

    if (existingCategory) {
      throw new CategoryAlreadyExistsError();
    }
  }

  const updatedCategory =
    await prisma.category.update({
      where: {
        id: category.id,
      },
      data: {
        name: input.name,
        type: input.type,
        icon: input.icon,
        color: input.color,
        isActive: input.isActive,
      },
      select: categorySelect,
    });

  return serializeCategory(
    updatedCategory,
  );
}

interface DeleteCategoryParams {
  userId: string;
  categoryId: string;
}

export async function deleteCategory({
  userId,
  categoryId,
}: DeleteCategoryParams) {
  const category =
    await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: {
        id: true,
        isDefault: true,

        _count: {
          select: {
            entries: true,
            budgets: true,
          },
        },
      },
    });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  if (category.isDefault) {
    throw new DefaultCategoryCannotBeDeletedError();
  }

  if (category._count.entries > 0) {
    throw new CategoryHasEntriesError();
  }

  if (category._count.budgets > 0) {
    throw new CategoryHasBudgetsError();
  }

  await prisma.category.delete({
    where: {
      id: category.id,
    },
  });
}

const categorySelect = {
  id: true,
  name: true,
  type: true,
  icon: true,
  color: true,
  isActive: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,

  _count: {
    select: {
      entries: true,
      budgets: true,
    },
  },
} as const;

interface SerializableCategory {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;

  _count: {
    entries: number;
    budgets: number;
  };
}

function serializeCategory(
  category: SerializableCategory,
) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    isActive: category.isActive,
    isDefault: category.isDefault,
    entriesCount:
      category._count.entries,
    budgetsCount:
      category._count.budgets,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
