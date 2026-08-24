"use client";

import { useState } from "react";
import { Tags } from "lucide-react";

import { CategoryIcon } from "../categories/category-icon";
import { formatMoney } from "../../lib/accounts";
import {
  type ReportCategoryBreakdown,
  formatReportPercentage,
} from "../../lib/reports";
import { ReportEmptyState } from "./report-empty-state";

export function CategoryBreakdownChart({
  categories,
}: {
  categories: ReportCategoryBreakdown[];
}) {
  const [selectedKey, setSelectedKey] =
    useState<string | null>(null);

  const activeCategory =
    categories.find(
      (category) =>
        getCategoryKey(category) === selectedKey,
    ) ?? categories[0];

  return (
    <section className={reportCardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0c6545]">
            <Tags className="size-4" />
            <h2 className="text-base font-bold tracking-[-0.025em] text-[#17211c]">
              Despesas por categoria
            </h2>
          </div>

          <p className="mt-1 text-xs leading-5 text-[#849087]">
            Onde o dinheiro foi mais consumido no período.
          </p>
        </div>
      </div>

      {!activeCategory ? (
        <div className="mt-5">
          <ReportEmptyState
            title="Nenhuma despesa para analisar"
            description="As despesas concluídas aparecerão aqui, ordenadas pelo maior impacto."
            icon={Tags}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
          <div className="mx-auto">
            <div
              role="img"
              aria-label={`Distribuição das despesas. ${activeCategory.name}: ${formatReportPercentage(activeCategory.percentage)}`}
              className="relative flex size-44 items-center justify-center rounded-full"
              style={{
                background:
                  createCategoryGradient(
                    categories,
                  ),
              }}
            >
              <div className="flex size-28 flex-col items-center justify-center rounded-full bg-white px-3 text-center shadow-inner">
                <span className="text-2xl font-bold tracking-[-0.04em] text-[#17211c]">
                  {formatReportPercentage(
                    activeCategory.percentage,
                  )}
                </span>
                <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-[#77837b]">
                  {activeCategory.name}
                </span>
              </div>
            </div>

            <p className="mt-3 text-center text-xs font-semibold text-[#59665e]">
              {formatMoney(activeCategory.amount)}
            </p>
          </div>

          <div className="space-y-2">
            {categories.map((category) => {
              const key = getCategoryKey(category);
              const isActive =
                getCategoryKey(activeCategory) === key;

              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedKey(key)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-[#24b46b]/20 ${
                    isActive
                      ? "border-[#bcdac8] bg-[#f1f8f3]"
                      : "border-transparent hover:border-[#e1e9e3] hover:bg-[#f8faf8]"
                  }`}
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={{
                      backgroundColor: category.color,
                    }}
                  >
                    <CategoryIcon
                      iconName={category.icon}
                      type="EXPENSE"
                      className="size-4.5"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-[#344139]">
                        {category.name}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-[#17211c]">
                        {formatMoney(category.amount)}
                      </p>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-[#7d8981]">
                      <span>
                        {category.transactionCount}{" "}
                        lançamento
                        {category.transactionCount !== 1
                          ? "s"
                          : ""}
                      </span>
                      <span className="font-semibold">
                        {formatReportPercentage(
                          category.percentage,
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function getCategoryKey(
  category: ReportCategoryBreakdown,
) {
  return category.categoryId ?? "uncategorized";
}

function createCategoryGradient(
  categories: ReportCategoryBreakdown[],
) {
  let current = 0;

  const segments = categories.map(
    (category) => {
      const start = current;
      current += category.percentage;
      return `${category.color} ${start}% ${current}%`;
    },
  );

  if (current < 100) {
    segments.push(
      `#e6ede8 ${current}% 100%`,
    );
  }

  return `conic-gradient(${segments.join(", ")})`;
}

const reportCardClass =
  "rounded-[1.7rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] sm:p-6";
