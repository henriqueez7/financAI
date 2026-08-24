import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  ChartPie,
  CircleAlert,
  Goal,
  PiggyBank,
  ReceiptText,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import type { InsightType } from "../../lib/insights";

interface InsightIconProps {
  type?: InsightType;
  className?: string;
}

const iconsByType = {
  EXPENSE_INCREASE: TrendingUp,
  EXPENSE_DECREASE: TrendingDown,
  SAVINGS_RATE_GOOD: PiggyBank,
  SAVINGS_RATE_LOW: WalletCards,
  CATEGORY_CONCENTRATION: ChartPie,
  LARGE_EXPENSE: ReceiptText,
  BUDGET_WARNING: CircleAlert,
  BUDGET_EXCEEDED: ShieldAlert,
  GOAL_NEAR_COMPLETION: Target,
  GOAL_COMPLETED: BadgeCheck,
  GOAL_OVERDUE: Goal,
  NEGATIVE_RESULT: ArrowDownRight,
  POSITIVE_RESULT: ArrowUpRight,
} satisfies Record<InsightType, typeof Sparkles>;

export function InsightIcon({
  type,
  className,
}: InsightIconProps) {
  const Icon = type ? iconsByType[type] : Sparkles;

  return <Icon aria-hidden="true" className={className} />;
}
