"use client";

import {
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";

import type { Goal } from "../../lib/goals";

interface DeleteGoalDialogProps {
  goal: Goal;
  isDeleting: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteGoalDialog({
  goal,
  isDeleting,
  errorMessage = "",
  onCancel,
  onConfirm,
}: DeleteGoalDialogProps) {
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
        className="fixed inset-0 z-50 bg-[#031b12]/45 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-goal-title"
        aria-describedby="delete-goal-description"
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
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.7rem] border border-[#e3e8e4] bg-white p-6 shadow-[0_30px_90px_rgba(12,40,25,0.3)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fff0ef] text-[#df4545]">
            <Trash2 className="size-5" />
          </div>

          <button
            type="button"
            aria-label="Fechar diálogo"
            autoFocus
            disabled={isDeleting}
            onClick={onCancel}
            className="flex size-11 items-center justify-center rounded-xl text-[#849087] transition hover:bg-[#f2f5f2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24b46b]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2
          id="delete-goal-title"
          className="mt-5 text-xl font-bold tracking-[-0.035em]"
        >
          Excluir meta?
        </h2>

        <p
          id="delete-goal-description"
          className="mt-3 text-sm leading-6 text-[#6d7971]"
        >
          A meta “{goal.name}” e seu histórico de contribuições serão excluídos
          permanentemente. Contas e lançamentos não serão alterados.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-[#f0cac7] bg-[#fff1f0] p-4 text-sm text-[#ad3d3d]">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[#d9e2db] bg-white px-4 text-sm font-semibold text-[#455249] transition hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#df4545] px-4 text-sm font-semibold text-white transition hover:bg-[#c93838] disabled:cursor-not-allowed disabled:opacity-60"
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
