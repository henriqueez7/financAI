"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  Plus,
  ReceiptText,
  RefreshCw,
  Tags,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";

import { BudgetList } from "../src/components/budgets/budget-list";
import { AppShell } from "../src/components/layout/app-shell";
import { useBudgets } from "../src/hooks/use-budgets";

import {
  budgetMonthOptions,
  formatBudgetPeriod,
} from "../src/lib/budgets";

import { formatMoney } from "../src/lib/accounts";

const today = new Date();
const currentMonth = today.getMonth() + 1;
const currentYear = today.getFullYear();

const yearOptions = Array.from(
  { length: 7 },
  (_, index) => currentYear - 3 + index,
);

export default function BudgetsPage() {
  const [month, setMonth] =
    useState(currentMonth);

  const [year, setYear] =
    useState(currentYear);

  const [search, setSearch] =
    useState("");

  const {
    budgets,
    isLoading,
    errorMessage,
    reload,
  } = useBudgets({ month, year });

  const filteredBudgets = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return budgets;
    }

    return budgets.filter((budget) =>
      budget.category.name
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [budgets, search]);

  const summary = useMemo(
    () =>
      budgets.reduce(
        (result, budget) => ({
          amount:
            result.amount + budget.amount,
          spent:
            result.spent + budget.spentAmount,
          remaining:
            result.remaining +
            budget.remainingAmount,
          categories:
            result.categories + 1,
        }),
        {
          amount: 0,
          spent: 0,
          remaining: 0,
          categories: 0,
        },
      ),
    [budgets],
  );

  return (
    <AppShell>
    <main className="min-h-[calc(100dvh-73px)] bg-[#f2f5f2] text-[#17211c]">
      <header className="relative z-20 border-b border-[#dde5df] bg-[#f2f5f2]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Voltar para o dashboard"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#0c4f38] shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-[-0.035em] sm:text-2xl">
              Orçamentos
            </h1>

            <p className="mt-0.5 truncate text-xs text-[#78847c]">
              {formatBudgetPeriod(month, year)} · Planejado x realizado
            </p>
          </div>

          <button
            type="button"
            aria-label="Atualizar orçamentos"
            onClick={() => void reload()}
            className="hidden size-11 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#526058] shadow-sm transition hover:-translate-y-0.5 hover:text-[#0c4f38] active:translate-y-0 active:scale-95 sm:flex"
          >
            <RefreshCw className="size-4" />
          </button>

          <Link
            href="/budgets/new"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#148457] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(12,79,56,0.22)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:flex"
          >
            <Plus className="size-4" />
            Novo orçamento
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
        <section className="rounded-[1.6rem] border border-[#dfe6e1] bg-white p-4 shadow-[0_12px_38px_rgba(21,53,36,0.045)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#0c6545]">
                <CalendarRange className="size-4" />
                <h2 className="text-sm font-bold">
                  Período de acompanhamento
                </h2>
              </div>

              <p className="mt-1 text-xs text-[#849087]">
                Altere o mês e o ano para consultar outros planejamentos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="relative min-w-0 sm:w-44">
                <label
                  htmlFor="budgetMonthFilter"
                  className="sr-only"
                >
                  Mês
                </label>

                <select
                  id="budgetMonthFilter"
                  value={month}
                  onChange={(event) =>
                    setMonth(
                      Number(event.target.value),
                    )
                  }
                  className={filterClassName}
                >
                  {budgetMonthOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
              </div>

              <div className="relative min-w-0 sm:w-32">
                <label
                  htmlFor="budgetYearFilter"
                  className="sr-only"
                >
                  Ano
                </label>

                <select
                  id="budgetYearFilter"
                  value={year}
                  onChange={(event) =>
                    setYear(
                      Number(event.target.value),
                    )
                  }
                  className={filterClassName}
                >
                  {yearOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total orçado"
            value={formatMoney(summary.amount)}
            description="Planejado no período"
            icon={CircleDollarSign}
            variant="positive"
          />

          <SummaryCard
            label="Total gasto"
            value={formatMoney(summary.spent)}
            description="Despesas concluídas"
            icon={ReceiptText}
            variant={
              summary.spent > summary.amount &&
              summary.amount > 0
                ? "negative"
                : "neutral"
            }
          />

          <SummaryCard
            label="Restante"
            value={formatMoney(summary.remaining)}
            description="Disponível nos orçamentos"
            icon={WalletCards}
            variant={
              summary.remaining < 0
                ? "negative"
                : "positive"
            }
          />

          <SummaryCard
            label="Categorias"
            value={String(summary.categories)}
            description="Com orçamento definido"
            icon={Tags}
            variant="neutral"
          />
        </section>

        <BudgetList
          budgets={filteredBudgets}
          search={search}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onSearchChange={setSearch}
          onRetry={() => void reload()}
        />
      </div>

    </main>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  variant: "positive" | "negative" | "neutral";
}) {
  const variants = {
    positive: {
      icon: "bg-[#e4f7eb] text-[#0b9258]",
      value: "text-[#0c8c57]",
      decoration: "bg-[#2bc277]/[0.07]",
    },
    negative: {
      icon: "bg-[#fff0ef] text-[#df4545]",
      value: "text-[#df4545]",
      decoration: "bg-[#df4545]/[0.06]",
    },
    neutral: {
      icon: "bg-[#edf2ef] text-[#526058]",
      value: "text-[#17211c]",
      decoration: "bg-[#789186]/[0.06]",
    },
  };

  const styles = variants[variant];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      className="group relative overflow-hidden rounded-[1.6rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] transition-shadow hover:shadow-[0_20px_50px_rgba(21,53,36,0.09)]"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-12 -top-12 size-32 rounded-full transition duration-500 group-hover:scale-125 ${styles.decoration}`}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[#59665e]">
            {label}
          </p>

          <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
            <Icon className="size-5" />
          </div>
        </div>

        <p className={`mt-5 text-2xl font-bold tracking-[-0.045em] ${styles.value}`}>
          {value}
        </p>

        <p className="mt-2 text-xs text-[#87928b]">
          {description}
        </p>
      </div>
    </motion.article>
  );
}

const filterClassName = `
  min-h-12 w-full appearance-none
  rounded-2xl border border-[#dbe4dd]
  bg-[#f8faf8] px-3 pr-9
  text-sm font-semibold text-[#344139]
  outline-none transition
  focus:border-[#65b98a]
  focus:bg-white
  focus:ring-4
  focus:ring-[#24b46b]/10
`;
