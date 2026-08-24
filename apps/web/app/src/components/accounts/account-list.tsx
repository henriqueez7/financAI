"use client";

import {
  Building2,
  CirclePlus,
  RefreshCw,
  Search,
} from "lucide-react";

import type { Account } from "../../lib/accounts";
import { AccountCard } from "./account-card";

interface AccountListProps {
  accounts: Account[];
  search: string;
  isLoading: boolean;
  errorMessage: string;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
}

export function AccountList({
  accounts,
  search,
  isLoading,
  errorMessage,
  onSearchChange,
  onRetry,
}: AccountListProps) {
  if (isLoading) {
    return <AccountListSkeleton />;
  }

  if (errorMessage) {
    return (
      <AccountListError
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (accounts.length === 0) {
    return (
      <AccountListEmpty
        hasSearch={Boolean(search.trim())}
      />
    );
  }

  return (
    <section>
      <div
        className="
          mb-5 flex flex-col gap-3
          sm:flex-row sm:items-center
          sm:justify-between
        "
      >
        <div>
          <h2
            className="
              text-lg font-bold
              tracking-[-0.03em]
            "
          >
            Suas contas
          </h2>

          <p className="mt-1 text-sm text-[#78847c]">
            {accounts.length} conta
            {accounts.length === 1 ? "" : "s"} encontrada
            {accounts.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search
            className="
              pointer-events-none absolute
              left-4 top-1/2 size-4
              -translate-y-1/2
              text-[#87928b]
            "
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Buscar conta"
            className="
              min-h-12 w-full rounded-2xl
              border border-[#dbe4dd]
              bg-white pl-11 pr-4
              text-sm outline-none
              transition
              placeholder:text-[#99a49d]
              focus:border-[#65b98a]
              focus:ring-4
              focus:ring-[#24b46b]/10
            "
          />
        </div>
      </div>

      <div
        className="
          grid gap-4
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
          />
        ))}
      </div>
    </section>
  );
}

function AccountListSkeleton() {
  return (
    <section>
      <div
        className="
          mb-5 flex flex-col gap-3
          sm:flex-row sm:items-center
          sm:justify-between
        "
      >
        <div>
          <div
            className="
              h-6 w-36 animate-pulse
              rounded-lg bg-[#dfe7e1]
            "
          />

          <div
            className="
              mt-2 h-4 w-24 animate-pulse
              rounded bg-[#e8ede9]
            "
          />
        </div>

        <div
          className="
            h-12 w-full animate-pulse
            rounded-2xl bg-[#e3e9e4]
            sm:max-w-sm
          "
        />
      </div>

      <div
        className="
          grid gap-4
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            key={index}
            className="
              h-80 animate-pulse
              rounded-[1.7rem]
              border border-[#dfe6e1]
              bg-white
            "
          />
        ))}
      </div>
    </section>
  );
}

function AccountListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      className="
        flex min-h-80 flex-col
        items-center justify-center
        rounded-[1.7rem]
        border border-[#dfe6e1]
        bg-white px-5
        text-center
        shadow-[0_14px_42px_rgba(21,53,36,0.055)]
      "
    >
      <div
        className="
          flex size-14 items-center
          justify-center rounded-2xl
          bg-[#fff0ef]
          text-[#df4545]
        "
      >
        <RefreshCw className="size-6" />
      </div>

      <h2
        className="
          mt-5 text-xl font-bold
          tracking-[-0.035em]
        "
      >
        Não foi possível carregar
      </h2>

      <p
        className="
          mt-2 max-w-md
          text-sm leading-6
          text-[#748078]
        "
      >
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="
          mt-5 flex min-h-11
          items-center justify-center
          gap-2 rounded-2xl
          bg-[#0c4f38] px-5
          text-sm font-semibold
          text-white transition
          hover:bg-[#0a432f]
          active:scale-[0.98]
        "
      >
        <RefreshCw className="size-4" />
        Tentar novamente
      </button>
    </section>
  );
}

function AccountListEmpty({
  hasSearch,
}: {
  hasSearch: boolean;
}) {
  return (
    <section
      className="
        flex min-h-80 flex-col
        items-center justify-center
        rounded-[1.7rem]
        border border-dashed
        border-[#d6e1d9]
        bg-white px-5
        text-center
      "
    >
      <div
        className="
          flex size-16 items-center
          justify-center rounded-[1.4rem]
          bg-[#e6f5eb]
          text-[#0c8b56]
        "
      >
        {hasSearch ? (
          <Building2 className="size-7" />
        ) : (
          <CirclePlus className="size-7" />
        )}
      </div>

      <h2
        className="
          mt-5 text-xl font-bold
          tracking-[-0.035em]
        "
      >
        {hasSearch
          ? "Nenhuma conta encontrada"
          : "Você ainda não possui contas"}
      </h2>

      <p
        className="
          mt-2 max-w-md
          text-sm leading-6
          text-[#748078]
        "
      >
        {hasSearch
          ? "Tente buscar por outro nome ou tipo de conta."
          : "Crie sua primeira conta para organizar saldos e lançamentos."}
      </p>
    </section>
  );
}