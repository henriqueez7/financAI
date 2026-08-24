import {
  AlertTriangle,
  PiggyBank,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { CategoryIcon } from "../categories/category-icon";
import { formatMoney } from "../../lib/accounts";
import { formatBudgetPeriod } from "../../lib/budgets";
import {
  type ReportBudgetOverview,
  formatReportPercentage,
} from "../../lib/reports";
import { ReportEmptyState } from "./report-empty-state";

export function BudgetOverview({
  budgets,
}: {
  budgets: ReportBudgetOverview;
}) {
  return (
    <section className={reportCardClass}>
      <div>
        <div className="flex items-center gap-2 text-[#0c6545]">
          <PiggyBank className="size-4" />
          <h2 className="text-base font-bold tracking-[-0.025em] text-[#17211c]">
            Saúde dos orçamentos
          </h2>
        </div>

        <p className="mt-1 text-xs leading-5 text-[#849087]">
          Planejado e realizado nos orçamentos mensais que cruzam o período.
        </p>
      </div>

      {budgets.items.length === 0 ? (
        <div className="mt-5">
          <ReportEmptyState
            title="Sem orçamentos neste recorte"
            description="Crie orçamentos para acompanhar limites, excessos e categorias próximas do teto."
            icon={PiggyBank}
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BudgetMetric
              label="Orçado"
              value={formatMoney(
                budgets.totalBudgeted,
              )}
              icon={WalletCards}
              variant="neutral"
            />
            <BudgetMetric
              label="Gasto"
              value={formatMoney(
                budgets.totalSpent,
              )}
              icon={PiggyBank}
              variant="neutral"
            />
            <BudgetMetric
              label="Excedidos"
              value={String(
                budgets.exceededBudgets,
              )}
              icon={AlertTriangle}
              variant={
                budgets.exceededBudgets > 0
                  ? "danger"
                  : "positive"
              }
            />
            <BudgetMetric
              label="Próximos do limite"
              value={String(
                budgets.budgetsNearLimit,
              )}
              icon={ShieldCheck}
              variant={
                budgets.budgetsNearLimit > 0
                  ? "warning"
                  : "positive"
              }
            />
          </div>

          <div className="mt-5 space-y-3">
            {budgets.items
              .slice(0, 8)
              .map((budget) => {
                const progress = Math.min(
                  Math.max(
                    budget.percentageUsed,
                    0,
                  ),
                  100,
                );

                return (
                  <article
                    key={budget.id}
                    className="rounded-[1.2rem] border border-[#e3eae5] bg-[#fbfcfb] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white"
                        style={{
                          backgroundColor:
                            budget.category.color ??
                            "#0c7d50",
                        }}
                      >
                        <CategoryIcon
                          iconName={
                            budget.category.icon
                          }
                          type="EXPENSE"
                          className="size-4.5"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-[#334038]">
                              {budget.category.name}
                            </h3>
                            <p className="mt-0.5 text-[11px] capitalize text-[#7f8b83]">
                              {formatBudgetPeriod(
                                budget.month,
                                budget.year,
                              )}
                            </p>
                          </div>

                          <div className="shrink-0 text-left sm:text-right">
                            <p className="text-sm font-bold text-[#26342c]">
                              {formatMoney(
                                budget.spentAmount,
                              )}{" "}
                              <span className="text-xs font-medium text-[#87928b]">
                                de {formatMoney(
                                  budget.amount,
                                )}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e5ece7]">
                          <div
                            className={`h-full rounded-full ${
                              budget.exceeded
                                ? "bg-[#e8554f]"
                                : budget.nearLimit
                                  ? "bg-[#e5a52d]"
                                  : "bg-[#1cad67]"
                            }`}
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                          <span
                            className={
                              budget.remainingAmount >= 0
                                ? "text-[#758179]"
                                : "font-semibold text-[#d94a45]"
                            }
                          >
                            {budget.remainingAmount >= 0
                              ? `Restam ${formatMoney(
                                  budget.remainingAmount,
                                )}`
                              : `Excesso de ${formatMoney(
                                  Math.abs(
                                    budget.remainingAmount,
                                  ),
                                )}`}
                          </span>
                          <span className="font-bold text-[#4a5850]">
                            {formatReportPercentage(
                              budget.percentageUsed,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </>
      )}
    </section>
  );
}

function BudgetMetric({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  variant:
    | "neutral"
    | "positive"
    | "warning"
    | "danger";
}) {
  const styles = {
    neutral: "bg-[#edf2ef] text-[#526058]",
    positive: "bg-[#e3f6ea] text-[#0b8b55]",
    warning: "bg-[#fff5dc] text-[#b2760c]",
    danger: "bg-[#fff0ef] text-[#d94a45]",
  }[variant];

  return (
    <div className="rounded-2xl bg-[#f8faf8] p-3.5">
      <div className="flex items-center gap-2">
        <div className={`flex size-8 items-center justify-center rounded-xl ${styles}`}>
          <Icon className="size-4" />
        </div>
        <span className="text-[11px] font-semibold text-[#77837b]">
          {label}
        </span>
      </div>
      <p className="mt-3 truncate text-base font-bold text-[#27352d]">
        {value}
      </p>
    </div>
  );
}

const reportCardClass =
  "rounded-[1.7rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] sm:p-6";
