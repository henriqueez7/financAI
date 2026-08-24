"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Palette,
  Save,
  Tag,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  type Category,
  type CategoryType,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  createCategory,
  formatCategoryType,
  getCategoryFallbackColor,
  updateCategory,
} from "../../lib/categories";

import {
  ApiError,
  clearStoredSession,
} from "../../lib/api";

import {
  CategoryIcon,
  categoryIconOptions,
  getDefaultCategoryIconName,
} from "./category-icon";

interface CategoryFormProps {
  category?: Category;
  onSuccess?: (category: Category) => void;
}

interface CategoryFormState {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isActive: boolean;
}

const categoryTypes: Array<{
  type: CategoryType;
  label: string;
  description: string;
}> = [
  {
    type: "EXPENSE",
    label: "Despesa",
    description: "Para organizar gastos e saídas de dinheiro.",
  },
  {
    type: "INCOME",
    label: "Receita",
    description: "Para organizar ganhos e entradas de dinheiro.",
  },
];

const categoryColors = [
  { value: "#EF4444", label: "Vermelho" },
  { value: "#F97316", label: "Laranja" },
  { value: "#EAB308", label: "Amarelo" },
  { value: "#22C55E", label: "Verde" },
  { value: "#14B8A6", label: "Turquesa" },
  { value: "#0EA5E9", label: "Azul claro" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#6366F1", label: "Índigo" },
  { value: "#8B5CF6", label: "Violeta" },
  { value: "#A855F7", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#64748B", label: "Cinza" },
];

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

export function CategoryForm({
  category,
  onSuccess,
}: CategoryFormProps) {
  const isEditing = Boolean(category);

  const [form, setForm] =
    useState<CategoryFormState>(() =>
      createInitialForm(category),
    );

  const [initialState, setInitialState] =
    useState<CategoryFormState>(() =>
      createInitialForm(category),
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const hasChanges = useMemo(
    () =>
      JSON.stringify(form) !==
      JSON.stringify(initialState),
    [form, initialState],
  );

  const selectedType = categoryTypes.find(
    (option) => option.type === form.type,
  );

  function clearFeedback() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateForm<
    K extends keyof CategoryFormState,
  >(
    field: K,
    value: CategoryFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    clearFeedback();
  }

  function handleTypeChange(type: CategoryType) {
    setForm((current) => {
      const usesDefaultColor =
        current.color.toLocaleLowerCase("en-US") ===
        getCategoryFallbackColor(
          current.type,
        ).toLocaleLowerCase("en-US");

      const usesDefaultIcon =
        current.icon ===
        getDefaultCategoryIconName(current.type);

      return {
        ...current,
        type,
        color: usesDefaultColor
          ? getCategoryFallbackColor(type)
          : current.color,
        icon: usesDefaultIcon
          ? getDefaultCategoryIconName(type)
          : current.icon,
      };
    });

    clearFeedback();
  }

  function validateForm() {
    if (form.name.trim().length < 2) {
      return "Informe um nome com pelo menos 2 caracteres.";
    }

    if (form.name.trim().length > 60) {
      return "O nome deve possuir no máximo 60 caracteres.";
    }

    if (form.icon.trim().length > 50) {
      return "O nome do ícone deve possuir no máximo 50 caracteres.";
    }

    if (!hexColorPattern.test(form.color)) {
      return "Selecione uma cor válida para a categoria.";
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

      let savedCategory: Category;
      let message: string;

      if (category) {
        const input: UpdateCategoryInput = {
          name: form.name.trim(),
          type: form.type,
          icon: form.icon || null,
          color: form.color,
          isActive: form.isActive,
        };

        const response = await updateCategory(
          category.id,
          input,
        );

        savedCategory = response.category;
        message = response.message;
      } else {
        const input: CreateCategoryInput = {
          name: form.name.trim(),
          type: form.type,
          icon: form.icon || null,
          color: form.color,
          isActive: form.isActive,
        };

        const response = await createCategory(input);

        savedCategory = response.category;
        message = response.message;
      }

      const savedForm = createInitialForm(
        savedCategory,
      );

      setForm(savedForm);
      setInitialState(savedForm);
      setSuccessMessage(message);

      onSuccess?.(savedCategory);
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
            ? "Não foi possível atualizar a categoria."
            : "Não foi possível criar a categoria.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const saveDisabled =
    isSubmitting ||
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
              htmlFor="name"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Nome da categoria
            </label>

            <div className="group relative mt-2">
              <Tag className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

              <input
                id="name"
                type="text"
                maxLength={60}
                autoComplete="off"
                placeholder="Ex.: Alimentação, Salário ou Transporte"
                value={form.name}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm("name", event.target.value)
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="type"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Tipo da categoria
            </label>

            <div className="group relative mt-2">
              {form.type === "INCOME" ? (
                <ArrowUpRight className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />
              ) : (
                <ArrowDownRight className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />
              )}

              <select
                id="type"
                value={form.type}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleTypeChange(
                    event.target.value as CategoryType,
                  )
                }
                className="min-h-14 w-full appearance-none rounded-2xl border border-[#d8e1da] bg-[#fafcfb] pl-12 pr-11 text-sm text-[#17211c] outline-none transition focus:border-[#65b98a] focus:bg-white focus:ring-4 focus:ring-[#24b46b]/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {categoryTypes.map((option) => (
                  <option
                    key={option.type}
                    value={option.type}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7f8b83]">
              {selectedType?.description}
            </p>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-[#2e3c34]">
              Ícone
            </legend>

            <p className="mt-1 text-xs leading-5 text-[#7f8b83]">
              Escolha o símbolo que tornará a categoria fácil de reconhecer.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {categoryIconOptions.map((option) => {
                const Icon = option.icon;
                const selected = form.icon === option.name;

                return (
                  <button
                    key={option.name}
                    type="button"
                    aria-label={`Selecionar ícone ${option.label}`}
                    aria-pressed={selected}
                    disabled={isSubmitting}
                    onClick={() =>
                      updateForm("icon", option.name)
                    }
                    className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-[#58af7e] bg-[#edf8f1] text-[#0c754b] ring-2 ring-[#24b46b]/10"
                        : "border-[#dfe6e1] bg-[#fafcfb] text-[#68746c] hover:border-[#b9cec0] hover:bg-white hover:text-[#0c6545]"
                    }`}
                  >
                    <Icon className="size-5" />
                    <span className="text-[10px] font-semibold leading-3">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-[#2e3c34]">
              Cor
            </legend>

            <p className="mt-1 text-xs leading-5 text-[#7f8b83]">
              A cor será usada em cards, indicadores e relatórios.
            </p>

            <div className="mt-3 flex flex-wrap gap-2.5">
              {categoryColors.map((option) => {
                const selected =
                  form.color.toLocaleLowerCase("en-US") ===
                  option.value.toLocaleLowerCase("en-US");

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={`Selecionar cor ${option.label}`}
                    aria-pressed={selected}
                    title={option.label}
                    disabled={isSubmitting}
                    onClick={() =>
                      updateForm("color", option.value)
                    }
                    className={`flex size-10 items-center justify-center rounded-xl border bg-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-[#607068] ring-2 ring-[#1d9d64]/20 ring-offset-2"
                        : "border-[#dbe3dd] hover:-translate-y-0.5 hover:border-[#aebdb3]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="size-6 rounded-lg shadow-sm"
                      style={{
                        backgroundColor: option.value,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <label
              htmlFor="customColor"
              className="mt-4 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[#d8e1da] bg-[#fafcfb] px-4 transition hover:bg-white"
            >
              <Palette className="size-5 text-[#7a867e]" />

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#344139]">
                  Cor personalizada
                </span>
                <span className="mt-0.5 block text-xs uppercase text-[#89948d]">
                  {form.color}
                </span>
              </span>

              <input
                id="customColor"
                type="color"
                value={form.color}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "color",
                    event.target.value.toUpperCase(),
                  )
                }
                className="size-9 cursor-pointer rounded-xl border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              />
            </label>
          </fieldset>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[#dfe6e1] bg-[#fafcfb] p-4">
            <div>
              <p className="text-sm font-semibold">
                Categoria ativa
              </p>

              <p className="mt-1 text-xs leading-5 text-[#7f8b83]">
                Categorias inativas deixam de aparecer em novos lançamentos.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-label="Alterar status da categoria"
              aria-checked={form.isActive}
              disabled={isSubmitting}
              onClick={() =>
                updateForm("isActive", !form.isActive)
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                form.isActive
                  ? "bg-[#0c7a50]"
                  : "bg-[#cad4cd]"
              }`}
            >
              <motion.span
                layout
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 32,
                }}
                className={`absolute top-1 size-5 rounded-full bg-white shadow-sm ${
                  form.isActive ? "left-6" : "left-1"
                }`}
              />
            </button>
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
                    : "Criar categoria"}
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
              <div className="flex items-start gap-3">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${form.color}18`,
                    color: form.color,
                  }}
                >
                  <CategoryIcon
                    iconName={form.icon}
                    type={form.type}
                    className="size-6"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {form.name.trim() ||
                      "Nome da categoria"}
                  </h2>

                  <p className="mt-1 text-xs text-[#7a867e]">
                    {formatCategoryType(form.type)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#edf1ee] pt-4">
                <span className="text-xs text-[#7a867e]">
                  Status
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    form.isActive
                      ? "bg-[#e5f7eb] text-[#0b824f]"
                      : "bg-[#eff1ef] text-[#7f8782]"
                  }`}
                >
                  {form.isActive ? "Ativa" : "Inativa"}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/[0.08] p-3 text-xs text-white/65">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: form.color }}
              />
              {form.color.toUpperCase()}
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
            Organização inteligente
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#748078]">
            Categorias ajudam a comparar receitas e despesas, acompanhar
            orçamentos e identificar padrões na sua vida financeira.
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
  category?: Category,
): CategoryFormState {
  const type = category?.type ?? "EXPENSE";

  return {
    name: category?.name ?? "",
    type,
    icon:
      category?.icon ??
      getDefaultCategoryIconName(type),
    color:
      category?.color ??
      getCategoryFallbackColor(type),
    isActive: category?.isActive ?? true,
  };
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
