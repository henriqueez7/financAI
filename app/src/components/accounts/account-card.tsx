"use client";

import Link from "next/link";
import {
  Banknote,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";

import {
  type Account,
  formatAccountType,
  formatMoney,
} from "../../lib/accounts";

interface AccountCardProps {
  account: Account;
}

export function AccountCard({
  account,
}: AccountCardProps) {
  const Icon = getAccountIcon(account.type);

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -4,
      }}
      transition={{
        duration: 0.22,
      }}
      className="
        group relative overflow-hidden
        rounded-[1.7rem]
        border border-[#dfe6e1]
        bg-white p-5
        shadow-[0_14px_42px_rgba(21,53,36,0.055)]
        transition-shadow
        hover:shadow-[0_20px_55px_rgba(21,53,36,0.10)]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -right-12 -top-12
          size-32 rounded-full
          bg-[#27be73]/[0.07]
          transition duration-500
          group-hover:scale-125
        "
      />

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div
            className={`
              flex size-12 shrink-0
              items-center justify-center
              rounded-2xl
              ${getAccountIconClass(account.type)}
            `}
          >
            <Icon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                className="
                  truncate text-base font-bold
                  tracking-[-0.025em]
                "
              >
                {account.name}
              </h2>

              <span
                className={`
                  shrink-0 rounded-full
                  px-2.5 py-1
                  text-[10px] font-bold
                  uppercase tracking-wide
                  ${
                    account.isActive
                      ? "bg-[#e5f7ec] text-[#0b7f4e]"
                      : "bg-[#edf0ee] text-[#737e77]"
                  }
                `}
              >
                {account.isActive
                  ? "Ativa"
                  : "Inativa"}
              </span>
            </div>

            <p className="mt-1 text-xs text-[#849087]">
              {formatAccountType(account.type)}
            </p>
          </div>

          <Link
            href={`/accounts/${account.id}`}
            aria-label={`Editar conta ${account.name}`}
            className="
              flex size-9 shrink-0
              items-center justify-center
              rounded-xl
              text-[#849087]
              transition
              hover:bg-[#edf4ef]
              hover:text-[#0c4f38]
              active:scale-95
            "
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="mt-7">
          <p className="text-xs font-medium text-[#7b877f]">
            Saldo atual
          </p>

          <p
            className={`
              mt-1 text-2xl font-bold
              tracking-[-0.045em]
              ${
                account.currentBalance >= 0
                  ? "text-[#0c8b56]"
                  : "text-[#df4545]"
              }
            `}
          >
            {formatMoney(account.currentBalance)}
          </p>
        </div>

        <div
          className="
            mt-6 grid gap-3
            sm:grid-cols-2
          "
        >
          <div
            className="
              rounded-2xl
              border border-[#e6ece7]
              bg-[#fafcfb] p-3
            "
          >
            <p className="text-[11px] text-[#87928b]">
              Saldo inicial
            </p>

            <p className="mt-1 text-sm font-semibold">
              {formatMoney(account.initialBalance)}
            </p>
          </div>

          <div
            className="
              rounded-2xl
              border border-[#e6ece7]
              bg-[#fafcfb] p-3
            "
          >
            <p className="text-[11px] text-[#87928b]">
              Lançamentos
            </p>

            <p className="mt-1 text-sm font-semibold">
              {account.entriesCount}
            </p>
          </div>
        </div>

        <Link
          href={`/accounts/${account.id}`}
          className="
            mt-5 flex min-h-11
            items-center justify-center
            rounded-2xl
            border border-[#d7e0d9]
            bg-white px-4
            text-sm font-semibold
            text-[#0c4f38]
            transition
            hover:-translate-y-0.5
            hover:bg-[#f4faf6]
            active:translate-y-0
            active:scale-[0.98]
          "
        >
          Ver detalhes
        </Link>
      </div>
    </motion.article>
  );
}

function getAccountIcon(
  type: Account["type"],
) {
  const icons: Record<
    Account["type"],
    React.ComponentType<{
      className?: string;
    }>
  > = {
    CHECKING: Landmark,
    SAVINGS: PiggyBank,
    CASH: Banknote,
    INVESTMENT: CircleDollarSign,
    DIGITAL_WALLET: Wallet,
    OTHER: Building2,
  };

  return icons[type];
}

function getAccountIconClass(
  type: Account["type"],
) {
  const classes: Record<
    Account["type"],
    string
  > = {
    CHECKING:
      "bg-[#ede7ff] text-[#6e3ac5]",
    SAVINGS:
      "bg-[#e3f7ea] text-[#0b8c56]",
    CASH:
      "bg-[#fff2dc] text-[#b97914]",
    INVESTMENT:
      "bg-[#e7f0ff] text-[#356ccc]",
    DIGITAL_WALLET:
      "bg-[#e3f7f3] text-[#0b8b74]",
    OTHER:
      "bg-[#eef1ef] text-[#67736b]",
  };

  return classes[type];
}