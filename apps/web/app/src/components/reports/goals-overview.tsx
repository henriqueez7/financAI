import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Target,
} from "lucide-react";

import { formatMoney } from "../../lib/accounts";
import {
  type ReportGoalsOverview,
  formatReportPercentage,
} from "../../lib/reports";
import { ReportEmptyState } from "./report-empty-state";

export function GoalsOverview({
  goals,
}: {
  goals: ReportGoalsOverview;
}) {
  const hasGoals = goals.totalTargetAmount > 0;
  const visibleProgress = Math.min(
    Math.max(goals.overallProgressPercentage, 0),
    100,
  );

  return (
    <section className={reportCardClass}>
      <div>
        <div className="flex items-center gap-2 text-[#0c6545]">
          <Target className="size-4" />
          <h2 className="text-base font-bold tracking-[-0.025em] text-[#17211c]">
            Evolução das metas
          </h2>
        </div>

        <p className="mt-1 text-xs leading-5 text-[#849087]">
          Panorama atual das metas; aportes não são misturados com lançamentos.
        </p>
      </div>

      {!hasGoals ? (
        <div className="mt-5">
          <ReportEmptyState
            title="Nenhuma meta para acompanhar"
            description="Crie uma meta financeira e registre aportes para visualizar o progresso acumulado."
            icon={Target}
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <GoalMetric
              label="Metas ativas"
              value={String(goals.activeGoals)}
              icon={Target}
              variant="positive"
            />
            <GoalMetric
              label="Concluídas"
              value={String(
                goals.completedGoals,
              )}
              icon={CheckCircle2}
              variant="positive"
            />
            <GoalMetric
              label="Acumulado"
              value={formatMoney(
                goals.totalContributed,
              )}
              icon={CircleDollarSign}
              variant="neutral"
            />
            <GoalMetric
              label="Objetivo total"
              value={formatMoney(
                goals.totalTargetAmount,
              )}
              icon={Target}
              variant="neutral"
            />
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-[#e1e9e3] bg-[#f8faf8] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#657169]">
                  Progresso geral
                </p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#0b8954]">
                  {formatReportPercentage(
                    goals.overallProgressPercentage,
                  )}
                </p>
              </div>

              <p className="text-right text-[11px] leading-5 text-[#7d8981]">
                {formatMoney(
                  goals.totalContributed,
                )}
                <br />
                de {formatMoney(
                  goals.totalTargetAmount,
                )}
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#dfe9e2]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1eb56c] to-[#0c8151]"
                style={{
                  width: `${visibleProgress}%`,
                }}
              />
            </div>
          </div>

          {goals.overdueGoals > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#f0d49c] bg-[#fff8e8] p-4 text-[#8d630f]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs leading-5">
                <strong>
                  {goals.overdueGoals}{" "}
                  {goals.overdueGoals === 1
                    ? "meta ativa está atrasada"
                    : "metas ativas estão atrasadas"}
                </strong>
                . Revise o prazo ou o ritmo dos aportes.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function GoalMetric({
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
  variant: "positive" | "neutral";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#f8faf8] p-3.5">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          variant === "positive"
            ? "bg-[#e3f6ea] text-[#0b8b55]"
            : "bg-[#e9efeb] text-[#56645c]"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#7d8981]">
          {label}
        </p>
        <p
          className="mt-0.5 truncate text-base font-bold text-[#27352d]"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

const reportCardClass =
  "rounded-[1.7rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] sm:p-6";
