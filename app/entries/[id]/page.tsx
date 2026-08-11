"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { ApiError, api, clearStoredSession } from "../../src/lib/api";

type EntryType = "INCOME" | "EXPENSE";

type EntryStatus = "PENDING" | "COMPLETED" | "CANCELLED";

interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: string | number;
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

interface Entry {
  id: string;
  description: string;
  amount: string | number;
  type: EntryType;
  status: EntryStatus;
  dueDate: string;
  completedAt: string | null;
  notes: string | null;
  account: {
    id: string;
    name: string;
    type: string;
  };
  category: {
    id: string;
    name: string;
    type: EntryType;
    icon: string;
    color: string;
  } | null;
}

interface EntryResponse {
  entry: Entry;
}

interface AccountsResponse {
  accounts: Account[];
}

interface CategoriesResponse {
  categories: Category[];
}

interface UpdateEntryResponse {
  message: string;
  entry: Entry;
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

const emptyForm: EntryForm = {
  description: "",
  amount: "",
  type: "EXPENSE",
  status: "COMPLETED",
  dueDate: "",
  accountId: "",
  categoryId: "",
  notes: "",
};

export default function EditEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const entryId = params.id;

  const [form, setForm] = useState<EntryForm>(emptyForm);

  const [initialForm, setInitialForm] = useState<EntryForm | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.type === form.type && category.isActive,
      ),
    [categories, form.type],
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === form.accountId),
    [accounts, form.accountId],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId),
    [categories, form.categoryId],
  );

  const hasChanges = useMemo(() => {
    if (!initialForm) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  useEffect(() => {
    async function loadPage() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [entryResponse, accountsResponse, categoriesResponse] =
          await Promise.all([
            api<EntryResponse>(`/entries/${entryId}`),
            api<AccountsResponse>("/accounts"),
            api<CategoriesResponse>("/categories"),
          ]);

        const entry = entryResponse.entry;

        const loadedForm: EntryForm = {
          description: entry.description,
          amount: formatMoneyInput(Number(entry.amount)),
          type: entry.type,
          status: entry.status,
          dueDate: toDateInputValue(entry.dueDate),
          accountId: entry.account.id,
          categoryId: entry.category?.id ?? "",
          notes: entry.notes ?? "",
        };

        setAccounts(
          accountsResponse.accounts.filter((account) => account.isActive),
        );

        setCategories(categoriesResponse.categories);

        setForm(loadedForm);
        setInitialForm(loadedForm);
      } catch (error) {
        handleRequestError(error, "Não foi possível carregar o lançamento.");
      } finally {
        setIsLoading(false);
      }
    }

    if (entryId) {
      void loadPage();
    }
  }, [entryId]);

  function updateForm<K extends keyof EntryForm>(
    field: K,
    value: EntryForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleTypeChange(type: EntryType) {
    const compatibleCategory = categories.find(
      (category) => category.type === type && category.isActive,
    );

    setForm((current) => ({
      ...current,
      type,
      categoryId: compatibleCategory?.id ?? "",
    }));

    setErrorMessage("");
    setSuccessMessage("");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      const response = await api<UpdateEntryResponse>(`/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: form.description.trim(),
          amount: parseMoney(form.amount),
          type: form.type,
          status: form.status,
          dueDate: new Date(`${form.dueDate}T12:00:00.000Z`).toISOString(),
          accountId: form.accountId,
          categoryId: form.categoryId,
          notes: form.notes.trim() || null,
        }),
      });

      const updatedForm: EntryForm = {
        description: response.entry.description,
        amount: formatMoneyInput(Number(response.entry.amount)),
        type: response.entry.type,
        status: response.entry.status,
        dueDate: toDateInputValue(response.entry.dueDate),
        accountId: response.entry.account.id,
        categoryId: response.entry.category?.id ?? "",
        notes: response.entry.notes ?? "",
      };

      setForm(updatedForm);
      setInitialForm(updatedForm);
      setSuccessMessage(response.message);
    } catch (error) {
      handleRequestError(error, "Não foi possível atualizar o lançamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setErrorMessage("");

      await api<void>(`/entries/${entryId}`, {
        method: "DELETE",
      });

      router.replace("/entries");
      router.refresh();
    } catch (error) {
      setDeleteDialogOpen(false);

      handleRequestError(error, "Não foi possível excluir o lançamento.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleRequestError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      clearStoredSession();
      window.location.replace("/login");
      return;
    }

    setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
  }

  if (isLoading) {
    return <EditEntrySkeleton />;
  }

  if (errorMessage && !initialForm) {
    return (
      <LoadError
        message={errorMessage}
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
            href="/entries"
            aria-label="Voltar"
            className="
              flex size-11 items-center
              justify-center rounded-2xl
              border border-[#d8e1da]
              bg-white text-[#0c4f38]
              shadow-sm transition
              hover:-translate-y-0.5
              active:scale-95
            "
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1
                className="
                  truncate text-xl font-bold
                  tracking-[-0.035em]
                  sm:text-2xl
                "
              >
                Editar lançamento
              </h1>

              {hasChanges && (
                <span
                  className="
                    hidden rounded-full
                    bg-[#fff1d7] px-2.5
                    py-1 text-[10px]
                    font-bold text-[#9b6712]
                    sm:inline-flex
                  "
                >
                  Não salvo
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-[#78847c]">
              Atualize os dados da movimentação.
            </p>
          </div>

          <button
            type="button"
            aria-label="Excluir lançamento"
            onClick={() => setDeleteDialogOpen(true)}
            className="
              flex size-11 items-center
              justify-center rounded-2xl
              border border-[#f1cccc]
              bg-white text-[#d64242]
              transition
              hover:bg-[#fff2f1]
              active:scale-95
            "
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </header>

      <div
        className="
          mx-auto grid max-w-[1200px]
          gap-5 px-4 py-5
          sm:px-6
          lg:grid-cols-[1fr_340px]
          lg:px-8 lg:py-8
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
                onClick={() => handleTypeChange("EXPENSE")}
              />

              <TypeButton
                label="Receita"
                description="Dinheiro que entrou"
                icon={ArrowUpRight}
                active={form.type === "INCOME"}
                variant="income"
                disabled={isSubmitting}
                onClick={() => handleTypeChange("INCOME")}
              />
            </div>

            <div
              className="
                mt-7 grid gap-5
                sm:grid-cols-2
              "
            >
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="description">Descrição</FieldLabel>

                <InputWrapper icon={<ReceiptText className="size-5" />}>
                  <input
                    id="description"
                    type="text"
                    maxLength={100}
                    value={form.description}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    className={inputClassName}
                  />
                </InputWrapper>
              </div>

              <div>
                <FieldLabel htmlFor="amount">Valor</FieldLabel>

                <InputWrapper icon={<CircleDollarSign className="size-5" />}>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm(
                        "amount",
                        sanitizeMoneyInput(event.target.value),
                      )
                    }
                    className={inputClassName}
                  />
                </InputWrapper>
              </div>

              <div>
                <FieldLabel htmlFor="dueDate">Data</FieldLabel>

                <InputWrapper icon={<CalendarDays className="size-5" />}>
                  <input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm("dueDate", event.target.value)
                    }
                    className={inputClassName}
                  />
                </InputWrapper>
              </div>

              <div>
                <FieldLabel htmlFor="accountId">Conta</FieldLabel>

                <SelectField
                  id="accountId"
                  icon={<WalletCards className="size-5" />}
                  value={form.accountId}
                  disabled={isSubmitting}
                  onChange={(value) => updateForm("accountId", value)}
                >
                  <option value="">Selecione uma conta</option>

                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {formatAccountType(account.type)}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div>
                <FieldLabel htmlFor="categoryId">Categoria</FieldLabel>

                <SelectField
                  id="categoryId"
                  icon={<Tag className="size-5" />}
                  value={form.categoryId}
                  disabled={isSubmitting}
                  onChange={(value) => updateForm("categoryId", value)}
                >
                  <option value="">Selecione uma categoria</option>

                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Status</FieldLabel>

                <div
                  className="
                    mt-2 grid gap-3
                    sm:grid-cols-3
                  "
                >
                  <StatusButton
                    label="Concluído"
                    active={form.status === "COMPLETED"}
                    disabled={isSubmitting}
                    onClick={() => updateForm("status", "COMPLETED")}
                  />

                  <StatusButton
                    label="Pendente"
                    active={form.status === "PENDING"}
                    disabled={isSubmitting}
                    onClick={() => updateForm("status", "PENDING")}
                  />

                  <StatusButton
                    label="Cancelado"
                    active={form.status === "CANCELLED"}
                    disabled={isSubmitting}
                    onClick={() => updateForm("status", "CANCELLED")}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel htmlFor="notes">Observações</FieldLabel>

                <div className="group relative mt-2">
                  <FileText
                    className="
                      pointer-events-none
                      absolute left-4 top-4
                      size-5 text-[#87928b]
                      group-focus-within:text-[#0c7a4d]
                    "
                  />

                  <textarea
                    id="notes"
                    rows={4}
                    maxLength={500}
                    value={form.notes}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    className="
                      w-full resize-none
                      rounded-2xl border
                      border-[#d8e1da]
                      bg-[#fafcfb]
                      py-4 pl-12 pr-4
                      text-sm outline-none
                      transition
                      focus:border-[#65b98a]
                      focus:bg-white
                      focus:ring-4
                      focus:ring-[#24b46b]/10
                      disabled:opacity-60
                    "
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {errorMessage && (
                <Feedback key="error" message={errorMessage} variant="error" />
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
                  flex min-h-12
                  items-center justify-center
                  rounded-2xl border
                  border-[#d7e0d9]
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
                disabled={isSubmitting || !hasChanges}
                whileHover={isSubmitting || !hasChanges ? undefined : { y: -2 }}
                whileTap={
                  isSubmitting || !hasChanges ? undefined : { scale: 0.98 }
                }
                className="
                  flex min-h-12
                  items-center justify-center
                  gap-2 rounded-2xl
                  bg-gradient-to-r
                  from-[#0c4f38]
                  to-[#138153]
                  px-6 text-sm
                  font-semibold text-white
                  shadow-[0_14px_30px_rgba(12,79,56,0.22)]
                  transition
                  disabled:cursor-not-allowed
                  disabled:opacity-50
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
                    Salvar alterações
                    <ArrowRight className="size-4" />
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
              overflow-hidden
              rounded-[1.8rem]
              bg-gradient-to-br
              from-[#073c2b]
              to-[#10784d]
              p-5 text-white
              shadow-[0_18px_55px_rgba(7,60,43,0.18)]
            "
          >
            <p className="text-xs text-white/55">Pré-visualização</p>

            <div className="mt-3 flex items-center gap-3">
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
                <h2 className="font-semibold">
                  {form.type === "INCOME" ? "Receita" : "Despesa"}
                </h2>

                <p className="mt-0.5 text-xs text-white/50">
                  {formatStatus(form.status)}
                </p>
              </div>
            </div>

            <p
              className={`
                mt-7 text-3xl font-bold
                tracking-[-0.05em]
                ${form.type === "INCOME" ? "text-[#77efa9]" : "text-[#ffb0b0]"}
              `}
            >
              {form.type === "INCOME" ? "+" : "-"}{" "}
              {formatCurrency(parseMoney(form.amount) || 0)}
            </p>

            <p className="mt-3 truncate text-sm font-semibold">
              {form.description.trim() || "Descrição do lançamento"}
            </p>

            <div className="mt-5 space-y-3 text-xs">
              <PreviewRow
                label="Conta"
                value={selectedAccount?.name ?? "Não selecionada"}
              />

              <PreviewRow
                label="Categoria"
                value={selectedCategory?.name ?? "Não selecionada"}
              />

              <PreviewRow
                label="Data"
                value={
                  form.dueDate ? formatDate(form.dueDate) : "Não informada"
                }
              />
            </div>
          </motion.section>

          <section
            className="
              rounded-[1.6rem]
              border border-[#dfe6e1]
              bg-white p-5
              shadow-[0_14px_42px_rgba(21,53,36,0.055)]
            "
          >
            <h2 className="font-bold">Estado da edição</h2>

            <div className="mt-4 flex items-center gap-3">
              <div
                className={`
                  flex size-10 items-center
                  justify-center rounded-2xl
                  ${
                    hasChanges
                      ? "bg-[#fff1d7] text-[#a36c12]"
                      : "bg-[#e7f6ec] text-[#0c8754]"
                  }
                `}
              >
                {hasChanges ? (
                  <AlertCircle className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {hasChanges ? "Alterações não salvas" : "Tudo atualizado"}
                </p>

                <p className="mt-1 text-xs text-[#7c8880]">
                  {hasChanges
                    ? "Salve para registrar as mudanças."
                    : "Nenhuma alteração pendente."}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {deleteDialogOpen && (
          <DeleteDialog
            description={form.description}
            isDeleting={isDeleting}
            onCancel={() => setDeleteDialogOpen(false)}
            onConfirm={() => void handleDelete()}
          />
        )}
      </AnimatePresence>
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
      whileTap={{
        scale: 0.98,
      }}
      className={`
        flex items-center gap-3
        rounded-2xl border p-4
        text-left transition
        disabled:opacity-60
        ${
          active
            ? income
              ? "border-[#55bd82] bg-[#ebf8f0] ring-4 ring-[#24b46b]/8"
              : "border-[#ee8d8d] bg-[#fff4f3] ring-4 ring-[#df4545]/8"
            : "border-[#dce4de] bg-[#fafcfb]"
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
        <p className="text-sm font-semibold">{label}</p>

        <p className="mt-1 text-xs text-[#849087]">{description}</p>
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

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
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

function InputWrapper({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="group relative mt-2">
      <div
        className="
          pointer-events-none
          absolute left-4 top-1/2
          -translate-y-1/2
          text-[#87928b]
          group-focus-within:text-[#0c7a4d]
        "
      >
        {icon}
      </div>

      {children}
    </div>
  );
}

function SelectField({
  id,
  icon,
  value,
  disabled,
  onChange,
  children,
}: {
  id: string;
  icon: ReactNode;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="group relative mt-2">
      <div
        className="
          pointer-events-none
          absolute left-4 top-1/2
          -translate-y-1/2
          text-[#87928b]
          group-focus-within:text-[#0c7a4d]
        "
      >
        {icon}
      </div>

      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="
          min-h-14 w-full
          appearance-none rounded-2xl
          border border-[#d8e1da]
          bg-[#fafcfb]
          pl-12 pr-11 text-sm
          outline-none transition
          focus:border-[#65b98a]
          focus:bg-white
          focus:ring-4
          focus:ring-[#24b46b]/10
          disabled:opacity-60
        "
      >
        {children}
      </select>

      <ChevronDown
        className="
          pointer-events-none
          absolute right-4 top-1/2
          size-4 -translate-y-1/2
          text-[#87928b]
        "
      />
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/55">{label}</span>

      <span
        className="
          ml-auto max-w-[170px]
          truncate font-semibold
        "
      >
        {value}
      </span>
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
      {success ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-5 shrink-0" />
      )}

      <p className="leading-5">{message}</p>
    </motion.div>
  );
}

function DeleteDialog({
  description,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  description: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Fechar"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        onClick={onCancel}
        className="
          fixed inset-0 z-50
          bg-[#031b12]/45
          backdrop-blur-sm
        "
      />

      <motion.div
        initial={{
          opacity: 0,
          y: 24,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.96,
        }}
        className="
          fixed left-1/2 top-1/2
          z-[60]
          w-[calc(100%-2rem)]
          max-w-md
          -translate-x-1/2
          -translate-y-1/2
          rounded-[1.7rem]
          border border-[#e3e8e4]
          bg-white p-6
          shadow-[0_30px_90px_rgba(12,40,25,0.3)]
        "
      >
        <div className="flex items-start justify-between">
          <div
            className="
              flex size-12 items-center
              justify-center rounded-2xl
              bg-[#fff0ef]
              text-[#df4545]
            "
          >
            <Trash2 className="size-5" />
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="
              flex size-9 items-center
              justify-center rounded-xl
              text-[#849087]
              hover:bg-[#f2f5f2]
            "
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 className="mt-5 text-xl font-bold">Excluir lançamento?</h2>

        <p className="mt-3 text-sm leading-6 text-[#6d7971]">
          O lançamento “{description}” será excluído permanentemente.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="
              min-h-12 rounded-2xl
              border border-[#d9e2db]
              bg-white text-sm
              font-semibold text-[#455249]
            "
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="
              flex min-h-12 items-center
              justify-center gap-2
              rounded-2xl bg-[#df4545]
              text-sm font-semibold
              text-white
              disabled:opacity-70
            "
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

function EditEntrySkeleton() {
  return (
    <main className="min-h-dvh bg-[#f2f5f2]">
      <div
        className="
          h-[73px] border-b
          border-[#dde5df]
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
            h-[720px] animate-pulse
            rounded-[1.8rem] bg-white
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
              h-36 animate-pulse
              rounded-[1.6rem]
              bg-white
            "
          />
        </div>
      </div>
    </main>
  );
}

function LoadError({
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
          bg-white p-7 text-center
        "
      >
        <AlertCircle
          className="
            mx-auto size-12
            text-[#df4545]
          "
        />

        <h1 className="mt-5 text-xl font-bold">Não foi possível abrir</h1>

        <p className="mt-3 text-sm text-[#65716a]">{message}</p>

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
          "
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </button>
      </div>
    </main>
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

  if (sanitized.includes(",") && sanitized.includes(".")) {
    return Number(sanitized.replace(/\./g, "").replace(",", "."));
  }

  return Number(sanitized.replace(",", "."));
}

function formatMoneyInput(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatStatus(status: EntryStatus) {
  const labels: Record<EntryStatus, string> = {
    COMPLETED: "Concluído",
    PENDING: "Pendente",
    CANCELLED: "Cancelado",
  };

  return labels[status];
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
  focus:border-[#65b98a]
  focus:bg-white
  focus:ring-4
  focus:ring-[#24b46b]/10
  disabled:cursor-not-allowed
  disabled:opacity-60
`;
