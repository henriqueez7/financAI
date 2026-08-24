"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  RefreshCw,
  Target,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";

import {
  GoalList,
  type GoalStatusFilter,
} from "../src/components/goals/goal-list";
import { AppShell } from "../src/components/layout/app-shell";
import { useGoals } from "../src/hooks/use-goals";
import { formatMoney } from "../src/lib/accounts";

export default function GoalsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<GoalStatusFilter>("ALL");

  const {
    goals,
    isLoading,
    errorMessage,
    reload,
  } = useGoals();

  const filteredGoals = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("pt-BR");

    return goals.filter((goal) => {
      if (
        status !== "ALL" &&
        goal.status !== status
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [goal.name, goal.description ?? ""]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    });
  }, [goals, search, status]);

  const summary = useMemo(
    () =>
      goals.reduce(
        (result, goal) => {
          if (goal.status === "ACTIVE") {
            result.active += 1;
          }

          if (goal.status === "COMPLETED") {
            result.completed += 1;
          }

          if (goal.status !== "CANCELLED") {
            result.currentAmount +=
              goal.currentAmount;
            result.targetAmount +=
              goal.targetAmount;
          }

          return result;
        },
        {
          active: 0,
          completed: 0,
          currentAmount: 0,
          targetAmount: 0,
        },
      ),
    [goals],
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
              Metas financeiras
            </h1>

            <p className="mt-0.5 truncate text-xs text-[#78847c]">
              Construa seus objetivos, um aporte de cada vez.
            </p>
          </div>

          <button
            type="button"
            aria-label="Atualizar metas"
            onClick={() => void reload()}
            className="hidden size-11 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#526058] shadow-sm transition hover:-translate-y-0.5 hover:text-[#0c4f38] active:translate-y-0 active:scale-95 sm:flex"
          >
            <RefreshCw className="size-4" />
          </button>

          <Link
            href="/goals/new"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#148457] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(12,79,56,0.22)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:flex"
          >
            <Plus className="size-4" />
            Nova meta
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Metas ativas"
            value={String(summary.active)}
            description="Objetivos em andamento"
            icon={Target}
            variant="positive"
          />

          <SummaryCard
            label="Valor acumulado"
            value={formatMoney(
              summary.currentAmount,
            )}
            description="Somado nas metas válidas"
            icon={WalletCards}
            variant="positive"
          />

          <SummaryCard
            label="Valor objetivo"
            value={formatMoney(
              summary.targetAmount,
            )}
            description="Total planejado"
            icon={CircleDollarSign}
            variant="neutral"
          />

          <SummaryCard
            label="Concluídas"
            value={String(summary.completed)}
            description="Objetivos alcançados"
            icon={CheckCircle2}
            variant="positive"
          />
        </section>

        <GoalList
          goals={filteredGoals}
          search={search}
          status={status}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
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
  variant: "positive" | "neutral";
}) {
  const variants = {
    positive: {
      icon: "bg-[#e4f7eb] text-[#0b9258]",
      value: "text-[#0c8c57]",
      decoration: "bg-[#2bc277]/[0.07]",
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

          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
          >
            <Icon className="size-5" />
          </div>
        </div>

        <p
          className={`mt-5 truncate text-2xl font-bold tracking-[-0.045em] ${styles.value}`}
          title={value}
        >
          {value}
        </p>

        <p className="mt-2 text-xs text-[#87928b]">
          {description}
        </p>
      </div>
    </motion.article>
  );
}
