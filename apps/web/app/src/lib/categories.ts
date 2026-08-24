import { api } from "./api";

export type CategoryType =
  | "INCOME"
  | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  isDefault: boolean;
  entriesCount: number;
  budgetsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
}

interface CategoriesResponse {
  categories: Category[];
}

interface CategoryResponse {
  category: Category;
}

interface CreateCategoryResponse {
  message: string;
  category: Category;
}

interface UpdateCategoryResponse {
  message: string;
  category: Category;
}

export async function listCategories() {
  const response =
    await api<CategoriesResponse>(
      "/categories",
    );

  return response.categories;
}

export async function getCategory(
  id: string,
) {
  const response =
    await api<CategoryResponse>(
      `/categories/${id}`,
    );

  return response.category;
}

export async function createCategory(
  input: CreateCategoryInput,
) {
  return api<CreateCategoryResponse>(
    "/categories",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
) {
  return api<UpdateCategoryResponse>(
    `/categories/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteCategory(
  id: string,
) {
  await api<void>(
    `/categories/${id}`,
    {
      method: "DELETE",
    },
  );
}

export function formatCategoryType(
  type: CategoryType,
) {
  const labels: Record<
    CategoryType,
    string
  > = {
    INCOME: "Receita",
    EXPENSE: "Despesa",
  };

  return labels[type];
}

export function getCategoryFallbackColor(
  type: CategoryType,
) {
  return type === "INCOME"
    ? "#22c55e"
    : "#ef4444";
}

export function getCategoryDeletionBlockReason(
  category: Pick<
    Category,
    | "isDefault"
    | "entriesCount"
    | "budgetsCount"
  >,
) {
  if (category.isDefault) {
    return "Categorias padrão não podem ser excluídas.";
  }

  if (
    category.entriesCount > 0 &&
    category.budgetsCount > 0
  ) {
    return "Esta categoria possui lançamentos e orçamentos vinculados e não pode ser excluída.";
  }

  if (category.entriesCount > 0) {
    return "Esta categoria possui lançamentos vinculados e não pode ser excluída.";
  }

  if (category.budgetsCount > 0) {
    return "Esta categoria possui orçamentos vinculados e não pode ser excluída.";
  }

  return "";
}
