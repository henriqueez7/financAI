"use client";

import {
  AlertCircle,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";

import type { Category } from "../../lib/categories";

import { CategoryCard } from "./category-card";

interface CategoryListProps {
  categories: Category[];
  search: string;
  isLoading: boolean;
  errorMessage: string;
  onSearchChange: (
    value: string,
  ) => void;
  onRetry: () => void;
}

export function CategoryList({
  categories,
  search,
  isLoading,
  errorMessage,
  onSearchChange,
  onRetry,
}: CategoryListProps) {
  return (
    <section
      className="
        rounded-[1.8rem]
        border border-[#dfe6e1]
        bg-white p-4
        shadow-[0_14px_42px_rgba(21,53,36,0.045)]
        sm:p-6
      "
    >
      <div
        className="
          flex flex-col gap-4
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >
        <div>
          <h2
            className="
              text-lg font-bold
              tracking-[-0.035em]
              text-[#26312b]
            "
          >
            Suas categorias
          </h2>

          <p className="mt-1 text-xs text-[#849087]">
            Organize receitas e despesas para entender melhor seus gastos.
          </p>
        </div>

        <div
          className="
            relative w-full
            lg:max-w-sm
          "
        >
          <Search
            className="
              pointer-events-none
              absolute left-4 top-1/2
              size-4
              -translate-y-1/2
              text-[#96a199]
            "
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(
                event.target.value,
              )
            }
            placeholder="Buscar categoria..."
            className="
              min-h-12 w-full
              rounded-2xl
              border border-[#dce4de]
              bg-[#f8faf8]
              pl-11 pr-4
              text-sm text-[#29352e]
              outline-none
              transition
              placeholder:text-[#9ba49e]
              focus:border-[#83b49b]
              focus:bg-white
              focus:ring-4
              focus:ring-[#1d9d64]/10
            "
          />
        </div>
      </div>

      {isLoading && (
        <CategoryListSkeleton />
      )}

      {!isLoading &&
        Boolean(errorMessage) && (
          <CategoryError
            message={errorMessage}
            onRetry={onRetry}
          />
        )}

      {!isLoading &&
        !errorMessage &&
        categories.length === 0 && (
          <CategoryEmptyState
            hasSearch={Boolean(
              search.trim(),
            )}
          />
        )}

      {!isLoading &&
        !errorMessage &&
        categories.length > 0 && (
          <div
            className="
              mt-6 grid gap-4
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {categories.map(
              (category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                />
              ),
            )}
          </div>
        )}
    </section>
  );
}

function CategoryListSkeleton() {
  return (
    <div
      className="
        mt-6 grid gap-4
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
            h-[190px]
            animate-pulse
            rounded-[1.6rem]
            border border-[#e5ebe7]
            bg-[#f5f8f6]
          "
        />
      ))}
    </div>
  );
}

function CategoryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="
        mt-6 flex flex-col
        items-center
        rounded-[1.6rem]
        border border-[#f0d1ce]
        bg-[#fff7f6]
        px-5 py-10
        text-center
      "
    >
      <div
        className="
          flex size-12
          items-center justify-center
          rounded-2xl
          bg-[#ffe8e6]
          text-[#d84b45]
        "
      >
        <AlertCircle className="size-5" />
      </div>

      <h3
        className="
          mt-4 font-bold
          text-[#343d38]
        "
      >
        Não foi possível carregar as categorias
      </h3>

      <p
        className="
          mt-2 max-w-md
          text-sm leading-6
          text-[#78837c]
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
          bg-[#0c4f38]
          px-4 text-sm
          font-semibold text-white
          transition
          hover:bg-[#0a432f]
          active:scale-[0.98]
        "
      >
        <RefreshCw className="size-4" />
        Tentar novamente
      </button>
    </div>
  );
}

function CategoryEmptyState({
  hasSearch,
}: {
  hasSearch: boolean;
}) {
  return (
    <div
      className="
        mt-6 flex flex-col
        items-center
        rounded-[1.6rem]
        border border-dashed
        border-[#d5dfd8]
        bg-[#f9fbf9]
        px-5 py-12
        text-center
      "
    >
      <div
        className="
          flex size-14
          items-center justify-center
          rounded-2xl
          bg-[#e9f5ed]
          text-[#168455]
        "
      >
        {hasSearch ? (
          <Search className="size-6" />
        ) : (
          <FolderOpen className="size-6" />
        )}
      </div>

      <h3
        className="
          mt-4 text-base font-bold
          text-[#303c35]
        "
      >
        {hasSearch
          ? "Nenhuma categoria encontrada"
          : "Nenhuma categoria cadastrada"}
      </h3>

      <p
        className="
          mt-2 max-w-md
          text-sm leading-6
          text-[#7b867f]
        "
      >
        {hasSearch
          ? "Tente buscar usando outro nome ou tipo de categoria."
          : "Crie categorias para organizar suas receitas e despesas."}
      </p>

      {!hasSearch && (
        <Link
          href="/categories/new"
          className="
            mt-5 flex min-h-11
            items-center justify-center
            gap-2 rounded-2xl
            bg-[#0c4f38]
            px-4 text-sm
            font-semibold text-white
            transition
            hover:bg-[#0a432f]
            active:scale-[0.98]
          "
        >
          <Plus className="size-4" />
          Nova categoria
        </Link>
      )}
    </div>
  );
}