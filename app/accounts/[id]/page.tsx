"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { AccountForm } from "../../src/components/accounts/account-form";
import { DeleteAccountDialog } from "../../src/components/accounts/delete-account-dialog";

import {
  type Account,
  deleteAccount,
  getAccount,
} from "../../src/lib/accounts";

import { ApiError, clearStoredSession } from "../../src/lib/api";

export default function EditAccountPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const accountId = params.id;

  const [account, setAccount] = useState<Account | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getAccount(accountId);

        setAccount(data);
      } catch (error) {
        handleRequestError(error, "Não foi possível carregar a conta.");
      } finally {
        setIsLoading(false);
      }
    }

    if (accountId) {
      void loadAccount();
    }
  }, [accountId]);

  function handleRequestError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      clearStoredSession();
      window.location.replace("/login");
      return;
    }

    setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
  }

  async function handleDeleteAccount() {
    if (!account) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteErrorMessage("");

      await deleteAccount(account.id);

      setDeleteDialogOpen(false);

      router.replace("/accounts");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearStoredSession();
        window.location.replace("/login");
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setDeleteErrorMessage(
          error.message ||
            "Esta conta possui lançamentos vinculados e não pode ser excluída.",
        );

        return;
      }

      setDeleteErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a conta.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <EditAccountSkeleton />;
  }

  if (!account || errorMessage) {
    return (
      <LoadAccountError
        message={errorMessage || "Conta não encontrada."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[#f2f5f2] text-[#17211c]">
      <header
        className="
          sticky top-0 z-30
          border-b border-[#dde5df]
          bg-[#f2f5f2]/90
          px-4 py-3
          backdrop-blur-xl
          sm:px-6 lg:px-8
        "
      >
        <div
          className="
            mx-auto flex max-w-[1200px]
            items-center gap-3
          "
        >
          <Link
            href="/accounts"
            aria-label="Voltar para contas"
            className="
              flex size-11 shrink-0
              items-center justify-center
              rounded-2xl
              border border-[#d8e1da]
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
              Editar conta
            </h1>

            <p className="mt-0.5 text-xs text-[#78847c]">
              Atualize as informações da conta.
            </p>
          </div>

          <button
            type="button"
            aria-label="Excluir conta"
            onClick={() => {
              setDeleteErrorMessage("");
              setDeleteDialogOpen(true);
            }}
            className="
              flex size-11 shrink-0
              items-center justify-center
              rounded-2xl
              border border-[#f0cccc]
              bg-white text-[#df4545]
              shadow-sm transition
              hover:-translate-y-0.5
              hover:bg-[#fff3f2]
              active:translate-y-0
              active:scale-95
            "
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </header>

      <div
        className="
          mx-auto max-w-[1200px]
          px-4 py-5
          sm:px-6
          lg:px-8 lg:py-8
        "
      >
        <AccountForm
          account={account}
          onSuccess={(updatedAccount) => {
            setAccount(updatedAccount);
          }}
        />

        <section
          className="
            mt-6 rounded-[1.6rem]
            border border-[#f0d1d1]
            bg-white p-5
            shadow-[0_14px_42px_rgba(21,53,36,0.045)]
            sm:p-6
          "
        >
          <div
            className="
              flex flex-col gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h2
                className="
                  text-base font-bold
                  tracking-[-0.025em]
                  text-[#2d3731]
                "
              >
                Zona de perigo
              </h2>

              <p
                className="
                  mt-1 max-w-xl
                  text-sm leading-6
                  text-[#7b877f]
                "
              >
                Excluir uma conta é uma ação permanente. Contas com lançamentos
                vinculados não podem ser excluídas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeleteErrorMessage("");
                setDeleteDialogOpen(true);
              }}
              className="
                flex min-h-11 shrink-0
                items-center justify-center
                gap-2 rounded-2xl
                border border-[#efcaca]
                bg-[#fff7f6]
                px-4 text-sm
                font-semibold text-[#c53e3e]
                transition
                hover:-translate-y-0.5
                hover:bg-[#fff0ef]
                active:translate-y-0
                active:scale-[0.98]
              "
            >
              <Trash2 className="size-4" />
              Excluir conta
            </button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {deleteDialogOpen && (
          <DeleteAccountDialog
            account={account}
            isDeleting={isDeleting}
            errorMessage={deleteErrorMessage}
            onCancel={() => {
              if (isDeleting) {
                return;
              }

              setDeleteDialogOpen(false);
              setDeleteErrorMessage("");
            }}
            onConfirm={() => void handleDeleteAccount()}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function EditAccountSkeleton() {
  return (
    <main className="min-h-dvh bg-[#f2f5f2]">
      <div
        className="
          h-[73px]
          border-b border-[#dde5df]
          bg-white/60
        "
      />

      <div
        className="
          mx-auto grid max-w-[1200px]
          gap-5 px-4 py-8
          sm:px-6
          lg:grid-cols-[1fr_340px]
          lg:px-8
        "
      >
        <div
          className="
            h-[620px] animate-pulse
            rounded-[1.8rem]
            bg-white
          "
        />

        <div className="space-y-5">
          <div
            className="
              h-72 animate-pulse
              rounded-[1.8rem]
              bg-[#dce7df]
            "
          />

          <div
            className="
              h-40 animate-pulse
              rounded-[1.6rem]
              bg-white
            "
          />
        </div>
      </div>
    </main>
  );
}

function LoadAccountError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main
      className="
        flex min-h-dvh
        items-center justify-center
        bg-[#f2f5f2] px-5
      "
    >
      <div
        className="
          w-full max-w-md
          rounded-[2rem]
          border border-[#dfe6e1]
          bg-white p-7
          text-center
          shadow-[0_18px_55px_rgba(21,53,36,0.08)]
        "
      >
        <div
          className="
            mx-auto flex size-14
            items-center justify-center
            rounded-2xl
            bg-[#fff0ef]
            text-[#df4545]
          "
        >
          <AlertCircle className="size-6" />
        </div>

        <h1
          className="
            mt-5 text-xl font-bold
            tracking-[-0.035em]
          "
        >
          Não foi possível abrir a conta
        </h1>

        <p
          className="
            mt-3 text-sm leading-6
            text-[#65716a]
          "
        >
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="
            mt-6 flex min-h-12
            w-full items-center
            justify-center gap-2
            rounded-2xl
            bg-[#0c4f38]
            text-sm font-semibold
            text-white
            transition
            hover:bg-[#0a432f]
            active:scale-[0.98]
          "
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
