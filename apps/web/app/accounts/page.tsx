"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CirclePlus,
  Landmark,
  PiggyBank,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";

import { AccountList } from "../src/components/accounts/account-list";
import { AppShell } from "../src/components/layout/app-shell";
import { useAccounts } from "../src/hooks/use-accounts";
import { formatMoney } from "../src/lib/accounts";

export default function AccountsPage() {
  const [search, setSearch] = useState("");

  const {
    accounts,
    isLoading,
    errorMessage,
    reload,
  } = useAccounts();

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return accounts;
    }

    return accounts.filter((account) => {
      const searchableText = [
        account.name,
        account.type,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return searchableText.includes(normalizedSearch);
    });
  }, [accounts, search]);

  const summary = useMemo(() => {
    return accounts.reduce(
      (result, account) => {
        result.totalBalance += account.currentBalance;

        if (account.isActive) {
          result.activeAccounts += 1;
        } else {
          result.inactiveAccounts += 1;
        }

        return result;
      },
      {
        totalBalance: 0,
        activeAccounts: 0,
        inactiveAccounts: 0,
      },
    );
  }, [accounts]);

  return (
    <AppShell>
    <main className="min-h-[calc(100dvh-73px)] bg-[#f2f5f2] text-[#17211c]">
      <header
        className="
          relative z-20
          border-b border-[#dde5df]
          bg-[#f2f5f2]/90
          px-4 py-3
          backdrop-blur-xl
          sm:px-6 lg:px-8
        "
      >
        <div
          className="
            mx-auto flex max-w-[1440px]
            items-center gap-3
          "
        >
          <Link
            href="/dashboard"
            aria-label="Voltar para o dashboard"
            className="
              flex size-11 shrink-0
              items-center justify-center
              rounded-2xl
              border border-[#d8e1da]
              bg-white text-[#0c4f38]
              shadow-sm transition
              hover:-translate-y-0.5
              active:translate-y-0
              active:scale-95
            "
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1
              className="
                truncate text-xl font-bold
                tracking-[-0.035em]
                sm:text-2xl
              "
            >
              Contas
            </h1>

            <p className="mt-0.5 text-xs text-[#78847c]">
              Organize seus saldos e instituições financeiras.
            </p>
          </div>

          <button
            type="button"
            aria-label="Atualizar contas"
            onClick={() => void reload()}
            className="
              hidden size-11 items-center
              justify-center rounded-2xl
              border border-[#d8e1da]
              bg-white text-[#526058]
              shadow-sm transition
              hover:-translate-y-0.5
              hover:text-[#0c4f38]
              active:translate-y-0
              active:scale-95
              sm:flex
            "
          >
            <RefreshCw className="size-4" />
          </button>

          <Link
            href="/accounts/new"
            className="
              hidden min-h-11 items-center
              justify-center gap-2
              rounded-2xl
              bg-gradient-to-r
              from-[#0c4f38] to-[#148457]
              px-4 text-sm font-semibold
              text-white
              shadow-[0_14px_30px_rgba(12,79,56,0.22)]
              transition
              hover:-translate-y-0.5
              active:translate-y-0
              active:scale-[0.98]
              sm:flex
            "
          >
            <Plus className="size-4" />
            Nova conta
          </Link>
        </div>
      </header>

      <div
        className="
          mx-auto max-w-[1440px]
          space-y-6 px-4 pb-28 pt-5
          sm:px-6
          lg:px-8 lg:pb-10 lg:pt-7
        "
      >
        <section
          className="
            grid gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <SummaryCard
            label="Saldo total"
            value={formatMoney(summary.totalBalance)}
            description="Soma dos saldos atuais"
            icon={WalletCards}
            variant={
              summary.totalBalance >= 0
                ? "positive"
                : "negative"
            }
          />

          <SummaryCard
            label="Total de contas"
            value={String(accounts.length)}
            description="Contas cadastradas"
            icon={Landmark}
            variant="neutral"
          />

          <SummaryCard
            label="Contas ativas"
            value={String(summary.activeAccounts)}
            description="Disponíveis para uso"
            icon={PiggyBank}
            variant="positive"
          />

          <SummaryCard
            label="Contas inativas"
            value={String(summary.inactiveAccounts)}
            description="Ocultas em novos lançamentos"
            icon={CirclePlus}
            variant="neutral"
          />
        </section>

        <AccountList
          accounts={filteredAccounts}
          search={search}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onSearchChange={setSearch}
          onRetry={() => void reload()}
        />
      </div>

    </main>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  variant:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const variantClasses = {
    positive: {
      icon: "bg-[#e4f7eb] text-[#0b9258]",
      value: "text-[#0c8c57]",
      decoration: "bg-[#2bc277]/[0.07]",
    },
    negative: {
      icon: "bg-[#fff0ef] text-[#df4545]",
      value: "text-[#df4545]",
      decoration: "bg-[#df4545]/[0.06]",
    },
    neutral: {
      icon: "bg-[#edf2ef] text-[#526058]",
      value: "text-[#17211c]",
      decoration: "bg-[#789186]/[0.06]",
    },
  };

  const classes = variantClasses[variant];

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
        rounded-[1.6rem]
        border border-[#dfe6e1]
        bg-white p-5
        shadow-[0_14px_42px_rgba(21,53,36,0.055)]
        transition-shadow
        hover:shadow-[0_20px_50px_rgba(21,53,36,0.09)]
      "
    >
      <div
        aria-hidden="true"
        className={`
          pointer-events-none absolute
          -right-12 -top-12
          size-32 rounded-full
          transition duration-500
          group-hover:scale-125
          ${classes.decoration}
        `}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[#59665e]">
            {label}
          </p>

          <div
            className={`
              flex size-10 shrink-0
              items-center justify-center
              rounded-2xl
              ${classes.icon}
            `}
          >
            <Icon className="size-5" />
          </div>
        </div>

        <p
          className={`
            mt-5 text-2xl font-bold
            tracking-[-0.045em]
            ${classes.value}
          `}
        >
          {value}
        </p>

        <p className="mt-2 text-xs text-[#87928b]">
          {description}
        </p>
      </div>
    </motion.article>
  );
}
