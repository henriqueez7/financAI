interface BudgetProgressProps {
  percentage: number;
  showStatus?: boolean;
}

export type BudgetHealthStatus =
  | "healthy"
  | "attention"
  | "near-limit"
  | "exceeded";

export function getBudgetHealthStatus(
  percentage: number,
): BudgetHealthStatus {
  if (percentage >= 100) {
    return "exceeded";
  }

  if (percentage >= 90) {
    return "near-limit";
  }

  if (percentage >= 70) {
    return "attention";
  }

  return "healthy";
}

export function getBudgetStatusLabel(
  status: BudgetHealthStatus,
) {
  const labels: Record<
    BudgetHealthStatus,
    string
  > = {
    healthy: "Dentro do orçamento",
    attention: "Atenção",
    "near-limit": "Próximo do limite",
    exceeded: "Excedido",
  };

  return labels[status];
}

export function BudgetProgress({
  percentage,
  showStatus = true,
}: BudgetProgressProps) {
  const status = getBudgetHealthStatus(
    percentage,
  );

  const styles: Record<
    BudgetHealthStatus,
    {
      text: string;
      track: string;
      bar: string;
      badge: string;
    }
  > = {
    healthy: {
      text: "text-[#0b7f4d]",
      track: "bg-[#e3f3e9]",
      bar: "bg-gradient-to-r from-[#1fa968] to-[#39ca80]",
      badge: "bg-[#e8f7ed] text-[#0b7f4d]",
    },
    attention: {
      text: "text-[#a26b13]",
      track: "bg-[#f8edcf]",
      bar: "bg-gradient-to-r from-[#d99a2b] to-[#e9b849]",
      badge: "bg-[#fff5dd] text-[#99630f]",
    },
    "near-limit": {
      text: "text-[#c86427]",
      track: "bg-[#fae5d8]",
      bar: "bg-gradient-to-r from-[#e77b35] to-[#ef984f]",
      badge: "bg-[#fff0e6] text-[#b95720]",
    },
    exceeded: {
      text: "text-[#d44343]",
      track: "bg-[#f8dddd]",
      bar: "bg-gradient-to-r from-[#df4545] to-[#ee6b62]",
      badge: "bg-[#fff0ef] text-[#cc3f3f]",
    },
  };

  const currentStyles = styles[status];
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
            {getBudgetStatusLabel(status)}
          </span>
        ) : (
          <span />
        )}

        <span
          className={`text-xs font-bold ${currentStyles.text}`}
        >
          {formatPercentage(percentage)}
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

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}
