"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Scale,
} from "lucide-react";

import { formatMoney } from "../../lib/accounts";
import {
  type CashFlowGranularity,
  type CashFlowPoint,
  formatCashFlowPeriod,
} from "../../lib/reports";
import { ReportEmptyState } from "./report-empty-state";

export function CashFlowChart({
  series,
  granularity,
}: {
  series: CashFlowPoint[];
  granularity: CashFlowGranularity;
}) {
  const [selectedPeriod, setSelectedPeriod] =
    useState<string | null>(null);

  const hasMovement = series.some(
    (point) =>
      point.income > 0 || point.expense > 0,
  );

  const fallbackPoint =
    [...series]
      .reverse()
      .find(
        (point) =>
          point.income > 0 || point.expense > 0,
      ) ?? series.at(-1);

  const activePoint =
    series.find(
      (point) =>
        point.period === selectedPeriod,
    ) ?? fallbackPoint;

  const maximum = Math.max(
    1,
    ...series.flatMap((point) => [
      point.income,
      point.expense,
    ]),
  );

  return (
    <section className={reportCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#0c6545]">
            <BarChart3 className="size-4" />
            <h2 className="text-base font-bold tracking-[-0.025em] text-[#17211c]">
              Fluxo de caixa
            </h2>
          </div>

          <p className="mt-1 text-xs leading-5 text-[#849087]">
            Entradas e saídas concluídas por {granularity === "DAY" ? "dia" : "mês"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-[#657169]">
          <Legend color="#19a864" label="Receitas" />
          <Legend color="#ef6860" label="Despesas" />
        </div>
      </div>

      {!hasMovement || !activePoint ? (
        <div className="mt-5">
          <ReportEmptyState
            title="Sem movimentações neste período"
            description="Registre receitas ou despesas concluídas para visualizar a evolução do fluxo de caixa."
            icon={BarChart3}
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 rounded-[1.25rem] bg-[#f6f9f7] p-4 sm:grid-cols-3">
            <SelectedValue
              label={formatCashFlowPeriod(
                activePoint.period,
                granularity,
              )}
              value={formatMoney(
                activePoint.net,
              )}
              icon={Scale}
              variant={
                activePoint.net >= 0
                  ? "positive"
                  : "negative"
              }
            />

            <SelectedValue
              label="Receitas"
              value={formatMoney(
                activePoint.income,
              )}
              icon={ArrowUpRight}
              variant="positive"
            />

            <SelectedValue
              label="Despesas"
              value={formatMoney(
                activePoint.expense,
              )}
              icon={ArrowDownRight}
              variant="negative"
            />
          </div>

          <div
            className="mt-5 overflow-x-auto overscroll-x-contain pb-2"
            aria-label="Gráfico interativo do fluxo de caixa"
          >
            <div
              className="flex min-w-max items-end gap-1 rounded-[1.2rem] border border-[#e4ebe6] bg-[linear-gradient(to_bottom,transparent_24%,#edf2ee_25%,transparent_26%,transparent_49%,#edf2ee_50%,transparent_51%,transparent_74%,#edf2ee_75%,transparent_76%)] px-3 pt-5"
              style={{ minHeight: 220 }}
            >
              {series.map((point) => {
                const isActive =
                  point.period ===
                  activePoint.period;

                return (
                  <button
                    key={point.period}
                    type="button"
                    aria-label={`${formatCashFlowPeriod(
                      point.period,
                      granularity,
                    )}: receitas ${formatMoney(
                      point.income,
                    )}, despesas ${formatMoney(
                      point.expense,
                    )}, resultado ${formatMoney(
                      point.net,
                    )}`}
                    aria-pressed={isActive}
                    onClick={() =>
                      setSelectedPeriod(
                        point.period,
                      )
                    }
                    className={`group flex min-h-[196px] w-13 shrink-0 flex-col items-center justify-end rounded-xl px-1 pb-2 pt-3 outline-none transition focus-visible:ring-4 focus-visible:ring-[#24b46b]/20 ${
                      isActive
                        ? "bg-[#e7f5ec]"
                        : "hover:bg-[#f3f7f4]"
                    }`}
                  >
                    <div className="flex h-36 items-end gap-1.5">
                      <span
                        className="w-3 rounded-t-md bg-[#19a864] transition-all group-hover:bg-[#138c54]"
                        style={{
                          height: getBarHeight(
                            point.income,
                            maximum,
                          ),
                        }}
                      />

                      <span
                        className="w-3 rounded-t-md bg-[#ef6860] transition-all group-hover:bg-[#dc514a]"
                        style={{
                          height: getBarHeight(
                            point.expense,
                            maximum,
                          ),
                        }}
                      />
                    </div>

                    <span className="mt-2 whitespace-nowrap text-[10px] font-semibold capitalize text-[#718078]">
                      {formatCashFlowPeriod(
                        point.period,
                        granularity,
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[#87928b]">
            Toque ou navegue pelos períodos para consultar os valores exatos.
          </p>
        </>
      )}
    </section>
  );
}

function SelectedValue({
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
  variant: "positive" | "negative";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          variant === "positive"
            ? "bg-[#e2f5e9] text-[#0b8b55]"
            : "bg-[#fff0ef] text-[#db4d47]"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold capitalize text-[#7b877f]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-[#26342c]">
          {value}
        </p>
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function getBarHeight(
  value: number,
  maximum: number,
) {
  if (value <= 0) {
    return 3;
  }

  return Math.max(
    8,
    Math.round((value / maximum) * 136),
  );
}

const reportCardClass =
  "rounded-[1.7rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] sm:p-6";
