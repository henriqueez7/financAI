import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
} from "lucide-react";

import { formatMoney } from "../../lib/accounts";
import type { ReportAccountBreakdown } from "../../lib/reports";
import { ReportEmptyState } from "./report-empty-state";

export function AccountBreakdown({
  accounts,
}: {
  accounts: ReportAccountBreakdown[];
}) {
  const maximumMovement = Math.max(
    1,
    ...accounts.flatMap((account) => [
      account.totalIncome,
      account.totalExpense,
    ]),
  );

  return (
    <section className={reportCardClass}>
      <div>
        <div className="flex items-center gap-2 text-[#0c6545]">
          <Landmark className="size-4" />
          <h2 className="text-base font-bold tracking-[-0.025em] text-[#17211c]">
            Movimentação por conta
          </h2>
        </div>

        <p className="mt-1 text-xs leading-5 text-[#849087]">
          Fluxo no período, sem confundir movimentação com saldo atual.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-5">
          <ReportEmptyState
            title="Nenhuma conta movimentada"
            description="As contas usadas em lançamentos concluídos aparecerão nesta comparação."
            icon={Landmark}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {accounts.map((account) => (
            <article
              key={account.accountId ?? "unassigned"}
              className="rounded-[1.25rem] border border-[#e2e9e4] bg-[#fbfcfb] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#e5f3e9] text-[#0c7f50]">
                    <Landmark className="size-4.5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[#2d3a32]">
                      {account.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#7d8981]">
                      {formatAccountType(
                        account.type,
                      )}{" "}
                      · {account.transactionCount}{" "}
                      lançamento
                      {account.transactionCount !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#849087]">
                    Movimento líquido
                  </p>
                  <p
                    className={`mt-1 truncate text-sm font-bold ${
                      account.netMovement >= 0
                        ? "text-[#0b8a54]"
                        : "text-[#d94a45]"
                    }`}
                    title={formatMoney(
                      account.netMovement,
                    )}
                  >
                    {formatMoney(
                      account.netMovement,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MovementBar
                  label="Receitas"
                  value={account.totalIncome}
                  maximum={maximumMovement}
                  icon={ArrowUpRight}
                  variant="income"
                />

                <MovementBar
                  label="Despesas"
                  value={account.totalExpense}
                  maximum={maximumMovement}
                  icon={ArrowDownRight}
                  variant="expense"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MovementBar({
  label,
  value,
  maximum,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  maximum: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  variant: "income" | "expense";
}) {
  const width = Math.max(
    value > 0 ? 2 : 0,
    (value / maximum) * 100,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#6f7b73]">
          <Icon
            className={`size-3.5 ${
              variant === "income"
                ? "text-[#15965b]"
                : "text-[#df514b]"
            }`}
          />
          {label}
        </span>
        <span className="font-bold text-[#344139]">
          {formatMoney(value)}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ede9]">
        <div
          className={`h-full rounded-full ${
            variant === "income"
              ? "bg-[#1cac67]"
              : "bg-[#ed625a]"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function formatAccountType(type: string | null) {
  if (!type) {
    return "Sem vínculo";
  }

  const labels: Record<string, string> = {
    CHECKING: "Conta corrente",
    SAVINGS: "Poupança",
    CASH: "Dinheiro",
    INVESTMENT: "Investimento",
    DIGITAL_WALLET: "Carteira digital",
    OTHER: "Outra conta",
  };

  return labels[type] ?? type;
}

const reportCardClass =
  "rounded-[1.7rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] sm:p-6";
