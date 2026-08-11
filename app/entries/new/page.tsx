"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Landmark,
  LoaderCircle,
  ReceiptText,
  Tag,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  ApiError,
  api,
  clearStoredSession,
} from "../../src/lib/api";

type EntryType = "INCOME" | "EXPENSE";
type EntryStatus = "COMPLETED" | "PENDING";

interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  type: EntryType;
  icon: string;
  color: string;
  isActive: boolean;
}

interface AccountsResponse {
  accounts: Account[];
}

interface CategoriesResponse {
  categories: Category[];
}

interface CreateEntryResponse {
  message: string;
  entry: {
    id: string;
  };
}

interface EntryForm {
  description: string;
  amount: string;
  type: EntryType;
  status: EntryStatus;
  dueDate: string;
  accountId: string;
  categoryId: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

const initialForm: EntryForm = {
  description: "",
  amount: "",
  type: "EXPENSE",
  status: "COMPLETED",
  dueDate: today,
  accountId: "",
  categoryId: "",
  notes: "",
};

export default function NewEntryPage() {
  const router = useRouter();

  const [form, setForm] = useState<EntryForm>(initialForm);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === form.type &&
          category.isActive,
      ),
    [categories, form.type],
  );

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) => account.id === form.accountId,
      ),
    [accounts, form.accountId],
  );

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => category.id === form.categoryId,
      ),
    [categories, form.categoryId],
  );

  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoadingOptions(true);
        setErrorMessage("");

        const [accountsResponse, categoriesResponse] =
          await Promise.all([
            api<AccountsResponse>("/accounts"),
            api<CategoriesResponse>("/categories"),
          ]);

        const activeAccounts =
          accountsResponse.accounts.filter(
            (account) => account.isActive,
          );

        setAccounts(activeAccounts);
        setCategories(categoriesResponse.categories);

        if (activeAccounts.length > 0) {
          setForm((current) => ({
            ...current,
            accountId: activeAccounts[0].id,
          }));
        }
      } catch (error) {
        handleRequestError(
          error,
          "Não foi possível carregar contas e categorias.",
        );
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadOptions();
  }, []);

  useEffect(() => {
    const firstCompatibleCategory =
      categories.find(
        (category) =>
          category.type === form.type &&
          category.isActive,
      );

    setForm((current) => ({
      ...current,
      categoryId: firstCompatibleCategory?.id ?? "",
    }));
  }, [form.type, categories]);

  function updateForm<K extends keyof EntryForm>(
    field: K,
    value: EntryForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function validateForm() {
    if (!form.description.trim()) {
      return "Informe uma descrição.";
    }

    const amount = parseMoney(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Informe um valor maior que zero.";
    }

    if (!form.dueDate) {
      return "Informe a data do lançamento.";
    }

    if (!form.accountId) {
      return "Selecione uma conta.";
    }

    if (!form.categoryId) {
      return "Selecione uma categoria.";
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

      const amount = parseMoney(form.amount);

      const dueDate = new Date(
        `${form.dueDate}T12:00:00.000Z`,
      ).toISOString();

      const response =
        await api<CreateEntryResponse>("/entries", {
          method: "POST",
          body: JSON.stringify({
            description: form.description.trim(),
            amount,
            type: form.type,
            status: form.status,
            dueDate,
            accountId: form.accountId,
            categoryId: form.categoryId,
            notes: form.notes.trim() || undefined,
          }),
        });

      setSuccessMessage(response.message);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 700);
      });

      router.replace("/entries");
      router.refresh();
    } catch (error) {
      handleRequestError(
        error,
        "Não foi possível criar o lançamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRequestError(
    error: unknown,
    fallbackMessage: string,
  ) {
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
        : fallbackMessage,
    );
  }

  return (
    <main className="min-h-dvh bg-[#f2f5f2] text-[#17211c]">
      <header
        className="
          sticky top-0 z-30
          border-b border-[#dde5df]
          bg-[#f2f5f2]/90
          px-4 py-3 backdrop-blur-xl
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
            href="/entries"
            aria-label="Voltar para lançamentos"
            className="
              flex size-11 items-center justify-center
              rounded-2xl border border-[#d8e1da]
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
              Novo lançamento
            </h1>

            <p className="mt-0.5 text-xs text-[#78847c]">
              Registre uma nova receita ou despesa.
            </p>
          </div>
        </div>
      </header>

      <div
        className="
          mx-auto grid max-w-[1200px]
          gap-5 px-4 py-5
          sm:px-6 lg:grid-cols-[1fr_340px]
          lg:px-8 lg:py-8
        "
      >
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
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
              <p className="text-sm font-semibold text-[#536158]">
                Tipo de lançamento
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <TypeButton
                  label="Despesa"
                  description="Dinheiro que saiu"
                  icon={ArrowDownRight}
                  active={form.type === "EXPENSE"}
                  variant="expense"
                  disabled={isSubmitting}
                  onClick={() =>
                    updateForm("type", "EXPENSE")
                  }
                />

                <TypeButton
                  label="Receita"
                  description="Dinheiro que entrou"
                  icon={ArrowUpRight}
                  active={form.type === "INCOME"}
                  variant="income"
                  disabled={isSubmitting}
                  onClick={() =>
                    updateForm("type", "INCOME")
                  }
                />
              </div>
            </div>

            <div
              className="
                mt-7 grid gap-5
                sm:grid-cols-2
              "
            >
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="description">
                  Descrição
                </FieldLabel>

                <div className="group relative mt-2">
                  <ReceiptText
                    className="
                      pointer-events-none absolute
                      left-4 top-1/2 size-5
                      -translate-y-1/2
                      text-[#87928b]
                      group-focus-within:text-[#0c7a4d]
                    "
                  />

                  <input
                    id="description"
                    type="text"
                    maxLength={100}
                    placeholder={
                      form.type === "EXPENSE"
                        ? "Ex.: Compras no mercado"
                        : "Ex.: Salário de agosto"
                    }
                    value={form.description}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="amount">
                  Valor
                </FieldLabel>

                <div className="group relative mt-2">
                  <CircleDollarSign
                    className="
                      pointer-events-none absolute
                      left-4 top-1/2 size-5
                      -translate-y-1/2
                      text-[#87928b]
                      group-focus-within:text-[#0c7a4d]
                    "
                  />

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
              </div>

              <div>
                <FieldLabel htmlFor="dueDate">
                  Data
                </FieldLabel>

                <div className="group relative mt-2">
                  <CalendarDays
                    className="
                      pointer-events-none absolute
                      left-4 top-1/2 size-5
                      -translate-y-1/2
                      text-[#87928b]
                      group-focus-within:text-[#0c7a4d]
                    "
                  />

                  <input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm(
                        "dueDate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="accountId">
                  Conta
                </FieldLabel>

                <SelectField
                  id="accountId"
                  icon={WalletCards}
                  value={form.accountId}
                  disabled={
                    isSubmitting || isLoadingOptions
                  }
                  onChange={(value) =>
                    updateForm("accountId", value)
                  }
                >
                  <option value="">
                    Selecione uma conta
                  </option>

                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name} ·{" "}
                      {formatAccountType(account.type)}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <FieldLabel htmlFor="categoryId">
                  Categoria
                </FieldLabel>

                <SelectField
                  id="categoryId"
                  icon={Tag}
                  value={form.categoryId}
                  disabled={
                    isSubmitting || isLoadingOptions
                  }
                  onChange={(value) =>
                    updateForm("categoryId", value)
                  }
                >
                  <option value="">
                    Selecione uma categoria
                  </option>

                  {filteredCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </SelectField>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Status</FieldLabel>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <StatusButton
                    label="Concluído"
                    active={
                      form.status === "COMPLETED"
                    }
                    disabled={isSubmitting}
                    onClick={() =>
                      updateForm(
                        "status",
                        "COMPLETED",
                      )
                    }
                  />

                  <StatusButton
                    label="Pendente"
                    active={form.status === "PENDING"}
                    disabled={isSubmitting}
                    onClick={() =>
                      updateForm("status", "PENDING")
                    }
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel htmlFor="notes">
                  Observações
                </FieldLabel>

                <div className="group relative mt-2">
                  <FileText
                    className="
                      pointer-events-none absolute
                      left-4 top-4 size-5
                      text-[#87928b]
                      group-focus-within:text-[#0c7a4d]
                    "
                  />

                  <textarea
                    id="notes"
                    rows={4}
                    maxLength={500}
                    placeholder="Adicione detalhes opcionais"
                    value={form.notes}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value,
                      )
                    }
                    className="
                      w-full resize-none rounded-2xl
                      border border-[#d8e1da]
                      bg-[#fafcfb]
                      py-4 pl-12 pr-4
                      text-sm text-[#17211c]
                      outline-none transition
                      placeholder:text-[#99a49d]
                      focus:border-[#65b98a]
                      focus:bg-white
                      focus:ring-4
                      focus:ring-[#24b46b]/10
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </div>
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

            <div
              className="
                mt-7 flex flex-col-reverse
                gap-3 sm:flex-row
                sm:justify-end
              "
            >
              <Link
                href="/entries"
                className="
                  flex min-h-12 items-center
                  justify-center rounded-2xl
                  border border-[#d7e0d9]
                  bg-white px-5
                  text-sm font-semibold
                  text-[#4e5b53]
                  transition
                  hover:bg-[#f7faf8]
                "
              >
                Cancelar
              </Link>

              <motion.button
                type="submit"
                disabled={
                  isSubmitting || isLoadingOptions
                }
                whileHover={
                  isSubmitting ? undefined : { y: -2 }
                }
                whileTap={
                  isSubmitting
                    ? undefined
                    : { scale: 0.98 }
                }
                className="
                  flex min-h-12 items-center
                  justify-center gap-2
                  rounded-2xl
                  bg-gradient-to-r
                  from-[#0c4f38] to-[#138153]
                  px-6 text-sm font-semibold
                  text-white
                  shadow-[0_14px_30px_rgba(12,79,56,0.22)]
                  transition
                  disabled:cursor-not-allowed
                  disabled:opacity-65
                "
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Salvando lançamento
                  </>
                ) : (
                  <>
                    Salvar lançamento
                    <ArrowRight className="size-4" />
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
            className="
              overflow-hidden rounded-[1.8rem]
              bg-gradient-to-br
              from-[#073c2b] to-[#10784d]
              p-5 text-white
              shadow-[0_18px_55px_rgba(7,60,43,0.18)]
            "
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  flex size-11 items-center
                  justify-center rounded-2xl
                  ${
                    form.type === "INCOME"
                      ? "bg-[#63e9a0]/15 text-[#82efb1]"
                      : "bg-[#ff9e9e]/15 text-[#ffc0c0]"
                  }
                `}
              >
                {form.type === "INCOME" ? (
                  <ArrowUpRight className="size-5" />
                ) : (
                  <ArrowDownRight className="size-5" />
                )}
              </div>

              <div>
                <p className="text-xs text-white/55">
                  Pré-visualização
                </p>

                <h2 className="mt-0.5 font-semibold">
                  {form.type === "INCOME"
                    ? "Nova receita"
                    : "Nova despesa"}
                </h2>
              </div>
            </div>

            <p
              className={`
                mt-7 text-3xl font-bold
                tracking-[-0.05em]
                ${
                  form.type === "INCOME"
                    ? "text-[#77efa9]"
                    : "text-[#ffb0b0]"
                }
              `}
            >
              {form.type === "INCOME" ? "+" : "-"}{" "}
              {formatCurrency(
                parseMoney(form.amount) || 0,
              )}
            </p>

            <p className="mt-3 truncate text-sm font-semibold">
              {form.description.trim() ||
                "Descrição do lançamento"}
            </p>

            <div className="mt-5 space-y-3 text-xs">
              <PreviewRow
                icon={Landmark}
                label="Conta"
                value={
                  selectedAccount?.name ??
                  "Não selecionada"
                }
              />

              <PreviewRow
                icon={Tag}
                label="Categoria"
                value={
                  selectedCategory?.name ??
                  "Não selecionada"
                }
              />

              <PreviewRow
                icon={CalendarDays}
                label="Data"
                value={
                  form.dueDate
                    ? formatDate(form.dueDate)
                    : "Não informada"
                }
              />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="
              rounded-[1.6rem]
              border border-[#dfe6e1]
              bg-white p-5
              shadow-[0_14px_42px_rgba(21,53,36,0.055)]
            "
          >
            <h2 className="font-bold">
              Dica rápida
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#748078]">
              Escolha uma categoria compatível com o
              tipo do lançamento. Isso melhora seus
              relatórios e análises financeiras.
            </p>
          </motion.section>
        </aside>
      </div>
    </main>
  );
}

function TypeButton({
  label,
  description,
  icon: Icon,
  active,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  active: boolean;
  variant: "income" | "expense";
  disabled: boolean;
  onClick: () => void;
}) {
  const income = variant === "income";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center gap-3
        rounded-2xl border p-4
        text-left transition
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${
          active
            ? income
              ? "border-[#55bd82] bg-[#ebf8f0] ring-4 ring-[#24b46b]/8"
              : "border-[#ee8d8d] bg-[#fff4f3] ring-4 ring-[#df4545]/8"
            : "border-[#dce4de] bg-[#fafcfb] hover:bg-white"
        }
      `}
    >
      <div
        className={`
          flex size-11 shrink-0
          items-center justify-center
          rounded-2xl
          ${
            income
              ? "bg-[#ddf5e6] text-[#0b9258]"
              : "bg-[#ffe5e3] text-[#df4545]"
          }
        `}
      >
        <Icon className="size-5" />
      </div>

      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>

        <p className="mt-1 text-xs text-[#849087]">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

function StatusButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        min-h-12 rounded-2xl
        border px-4 text-sm
        font-semibold transition
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${
          active
            ? "border-[#56b982] bg-[#e9f7ee] text-[#0b794b]"
            : "border-[#dce4de] bg-[#fafcfb] text-[#69756d]"
        }
      `}
    >
      {label}
    </button>
  );
}

function SelectField({
  id,
  icon: Icon,
  value,
  disabled,
  onChange,
  children,
}: {
  id: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative mt-2">
      <Icon
        className="
          pointer-events-none absolute
          left-4 top-1/2 size-5
          -translate-y-1/2
          text-[#87928b]
          group-focus-within:text-[#0c7a4d]
        "
      />

      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          min-h-14 w-full appearance-none
          rounded-2xl border border-[#d8e1da]
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
        {children}
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
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="
        block text-sm font-semibold
        text-[#2e3c34]
      "
    >
      {children}
    </label>
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
      {success ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
      ) : (
        <ReceiptText className="mt-0.5 size-5 shrink-0" />
      )}

      <p className="leading-5">{message}</p>
    </motion.div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-[#75e6a6]" />

      <span className="text-white/55">
        {label}
      </span>

      <span className="ml-auto max-w-[150px] truncate font-semibold">
        {value}
      </span>
    </div>
  );
}

function sanitizeMoneyInput(value: string) {
  return value
    .replace(/[^\d,.]/g, "")
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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatAccountType(type: string) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    CHECKING: "Conta corrente",
    SAVINGS: "Poupança",
    CREDIT_CARD: "Cartão de crédito",
    INVESTMENT: "Investimento",
  };

  return labels[type] ?? type;
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