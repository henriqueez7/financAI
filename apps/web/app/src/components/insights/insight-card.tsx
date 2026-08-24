"use client";

import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

import type {
  FinancialInsight,
  InsightSeverity,
} from "../../lib/insights";
import { InsightIcon } from "./insight-icon";

interface InsightCardProps {
  insight?: FinancialInsight;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  actionOverride?: {
    label: string;
    href: string;
  };
}

const severityStyles: Record<
  InsightSeverity,
  string
> = {
  CRITICAL: "bg-[#ffddd8]/15 text-[#ffd0c8] ring-[#ffb8ad]/20",
  WARNING: "bg-[#ffde8a]/15 text-[#ffe3a0] ring-[#ffe3a0]/20",
  POSITIVE: "bg-white/10 text-[#82efb1] ring-white/10",
  INFO: "bg-white/10 text-[#b9ead0] ring-white/10",
};

export function InsightCard({
  insight,
  isLoading = false,
  errorMessage = "",
  onRetry,
  actionOverride,
}: InsightCardProps) {
  const title = isLoading
    ? "Analisando seus dados"
    : errorMessage
      ? "Insight indisponível"
      : insight?.title ?? "Tudo começa com seus dados";

  const message = isLoading
    ? "Estamos calculando os fatos financeiros deste mês."
    : errorMessage
      ? "Não foi possível carregar seu insight agora."
      : insight?.message ??
        "Ainda não há dados suficientes neste período para gerar um insight financeiro.";

  const severity = insight?.severity ?? "INFO";
  const action = actionOverride ?? insight?.action;
  const safeAction =
    action && isSafeInternalHref(action.href)
      ? action
      : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={isLoading ? undefined : { y: -3 }}
      aria-busy={isLoading}
      className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-r from-[#073c2b] via-[#0b5c3e] to-[#10784d] p-5 text-white shadow-[0_20px_55px_rgba(7,60,43,0.18)] sm:p-6"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.1] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${severityStyles[severity]}`}
          >
            {errorMessage ? (
              <RefreshCw className="size-6" />
            ) : (
              <InsightIcon
                type={insight?.type}
                className={`size-6 ${isLoading ? "animate-pulse" : ""}`}
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">{title}</h2>

              <span className="rounded-full bg-[#29c97a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                Baseado em dados
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              {message}
            </p>
          </div>
        </div>

        {safeAction && insight && !isLoading && !errorMessage ? (
          <Link
            href={safeAction.href}
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
          >
            {safeAction.label}
            <ChevronRight className="size-4" />
          </Link>
        ) : errorMessage && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
          >
            Tentar novamente
            <RefreshCw className="size-4" />
          </button>
        ) : null}
      </div>
    </motion.article>
  );
}

function isSafeInternalHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return false;
  }

  try {
    const trustedOrigin = "https://finance-ai.invalid";
    const parsedUrl = new URL(href, trustedOrigin);

    return parsedUrl.origin === trustedOrigin;
  } catch {
    return false;
  }
}
