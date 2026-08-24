"use client";

import type { ComponentType } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

import { formatSignedPercentage } from "../../lib/reports";

type SummaryVariant =
  | "positive"
  | "negative"
  | "neutral";

export function ReportSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  variant = "neutral",
  changePercentage,
  comparisonLabel,
  favorableWhen = "up",
}: {
  label: string;
  value: string;
  description: string;
  icon: ComponentType<{
    className?: string;
  }>;
  variant?: SummaryVariant;
  changePercentage?: number | null;
  comparisonLabel?: string;
  favorableWhen?: "up" | "down";
}) {
  const styles = {
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
  }[variant];

  const hasChange =
    changePercentage !== undefined &&
    changePercentage !== null;

  const isUp =
    hasChange && changePercentage > 0;

  const isFavorable = hasChange
    ? favorableWhen === "up"
      ? changePercentage >= 0
      : changePercentage <= 0
    : false;

  const TrendIcon =
    isUp ? TrendingUp : TrendingDown;

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

        <p
          className={`mt-5 truncate text-2xl font-bold tracking-[-0.045em] ${styles.value}`}
          title={value}
        >
          {value}
        </p>

        <p className="mt-2 text-xs text-[#87928b]">
          {description}
        </p>

        {comparisonLabel && (
          <div className="mt-4 flex min-h-6 items-center gap-2 text-[11px]">
            {hasChange ? (
              <>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${
                    isFavorable
                      ? "bg-[#e5f7ec] text-[#0b8753]"
                      : "bg-[#fff0ef] text-[#d74343]"
                  }`}
                >
                  <TrendIcon className="size-3" />
                  {formatSignedPercentage(
                    changePercentage,
                  )}
                </span>

                <span className="truncate text-[#87928b]">
                  {comparisonLabel}
                </span>
              </>
            ) : (
              <span className="text-[#87928b]">
                Sem base comparável no período anterior
              </span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
