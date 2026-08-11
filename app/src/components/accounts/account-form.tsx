"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Landmark,
  LoaderCircle,
  PiggyBank,
  Save,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  type Account,
  type AccountType,
  type CreateAccountInput,
  type UpdateAccountInput,
  createAccount,
  formatAccountType,
  formatMoney,
  updateAccount,
} from "../../lib/accounts";

import {
  ApiError,
  clearStoredSession,
} from "../../lib/api";

interface AccountFormProps {
  account?: Account;
  onSuccess?: (account: Account) => void;
}

interface AccountFormState {
  name: string;
  type: AccountType;
  initialBalance: string;
  isActive: boolean;
}

const initialForm: AccountFormState = {
  name: "",
  type: "CHECKING",
  initialBalance: "0,00",
  isActive: true,
};

const accountTypes: Array<{
  type: AccountType;
  label: string;
  description: string;
}> = [
  {
    type: "CHECKING",
    label: "Conta corrente",
    description: "Conta bancária para movimentações diárias.",
  },
  {
    type: "SAVINGS",
    label: "Poupança",
    description: "Conta destinada à reserva de dinheiro.",
  },
  {
    type: "CASH",
    label: "Dinheiro",
    description: "Valores mantidos em espécie.",
  },
  {
    type: "INVESTMENT",
    label: "Investimento",
    description: "Corretora ou conta de investimentos.",
  },
  {
    type: "DIGITAL_WALLET",
    label: "Carteira digital",
    description: "Carteiras e serviços financeiros digitais.",
  },
  {
    type: "OTHER",
    label: "Outra",
    description: "Outro tipo de conta financeira.",
  },
];

export function AccountForm({
  account,
  onSuccess,
}: AccountFormProps) {
  const isEditing = Boolean(account);

  const [form, setForm] =
    useState<AccountFormState>(initialForm);

  const [initialState, setInitialState] =
    useState<AccountFormState>(initialForm);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    if (!account) {
      setForm(initialForm);
      setInitialState(initialForm);
      return;
    }

    const accountForm: AccountFormState = {
      name: account.name,
      type: account.type,
      initialBalance: formatMoneyInput(
        account.initialBalance,
      ),
      isActive: account.isActive,
    };

    setForm(accountForm);
    setInitialState(accountForm);
  }, [account]);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(form) !==
      JSON.stringify(initialState)
    );
  }, [form, initialState]);

  const parsedBalance = useMemo(
    () => parseMoney(form.initialBalance),
    [form.initialBalance],
  );

  function updateForm<
    K extends keyof AccountFormState,
  >(
    field: K,
    value: AccountFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  }

  function validateForm() {
    if (form.name.trim().length < 2) {
      return "Informe um nome com pelo menos 2 caracteres.";
    }

    if (form.name.trim().length > 80) {
      return "O nome deve possuir no máximo 80 caracteres.";
    }

    if (!Number.isFinite(parsedBalance)) {
      return "Informe um saldo inicial válido.";
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
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      let savedAccount: Account;
      let message: string;

      if (account) {
        const input: UpdateAccountInput = {
          name: form.name.trim(),
          type: form.type,
          initialBalance: parsedBalance,
          isActive: form.isActive,
        };

        const response = await updateAccount(
          account.id,
          input,
        );

        savedAccount = response.account;
        message = response.message;
      } else {
        const input: CreateAccountInput = {
          name: form.name.trim(),
          type: form.type,
          initialBalance: parsedBalance,
          isActive: form.isActive,
        };

        const response =
          await createAccount(input);

        savedAccount = response.account;
        message = response.message;
      }

      const savedForm: AccountFormState = {
        name: savedAccount.name,
        type: savedAccount.type,
        initialBalance: formatMoneyInput(
          savedAccount.initialBalance,
        ),
        isActive: savedAccount.isActive,
      };

      setForm(savedForm);
      setInitialState(savedForm);
      setSuccessMessage(message);

      onSuccess?.(savedAccount);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        clearStoredSession();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Não foi possível atualizar a conta."
            : "Não foi possível criar a conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const SelectedIcon = getAccountIcon(form.type);

  return (
    <div
      className="
        grid gap-5
        lg:grid-cols-[1fr_340px]
      "
    >
      <motion.section
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="
          rounded-[1.8rem]
          border border-[#dfe6e1]
          bg-white p-5
          shadow-[0_18px_55px_rgba(21,53,36,0.07)]
          sm:p-7
        "
      >
        <form onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="name"
              className="
                block text-sm font-semibold
                text-[#2e3c34]
              "
            >
              Nome da conta
            </label>

            <div className="group relative mt-2">
              <Building2
                className="
                  pointer-events-none absolute
                  left-4 top-1/2 size-5
                  -translate-y-1/2
                  text-[#87928b]
                  transition-colors
                  group-focus-within:text-[#0c7a4d]
                "
              />

              <input
                id="name"
                type="text"
                maxLength={80}
                autoComplete="off"
                placeholder="Ex.: Nubank, Carteira ou Reserva"
                value={form.name}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "name",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="type"
              className="
                block text-sm font-semibold
                text-[#2e3c34]
              "
            >
              Tipo da conta
            </label>

            <div className="group relative mt-2">
              <SelectedIcon
                className="
                  pointer-events-none absolute
                  left-4 top-1/2 size-5
                  -translate-y-1/2
                  text-[#87928b]
                  transition-colors
                  group-focus-within:text-[#0c7a4d]
                "
              />

              <select
                id="type"
                value={form.type}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "type",
                    event.target.value as AccountType,
                  )
                }
                className="
                  min-h-14 w-full
                  appearance-none rounded-2xl
                  border border-[#d8e1da]
                  bg-[#fafcfb]
                  pl-12 pr-11
                  text-sm text-[#17211c]
                  outline-none transition
                  focus:border-[#65b98a]
                  focus:bg-white
                  focus:ring-4
                  focus:ring-[#24b46b]/10
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {accountTypes.map((option) => (
                  <option
                    key={option.type}
                    value={option.type}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown
                className="
                  pointer-events-none absolute
                  right-4 top-1/2 size-4
                  -translate-y-1/2
                  text-[#87928b]
                "
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7f8b83]">
              {
                accountTypes.find(
                  (option) =>
                    option.type === form.type,
                )?.description
              }
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor="initialBalance"
              className="
                block text-sm font-semibold
                text-[#2e3c34]
              "
            >
              Saldo inicial
            </label>

            <div className="group relative mt-2">
              <CircleDollarSign
                className="
                  pointer-events-none absolute
                  left-4 top-1/2 size-5
                  -translate-y-1/2
                  text-[#87928b]
                  transition-colors
                  group-focus-within:text-[#0c7a4d]
                "
              />

              <input
                id="initialBalance"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.initialBalance}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm(
                    "initialBalance",
                    sanitizeMoneyInput(
                      event.target.value,
                    ),
                  )
                }
                className={inputClassName}
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7f8b83]">
              Informe o saldo existente no momento em que
              a conta for cadastrada.
            </p>
          </div>

          <div
            className="
              mt-6 flex items-center
              justify-between gap-4
              rounded-2xl
              border border-[#dfe6e1]
              bg-[#fafcfb] p-4
            "
          >
            <div>
              <p className="text-sm font-semibold">
                Conta ativa
              </p>

              <p className="mt-1 text-xs leading-5 text-[#7f8b83]">
                Contas inativas deixam de aparecer em novos
                lançamentos.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              disabled={isSubmitting}
              onClick={() =>
                updateForm(
                  "isActive",
                  !form.isActive,
                )
              }
              className={`
                relative h-7 w-12 shrink-0
                rounded-full transition
                disabled:cursor-not-allowed
                disabled:opacity-60
                ${
                  form.isActive
                    ? "bg-[#0c7a50]"
                    : "bg-[#cad4cd]"
                }
              `}
            >
              <motion.span
                layout
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 32,
                }}
                className={`
                  absolute top-1 size-5
                  rounded-full bg-white
                  shadow-sm
                  ${
                    form.isActive
                      ? "left-6"
                      : "left-1"
                  }
                `}
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

          <div
            className="
              mt-7 flex flex-col-reverse
              gap-3 sm:flex-row
              sm:justify-end
            "
          >
            <button
              type="button"
              disabled={
                isSubmitting || !hasChanges
              }
              onClick={() => {
                setForm(initialState);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="
                min-h-12 rounded-2xl
                border border-[#d7e0d9]
                bg-white px-5
                text-sm font-semibold
                text-[#4e5b53]
                transition
                hover:bg-[#f7faf8]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Desfazer alterações
            </button>

            <motion.button
              type="submit"
              disabled={
                isSubmitting ||
                (isEditing && !hasChanges)
              }
              whileHover={
                isSubmitting ||
                (isEditing && !hasChanges)
                  ? undefined
                  : { y: -2 }
              }
              whileTap={
                isSubmitting ||
                (isEditing && !hasChanges)
                  ? undefined
                  : { scale: 0.98 }
              }
              className="
                flex min-h-12
                items-center justify-center
                gap-2 rounded-2xl
                bg-gradient-to-r
                from-[#0c4f38] to-[#138153]
                px-6 text-sm font-semibold
                text-white
                shadow-[0_14px_30px_rgba(12,79,56,0.22)]
                transition
                disabled:cursor-not-allowed
                disabled:opacity-55
              "
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
                    : "Criar conta"}
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.section>

      <aside className="space-y-5">
        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.08,
          }}
          className="
            relative overflow-hidden
            rounded-[1.8rem]
            bg-gradient-to-br
            from-[#073c2b] to-[#10784d]
            p-5 text-white
            shadow-[0_18px_55px_rgba(7,60,43,0.18)]
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute inset-0
              opacity-[0.1]
              [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)]
              [background-size:24px_24px]
            "
          />

          <div className="relative z-10">
            <p className="text-xs text-white/55">
              Pré-visualização
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div
                className="
                  flex size-12 items-center
                  justify-center rounded-2xl
                  bg-white/10
                  text-[#83efb2]
                  ring-1 ring-white/10
                "
              >
                <SelectedIcon className="size-6" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-semibold">
                  {form.name.trim() ||
                    "Nome da conta"}
                </h2>

                <p className="mt-1 text-xs text-white/55">
                  {formatAccountType(form.type)}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs text-white/55">
                Saldo inicial
              </p>

              <p
                className="
                  mt-1 text-3xl font-bold
                  tracking-[-0.05em]
                  text-[#77efa9]
                "
              >
                {formatMoney(
                  Number.isFinite(parsedBalance)
                    ? parsedBalance
                    : 0,
                )}
              </p>
            </div>

            <div
              className="
                mt-6 flex items-center
                justify-between rounded-2xl
                bg-white/[0.08] p-3
              "
            >
              <span className="text-xs text-white/60">
                Status
              </span>

              <span
                className={`
                  rounded-full px-2.5 py-1
                  text-[10px] font-bold
                  uppercase tracking-wide
                  ${
                    form.isActive
                      ? "bg-[#2ac77a] text-white"
                      : "bg-white/10 text-white/60"
                  }
                `}
              >
                {form.isActive
                  ? "Ativa"
                  : "Inativa"}
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.14,
          }}
          className="
            rounded-[1.6rem]
            border border-[#dfe6e1]
            bg-white p-5
            shadow-[0_14px_42px_rgba(21,53,36,0.055)]
          "
        >
          <h2 className="font-bold">
            Sobre o saldo inicial
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#748078]">
            Receitas concluídas serão somadas e despesas
            concluídas serão descontadas para calcular o
            saldo atual da conta.
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

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -6,
        height: 0,
      }}
      animate={{
        opacity: 1,
        y: 0,
        height: "auto",
      }}
      exit={{
        opacity: 0,
        height: 0,
      }}
      className={`
        mt-6 flex items-start gap-3
        rounded-2xl border p-4
        text-sm
        ${
          success
            ? "border-[#b9e1c8] bg-[#eaf8ef] text-[#0b7046]"
            : "border-[#f0cac7] bg-[#fff1f0] text-[#ad3d3d]"
        }
      `}
    >
      <CheckCircle2
        className={`
          mt-0.5 size-5 shrink-0
          ${
            success
              ? "text-[#0b7046]"
              : "text-[#ad3d3d]"
          }
        `}
      />

      <p className="leading-5">
        {message}
      </p>
    </motion.div>
  );
}

function getAccountIcon(
  type: AccountType,
) {
  const icons: Record<
    AccountType,
    React.ComponentType<{
      className?: string;
    }>
  > = {
    CHECKING: Landmark,
    SAVINGS: PiggyBank,
    CASH: Banknote,
    INVESTMENT: CircleDollarSign,
    DIGITAL_WALLET: Wallet,
    OTHER: Building2,
  };

  return icons[type];
}

function sanitizeMoneyInput(
  value: string,
) {
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

  return Number(
    sanitized.replace(",", "."),
  );
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