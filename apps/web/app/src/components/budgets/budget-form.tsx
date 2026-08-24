"use client";

import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  LoaderCircle,
  Save,
  Tags,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  type Budget,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  budgetMonthOptions,
  createBudget,
  formatBudgetPeriod,
  listBudgets,
  updateBudget,
} from "../../lib/budgets";

import {
  type Category,
  getCategoryFallbackColor,
  listCategories,
} from "../../lib/categories";

import {
  ApiError,
  clearStoredSession,
} from "../../lib/api";

import { formatMoney } from "../../lib/accounts";

import { CategoryIcon } from "../categories/category-icon";

interface BudgetFormProps {
  budget?: Budget;
  onSuccess?: (budget: Budget) => void;
}

interface BudgetFormState {
  categoryId: string;
  amount: string;
  month: number;
  year: number;
}

export function BudgetForm({
  budget,
  onSuccess,
}: BudgetFormProps) {
  const isEditing = Boolean(budget);
  const budgetId = budget?.id;
  const budgetCategoryId = budget?.category.id;

  const [form, setForm] =
    useState<BudgetFormState>(() =>
      createInitialForm(budget),
    );

  const [initialState, setInitialState] =
    useState<BudgetFormState>(() =>
      createInitialForm(budget),
    );

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [existingBudgets, setExistingBudgets] =
    useState<Budget[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setIsLoadingOptions(true);
        setErrorMessage("");

        const [categoryData, budgetData] =
          await Promise.all([
            listCategories(),
            listBudgets(),
          ]);

        if (cancelled) {
          return;
        }

        setCategories(categoryData);
        setExistingBudgets(budgetData);

        if (!budgetId) {
          setForm((current) => {
            if (current.categoryId) {
              return current;
            }

            const firstCategory = categoryData.find(
              (category) =>
                category.type === "EXPENSE" &&
                category.isActive &&
                !budgetData.some(
                  (item) =>
                    item.category.id === category.id &&
                    item.month === current.month &&
                    item.year === current.year,
                ),
            );

            return firstCategory
              ? {
                  ...current,
                  categoryId: firstCategory.id,
                }
              : current;
          });
        }
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          clearStoredSession();
          window.location.replace("/login");
          return;
        }

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar categorias e orçamentos.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  const hasChanges = useMemo(
    () =>
      JSON.stringify(form) !==
      JSON.stringify(initialState),
    [form, initialState],
  );

  const parsedAmount = useMemo(
    () => parseMoney(form.amount),
    [form.amount],
  );

  const selectableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === "EXPENSE" &&
          (category.isActive ||
            category.id === budgetCategoryId),
      ),
    [budgetCategoryId, categories],
  );

  const selectedCategory =
    selectableCategories.find(
      (category) =>
        category.id === form.categoryId,
    ) ??
    (budget?.category.id === form.categoryId
      ? budget.category
      : null);

  const hasDuplicate = useMemo(
    () =>
      Boolean(form.categoryId) &&
      existingBudgets.some(
        (item) =>
          item.id !== budgetId &&
          item.category.id === form.categoryId &&
          item.month === form.month &&
          item.year === form.year,
      ),
    [
      budgetId,
      existingBudgets,
      form.categoryId,
      form.month,
      form.year,
    ],
  );

  function clearFeedback() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateForm<
    K extends keyof BudgetFormState,
  >(
    field: K,
    value: BudgetFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    clearFeedback();
  }

  function categoryHasBudget(categoryId: string) {
    return existingBudgets.some(
      (item) =>
        item.id !== budgetId &&
        item.category.id === categoryId &&
        item.month === form.month &&
        item.year === form.year,
    );
  }

  function validateForm() {
    if (!form.categoryId) {
      return "Selecione uma categoria de despesa.";
    }

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return "Informe um valor de orçamento maior que zero.";
    }

    if (form.month < 1 || form.month > 12) {
      return "Informe um mês válido.";
    }

    if (form.year < 2000 || form.year > 2100) {
      return "Informe um ano entre 2000 e 2100.";
    }

    if (hasDuplicate) {
      return "Esta categoria já possui orçamento no período selecionado.";
    }

    return "";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      clearFeedback();

      let savedBudget: Budget;
      let message: string;

      if (budget) {
        const input: UpdateBudgetInput = {
          categoryId: form.categoryId,
          amount: parsedAmount,
          month: form.month,
          year: form.year,
        };

        const response = await updateBudget(
          budget.id,
          input,
        );

        savedBudget = response.budget;
        message = response.message;
      } else {
        const input: CreateBudgetInput = {
          categoryId: form.categoryId,
          amount: parsedAmount,
          month: form.month,
          year: form.year,
        };

        const response = await createBudget(input);

        savedBudget = response.budget;
        message = response.message;
      }

      const savedForm = createInitialForm(
        savedBudget,
      );

      setForm(savedForm);
      setInitialState(savedForm);
      setExistingBudgets((current) => [
        ...current.filter(
          (item) => item.id !== savedBudget.id,
        ),
        savedBudget,
      ]);
      setSuccessMessage(message);

      onSuccess?.(savedBudget);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        clearStoredSession();
        window.location.replace("/login");
        return;
      }

      if (error instanceof ApiError) {
        setErrorMessage(
          error.payload.errors?.[0]?.message ??
            error.message,
        );
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Não foi possível atualizar o orçamento."
            : "Não foi possível criar o orçamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const categoryColor =
    selectedCategory?.color ||
    getCategoryFallbackColor("EXPENSE");

  const saveDisabled =
    isSubmitting ||
    isLoadingOptions ||
    !form.categoryId ||
    hasDuplicate ||
    (isEditing && !hasChanges);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.8rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_18px_55px_rgba(21,53,36,0.07)] sm:p-7"
      >
        <form onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="categoryId"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Categoria de despesa
            </label>

            <div className="group relative mt-2">
              <Tags className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

              <select
                id="categoryId"
                value={form.categoryId}
                disabled={
                  isSubmitting ||
                  isLoadingOptions ||
                  selectableCategories.length === 0
                }
                onChange={(event) =>
                  updateForm(
                    "categoryId",
                    event.target.value,
                  )
                }
                className={selectClassName}
              >
                <option value="">
                  {isLoadingOptions
                    ? "Carregando categorias..."
                    : "Selecione uma categoria"}
                </option>

                {selectableCategories.map(
                  (category) => {
                    const unavailable =
                      categoryHasBudget(category.id);

                    return (
                      <option
                        key={category.id}
                        value={category.id}
                        disabled={unavailable}
                      >
                        {category.name}
                        {unavailable
                          ? " — já possui orçamento"
                          : ""}
                      </option>
                    );
                  },
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
            </div>

            {hasDuplicate && (
              <p className="mt-2 text-xs leading-5 text-[#bd5c2b]">
                Esta categoria já possui orçamento no período selecionado.
              </p>
            )}

            {!isLoadingOptions &&
              selectableCategories.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-[#7f8b83]">
                  Cadastre uma categoria de despesa ativa antes de criar um
                  orçamento.{" "}
                  <Link
                    href="/categories/new"
                    className="font-semibold text-[#0c754b] underline underline-offset-2"
                  >
                    Criar categoria
                  </Link>
                </p>
              )}
          </div>

          <div className="mt-6">
            <label
              htmlFor="amount"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Valor do orçamento
            </label>

            <div className="group relative mt-2">
              <CircleDollarSign className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

              <input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "amount",
                    sanitizeMoneyInput(
                      event.target.value,
                    ),
                  )
                }
                className={inputClassName}
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7f8b83]">
              Defina quanto pretende gastar com esta categoria no período.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="month"
                className="block text-sm font-semibold text-[#2e3c34]"
              >
                Mês
              </label>

              <div className="group relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

                <select
                  id="month"
                  value={form.month}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    updateForm(
                      "month",
                      Number(event.target.value),
                    )
                  }
                  className={selectClassName}
                >
                  {budgetMonthOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
              </div>
            </div>

            <div>
              <label
                htmlFor="year"
                className="block text-sm font-semibold text-[#2e3c34]"
              >
                Ano
              </label>

              <input
                id="year"
                type="number"
                min={2000}
                max={2100}
                value={form.year}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "year",
                    Number(event.target.value),
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl border border-[#d8e1da] bg-[#fafcfb] px-4 text-sm text-[#17211c] outline-none transition focus:border-[#65b98a] focus:bg-white focus:ring-4 focus:ring-[#24b46b]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {errorMessage && (
              <Feedback
                key="error"
                message={errorMessage}
                variant="error"
              />
            )}

            {successMessage && (
              <Feedback
                key="success"
                message={successMessage}
                variant="success"
              />
            )}
          </AnimatePresence>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting || !hasChanges}
              onClick={() => {
                setForm(initialState);
                clearFeedback();
              }}
              className="min-h-12 rounded-2xl border border-[#d7e0d9] bg-white px-5 text-sm font-semibold text-[#4e5b53] transition hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Desfazer alterações
            </button>

            <motion.button
              type="submit"
              disabled={saveDisabled}
              whileHover={
                saveDisabled ? undefined : { y: -2 }
              }
              whileTap={
                saveDisabled
                  ? undefined
                  : { scale: 0.98 }
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#138153] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(12,79,56,0.22)] transition disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {isEditing
                    ? "Salvar alterações"
                    : "Criar orçamento"}
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.section>

      <aside className="space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#073c2b] to-[#10784d] p-5 text-white shadow-[0_18px_55px_rgba(7,60,43,0.18)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
          />

          <div className="relative z-10">
            <p className="text-xs text-white/55">
              Pré-visualização
            </p>

            <div className="mt-4 rounded-[1.4rem] bg-white p-4 text-[#17211c] shadow-lg">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${categoryColor}18`,
                    color: categoryColor,
                  }}
                >
                  <CategoryIcon
                    iconName={
                      selectedCategory?.icon ?? null
                    }
                    type="EXPENSE"
                    className="size-6"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {selectedCategory?.name ??
                      "Categoria"}
                  </h2>

                  <p className="mt-1 text-xs text-[#7a867e]">
                    {formatBudgetPeriod(
                      form.month,
                      form.year,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-[#edf1ee] pt-4">
                <p className="text-xs text-[#7a867e]">
                  Valor planejado
                </p>

                <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#0c7b4e]">
                  {formatMoney(
                    Number.isFinite(parsedAmount)
                      ? parsedAmount
                      : 0,
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-[1.6rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)]"
        >
          <h2 className="font-bold">
            Planejamento mensal
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#748078]">
            Apenas lançamentos de despesa concluídos no mês selecionado entram
            no cálculo do orçamento.
          </p>
        </motion.section>
      </aside>
    </div>
  );
}

function Feedback({
  message,
  variant,
}: {
  message: string;
  variant: "error" | "success";
}) {
  const success = variant === "success";
  const Icon = success
    ? CheckCircle2
    : CircleAlert;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        success
          ? "border-[#b9e1c8] bg-[#eaf8ef] text-[#0b7046]"
          : "border-[#f0cac7] bg-[#fff1f0] text-[#ad3d3d]"
      }`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <p className="leading-5">{message}</p>
    </motion.div>
  );
}

function createInitialForm(
  budget?: Budget,
): BudgetFormState {
  const today = new Date();

  return {
    categoryId: budget?.category.id ?? "",
    amount: formatMoneyInput(
      budget?.amount ?? 0,
    ),
    month: budget?.month ?? today.getMonth() + 1,
    year: budget?.year ?? today.getFullYear(),
  };
}

function sanitizeMoneyInput(value: string) {
  return value
    .replace(/[^\d,.-]/g, "")
    .replace(/(?!^)-/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/(,.*),/g, "$1");
}

function parseMoney(value: string) {
  const sanitized = value.trim();

  if (!sanitized) {
    return 0;
  }

  if (
    sanitized.includes(",") &&
    sanitized.includes(".")
  ) {
    return Number(
      sanitized
        .replace(/\./g, "")
        .replace(",", "."),
    );
  }

  return Number(sanitized.replace(",", "."));
}

function formatMoneyInput(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const inputClassName = `
  min-h-14 w-full rounded-2xl
  border border-[#d8e1da]
  bg-[#fafcfb]
  pl-12 pr-4
  text-sm text-[#17211c]
  outline-none transition
  placeholder:text-[#99a49d]
  focus:border-[#65b98a]
  focus:bg-white
  focus:ring-4
  focus:ring-[#24b46b]/10
  disabled:cursor-not-allowed
  disabled:opacity-60
`;

const selectClassName = `
  min-h-14 w-full appearance-none
  rounded-2xl border border-[#d8e1da]
  bg-[#fafcfb] pl-12 pr-11
  text-sm text-[#17211c]
  outline-none transition
  focus:border-[#65b98a]
  focus:bg-white
  focus:ring-4
  focus:ring-[#24b46b]/10
  disabled:cursor-not-allowed
  disabled:opacity-60
`;
