"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";

import { CategoryIcon } from "../categories/category-icon";

import {
  type Budget,
  formatBudgetPeriod,
} from "../../lib/budgets";

import { formatMoney } from "../../lib/accounts";
import { getCategoryFallbackColor } from "../../lib/categories";

import { BudgetProgress } from "./budget-progress";

interface BudgetCardProps {
  budget: Budget;
}

export function BudgetCard({
  budget,
}: BudgetCardProps) {
  const color =
    budget.category.color ||
    getCategoryFallbackColor("EXPENSE");

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
        href={`/budgets/${budget.id}`}
        className="block p-5 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: `${color}18`,
              color,
            }}
          >
            <CategoryIcon
              iconName={budget.category.icon}
              type={budget.category.type}
              className="size-5"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold tracking-[-0.025em] text-[#26312b]">
                  {budget.category.name}
                </h2>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#849087]">
                  <CalendarDays className="size-3.5" />
                  {formatBudgetPeriod(
                    budget.month,
                    budget.year,
                  )}
                </div>
              </div>

              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#98a29b] transition group-hover:bg-[#f0f5f1] group-hover:text-[#0c4f38]">
                <ChevronRight className="size-4" />
              </div>
            </div>

            <div className="mt-5">
              <BudgetProgress
                percentage={budget.percentageUsed}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#edf1ee] pt-4">
          <BudgetValue
            label="Orçado"
            value={formatMoney(budget.amount)}
            icon={CircleDollarSign}
          />

          <BudgetValue
            label="Gasto"
            value={formatMoney(
              budget.spentAmount,
            )}
            icon={ReceiptText}
          />

          <BudgetValue
            label="Restante"
            value={formatMoney(
              budget.remainingAmount,
            )}
            icon={WalletCards}
            negative={
              budget.remainingAmount < 0
            }
          />
        </div>
      </Link>
    </motion.article>
  );
}

function BudgetValue({
  label,
  value,
  icon: Icon,
  negative = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  negative?: boolean;
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
        className={`mt-1 truncate text-xs font-bold sm:text-sm ${
          negative
            ? "text-[#d44343]"
            : "text-[#344139]"
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
