"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Layers3,
  LockKeyhole,
  ReceiptText,
} from "lucide-react";
import { motion } from "motion/react";

import {
  type Category,
  formatCategoryType,
  getCategoryFallbackColor,
} from "../../lib/categories";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({
  category,
}: CategoryCardProps) {
  const color =
    category.color ||
    getCategoryFallbackColor(category.type);

  const isIncome =
    category.type === "INCOME";

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.2,
      }}
      className="
        group relative overflow-hidden
        rounded-[1.6rem]
        border border-[#dfe6e1]
        bg-white
        shadow-[0_12px_38px_rgba(21,53,36,0.05)]
        transition-shadow
        hover:shadow-[0_18px_46px_rgba(21,53,36,0.09)]
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute inset-x-0 top-0
          h-1
        "
        style={{
          backgroundColor: color,
        }}
      />

      <Link
        href={`/categories/${category.id}`}
        className="block p-5 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className="
              flex size-12 shrink-0
              items-center justify-center
              rounded-2xl
            "
            style={{
              backgroundColor: `${color}18`,
              color,
            }}
          >
            {isIncome ? (
              <ArrowUpRight className="size-5" />
            ) : (
              <ArrowDownRight className="size-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="
                      truncate text-base
                      font-bold
                      tracking-[-0.025em]
                      text-[#26312b]
                    "
                  >
                    {category.name}
                  </h2>

                  {category.isDefault && (
                    <span
                      className="
                        inline-flex items-center
                        gap-1 rounded-full
                        bg-[#edf2ef]
                        px-2 py-1
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.08em]
                        text-[#647168]
                      "
                    >
                      <LockKeyhole className="size-3" />
                      Padrão
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`
                      inline-flex items-center
                      rounded-full px-2.5 py-1
                      text-xs font-semibold
                      ${
                        isIncome
                          ? "bg-[#e7f8ed] text-[#0c8c57]"
                          : "bg-[#fff0ef] text-[#d94a4a]"
                      }
                    `}
                  >
                    {formatCategoryType(
                      category.type,
                    )}
                  </span>

                  <span
                    className={`
                      inline-flex items-center
                      rounded-full px-2.5 py-1
                      text-xs font-medium
                      ${
                        category.isActive
                          ? "bg-[#eef5f0] text-[#52705e]"
                          : "bg-[#f2f2f2] text-[#8a8f8c]"
                      }
                    `}
                  >
                    {category.isActive
                      ? "Ativa"
                      : "Inativa"}
                  </span>
                </div>
              </div>

              <div
                className="
                  flex size-9 shrink-0
                  items-center justify-center
                  rounded-xl
                  text-[#98a29b]
                  transition
                  group-hover:bg-[#f0f5f1]
                  group-hover:text-[#0c4f38]
                "
              >
                <ChevronRight className="size-4" />
              </div>
            </div>

            <div
              className="
                mt-5 grid grid-cols-2
                gap-3 border-t
                border-[#edf1ee] pt-4
              "
            >
              <div>
                <div
                  className="
                    flex items-center gap-1.5
                    text-[#89948d]
                  "
                >
                  <ReceiptText className="size-3.5" />

                  <span className="text-[11px] font-medium">
                    Lançamentos
                  </span>
                </div>

                <p
                  className="
                    mt-1 text-sm font-bold
                    text-[#344139]
                  "
                >
                  {category.entriesCount}
                </p>
              </div>

              <div>
                <div
                  className="
                    flex items-center gap-1.5
                    text-[#89948d]
                  "
                >
                  <Layers3 className="size-3.5" />

                  <span className="text-[11px] font-medium">
                    Orçamentos
                  </span>
                </div>

                <p
                  className="
                    mt-1 text-sm font-bold
                    text-[#344139]
                  "
                >
                  {category.budgetsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}