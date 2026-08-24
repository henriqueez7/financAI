"use client";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CircleAlert,
  History,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { AnimatePresence } from "motion/react";

import { AddGoalContributionDialog } from "../../src/components/goals/add-goal-contribution-dialog";
import { DeleteGoalDialog } from "../../src/components/goals/delete-goal-dialog";
import { GoalContributionList } from "../../src/components/goals/goal-contribution-list";
import { GoalForm } from "../../src/components/goals/goal-form";

import {
  ApiError,
  clearStoredSession,
} from "../../src/lib/api";
import {
  type Goal,
  deleteGoal,
  deleteGoalContribution,
  getGoal,
} from "../../src/lib/goals";

export default function EditGoalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const goalId = params.id;

  const [goal, setGoal] =
    useState<Goal | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isDeleting, setIsDeleting] =
    useState(false);
  const [deletingContributionId, setDeletingContributionId] =
    useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);
  const [contributionDialogOpen, setContributionDialogOpen] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] =
    useState("");
  const [contributionErrorMessage, setContributionErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadGoal() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getGoal(goalId);

        setGoal(data);

        if (
          window.location.hash === "#contributions"
        ) {
          window.setTimeout(() => {
            document
              .getElementById("contributions")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
          }, 120);
        }
      } catch (error) {
        handleUnauthorized(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a meta.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (goalId) {
      void loadGoal();
    }
  }, [goalId]);

  async function handleDeleteGoal() {
    if (!goal) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteErrorMessage("");

      await deleteGoal(goal.id);

      setDeleteDialogOpen(false);
      router.replace("/goals");
      router.refresh();
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }

      setDeleteErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a meta.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteContribution(
    contributionId: string,
  ) {
    if (!goal) {
      return;
    }

    try {
      setDeletingContributionId(contributionId);
      setContributionErrorMessage("");

      await deleteGoalContribution(
        goal.id,
        contributionId,
      );

      const updatedGoal = await getGoal(goal.id);

      setGoal(updatedGoal);
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }

      setContributionErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a contribuição.",
      );
    } finally {
      setDeletingContributionId("");
    }
  }

  if (isLoading) {
    return <EditGoalSkeleton />;
  }

  if (!goal || errorMessage) {
    return (
      <LoadGoalError
        message={
          errorMessage || "Meta não encontrada."
        }
        onRetry={() => window.location.reload()}
      />
    );
  }

  const canContribute =
    goal.status !== "PAUSED" &&
    goal.status !== "CANCELLED";

  return (
    <main className="min-h-dvh bg-[#f2f5f2] text-[#17211c]">
      <header className="sticky top-0 z-30 border-b border-[#dde5df] bg-[#f2f5f2]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <Link
            href="/goals"
            aria-label="Voltar para metas"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#0c4f38] shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-[-0.035em] sm:text-2xl">
              Editar meta
            </h1>

            <p className="mt-0.5 truncate text-xs text-[#78847c]">
              Atualize o objetivo e acompanhe suas contribuições.
            </p>
          </div>

          <button
            type="button"
            aria-label="Excluir meta"
            onClick={() => {
              setDeleteErrorMessage("");
              setDeleteDialogOpen(true);
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#f0cccc] bg-white text-[#df4545] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff3f2] active:translate-y-0 active:scale-95"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <GoalForm
          key={goal.id}
          goal={goal}
          onSuccess={(updatedGoal) => {
            setGoal(updatedGoal);
          }}
        />

        <section
          id="contributions"
          className="mt-6 scroll-mt-24 rounded-[1.8rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.055)] sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#0c6545]">
                <History className="size-5" />
                <h2 className="text-base font-bold tracking-[-0.025em]">
                  Histórico de contribuições
                </h2>
              </div>

              <p className="mt-1 text-sm leading-6 text-[#7b877f]">
                {goal.contributionsCount}{" "}
                {goal.contributionsCount === 1
                  ? "valor registrado"
                  : "valores registrados"}
                , sem movimentar contas ou lançamentos.
              </p>
            </div>

            <button
              type="button"
              disabled={!canContribute}
              onClick={() => {
                setContributionErrorMessage("");
                setContributionDialogOpen(true);
              }}
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#148457] px-4 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(12,79,56,0.18)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" />
              Adicionar valor
            </button>
          </div>

          {!canContribute && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#ead8b8] bg-[#fff8e9] p-4 text-sm text-[#8e641e]">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              Reative a meta no formulário antes de adicionar novas
              contribuições.
            </div>
          )}

          <GoalContributionList
            contributions={goal.contributions ?? []}
            deletingId={deletingContributionId}
            errorMessage={contributionErrorMessage}
            onDelete={(contributionId) =>
              void handleDeleteContribution(
                contributionId,
              )
            }
          />
        </section>

        <section className="mt-6 rounded-[1.6rem] border border-[#f0d1d1] bg-white p-5 shadow-[0_14px_42px_rgba(21,53,36,0.045)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-[-0.025em] text-[#2d3731]">
                Zona de perigo
              </h2>

              <p className="mt-1 max-w-xl text-sm leading-6 text-[#7b877f]">
                Excluir a meta remove também seu histórico de contribuições.
                Contas e lançamentos financeiros permanecem intactos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeleteErrorMessage("");
                setDeleteDialogOpen(true);
              }}
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#efcaca] bg-[#fff7f6] px-4 text-sm font-semibold text-[#c53e3e] transition hover:-translate-y-0.5 hover:bg-[#fff0ef] active:translate-y-0 active:scale-[0.98]"
            >
              <Trash2 className="size-4" />
              Excluir meta
            </button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {contributionDialogOpen && (
          <AddGoalContributionDialog
            goal={goal}
            onCancel={() =>
              setContributionDialogOpen(false)
            }
            onSuccess={(updatedGoal) => {
              setGoal(updatedGoal);
              setContributionDialogOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteDialogOpen && (
          <DeleteGoalDialog
            goal={goal}
            isDeleting={isDeleting}
            errorMessage={deleteErrorMessage}
            onCancel={() => {
              if (isDeleting) {
                return;
              }

              setDeleteDialogOpen(false);
              setDeleteErrorMessage("");
            }}
            onConfirm={() =>
              void handleDeleteGoal()
            }
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function handleUnauthorized(error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 401
  ) {
    clearStoredSession();
    window.location.replace("/login");
    return true;
  }

  return false;
}

function EditGoalSkeleton() {
  return (
    <main className="min-h-dvh bg-[#f2f5f2]">
      <div className="h-[73px] border-b border-[#dde5df] bg-white/60" />

      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="h-[1100px] animate-pulse rounded-[1.8rem] bg-white" />

          <div className="space-y-5">
            <div className="h-80 animate-pulse rounded-[1.8rem] bg-[#dce7df]" />
            <div className="h-40 animate-pulse rounded-[1.6rem] bg-white" />
          </div>
        </div>
      </div>
    </main>
  );
}

function LoadGoalError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f2f5f2] px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-[#dfe6e1] bg-white p-7 text-center shadow-[0_18px_55px_rgba(21,53,36,0.08)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#fff0ef] text-[#df4545]">
          <AlertCircle className="size-6" />
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-[-0.035em]">
          Não foi possível abrir a meta
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#65716a]">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0c4f38] text-sm font-semibold text-white transition hover:bg-[#0a432f] active:scale-[0.98]"
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
