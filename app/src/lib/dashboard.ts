import { api } from "./api";

export type AccountType =
  | "CASH"
  | "CHECKING"
  | "SAVINGS"
  | "CREDIT_CARD"
  | string;

export type EntryType =
  | "INCOME"
  | "EXPENSE";

export interface DashboardAccount {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: string;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCategory {
  id: string;
  name: string;
  type: EntryType;
  icon: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardEntry {
  id: string;
  description: string;
  amount: string;
  type: EntryType;
  status: string;
  source: string;
  dueDate: string;
  completedAt: string | null;
  notes: string | null;
  externalId: string | null;
  userId: string;
  accountId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category: DashboardCategory;
  account: DashboardAccount;
}

export interface DashboardData {
  balance: {
    income: number;
    expense: number;
    total: number;
  };
  accounts: DashboardAccount[];
  recentEntries: DashboardEntry[];
}

interface DashboardResponse {
  dashboard: DashboardData;
}

export async function getDashboard() {
  const response =
    await api<DashboardResponse>("/dashboard");

  return response.dashboard;
}