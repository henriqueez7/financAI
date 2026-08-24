import { api } from "./api";
import type { CategoryType } from "./categories";

export interface BudgetCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  category: BudgetCategory;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  exceeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetInput {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}

export interface UpdateBudgetInput {
  categoryId?: string;
  amount?: number;
  month?: number;
  year?: number;
}

export interface ListBudgetsFilters {
  categoryId?: string;
  month?: number;
  year?: number;
}

interface BudgetsResponse {
  budgets: Budget[];
}

interface BudgetResponse {
  budget: Budget;
}

interface CreateBudgetResponse {
  message: string;
  budget: Budget;
}

interface UpdateBudgetResponse {
  message: string;
  budget: Budget;
}

export async function listBudgets(
  filters: ListBudgetsFilters = {},
) {
  const searchParams = new URLSearchParams();

  if (filters.categoryId) {
    searchParams.set(
      "categoryId",
      filters.categoryId,
    );
  }

  if (filters.month) {
    searchParams.set(
      "month",
      String(filters.month),
    );
  }

  if (filters.year) {
    searchParams.set(
      "year",
      String(filters.year),
    );
  }

  const query = searchParams.toString();
  const response = await api<BudgetsResponse>(
    `/budgets${query ? `?${query}` : ""}`,
  );

  return response.budgets;
}

export async function getBudget(id: string) {
  const response = await api<BudgetResponse>(
    `/budgets/${id}`,
  );

  return response.budget;
}

export async function createBudget(
  input: CreateBudgetInput,
) {
  return api<CreateBudgetResponse>(
    "/budgets",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateBudget(
  id: string,
  input: UpdateBudgetInput,
) {
  return api<UpdateBudgetResponse>(
    `/budgets/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteBudget(id: string) {
  await api<void>(`/budgets/${id}`, {
    method: "DELETE",
  });
}

export function formatBudgetPeriod(
  month: number,
  year: number,
) {
  const value = new Intl.DateTimeFormat(
    "pt-BR",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const budgetMonthOptions = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];
