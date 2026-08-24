"use client";

import Link from "next/link";
import {
  AlertCircle,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import type { Budget } from "../../lib/budgets";

import { BudgetCard } from "./budget-card";

interface BudgetListProps {
  budgets: Budget[];
  search: string;
  isLoading: boolean;
  errorMessage: string;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
}

export function BudgetList({
  budgets,
  search,
  isLoading,
  errorMessage,
  onSearchChange,
  onRetry,
}: BudgetListProps) {
  return (
    <section className="rounded-[1.8rem] border border-[#dfe6e1] bg-white p-4 shadow-[0_14px_42px_rgba(21,53,36,0.045)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.035em] text-[#26312b]">
            Orçamentos do período
          </h2>

          <p className="mt-1 text-xs text-[#849087]">
            Acompanhe o planejado e o realizado por categoria.
          </p>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#96a199]" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Buscar por categoria..."
            className="min-h-12 w-full rounded-2xl border border-[#dce4de] bg-[#f8faf8] pl-11 pr-4 text-sm text-[#29352e] outline-none transition placeholder:text-[#9ba49e] focus:border-[#83b49b] focus:bg-white focus:ring-4 focus:ring-[#1d9d64]/10"
          />
        </div>
      </div>

      {isLoading && <BudgetListSkeleton />}

      {!isLoading && Boolean(errorMessage) && (
        <BudgetListError
          message={errorMessage}
          onRetry={onRetry}
        />
      )}

      {!isLoading &&
        !errorMessage &&
        budgets.length === 0 && (
          <BudgetListEmpty
            hasSearch={Boolean(search.trim())}
          />
        )}

      {!isLoading &&
        !errorMessage &&
        budgets.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
              />
            ))}
          </div>
        )}
    </section>
  );
}

function BudgetListSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-[285px] animate-pulse rounded-[1.65rem] border border-[#e5ebe7] bg-[#f5f8f6]"
          />
        ),
      )}
    </div>
  );
}

function BudgetListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-[1.6rem] border border-[#f0d1ce] bg-[#fff7f6] px-5 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#ffe8e6] text-[#d84b45]">
        <AlertCircle className="size-5" />
      </div>

      <h3 className="mt-4 font-bold text-[#343d38]">
        Não foi possível carregar os orçamentos
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#78837c]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0c4f38] px-4 text-sm font-semibold text-white transition hover:bg-[#0a432f] active:scale-[0.98]"
      >
        <RefreshCw className="size-4" />
        Tentar novamente
      </button>
    </div>
  );
}

function BudgetListEmpty({
  hasSearch,
}: {
  hasSearch: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-[1.6rem] border border-dashed border-[#d5dfd8] bg-[#f9fbf9] px-5 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#e9f5ed] text-[#168455]">
        {hasSearch ? (
          <Search className="size-6" />
        ) : (
          <PiggyBank className="size-6" />
        )}
      </div>

      <h3 className="mt-4 text-base font-bold text-[#303c35]">
        {hasSearch
          ? "Nenhum orçamento encontrado"
          : "Nenhum orçamento neste período"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#7b867f]">
        {hasSearch
          ? "Tente buscar usando outro nome de categoria."
          : "Defina limites mensais para acompanhar seus gastos por categoria."}
      </p>

      {!hasSearch && (
        <Link
          href="/budgets/new"
          className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0c4f38] px-4 text-sm font-semibold text-white transition hover:bg-[#0a432f] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Novo orçamento
        </Link>
      )}
    </div>
  );
}
