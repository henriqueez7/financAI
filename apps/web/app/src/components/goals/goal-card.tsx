"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Plus,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";

import { formatMoney } from "../../lib/accounts";
import {
  type Goal,
  formatGoalDate,
} from "../../lib/goals";

import { GoalIcon } from "./goal-icon";
import { GoalProgress } from "./goal-progress";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const color = goal.color || "#0C7A4D";
  const canContribute =
    goal.status !== "PAUSED" &&
    goal.status !== "CANCELLED";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-[1.65rem] border border-[#dfe6e1] bg-white shadow-[0_12px_38px_rgba(21,53,36,0.05)] transition-shadow hover:shadow-[0_18px_46px_rgba(21,53,36,0.09)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color }}
      />

      <Link
        href={`/goals/${goal.id}`}
        className="block p-5 pb-4 sm:p-6 sm:pb-4"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: `${color}18`,
              color,
            }}
          >
            <GoalIcon
              iconName={goal.icon}
              className="size-5"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold tracking-[-0.025em] text-[#26312b]">
                  {goal.name}
                </h2>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#849087]">
                  {goal.description ||
                    "Objetivo financeiro pessoal"}
                </p>
              </div>

              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#98a29b] transition group-hover:bg-[#f0f5f1] group-hover:text-[#0c4f38]">
                <ChevronRight className="size-4" />
              </div>
            </div>

            <div className="mt-5">
              <GoalProgress
                percentage={goal.percentageCompleted}
                status={goal.status}
                overdue={goal.overdue}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf1ee] pt-4">
          <GoalValue
            label="Acumulado"
            value={formatMoney(goal.currentAmount)}
            icon={WalletCards}
          />

          <GoalValue
            label="Objetivo"
            value={formatMoney(goal.targetAmount)}
            icon={CircleDollarSign}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span
            className={
              goal.remainingAmount > 0
                ? "font-semibold text-[#66736b]"
                : "font-semibold text-[#0b7f4d]"
            }
          >
            {goal.remainingAmount > 0
              ? `Faltam ${formatMoney(goal.remainingAmount)}`
              : goal.remainingAmount < 0
                ? `Excedente de ${formatMoney(Math.abs(goal.remainingAmount))}`
                : "Objetivo alcançado"}
          </span>

          {goal.targetDate && (
            <span
              className={`flex items-center gap-1.5 ${
                goal.overdue
                  ? "font-semibold text-[#d44343]"
                  : "text-[#87928b]"
              }`}
            >
              <CalendarDays className="size-3.5" />
              {formatGoalDate(goal.targetDate)}
            </span>
          )}
        </div>
      </Link>

      <div className="border-t border-[#edf1ee] px-5 py-3 sm:px-6">
        <Link
          href={`/goals/${goal.id}#contributions`}
          aria-disabled={!canContribute}
          tabIndex={canContribute ? undefined : -1}
          className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
            canContribute
              ? "bg-[#edf8f1] text-[#0c754b] hover:bg-[#e2f4e9]"
              : "pointer-events-none bg-[#f1f3f1] text-[#9ba39e]"
          }`}
        >
          <Plus className="size-3.5" />
          Adicionar valor
        </Link>
      </div>
    </motion.article>
  );
}

function GoalValue({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[#89948d]">
        <Icon className="size-3" />
        <span className="text-[10px] font-medium">
          {label}
        </span>
      </div>

      <p
        className="mt-1 truncate text-xs font-bold text-[#344139] sm:text-sm"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
