"use client";

import {
  type FormEvent,
  useState,
} from "react";
import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { motion } from "motion/react";

import { formatMoney } from "../../lib/accounts";
import {
  ApiError,
  clearStoredSession,
} from "../../lib/api";
import {
  type Goal,
  addGoalContribution,
} from "../../lib/goals";

interface AddGoalContributionDialogProps {
  goal: Goal;
  onCancel: () => void;
  onSuccess: (goal: Goal) => void;
}

export function AddGoalContributionDialog({
  goal,
  onCancel,
  onSuccess,
}: AddGoalContributionDialogProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const parsedAmount = parseMoney(amount);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setErrorMessage(
        "Informe um valor maior que zero.",
      );
      return;
    }

    if (!date) {
      setErrorMessage(
        "Informe a data da contribuição.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await addGoalContribution(
        goal.id,
        {
          amount: parsedAmount,
          date: new Date(
            `${date}T12:00:00.000Z`,
          ).toISOString(),
          notes: notes.trim() || null,
        },
      );

      onSuccess(response.goal);
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
          : "Não foi possível adicionar a contribuição.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Fechar diálogo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        disabled={isSubmitting}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-[#031b12]/45 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-contribution-title"
        aria-describedby="add-contribution-description"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isSubmitting) {
            onCancel();
          }
        }}
        initial={{
          opacity: 0,
          y: 24,
          scale: 0.96,
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.7rem] border border-[#e3e8e4] bg-white p-5 shadow-[0_30px_90px_rgba(12,40,25,0.3)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e8f7ed] text-[#0b7f4d]">
            <Plus className="size-5" />
          </div>

          <button
            type="button"
            aria-label="Fechar diálogo"
            disabled={isSubmitting}
            onClick={onCancel}
            className="flex size-11 items-center justify-center rounded-xl text-[#849087] transition hover:bg-[#f2f5f2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24b46b]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2
          id="add-contribution-title"
          className="mt-5 text-xl font-bold tracking-[-0.035em]"
        >
          Adicionar valor
        </h2>

        <p id="add-contribution-description" className="mt-2 text-sm leading-6 text-[#6d7971]">
          Registre um novo aporte em “{goal.name}”. Faltam{" "}
          <strong className="text-[#405047]">
            {formatMoney(
              Math.max(goal.remainingAmount, 0),
            )}
          </strong>{" "}
          para o objetivo.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mt-6">
            <label
              htmlFor="contributionAmount"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Valor
            </label>

            <div className="group relative mt-2">
              <CircleDollarSign className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] group-focus-within:text-[#0c7a4d]" />

              <input
                id="contributionAmount"
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="500,00"
                value={amount}
                disabled={isSubmitting}
                onChange={(event) => {
                  setAmount(
                    sanitizeMoneyInput(
                      event.target.value,
                    ),
                  );
                  setErrorMessage("");
                }}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="contributionDate"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Data
            </label>

            <div className="group relative mt-2">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#87928b] group-focus-within:text-[#0c7a4d]" />

              <input
                id="contributionDate"
                type="date"
                value={date}
                disabled={isSubmitting}
                onChange={(event) => {
                  setDate(event.target.value);
                  setErrorMessage("");
                }}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="contributionNotes"
              className="block text-sm font-semibold text-[#2e3c34]"
            >
              Observações
              <span className="ml-1 font-normal text-[#929c95]">
                opcional
              </span>
            </label>

            <div className="group relative mt-2">
              <FileText className="pointer-events-none absolute left-4 top-4 size-5 text-[#87928b] group-focus-within:text-[#0c7a4d]" />

              <textarea
                id="contributionNotes"
                rows={3}
                maxLength={300}
                placeholder="Ex.: Aporte mensal de agosto"
                value={notes}
                disabled={isSubmitting}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full resize-none rounded-2xl border border-[#d8e1da] bg-[#fafcfb] py-4 pl-12 pr-4 text-sm text-[#17211c] outline-none transition placeholder:text-[#99a49d] focus:border-[#65b98a] focus:bg-white focus:ring-4 focus:ring-[#24b46b]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-[#f0cac7] bg-[#fff1f0] p-4 text-sm text-[#ad3d3d]">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="min-h-12 rounded-2xl border border-[#d9e2db] bg-white px-4 text-sm font-semibold text-[#455249] transition hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#138153] px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Adicionando
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Adicionar
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
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
