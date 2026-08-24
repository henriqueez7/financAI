import type {
  GoalStatus,
} from "../../lib/goals";

export type GoalVisualState =
  | "start"
  | "progress"
  | "near"
  | "completed"
  | "overdue"
  | "paused"
  | "cancelled";

interface GoalProgressProps {
  percentage: number;
  status: GoalStatus;
  overdue?: boolean;
  showStatus?: boolean;
}

export function getGoalVisualState({
  percentage,
  status,
  overdue = false,
}: Omit<GoalProgressProps, "showStatus">): GoalVisualState {
  if (status === "CANCELLED") {
    return "cancelled";
  }

  if (status === "PAUSED") {
    return "paused";
  }

  if (overdue) {
    return "overdue";
  }

  if (
    status === "COMPLETED" ||
    percentage >= 100
  ) {
    return "completed";
  }

  if (percentage >= 75) {
    return "near";
  }

  if (percentage > 0) {
    return "progress";
  }

  return "start";
}

export function GoalProgress({
  percentage,
  status,
  overdue = false,
  showStatus = true,
}: GoalProgressProps) {
  const state = getGoalVisualState({
    percentage,
    status,
    overdue,
  });

  const styles: Record<
    GoalVisualState,
    {
      label: string;
      text: string;
      track: string;
      bar: string;
      badge: string;
    }
  > = {
    start: {
      label: "Começando",
      text: "text-[#526058]",
      track: "bg-[#e7ece8]",
      bar: "bg-[#95a49b]",
      badge: "bg-[#eef2ef] text-[#647169]",
    },
    progress: {
      label: "Em progresso",
      text: "text-[#0b7f4d]",
      track: "bg-[#e3f3e9]",
      bar: "bg-gradient-to-r from-[#1fa968] to-[#39ca80]",
      badge: "bg-[#e8f7ed] text-[#0b7f4d]",
    },
    near: {
      label: "Perto da conclusão",
      text: "text-[#0b7f4d]",
      track: "bg-[#dff3e7]",
      bar: "bg-gradient-to-r from-[#15965b] to-[#22c875]",
      badge: "bg-[#e5f7eb] text-[#087247]",
    },
    completed: {
      label: "Concluída",
      text: "text-[#087247]",
      track: "bg-[#d9f0e2]",
      bar: "bg-gradient-to-r from-[#087247] to-[#20b76c]",
      badge: "bg-[#dff5e7] text-[#087247]",
    },
    overdue: {
      label: "Atrasada",
      text: "text-[#d44343]",
      track: "bg-[#f8dddd]",
      bar: "bg-gradient-to-r from-[#df4545] to-[#ee6b62]",
      badge: "bg-[#fff0ef] text-[#cc3f3f]",
    },
    paused: {
      label: "Pausada",
      text: "text-[#9a6819]",
      track: "bg-[#f4ead3]",
      bar: "bg-[#d69a35]",
      badge: "bg-[#fff4dc] text-[#936117]",
    },
    cancelled: {
      label: "Cancelada",
      text: "text-[#707a74]",
      track: "bg-[#e8ece9]",
      bar: "bg-[#9da7a1]",
      badge: "bg-[#eff2f0] text-[#707a74]",
    },
  };

  const currentStyles = styles[state];
  const barWidth = Math.min(
    Math.max(percentage, 0),
    100,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        {showStatus ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${currentStyles.badge}`}
          >
            {currentStyles.label}
          </span>
        ) : (
          <span />
        )}

        <span
          className={`text-xs font-bold ${currentStyles.text}`}
        >
          {percentage.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </span>
      </div>

      <div
        className={`mt-2.5 h-2.5 overflow-hidden rounded-full ${currentStyles.track}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${currentStyles.bar}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
