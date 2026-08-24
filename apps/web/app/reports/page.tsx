"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calculator,
  CircleDollarSign,
  Hash,
  RefreshCw,
  Scale,
  TrendingUp,
} from "lucide-react";

import { AccountBreakdown } from "../src/components/reports/account-breakdown";
import { BudgetOverview } from "../src/components/reports/budget-overview";
import { CashFlowChart } from "../src/components/reports/cash-flow-chart";
import { CategoryBreakdownChart } from "../src/components/reports/category-breakdown-chart";
import { GoalsOverview } from "../src/components/reports/goals-overview";
import { AppShell } from "../src/components/layout/app-shell";
import {
  ReportFiltersPanel,
  type ReportPeriodPreset,
} from "../src/components/reports/report-filters";
import { ReportSummaryCard } from "../src/components/reports/report-summary-card";
import { Skeleton } from "../src/components/ui/skeleton";
import { useReports } from "../src/hooks/use-reports";
import { formatMoney } from "../src/lib/accounts";
import {
  type ReportFilters,
  formatReportPeriod,
  formatReportPercentage,
} from "../src/lib/reports";

export default function ReportsPage() {
  const [preset, setPreset] =
    useState<ReportPeriodPreset>(
      "THIS_MONTH",
    );

  const [filters, setFilters] =
    useState<ReportFilters>(() =>
      createDefaultFilters(),
    );

  const {
    report,
    isLoading,
    errorMessage,
    reload,
  } = useReports(filters);

  if (isLoading && !report) {
    return (
      <AppShell>
        <ReportsSkeleton />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <ReportsError
          message={
            errorMessage ||
            "Relatórios indisponíveis no momento."
          }
          onRetry={() => void reload()}
        />
      </AppShell>
    );
  }

  const comparison =
    report.overview.comparison;

  const comparisonLabel =
    comparison?.label ??
    report.period.comparisonLabel;

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
              Relatórios
            </h1>

            <p className="mt-0.5 truncate text-xs text-[#78847c]">
              {formatReportPeriod(
                report.period.dateFrom,
                report.period.dateTo,
              )}
            </p>
          </div>

          {isLoading && (
            <span className="hidden items-center gap-2 text-xs font-semibold text-[#748078] sm:flex">
              <RefreshCw className="size-3.5 animate-spin" />
              Atualizando
            </span>
          )}

          <button
            type="button"
            aria-label="Atualizar relatórios"
            disabled={isLoading}
            onClick={() => void reload()}
            className="flex size-11 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#526058] shadow-sm transition hover:-translate-y-0.5 hover:text-[#0c4f38] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <RefreshCw
              className={`size-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <ReportFiltersPanel
          filters={filters}
          preset={preset}
          accounts={
            report.filterOptions.accounts
          }
          categories={
            report.filterOptions.categories
          }
          disabled={isLoading}
          onPresetChange={setPreset}
          onFiltersChange={setFilters}
        />

        {errorMessage && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-[#f0b7b4] bg-[#fff3f2] p-4 text-sm text-[#a93632] sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="min-h-10 shrink-0 rounded-xl bg-white px-4 text-xs font-bold shadow-sm transition hover:bg-[#fffafa]"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportSummaryCard
            label="Receitas"
            value={formatMoney(
              report.overview.totalIncome,
            )}
            description="Entradas concluídas"
            icon={ArrowUpRight}
            variant="positive"
            changePercentage={
              comparison?.incomeChangePercentage ??
              null
            }
            comparisonLabel={comparisonLabel}
          />

          <ReportSummaryCard
            label="Despesas"
            value={formatMoney(
              report.overview.totalExpense,
            )}
            description="Saídas concluídas"
            icon={ArrowDownRight}
            variant="negative"
            changePercentage={
              comparison?.expenseChangePercentage ??
              null
            }
            comparisonLabel={comparisonLabel}
            favorableWhen="down"
          />

          <ReportSummaryCard
            label="Resultado"
            value={formatMoney(
              report.overview.netResult,
            )}
            description="Receitas menos despesas"
            icon={Scale}
            variant={
              report.overview.netResult >= 0
                ? "positive"
                : "negative"
            }
            changePercentage={
              comparison?.netResultChangePercentage ??
              null
            }
            comparisonLabel={comparisonLabel}
          />

          <ReportSummaryCard
            label="Taxa de economia"
            value={
              report.overview.savingsRate === null
                ? "—"
                : formatReportPercentage(
                    report.overview.savingsRate,
                  )
            }
            description={
              report.overview.savingsRate === null
                ? "Sem receita para calcular"
                : "Resultado sobre as receitas"
            }
            icon={TrendingUp}
            variant={
              report.overview.savingsRate !== null &&
              report.overview.savingsRate >= 0
                ? "positive"
                : "neutral"
            }
          />
        </section>

        <PeriodReading
          transactionCount={
            report.overview.transactionCount
          }
          averageExpense={
            report.overview.averageExpense
          }
          largestExpense={
            report.overview.largestExpense
          }
          largestIncome={
            report.overview.largestIncome
          }
        />

        <CashFlowChart
          series={report.cashFlow.series}
          granularity={
            report.cashFlow.granularity
          }
        />

        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <CategoryBreakdownChart
            categories={report.categories}
          />
          <AccountBreakdown
            accounts={report.accounts}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <BudgetOverview
            budgets={report.budgets}
          />
          <GoalsOverview goals={report.goals} />
        </div>
      </div>
    </main>
    </AppShell>
  );
}

function PeriodReading({
  transactionCount,
  averageExpense,
  largestExpense,
  largestIncome,
}: {
  transactionCount: number;
  averageExpense: number | null;
  largestExpense: number | null;
  largestIncome: number | null;
}) {
  return (
    <section className="rounded-[1.45rem] border border-[#dfe6e1] bg-white p-4 shadow-[0_10px_32px_rgba(21,53,36,0.04)] sm:p-5">
      <div className="flex items-center gap-2 text-[#0c6545]">
        <Calculator className="size-4" />
        <h2 className="text-sm font-bold">
          Leitura do período
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReadingMetric
          label="Lançamentos"
          value={String(transactionCount)}
          icon={Hash}
        />
        <ReadingMetric
          label="Despesa média"
          value={
            averageExpense === null
              ? "—"
              : formatMoney(averageExpense)
          }
          icon={Calculator}
        />
        <ReadingMetric
          label="Maior despesa"
          value={
            largestExpense === null
              ? "—"
              : formatMoney(largestExpense)
          }
          icon={ArrowDownRight}
        />
        <ReadingMetric
          label="Maior receita"
          value={
            largestIncome === null
              ? "—"
              : formatMoney(largestIncome)
          }
          icon={CircleDollarSign}
        />
      </div>
    </section>
  );
}

function ReadingMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#f7faf8] p-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f3ea] text-[#0b8050]">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#7d8981]">
          {label}
        </p>
        <p
          className="mt-0.5 truncate text-sm font-bold text-[#2b3931]"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <main className="min-h-[calc(100dvh-73px)] bg-[#f2f5f2]">
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-40 rounded-[1.6rem]" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                className="h-48 rounded-[1.6rem]"
              />
            ),
          )}
        </div>

        <Skeleton className="h-28 rounded-[1.45rem]" />
        <Skeleton className="h-[430px] rounded-[1.7rem]" />

        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[460px] rounded-[1.7rem]" />
          <Skeleton className="h-[460px] rounded-[1.7rem]" />
        </div>
      </div>
    </main>
  );
}

function ReportsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-[calc(100dvh-73px)] items-center justify-center bg-[#f2f5f2] px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-[#dfe6e1] bg-white p-7 text-center shadow-[0_20px_60px_rgba(20,55,38,0.10)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#e7f5ec] text-[#0c8553]">
          <BarChart3 className="size-6" />
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-[-0.04em]">
          Não foi possível carregar
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#65716a]">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-12 w-full rounded-2xl bg-[#0c4f38] px-5 font-semibold text-white transition hover:bg-[#0a422f] active:scale-[0.98]"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}

function createDefaultFilters(): ReportFilters {
  const today = new Date();

  return {
    month: today.getUTCMonth() + 1,
    year: today.getUTCFullYear(),
  };
}
