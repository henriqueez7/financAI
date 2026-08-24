"use client";

import { useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  History,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import { formatMoney } from "../../lib/accounts";
import {
  type GoalContribution,
  formatGoalDate,
} from "../../lib/goals";

interface GoalContributionListProps {
  contributions: GoalContribution[];
  deletingId: string;
  errorMessage: string;
  onDelete: (contributionId: string) => void;
}

export function GoalContributionList({
  contributions,
  deletingId,
  errorMessage,
  onDelete,
}: GoalContributionListProps) {
  const [confirmingId, setConfirmingId] =
    useState("");

  if (contributions.length === 0) {
    return (
      <div className="mt-5 flex flex-col items-center rounded-[1.4rem] border border-dashed border-[#d5dfd8] bg-[#f9fbf9] px-5 py-9 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e9f5ed] text-[#168455]">
          <History className="size-5" />
        </div>

        <h3 className="mt-4 text-sm font-bold text-[#303c35]">
          Nenhuma contribuição registrada
        </h3>

        <p className="mt-2 max-w-md text-xs leading-5 text-[#7b867f]">
          Adicione o primeiro valor para começar a acompanhar o progresso.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#f0cac7] bg-[#fff1f0] p-4 text-sm text-[#ad3d3d]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="divide-y divide-[#edf1ee] overflow-hidden rounded-[1.4rem] border border-[#e1e7e3]">
        {contributions.map((contribution) => {
          const isDeleting =
            deletingId === contribution.id;
          const isConfirming =
            confirmingId === contribution.id;

          return (
            <article
              key={contribution.id}
              className="flex flex-col gap-4 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-bold text-[#0b7f4d]">
                  + {formatMoney(contribution.amount)}
                </p>

                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#87928b]">
                  <CalendarDays className="size-3.5" />
                  {formatGoalDate(contribution.date)}
                </div>

                {contribution.notes && (
                  <p className="mt-2 text-xs leading-5 text-[#68746d]">
                    {contribution.notes}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isConfirming && !isDeleting && (
                  <button
                    type="button"
                    onClick={() => setConfirmingId("")}
                    className="min-h-10 rounded-xl border border-[#d9e2db] px-3 text-xs font-semibold text-[#58655d] transition hover:bg-[#f7faf8]"
                  >
                    Manter
                  </button>
                )}

                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => {
                    if (isConfirming) {
                      onDelete(contribution.id);
                      return;
                    }

                    setConfirmingId(contribution.id);
                  }}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isConfirming
                      ? "bg-[#df4545] text-white"
                      : "border border-[#efcece] bg-[#fff8f7] text-[#c84242] hover:bg-[#fff0ef]"
                  }`}
                >
                  {isDeleting ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  {isDeleting
                    ? "Removendo"
                    : isConfirming
                      ? "Confirmar remoção"
                      : "Remover"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
