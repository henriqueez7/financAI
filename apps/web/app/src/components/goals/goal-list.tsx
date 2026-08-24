"use client";

import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  Plus,
  RefreshCw,
  Search,
  Target,
} from "lucide-react";

import type {
  Goal,
  GoalStatus,
} from "../../lib/goals";

import { GoalCard } from "./goal-card";

export type GoalStatusFilter =
  | "ALL"
  | GoalStatus;

interface GoalListProps {
  goals: Goal[];
  search: string;
  status: GoalStatusFilter;
  isLoading: boolean;
  errorMessage: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (
    value: GoalStatusFilter,
  ) => void;
  onRetry: () => void;
}

export function GoalList({
  goals,
  search,
  status,
  isLoading,
  errorMessage,
  onSearchChange,
  onStatusChange,
  onRetry,
}: GoalListProps) {
  const hasFilters =
    Boolean(search.trim()) || status !== "ALL";

  return (
    <section className="rounded-[1.8rem] border border-[#dfe6e1] bg-white p-4 shadow-[0_14px_42px_rgba(21,53,36,0.045)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.035em] text-[#26312b]">
            Seus objetivos
          </h2>

          <p className="mt-1 text-xs text-[#849087]">
            Acompanhe cada conquista e mantenha o foco no próximo passo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-[560px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#96a199]" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="Buscar meta..."
              className="min-h-12 w-full rounded-2xl border border-[#dce4de] bg-[#f8faf8] pl-11 pr-4 text-sm text-[#29352e] outline-none transition placeholder:text-[#9ba49e] focus:border-[#83b49b] focus:bg-white focus:ring-4 focus:ring-[#1d9d64]/10"
            />
          </div>

          <div className="relative min-w-0">
            <select
              aria-label="Filtrar metas por status"
              value={status}
              onChange={(event) =>
                onStatusChange(
                  event.target.value as GoalStatusFilter,
                )
              }
              className="min-h-12 w-full appearance-none rounded-2xl border border-[#dce4de] bg-[#f8faf8] px-4 pr-10 text-sm font-semibold text-[#344139] outline-none transition focus:border-[#83b49b] focus:bg-white focus:ring-4 focus:ring-[#1d9d64]/10"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="COMPLETED">Concluídas</option>
              <option value="PAUSED">Pausadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
          </div>
        </div>
      </div>

      {isLoading && <GoalListSkeleton />}

      {!isLoading && Boolean(errorMessage) && (
        <GoalListError
          message={errorMessage}
          onRetry={onRetry}
        />
      )}

      {!isLoading &&
        !errorMessage &&
        goals.length === 0 && (
          <GoalListEmpty hasFilters={hasFilters} />
        )}

      {!isLoading &&
        !errorMessage &&
        goals.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
              />
            ))}
          </div>
        )}
    </section>
  );
}

function GoalListSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-[390px] animate-pulse rounded-[1.65rem] border border-[#e5ebe7] bg-[#f5f8f6]"
          />
        ),
      )}
    </div>
  );
}

function GoalListError({
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
        Não foi possível carregar as metas
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

function GoalListEmpty({
  hasFilters,
}: {
  hasFilters: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-[1.6rem] border border-dashed border-[#d5dfd8] bg-[#f9fbf9] px-5 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#e9f5ed] text-[#168455]">
        {hasFilters ? (
          <Search className="size-6" />
        ) : (
          <Target className="size-6" />
        )}
      </div>

      <h3 className="mt-4 text-base font-bold text-[#303c35]">
        {hasFilters
          ? "Nenhuma meta encontrada"
          : "Você ainda não criou uma meta"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#7b867f]">
        {hasFilters
          ? "Ajuste a busca ou o status para encontrar outros objetivos."
          : "Transforme um plano importante em um objetivo financeiro acompanhável."}
      </p>

      {!hasFilters && (
        <Link
          href="/goals/new"
          className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0c4f38] px-4 text-sm font-semibold text-white transition hover:bg-[#0a432f] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Nova meta
        </Link>
      )}
    </div>
  );
}
