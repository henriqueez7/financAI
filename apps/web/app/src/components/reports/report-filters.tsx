"use client";

import { useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  Filter,
  RotateCcw,
} from "lucide-react";

import type {
  ReportFilterAccount,
  ReportFilterCategory,
  ReportFilters,
  ReportEntryType,
} from "../../lib/reports";

export type ReportPeriodPreset =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "THIS_YEAR"
  | "CUSTOM";

const presetOptions: Array<{
  value: ReportPeriodPreset;
  label: string;
}> = [
  { value: "THIS_MONTH", label: "Este mês" },
  { value: "LAST_MONTH", label: "Mês passado" },
  {
    value: "LAST_3_MONTHS",
    label: "Últimos 3 meses",
  },
  {
    value: "LAST_6_MONTHS",
    label: "Últimos 6 meses",
  },
  { value: "THIS_YEAR", label: "Este ano" },
  { value: "CUSTOM", label: "Personalizado" },
];

export function ReportFiltersPanel({
  filters,
  preset,
  accounts,
  categories,
  disabled = false,
  onPresetChange,
  onFiltersChange,
}: {
  filters: ReportFilters;
  preset: ReportPeriodPreset;
  accounts: ReportFilterAccount[];
  categories: ReportFilterCategory[];
  disabled?: boolean;
  onPresetChange: (
    preset: ReportPeriodPreset,
  ) => void;
  onFiltersChange: (
    filters: ReportFilters,
  ) => void;
}) {
  const todayKey = formatDateInput(
    new Date(),
  );

  const [customDateFrom, setCustomDateFrom] =
    useState(
      filters.dateFrom ??
        formatDateInput(
          new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              1,
            ),
          ),
        ),
    );

  const [customDateTo, setCustomDateTo] =
    useState(filters.dateTo ?? todayKey);

  const availableCategories = filters.type
    ? categories.filter(
        (category) =>
          category.type === filters.type,
      )
    : categories;

  const activeDimensionFilters = [
    filters.accountId,
    filters.categoryId,
    filters.type,
  ].filter(Boolean).length;

  function updatePreset(
    nextPreset: ReportPeriodPreset,
  ) {
    onPresetChange(nextPreset);

    if (nextPreset === "CUSTOM") {
      return;
    }

    onFiltersChange({
      ...getDimensionFilters(filters),
      ...createPeriodFilters(nextPreset),
    });
  }

  function updateType(type: string) {
    const nextType =
      type === "ALL"
        ? undefined
        : (type as ReportEntryType);

    const selectedCategory = categories.find(
      (category) =>
        category.id === filters.categoryId,
    );

    onFiltersChange({
      ...filters,
      type: nextType,
      categoryId:
        selectedCategory &&
        nextType &&
        selectedCategory.type !== nextType
          ? undefined
          : filters.categoryId,
    });
  }

  function clearDimensionFilters() {
    onFiltersChange({
      ...filters,
      accountId: undefined,
      categoryId: undefined,
      type: undefined,
    });
  }

  const customPeriodIsInvalid =
    !customDateFrom ||
    !customDateTo ||
    customDateFrom > customDateTo;

  return (
    <section className="rounded-[1.6rem] border border-[#dfe6e1] bg-white p-4 shadow-[0_12px_38px_rgba(21,53,36,0.045)] sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2 text-[#0c6545]">
            <Filter className="size-4" />
            <h2 className="text-sm font-bold">
              Filtros do relatório
            </h2>

            {activeDimensionFilters > 0 && (
              <span className="rounded-full bg-[#e2f5e9] px-2 py-0.5 text-[10px] font-bold text-[#0b7b4d]">
                {activeDimensionFilters} ativo
                {activeDimensionFilters > 1
                  ? "s"
                  : ""}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-5 text-[#849087]">
            Compare períodos e refine somente os lançamentos concluídos.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            id="reportPeriod"
            label="Período"
            value={preset}
            disabled={disabled}
            onChange={(value) =>
              updatePreset(
                value as ReportPeriodPreset,
              )
            }
          >
            {presetOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="reportAccount"
            label="Conta"
            value={filters.accountId ?? "ALL"}
            disabled={disabled}
            onChange={(value) =>
              onFiltersChange({
                ...filters,
                accountId:
                  value === "ALL"
                    ? undefined
                    : value,
              })
            }
          >
            <option value="ALL">
              Todas as contas
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
                {!account.isActive
                  ? " (inativa)"
                  : ""}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="reportCategory"
            label="Categoria"
            value={filters.categoryId ?? "ALL"}
            disabled={disabled}
            onChange={(value) =>
              onFiltersChange({
                ...filters,
                categoryId:
                  value === "ALL"
                    ? undefined
                    : value,
              })
            }
          >
            <option value="ALL">
              Todas as categorias
            </option>

            {availableCategories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                  {!category.isActive
                    ? " (inativa)"
                    : ""}
                </option>
              ),
            )}
          </FilterSelect>

          <FilterSelect
            id="reportType"
            label="Tipo"
            value={filters.type ?? "ALL"}
            disabled={disabled}
            onChange={updateType}
          >
            <option value="ALL">
              Receitas e despesas
            </option>
            <option value="INCOME">
              Somente receitas
            </option>
            <option value="EXPENSE">
              Somente despesas
            </option>
          </FilterSelect>
        </div>
      </div>

      {preset === "CUSTOM" && (
        <div className="mt-4 grid gap-3 border-t border-[#e5ebe7] pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <DateInput
            id="reportDateFrom"
            label="Data inicial"
            value={customDateFrom}
            max={customDateTo || undefined}
            disabled={disabled}
            onChange={setCustomDateFrom}
          />

          <DateInput
            id="reportDateTo"
            label="Data final"
            value={customDateTo}
            min={customDateFrom || undefined}
            disabled={disabled}
            onChange={setCustomDateTo}
          />

          <button
            type="button"
            disabled={
              disabled || customPeriodIsInvalid
            }
            onClick={() =>
              onFiltersChange({
                ...getDimensionFilters(filters),
                dateFrom: customDateFrom,
                dateTo: customDateTo,
              })
            }
            className="min-h-12 rounded-2xl bg-[#0c4f38] px-5 text-sm font-semibold text-white transition hover:bg-[#0a422f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Aplicar período
          </button>
        </div>
      )}

      {activeDimensionFilters > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={clearDimensionFilters}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#607067] transition hover:bg-[#edf4ef] hover:text-[#0c6545] disabled:opacity-55"
        >
          <RotateCcw className="size-3.5" />
          Limpar conta, categoria e tipo
        </button>
      )}
    </section>
  );
}

function FilterSelect({
  id,
  label,
  value,
  disabled,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 xl:w-48">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#7b877f]"
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={selectClassName}
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
      </div>
    </div>
  );
}

function DateInput({
  id,
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#7b877f]"
      >
        {label}
      </label>

      <div className="relative">
        <CalendarRange className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7d8b82]" />

        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="min-h-12 w-full rounded-2xl border border-[#dbe4dd] bg-[#f8faf8] pl-11 pr-3 text-sm font-semibold text-[#344139] outline-none transition focus:border-[#65b98a] focus:bg-white focus:ring-4 focus:ring-[#24b46b]/10 disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>
    </div>
  );
}

function getDimensionFilters(
  filters: ReportFilters,
) {
  return {
    accountId: filters.accountId,
    categoryId: filters.categoryId,
    type: filters.type,
  };
}

function createPeriodFilters(
  preset: Exclude<
    ReportPeriodPreset,
    "CUSTOM"
  >,
): ReportFilters {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  if (preset === "THIS_MONTH") {
    return {
      month: month + 1,
      year,
    };
  }

  if (preset === "LAST_MONTH") {
    const lastMonth = new Date(
      Date.UTC(year, month - 1, 1),
    );

    return {
      month: lastMonth.getUTCMonth() + 1,
      year: lastMonth.getUTCFullYear(),
    };
  }

  const dateTo = formatDateInput(today);

  if (preset === "THIS_YEAR") {
    return {
      dateFrom: `${year}-01-01`,
      dateTo,
    };
  }

  const months =
    preset === "LAST_3_MONTHS" ? 3 : 6;

  return {
    dateFrom: formatDateInput(
      new Date(
        Date.UTC(year, month - months + 1, 1),
      ),
    ),
    dateTo,
  };
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

const selectClassName = `
  min-h-12 w-full appearance-none
  rounded-2xl border border-[#dbe4dd]
  bg-[#f8faf8] px-3 pr-9
  text-sm font-semibold text-[#344139]
  outline-none transition
  focus:border-[#65b98a]
  focus:bg-white
  focus:ring-4
  focus:ring-[#24b46b]/10
  disabled:cursor-not-allowed
  disabled:opacity-55
`;
