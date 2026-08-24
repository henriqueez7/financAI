"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  DatabaseZap,
  FilePlus2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AiAnalysisCard } from "../src/components/ai/ai-analysis-card";
import { AiLoadingState } from "../src/components/ai/ai-loading-state";
import { AiPriorityList } from "../src/components/ai/ai-priority-list";
import { AiQuestionBox } from "../src/components/ai/ai-question-box";
import { AppShell } from "../src/components/layout/app-shell";
import { Button } from "../src/components/ui/button";
import { useAiAnalysis } from "../src/hooks/use-ai-analysis";
import { formatReportPeriod } from "../src/lib/reports";

export default function AiAnalysisPage() {
  const filters = createCurrentMonthFilters();
  const {
    result,
    isLoading,
    errorMessage,
    analyze,
  } = useAiAnalysis(filters);

  const periodLabel = result
    ? formatReportPeriod(
        result.period.dateFrom,
        result.period.dateTo,
      )
    : "Mês atual";

  return (
    <AppShell>
      <main className="min-h-[calc(100dvh-73px)] bg-[#f2f5f2] text-[#17211c]">
        <header className="border-b border-[#dde5df] bg-[#f2f5f2]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Voltar para o dashboard"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#0c4f38] shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold tracking-[-0.035em] sm:text-2xl">
                Análises com IA
              </h1>
              <p className="mt-0.5 truncate text-xs text-[#78847c]">
                {periodLabel}
              </p>
            </div>

            <button
              type="button"
              aria-label="Gerar nova análise"
              title="Gerar nova análise"
              disabled={isLoading}
              onClick={() => void analyze()}
              className="flex size-11 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#526058] shadow-sm transition hover:-translate-y-0.5 hover:text-[#0c4f38] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RefreshCw
                className={`size-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1320px] space-y-6 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pt-7">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#cde1d4] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#277052]">
                <Sparkles className="size-3.5" />
                IA com base nos seus dados
              </div>
              <h2 className="mt-3 max-w-2xl text-2xl font-bold tracking-[-0.04em] text-[#1f2d25] sm:text-3xl">
                Clareza sobre o que importa agora
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">
                A IA explica e prioriza os fatos calculados pelo Finance AI. Ela não substitui os números dos seus relatórios.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#617168]">
              <ShieldCheck className="size-4 text-[#168356]" />
              Contexto agregado e protegido
            </div>
          </section>

          {isLoading && !result ? (
            <AiLoadingState />
          ) : errorMessage && !result ? (
            <AiErrorState
              message={errorMessage}
              onRetry={() => void analyze()}
            />
          ) : result?.status === "INSUFFICIENT_DATA" ? (
            <AiEmptyState />
          ) : result?.analysis ? (
            <>
              {errorMessage && (
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-2xl border border-[#f0b7b4] bg-[#fff3f2] p-4 text-sm text-[#a93632] sm:flex-row sm:items-center sm:justify-between"
                >
                  <p>{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => void analyze()}
                    className="min-h-10 shrink-0 rounded-xl bg-white px-4 text-xs font-bold shadow-sm"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              <AiAnalysisCard
                analysis={result.analysis}
                periodLabel={periodLabel}
              />

              <AiPriorityList
                priorities={result.analysis.priorities}
                recommendations={result.analysis.recommendations}
              />

              <SourceInsights
                count={result.sourceInsights.length}
                labels={result.sourceInsights
                  .slice(0, 4)
                  .map((insight) => insight.title)}
              />

              <AiQuestionBox
                isLoading={isLoading}
                onAsk={analyze}
              />
            </>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}

function AiEmptyState() {
  return (
    <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-[#dce5df] bg-white p-7 text-center shadow-[0_18px_50px_rgba(24,54,38,0.06)] sm:p-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-[1.3rem] bg-[#e7f6ed] text-[#0d704a]">
        <DatabaseZap className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#25332b]">
        Ainda faltam fatos para analisar
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#748078]">
        Adicione receitas ou despesas neste mês. A primeira análise aparecerá quando houver dados financeiros, orçamentos ou metas relevantes.
      </p>
      <Link
        href="/entries/new"
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#138153] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(12,79,56,0.22)] transition hover:-translate-y-0.5"
      >
        <FilePlus2 className="size-4" />
        Adicionar lançamento
      </Link>
    </section>
  );
}

function AiErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      role="alert"
      className="mx-auto max-w-2xl rounded-[1.75rem] border border-[#ead4bc] bg-white p-7 text-center shadow-[0_18px_50px_rgba(24,54,38,0.06)] sm:p-10"
    >
      <span className="mx-auto flex size-14 items-center justify-center rounded-[1.3rem] bg-[#fff4df] text-[#9a6a1a]">
        <Bot className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#25332b]">
        Análise indisponível agora
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#748078]">
        {message}
      </p>
      <Button onClick={onRetry} className="mt-6">
        <RefreshCw className="size-4" />
        Tentar novamente
      </Button>
    </section>
  );
}

function SourceInsights({
  count,
  labels,
}: {
  count: number;
  labels: string[];
}) {
  return (
    <section className="rounded-[1.4rem] border border-[#dce5df] bg-[#edf5f0] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#18714d]" />
        <div>
          <h3 className="text-xs font-bold text-[#315943]">
            Baseada em Relatórios e {count} insight{count === 1 ? "" : "s"} determinístico{count === 1 ? "" : "s"}
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-[#6d7f74]">
            Os valores vêm de Relatórios; a IA apenas explica e prioriza.
          </p>
        </div>
      </div>

      {labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-0 sm:justify-end">
          {labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#526c5e] shadow-sm"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function createCurrentMonthFilters() {
  const today = new Date();

  return {
    month: today.getUTCMonth() + 1,
    year: today.getUTCFullYear(),
  };
}
