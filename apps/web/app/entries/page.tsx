"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  CirclePlus,
  Filter,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { AppShell } from "../src/components/layout/app-shell";
import {
  ApiError,
  api,
  clearStoredSession,
} from "../src/lib/api";

type EntryType = "INCOME" | "EXPENSE";

interface EntryAccount {
  id: string;
  name: string;
  type: string;
}

interface EntryCategory {
  id: string;
  name: string;
  type: EntryType;
  icon: string;
  color: string;
}

interface Entry {
  id: string;
  description: string;
  amount: string;
  type: EntryType;
  status: string;
  dueDate: string;
  completedAt: string | null;
  notes: string | null;
  account: EntryAccount;
  category: EntryCategory;
}

interface EntriesResponse {
  entries: Entry[];
}

interface Filters {
  search: string;
  type: "ALL" | EntryType;
  month: string;
  year: string;
}

const currentDate = new Date();

const initialFilters: Filters = {
  search: "",
  type: "ALL",
  month: String(currentDate.getMonth() + 1),
  year: String(currentDate.getFullYear()),
};

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();

      if (appliedFilters.type !== "ALL") {
        params.set("type", appliedFilters.type);
      }

      if (appliedFilters.month && appliedFilters.year) {
        params.set("month", appliedFilters.month);
        params.set("year", appliedFilters.year);
      }

      const queryString = params.toString();
      const response = await api<EntriesResponse>(
        `/entries${queryString ? `?${queryString}` : ""}`,
      );

      setEntries(response.entries);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearStoredSession();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os lançamentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEntries();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = appliedFilters.search
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return entries;
    }

    return entries.filter((entry) => {
      const searchableText = [
        entry.description,
        entry.account.name,
        entry.category.name,
        entry.notes ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return searchableText.includes(normalizedSearch);
    });
  }, [entries, appliedFilters.search]);

  const summary = useMemo(() => {
    return filteredEntries.reduce(
      (result, entry) => {
        const amount = Number(entry.amount);

        if (entry.type === "INCOME") {
          result.income += amount;
        } else {
          result.expense += amount;
        }

        return result;
      },
      {
        income: 0,
        expense: 0,
      },
    );
  }, [filteredEntries]);

  async function handleDelete() {
    if (!entryToDelete) {
      return;
    }

    try {
      setIsDeleting(true);

      await api<void>(`/entries/${entryToDelete.id}`, {
        method: "DELETE",
      });

      setEntries((currentEntries) =>
        currentEntries.filter(
          (entry) => entry.id !== entryToDelete.id,
        ),
      );

      setEntryToDelete(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearStoredSession();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o lançamento.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell>
    <main className="min-h-[calc(100dvh-73px)] bg-[#f2f5f2] text-[#17211c]">
      <header
        className="
          relative z-20
          border-b border-[#dde5df]
          bg-[#f2f5f2]/90
          px-4 py-3 backdrop-blur-xl
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
            className="
              flex size-11 items-center justify-center
              rounded-2xl border border-[#d8e1da]
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
              Lançamentos
            </h1>

            <p className="mt-0.5 text-xs text-[#78847c]">
              Consulte e organize suas movimentações.
            </p>
          </div>

          <Link
            href="/entries/new"
            className="
              hidden min-h-11 items-center gap-2
              rounded-2xl
              bg-gradient-to-r
              from-[#0c4f38] to-[#148457]
              px-4 text-sm font-semibold
              text-white
              shadow-[0_14px_30px_rgba(12,79,56,0.22)]
              transition
              hover:-translate-y-0.5
              sm:flex
            "
          >
            <Plus className="size-4" />
            Novo lançamento
          </Link>
        </div>
      </header>

      <div
        className="
          mx-auto max-w-[1440px]
          space-y-5 px-4 pb-28 pt-5
          sm:px-6 lg:px-8 lg:pb-10
        "
      >
        <section
          className="
            grid gap-4
            sm:grid-cols-3
          "
        >
          <SummaryCard
            label="Receitas"
            value={summary.income}
            icon={ArrowUpRight}
            variant="income"
          />

          <SummaryCard
            label="Despesas"
            value={summary.expense}
            icon={ArrowDownRight}
            variant="expense"
          />

          <SummaryCard
            label="Resultado"
            value={summary.income - summary.expense}
            icon={WalletCards}
            variant={
              summary.income - summary.expense >= 0
                ? "income"
                : "expense"
            }
          />
        </section>

        <section
          className="
            rounded-[1.7rem]
            border border-[#dfe6e1]
            bg-white p-4
            shadow-[0_14px_42px_rgba(21,53,36,0.055)]
            sm:p-5
          "
        >
          <div
            className="
              grid gap-3
              md:grid-cols-[1fr_180px_130px_130px_auto]
            "
          >
            <div className="relative">
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
                placeholder="Buscar descrição, conta ou categoria"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                className="
                  min-h-12 w-full rounded-2xl
                  border border-[#dbe4dd]
                  bg-[#fafcfb] pl-11 pr-4
                  text-sm outline-none
                  transition
                  placeholder:text-[#9aa49e]
                  focus:border-[#68b98a]
                  focus:bg-white
                  focus:ring-4
                  focus:ring-[#24b46b]/10
                "
              />
            </div>

            <SelectField
              value={filters.type}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  type: value as Filters["type"],
                }))
              }
              options={[
                { value: "ALL", label: "Todos os tipos" },
                { value: "INCOME", label: "Receitas" },
                { value: "EXPENSE", label: "Despesas" },
              ]}
            />

            <SelectField
              value={filters.month}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  month: value,
                }))
              }
              options={monthOptions}
            />

            <SelectField
              value={filters.year}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  year: value,
                }))
              }
              options={yearOptions}
            />

            <button
              type="button"
              onClick={() => setAppliedFilters(filters)}
              className="
                flex min-h-12 items-center
                justify-center gap-2 rounded-2xl
                bg-[#0c4f38] px-5
                text-sm font-semibold text-white
                transition
                hover:bg-[#0a432f]
                active:scale-[0.98]
              "
            >
              <Filter className="size-4" />
              Filtrar
            </button>
          </div>
        </section>

        <section
          className="
            overflow-hidden rounded-[1.7rem]
            border border-[#dfe6e1]
            bg-white
            shadow-[0_14px_42px_rgba(21,53,36,0.055)]
          "
        >
          <div
            className="
              flex items-center justify-between
              border-b border-[#edf1ee]
              px-5 py-4
            "
          >
            <div>
              <h2 className="font-bold">
                Movimentações
              </h2>

              <p className="mt-1 text-xs text-[#859087]">
                {filteredEntries.length} lançamento
                {filteredEntries.length === 1 ? "" : "s"} encontrado
                {filteredEntries.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadEntries()}
              className="
                flex size-10 items-center justify-center
                rounded-xl border border-[#dce4de]
                text-[#526058]
                transition
                hover:bg-[#f2f7f4]
                active:scale-95
              "
            >
              <RefreshCw className="size-4" />
            </button>
          </div>

          {isLoading ? (
            <EntriesSkeleton />
          ) : errorMessage ? (
            <ErrorState
              message={errorMessage}
              onRetry={() => void loadEntries()}
            />
          ) : filteredEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[#edf1ee]">
              {filteredEntries.map((entry, index) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  onDelete={() => setEntryToDelete(entry)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {entryToDelete && (
          <DeleteDialog
            entry={entryToDelete}
            isDeleting={isDeleting}
            onCancel={() => setEntryToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        )}
      </AnimatePresence>
    </main>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  variant: "income" | "expense";
}) {
  const positive = variant === "income";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        rounded-[1.5rem]
        border border-[#dfe6e1]
        bg-white p-5
        shadow-[0_14px_42px_rgba(21,53,36,0.055)]
      "
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#59665e]">
          {label}
        </p>

        <div
          className={`
            flex size-10 items-center justify-center
            rounded-2xl
            ${
              positive
                ? "bg-[#e4f7eb] text-[#0b9258]"
                : "bg-[#fff0ef] text-[#df4545]"
            }
          `}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <p
        className={`
          mt-5 text-2xl font-bold
          tracking-[-0.045em]
          ${
            positive
              ? "text-[#0c8c57]"
              : "text-[#df4545]"
          }
        `}
      >
        {formatCurrency(value)}
      </p>
    </motion.article>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="
          min-h-12 w-full appearance-none
          rounded-2xl border border-[#dbe4dd]
          bg-[#fafcfb] px-4 pr-10
          text-sm outline-none transition
          focus:border-[#68b98a]
          focus:bg-white
          focus:ring-4
          focus:ring-[#24b46b]/10
        "
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        className="
          pointer-events-none absolute
          right-4 top-1/2 size-4
          -translate-y-1/2
          text-[#849087]
        "
      />
    </div>
  );
}

function EntryRow({
  entry,
  index,
  onDelete,
}: {
  entry: Entry;
  index: number;
  onDelete: () => void;
}) {
  const income = entry.type === "INCOME";
  const amount = Number(entry.amount);

  return (
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.04,
      }}
      className="
        group flex items-center gap-3
        px-4 py-4 transition
        hover:bg-[#fafcfb]
        sm:px-5
      "
    >
      <div
        className={`
          flex size-12 shrink-0
          items-center justify-center
          rounded-2xl
          ${
            income
              ? "bg-[#e4f7eb] text-[#0b9258]"
              : "bg-[#fff0ef] text-[#df4545]"
          }
        `}
      >
        <EntryIcon entry={entry} className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.description}
        </p>

        <div
          className="
            mt-1 flex flex-wrap items-center
            gap-x-2 gap-y-1
            text-xs text-[#849087]
          "
        >
          <span>{entry.account.name}</span>
          <span>•</span>
          <span>{entry.category.name}</span>
          <span>•</span>
          <span>{formatDate(entry.dueDate)}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`
            text-sm font-bold
            sm:text-base
            ${
              income
                ? "text-[#0c955b]"
                : "text-[#df4545]"
            }
          `}
        >
          {income ? "+" : "-"} {formatCurrency(amount)}
        </p>

        <span
          className="
            mt-1 inline-flex rounded-full
            bg-[#edf4ef] px-2 py-1
            text-[10px] font-semibold
            text-[#657169]
          "
        >
          {formatStatus(entry.status)}
        </span>
      </div>

      <div className="hidden items-center gap-1 sm:flex">
        <Link
          href={`/entries/${entry.id}`}
          className="
            flex size-9 items-center justify-center
            rounded-xl text-[#87928b]
            transition
            hover:bg-[#edf4ef]
            hover:text-[#0c4f38]
          "
        >
          <MoreHorizontal className="size-4" />
        </Link>

        <button
          type="button"
          onClick={onDelete}
          className="
            flex size-9 items-center justify-center
            rounded-xl text-[#a66a6a]
            transition
            hover:bg-[#fff0ef]
            hover:text-[#df4545]
          "
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </motion.article>
  );
}

function EntriesSkeleton() {
  return (
    <div className="divide-y divide-[#edf1ee]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="
            flex animate-pulse items-center
            gap-3 px-5 py-4
          "
        >
          <div className="size-12 rounded-2xl bg-[#e5ebe6]" />

          <div className="flex-1">
            <div className="h-4 w-48 rounded bg-[#e5ebe6]" />
            <div className="mt-2 h-3 w-72 max-w-full rounded bg-[#edf1ee]" />
          </div>

          <div className="h-5 w-24 rounded bg-[#e5ebe6]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="
        flex min-h-72 flex-col
        items-center justify-center
        px-5 text-center
      "
    >
      <div
        className="
          flex size-14 items-center justify-center
          rounded-2xl bg-[#fff0ef]
          text-[#df4545]
        "
      >
        <RefreshCw className="size-6" />
      </div>

      <h2 className="mt-5 font-bold">
        Não foi possível carregar
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#748078]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="
          mt-5 min-h-11 rounded-2xl
          bg-[#0c4f38] px-5
          text-sm font-semibold
          text-white transition
          active:scale-[0.98]
        "
      >
        Tentar novamente
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="
        flex min-h-80 flex-col
        items-center justify-center
        px-5 text-center
      "
    >
      <div
        className="
          flex size-16 items-center justify-center
          rounded-[1.4rem]
          bg-[#e6f5eb]
          text-[#0c8b56]
        "
      >
        <ReceiptText className="size-7" />
      </div>

      <h2
        className="
          mt-5 text-xl font-bold
          tracking-[-0.035em]
        "
      >
        Nenhum lançamento encontrado
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#748078]">
        Altere os filtros ou registre sua primeira movimentação.
      </p>

      <Link
        href="/entries/new"
        className="
          mt-6 flex min-h-12 items-center
          gap-2 rounded-2xl
          bg-[#0c4f38] px-5
          text-sm font-semibold
          text-white transition
          hover:bg-[#0a432f]
          active:scale-[0.98]
        "
      >
        <CirclePlus className="size-4" />
        Novo lançamento
      </Link>
    </div>
  );
}

function DeleteDialog({
  entry,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  entry: Entry;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Fechar diálogo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        disabled={isDeleting}
        onClick={onCancel}
        className="
          fixed inset-0 z-50
          bg-[#031b12]/45
          backdrop-blur-sm
        "
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-entry-title"
        aria-describedby="delete-entry-description"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isDeleting) {
            onCancel();
          }
        }}
        initial={{
          opacity: 0,
          y: 24,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.96,
        }}
        className="
          fixed left-1/2 top-1/2 z-[60]
          w-[calc(100%-2rem)]
          max-w-md
          max-h-[calc(100dvh-2rem)]
          -translate-x-1/2
          -translate-y-1/2
          overflow-y-auto
          rounded-[1.7rem]
          border border-[#e3e8e4]
          bg-white p-6
          shadow-[0_30px_90px_rgba(12,40,25,0.3)]
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div
            className="
              flex size-12 items-center justify-center
              rounded-2xl bg-[#fff0ef]
              text-[#df4545]
            "
          >
            <Trash2 className="size-5" />
          </div>

          <button
            type="button"
            aria-label="Fechar diálogo"
            autoFocus
            disabled={isDeleting}
            onClick={onCancel}
            className="
              flex size-11 items-center justify-center
              rounded-xl text-[#849087]
              transition hover:bg-[#f2f5f2]
              focus-visible:outline-none
              focus-visible:ring-4
              focus-visible:ring-[#24b46b]/15
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X className="size-4" />
          </button>
        </div>

        <h2
          id="delete-entry-title"
          className="
            mt-5 text-xl font-bold
            tracking-[-0.035em]
          "
        >
          Excluir lançamento?
        </h2>

        <p id="delete-entry-description" className="mt-3 text-sm leading-6 text-[#6d7971]">
          O lançamento “{entry.description}” será excluído permanentemente.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="
              min-h-12 rounded-2xl
              border border-[#d9e2db]
              bg-white px-4
              text-sm font-semibold
              text-[#455249]
              transition
              hover:bg-[#f7faf8]
              disabled:opacity-60
            "
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="
              flex min-h-12 items-center
              justify-center gap-2
              rounded-2xl
              bg-[#df4545] px-4
              text-sm font-semibold
              text-white transition
              hover:bg-[#c93838]
              disabled:cursor-not-allowed
              disabled:opacity-70
            "
          >
            {isDeleting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Excluindo
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Excluir
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function EntryIcon({
  entry,
  className,
}: {
  entry: Entry;
  className?: string;
}) {
  if (entry.type === "INCOME") {
    return <Landmark className={className} />;
  }

  const icon = entry.category.icon.toLowerCase();

  if (
    icon.includes("utensil") ||
    icon.includes("food")
  ) {
    return <Utensils className={className} />;
  }

  return <ReceiptText className={className} />;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    COMPLETED: "Concluído",
    PENDING: "Pendente",
    CANCELLED: "Cancelado",
  };

  return labels[status] ?? status;
}

const monthOptions = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const yearOptions = Array.from(
  { length: 7 },
  (_, index) => {
    const year = currentDate.getFullYear() - 3 + index;

    return {
      value: String(year),
      label: String(year),
    };
  },
);
