import { api } from "./api";

export type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CASH"
  | "INVESTMENT"
  | "DIGITAL_WALLET"
  | "OTHER";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  entriesCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
  isActive?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  initialBalance?: number;
  isActive?: boolean;
}

interface AccountsResponse {
  accounts: Account[];
}

interface AccountResponse {
  account: Account;
}

interface CreateAccountResponse {
  message: string;
  account: Account;
}

interface UpdateAccountResponse {
  message: string;
  account: Account;
}

export async function listAccounts() {
  const response =
    await api<AccountsResponse>("/accounts");

  return response.accounts;
}

export async function getAccount(id: string) {
  const response =
    await api<AccountResponse>(
      `/accounts/${id}`,
    );

  return response.account;
}

export async function createAccount(
  input: CreateAccountInput,
) {
  const response =
    await api<CreateAccountResponse>(
      "/accounts",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

  return response;
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
) {
  const response =
    await api<UpdateAccountResponse>(
      `/accounts/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );

  return response;
}

export async function deleteAccount(
  id: string,
) {
  await api<void>(`/accounts/${id}`, {
    method: "DELETE",
  });
}

export function formatAccountType(
  type: AccountType,
) {
  const labels: Record<
    AccountType,
    string
  > = {
    CHECKING: "Conta Corrente",
    SAVINGS: "Poupança",
    CASH: "Dinheiro",
    INVESTMENT: "Investimento",
    DIGITAL_WALLET: "Carteira Digital",
    OTHER: "Outra",
  };

  return labels[type];
}

export function formatMoney(
  value: number,
) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}