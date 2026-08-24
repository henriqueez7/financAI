"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  FileText,
  Flag,
  LoaderCircle,
  Palette,
  Save,
  Target,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { formatMoney } from "../../lib/accounts";
import {
  ApiError,
  clearStoredSession,
} from "../../lib/api";
import {
  type CreateGoalInput,
  type Goal,
  type GoalStatus,
  type UpdateGoalInput,
  createGoal,
  formatGoalDate,
  formatGoalStatus,
  updateGoal,
} from "../../lib/goals";

import {
  GoalIcon,
  goalColorOptions,
  goalIconOptions,
} from "./goal-icon";
import { GoalProgress } from "./goal-progress";

interface GoalFormProps {
  goal?: Goal;
  onSuccess?: (goal: Goal) => void;
}

interface GoalFormState {
  name: string;
  description: string;
  targetAmount: string;
  initialAmount: string;
  targetDate: string;
  status: GoalStatus;
  icon: string;
  color: string;
}

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

const statusOptions: Array<{
  value: GoalStatus;
  label: string;
}> = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "PAUSED", label: "Pausada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "COMPLETED", label: "Concluída" },
];

export function GoalForm({
  goal,
  onSuccess,
}: GoalFormProps) {
  const isEditing = Boolean(goal);

  const [form, setForm] =
    useState<GoalFormState>(() =>
      createInitialForm(goal),
    );

  const [initialState, setInitialState] =
    useState<GoalFormState>(() =>
      createInitialForm(goal),
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

  const parsedTargetAmount = useMemo(
    () => parseMoney(form.targetAmount),
    [form.targetAmount],
  );

  const parsedInitialAmount = useMemo(
    () => parseMoney(form.initialAmount),
    [form.initialAmount],
  );

  const previewCurrentAmount =
    goal?.currentAmount ?? parsedInitialAmount;

  const previewPercentage =
    parsedTargetAmount > 0
      ? (previewCurrentAmount /
          parsedTargetAmount) *
        100
      : 0;

  const previewCompleted =
    parsedTargetAmount > 0 &&
    previewCurrentAmount >= parsedTargetAmount;

  const previewStatus =
    form.status === "ACTIVE" && previewCompleted
      ? "COMPLETED"
      : form.status;

  function clearFeedback() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateForm<
    K extends keyof GoalFormState,
  >(
    field: K,
    value: GoalFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    clearFeedback();
  }

  function validateForm() {
    const name = form.name.trim();

    if (name.length < 2) {
      return "Informe um nome com pelo menos 2 caracteres.";
    }

    if (name.length > 100) {
      return "O nome deve possuir no máximo 100 caracteres.";
    }

    if (form.description.trim().length > 500) {
      return "A descrição deve possuir no máximo 500 caracteres.";
    }

    if (
      !Number.isFinite(parsedTargetAmount) ||
      parsedTargetAmount <= 0
    ) {
      return "Informe um valor objetivo maior que zero.";
    }

    if (
      !Number.isFinite(parsedInitialAmount) ||
      parsedInitialAmount < 0
    ) {
      return "O valor inicial não pode ser negativo.";
    }

    if (!hexColorPattern.test(form.color)) {
      return "Selecione uma cor válida para a meta.";
    }

    if (
      form.status === "COMPLETED" &&
      previewCurrentAmount < parsedTargetAmount
    ) {
      return "A meta só pode ser concluída quando o valor acumulado atingir o objetivo.";
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

      let savedGoal: Goal;
      let message: string;

      if (goal) {
        const input: UpdateGoalInput = {
          name: form.name.trim(),
          description:
            form.description.trim() || null,
          targetAmount: parsedTargetAmount,
          targetDate: toApiDate(form.targetDate),
          status: form.status,
          icon: form.icon || null,
          color: form.color,
        };

        const response = await updateGoal(
          goal.id,
          input,
        );

        savedGoal = response.goal;
        message = response.message;
      } else {
        const input: CreateGoalInput = {
          name: form.name.trim(),
          description:
            form.description.trim() || null,
          targetAmount: parsedTargetAmount,
          initialAmount: parsedInitialAmount,
          targetDate: toApiDate(form.targetDate),
          status: "ACTIVE",
          icon: form.icon || null,
          color: form.color,
        };

        const response = await createGoal(input);

        savedGoal = response.goal;
        message = response.message;
      }

      const savedForm = createInitialForm(
        savedGoal,
      );

      setForm(savedForm);
      setInitialState(savedForm);
      setSuccessMessage(message);

      onSuccess?.(savedGoal);
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
            ? "Não foi possível atualizar a meta."
            : "Não foi possível criar a meta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const saveDisabled =
    isSubmitting || (isEditing && !hasChanges);

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
              Nome da meta
            </label>

            <div className="group relative mt-2">
              <Target className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

              <input
                id="name"
                type="text"
                maxLength={100}
                autoComplete="off"
                placeholder="Ex.: Reserva de emergência"
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
              htmlFor="description"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Descrição
              <span className="ml-1 font-normal text-[#929c95]">
                opcional
              </span>
            </label>

            <div className="group relative mt-2">
              <FileText className="pointer-events-none absolute left-4 top-4 size-5 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

              <textarea
                id="description"
                maxLength={500}
                rows={4}
                placeholder="Por que este objetivo é importante?"
                value={form.description}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value,
                  )
                }
                className="w-full resize-none rounded-2xl border border-[#d8e1da] bg-[#fafcfb] py-4 pl-12 pr-4 text-sm text-[#17211c] outline-none transition placeholder:text-[#99a49d] focus:border-[#65b98a] focus:bg-white focus:ring-4 focus:ring-[#24b46b]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="targetAmount"
              label="Valor objetivo"
              value={form.targetAmount}
              placeholder="30.000,00"
              disabled={isSubmitting}
              icon={CircleDollarSign}
              onChange={(value) =>
                updateForm("targetAmount", value)
              }
            />

            {isEditing ? (
              <div>
                <p className="block text-sm font-semibold text-[#2e3c34]">
                  Valor acumulado
                </p>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-[#d8e1da] bg-[#f4f7f5] px-4 text-sm font-bold text-[#0b7f4d]">
                  <WalletCards className="size-5" />
                  {formatMoney(goal?.currentAmount ?? 0)}
                </div>

                <p className="mt-2 text-xs leading-5 text-[#7f8b83]">
                  O acumulado é controlado pelo histórico de contribuições.
                </p>
              </div>
            ) : (
              <MoneyField
                id="initialAmount"
                label="Valor inicial"
                optional
                value={form.initialAmount}
                placeholder="0,00"
                disabled={isSubmitting}
                icon={WalletCards}
                onChange={(value) =>
                  updateForm("initialAmount", value)
                }
              />
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="targetDate"
                className="block text-sm font-semibold text-[#2e3c34]"
              >
                Data alvo
                <span className="ml-1 font-normal text-[#929c95]">
                  opcional
                </span>
              </label>

              <div className="group relative mt-2">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

                <input
                  id="targetDate"
                  type="date"
                  value={form.targetDate}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    updateForm(
                      "targetDate",
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </div>
            </div>

            {isEditing && (
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-semibold text-[#2e3c34]"
                >
                  Status
                </label>

                <div className="group relative mt-2">
                  <Flag className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

                  <select
                    id="status"
                    value={form.status}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as GoalStatus,
                      )
                    }
                    className={selectClassName}
                  >
                    {statusOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={
                          option.value === "COMPLETED" &&
                          previewCurrentAmount <
                            parsedTargetAmount
                        }
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />
                </div>
              </div>
            )}
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-[#2e3c34]">
              Ícone
            </legend>

            <p className="mt-1 text-xs leading-5 text-[#7f8b83]">
              Escolha um símbolo para reconhecer rapidamente este objetivo.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {goalIconOptions.map((option) => {
                const Icon = option.icon;
                const selected =
                  form.icon === option.name;

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
              A cor identifica a meta nos cards e indicadores.
            </p>

            <div className="mt-3 flex flex-wrap gap-2.5">
              {goalColorOptions.map((option) => {
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
                    : "Criar meta"}
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
                  <GoalIcon
                    iconName={form.icon}
                    className="size-6"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {form.name.trim() ||
                      "Nome da meta"}
                  </h2>

                  <p className="mt-1 text-xs text-[#7a867e]">
                    {form.targetDate
                      ? formatGoalDate(
                          toApiDate(form.targetDate) ?? "",
                        )
                      : "Sem prazo definido"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <GoalProgress
                  percentage={previewPercentage}
                  status={previewStatus}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf1ee] pt-4">
                <PreviewValue
                  label="Acumulado"
                  value={formatMoney(
                    Number.isFinite(
                      previewCurrentAmount,
                    )
                      ? previewCurrentAmount
                      : 0,
                  )}
                />

                <PreviewValue
                  label="Objetivo"
                  value={formatMoney(
                    Number.isFinite(
                      parsedTargetAmount,
                    )
                      ? parsedTargetAmount
                      : 0,
                  )}
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#edf1ee] pt-4">
                <span className="text-xs text-[#7a867e]">
                  Status
                </span>

                <span className="rounded-full bg-[#e8f7ed] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0b7f4d]">
                  {formatGoalStatus(previewStatus)}
                </span>
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
            Histórico auditável
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#748078]">
            Cada valor adicionado ficará registrado separadamente. Nenhuma conta
            ou lançamento será alterado automaticamente.
          </p>
        </motion.section>
      </aside>
    </div>
  );
}

function MoneyField({
  id,
  label,
  optional = false,
  value,
  placeholder,
  disabled,
  icon: Icon,
  onChange,
}: {
  id: string;
  label: string;
  optional?: boolean;
  value: string;
  placeholder: string;
  disabled: boolean;
  icon: React.ComponentType<{
    className?: string;
  }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[#2e3c34]"
      >
        {label}
        {optional && (
          <span className="ml-1 font-normal text-[#929c95]">
            opcional
          </span>
        )}
      </label>

      <div className="group relative mt-2">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] transition-colors group-focus-within:text-[#0c7a4d]" />

        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              sanitizeMoneyInput(event.target.value),
            )
          }
          className={inputClassName}
        />
      </div>
    </div>
  );
}

function PreviewValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-[#7a867e]">
        {label}
      </p>
      <p
        className="mt-1 truncate text-xs font-bold text-[#344139]"
        title={value}
      >
        {value}
      </p>
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
  goal?: Goal,
): GoalFormState {
  return {
    name: goal?.name ?? "",
    description: goal?.description ?? "",
    targetAmount: formatMoneyInput(
      goal?.targetAmount ?? 0,
    ),
    initialAmount: formatMoneyInput(0),
    targetDate: goal?.targetDate
      ? new Date(goal.targetDate)
          .toISOString()
          .slice(0, 10)
      : "",
    status: goal?.status ?? "ACTIVE",
    icon: goal?.icon ?? "Target",
    color: goal?.color ?? "#0C7A4D",
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

function toApiDate(value: string) {
  if (!value) {
    return null;
  }

  return new Date(
    `${value}T12:00:00.000Z`,
  ).toISOString();
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
