"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Utensils,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";

import { AppShell } from "../src/components/layout/app-shell";
import { InsightCard } from "../src/components/insights/insight-card";
import { useDashboard } from "../src/hooks/use-dashboard";
import { useInsights } from "../src/hooks/use-insights";
import type {
  DashboardAccount,
  DashboardEntry,
} from "../src/lib/dashboard";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface SummaryCardData {
  label: string;
  value: number;
  trend: string;
  trendLabel: string;
  positive: boolean;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

interface CategorySummary {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

const chartValues = [
  28, 62, 44, 72, 50, 38, 68, 83, 55, 78, 47, 65,
];

export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);

  const {
    dashboard,
    isLoading,
    errorMessage,
    reload,
  } = useDashboard();

  const {
    overview: insightsOverview,
    isLoading: isLoadingInsights,
    errorMessage: insightsErrorMessage,
    reload: reloadInsights,
  } = useInsights();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser =
        window.localStorage.getItem("user") ??
        window.sessionStorage.getItem("user");

      if (!storedUser) {
        return;
      }

      try {
        setUser(JSON.parse(storedUser) as StoredUser);
      } catch {
        setUser(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const summaryCards = useMemo<SummaryCardData[]>(() => {
    if (!dashboard) {
      return [];
    }

    const result =
      dashboard.balance.income -
      dashboard.balance.expense;

    return [
      {
        label: "Saldo atual",
        value: dashboard.balance.total,
        trend: dashboard.balance.total >= 0
          ? "Positivo"
          : "Negativo",
        trendLabel: "saldo disponível",
        positive: dashboard.balance.total >= 0,
        icon: WalletCards,
      },
      {
        label: "Receitas",
        value: dashboard.balance.income,
        trend: "Entradas",
        trendLabel: "receitas concluídas",
        positive: true,
        icon: ArrowUpRight,
      },
      {
        label: "Despesas",
        value: dashboard.balance.expense,
        trend: "Saídas",
        trendLabel: "despesas concluídas",
        positive: false,
        icon: ArrowDownRight,
      },
      {
        label: "Resultado",
        value: result,
        trend: result >= 0 ? "Economia" : "Déficit",
        trendLabel: "receitas menos despesas",
        positive: result >= 0,
        icon: PiggyBank,
      },
    ];
  }, [dashboard]);

  const categorySummaries = useMemo<CategorySummary[]>(() => {
    if (!dashboard) {
      return [];
    }

    const totals = new Map<
      string,
      {
        amount: number;
        color: string;
      }
    >();

    for (const entry of dashboard.recentEntries) {
      if (entry.type !== "EXPENSE") {
        continue;
      }

      const current = totals.get(entry.category.name);
      const amount = Number(entry.amount);

      totals.set(entry.category.name, {
        amount: (current?.amount ?? 0) + amount,
        color: entry.category.color || "#22c55e",
      });
    }

    const total = Array.from(totals.values()).reduce(
      (sum, category) => sum + category.amount,
      0,
    );

    return Array.from(totals.entries())
      .map(([name, category]) => ({
        name,
        amount: category.amount,
        color: category.color,
        percentage:
          total > 0
            ? Math.round((category.amount / total) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [dashboard]);

  if (isLoading) {
    return (
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  if (errorMessage || !dashboard) {
    return (
      <AppShell>
        <DashboardError
          message={
            errorMessage ||
            "Dashboard indisponível no momento."
          }
          onRetry={() => void reload()}
        />
      </AppShell>
    );
  }

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || "usuário";

  return (
    <AppShell>
        <motion.main
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.06,
              },
            },
          }}
          className="
            mx-auto w-full max-w-[1600px]
            space-y-5 px-4 pb-28 pt-4
            sm:px-6 sm:pt-6
            lg:px-8 lg:pb-10
          "
        >
          <Greeting firstName={firstName} />

          <section
            className="
              grid gap-4
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            {summaryCards.map((card, index) => (
              <SummaryCard
                key={card.label}
                {...card}
                index={index}
              />
            ))}
          </section>

          <section
            className="
              grid gap-5
              xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]
            "
          >
            <CashFlowCard
              income={dashboard.balance.income}
              expense={dashboard.balance.expense}
            />

            <CategoriesCard
              categories={categorySummaries}
              total={dashboard.balance.expense}
            />
          </section>

          <section
            className="
              grid gap-5
              xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]
            "
          >
            <RecentEntriesCard
              entries={dashboard.recentEntries}
            />

            <AccountsCard accounts={dashboard.accounts} />
          </section>

          <InsightCard
            insight={insightsOverview?.insights[0]}
            isLoading={isLoadingInsights}
            errorMessage={insightsErrorMessage}
            onRetry={() => void reloadInsights()}
            actionOverride={{
              label: "Ver análise completa",
              href: "/ai",
            }}
          />
        </motion.main>
    </AppShell>
  );
}

function Greeting({
  firstName,
}: {
  firstName: string;
}) {
  const currentDate = new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
    },
  ).format(new Date());

  const formattedDate =
    currentDate.charAt(0).toUpperCase() +
    currentDate.slice(1);

  return (
    <motion.section
      variants={sectionAnimation}
      className="
        flex flex-col justify-between gap-4
        sm:flex-row sm:items-end
      "
    >
      <div>
        <p className="text-sm font-medium text-[#68756d]">
          {formattedDate}
        </p>

        <h1
          className="
            mt-1 text-3xl font-bold
            tracking-[-0.045em]
            sm:text-4xl
          "
        >
          Olá, {firstName}! 👋
        </h1>

        <p className="mt-2 text-sm text-[#6f7c74]">
          Aqui está o resumo da sua vida financeira.
        </p>
      </div>

    </motion.section>
  );
}

function SummaryCard({
  label,
  value,
  trend,
  trendLabel,
  positive,
  icon: Icon,
  index,
}: SummaryCardData & {
  index: number;
}) {
  return (
    <motion.article
      variants={sectionAnimation}
      whileHover={{
        y: -4,
        transition: {
          duration: 0.2,
        },
      }}
      className="
        group relative overflow-hidden
        rounded-[1.6rem]
        border border-[#dfe6e1]
        bg-white p-5
        shadow-[0_14px_42px_rgba(21,53,36,0.055)]
        transition-shadow
        hover:shadow-[0_20px_50px_rgba(21,53,36,0.09)]
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute -right-12 -top-12
          size-32 rounded-full
          bg-[#2bc277]/[0.06]
          transition duration-500
          group-hover:scale-125
        "
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#59665e]">
            {label}
          </p>

          <div
            className={`
              flex size-10 items-center justify-center
              rounded-2xl
              ${
                positive
                  ? "bg-[#e4f7eb] text-[#0d8554]"
                  : "bg-[#fff0ef] text-[#df4545]"
              }
            `}
          >
            <Icon className="size-5" />
          </div>
        </div>

        <p
          className={`
            mt-5 text-[1.75rem] font-bold
            tracking-[-0.045em]
            ${
              index === 0
                ? positive
                  ? "text-[#15915d]"
                  : "text-[#df4545]"
                : "text-[#17211c]"
            }
          `}
        >
          <AnimatedCurrency value={value} />
        </p>

        <div className="mt-4 flex items-center gap-2 text-xs">
          <span
            className={`
              flex items-center gap-1 font-bold
              ${
                positive
                  ? "text-[#0b945b]"
                  : "text-[#e14646]"
              }
            `}
          >
            {positive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}

            {trend}
          </span>

          <span className="text-[#8a958e]">
            {trendLabel}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function AnimatedCurrency({
  value,
}: {
  value: number;
}) {
  const [displayedValue, setDisplayedValue] = useState(0);

  useEffect(() => {
    let animationFrame = 0;
    const duration = 850;
    const start = performance.now();

    function animate(time: number) {
      const progress = Math.min(
        (time - start) / duration,
        1,
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setDisplayedValue(value * eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return displayedValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function CashFlowCard({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  return (
    <motion.article
      variants={sectionAnimation}
      className={dashboardCardClass}
    >
      <CardHeader
        title="Fluxo de caixa"
        description="Visão das suas entradas e saídas"
      />

      <div className="mt-7 flex items-center gap-5 text-xs">
        <Legend color="#16955d" label="Receitas" />
        <Legend color="#cbe7d6" label="Despesas" />
      </div>

      <div className="mt-7 flex h-[220px] items-end gap-2 sm:gap-3">
        {chartValues.map((value, index) => {
          const incomeHeight = Math.max(
            18,
            value * (income > 0 ? 1 : 0.25),
          );

          const expenseRatio =
            income > 0
              ? Math.min(expense / income, 1)
              : expense > 0
                ? 0.7
                : 0.25;

          const expenseHeight = Math.max(
            12,
            incomeHeight * expenseRatio,
          );

          return (
            <div
              key={`${value}-${index}`}
              className="
                flex h-full flex-1
                items-end gap-1
              "
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.min(incomeHeight, 95)}%`,
                }}
                transition={{
                  delay: 0.25 + index * 0.035,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="
                  w-1/2 rounded-t-lg
                  bg-gradient-to-t
                  from-[#117d50] to-[#2ec67c]
                "
              />

              <motion.div
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.min(expenseHeight, 90)}%`,
                }}
                transition={{
                  delay: 0.28 + index * 0.035,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="
                  w-1/2 rounded-t-lg
                  bg-[#d7ebde]
                "
              />
            </div>
          );
        })}
      </div>

      <div
        className="
          mt-3 flex justify-between
          text-[11px] text-[#89948d]
        "
      >
        <span>Jan</span>
        <span>Fev</span>
        <span>Mar</span>
        <span>Abr</span>
        <span>Mai</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Ago</span>
      </div>
    </motion.article>
  );
}

function CategoriesCard({
  categories,
  total,
}: {
  categories: CategorySummary[];
  total: number;
}) {
  const chartBackground =
    categories.length > 0
      ? createConicGradient(categories)
      : "conic-gradient(#dce9e0 0% 100%)";

  return (
    <motion.article
      variants={sectionAnimation}
      className={dashboardCardClass}
    >
      <CardHeader
        title="Gastos por categoria"
        description="Distribuição das despesas recentes"
      />

      <div
        className="
          mt-7 grid items-center gap-7
          sm:grid-cols-[180px_1fr]
          xl:grid-cols-1
          2xl:grid-cols-[180px_1fr]
        "
      >
        <div
          className="
            relative mx-auto
            flex size-44 items-center justify-center
            rounded-full
          "
          style={{
            background: chartBackground,
          }}
        >
          <div
            className="
              flex size-28 flex-col
              items-center justify-center
              rounded-full bg-white
              shadow-inner
            "
          >
            <span className="text-xs text-[#7d8981]">
              Total
            </span>

            <strong className="mt-1 text-base">
              {formatCurrency(total)}
            </strong>

            <span className="mt-0.5 text-[10px] text-[#9aa39e]">
              despesas
            </span>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="min-w-0 space-y-3">
            {categories.map((category) => (
              <div
                key={category.name}
                className="
                  flex min-w-0 items-center gap-3
                  text-xs
                "
              >
                <span
                  className="
                    size-2.5 shrink-0
                    rounded-full
                  "
                  style={{
                    backgroundColor: category.color,
                  }}
                />

                <span className="min-w-0 flex-1 truncate font-medium">
                  {category.name}
                </span>

                <span className="text-[#78847c]">
                  {category.percentage}%
                </span>

                <span className="w-20 text-right font-semibold">
                  {formatCurrency(category.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-[#49564e]">
              Nenhuma despesa recente
            </p>

            <p className="mt-2 text-xs leading-5 text-[#87928b]">
              Registre uma despesa para visualizar a
              distribuição por categoria.
            </p>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function RecentEntriesCard({
  entries,
}: {
  entries: DashboardEntry[];
}) {
  return (
    <motion.article
      variants={sectionAnimation}
      className={dashboardCardClass}
    >
      <CardHeader
        title="Últimos lançamentos"
        action="Ver todos"
      />

      {entries.length > 0 ? (
        <div className="mt-5 divide-y divide-[#edf1ee]">
          {entries.map((entry, index) => {
            const income = entry.type === "INCOME";
            const Icon = getEntryIcon(entry);
            const value = Number(entry.amount);

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.38 + index * 0.07,
                }}
                className="
                  group flex items-center gap-3
                  py-4 first:pt-0 last:pb-0
                "
              >
                <div
                  className={`
                    flex size-11 shrink-0
                    items-center justify-center
                    rounded-2xl
                    ${
                      income
                        ? "bg-[#e4f7eb] text-[#0a8b55]"
                        : "bg-[#fff0ef] text-[#e04646]"
                    }
                  `}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {entry.description}
                  </p>

                  <p
                    className="
                      mt-1 truncate
                      text-xs text-[#849087]
                    "
                  >
                    {entry.account.name} •{" "}
                    {entry.category.name}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`
                      text-sm font-bold
                      ${
                        income
                          ? "text-[#0c955b]"
                          : "text-[#df4545]"
                      }
                    `}
                  >
                    {income ? "+" : "-"}{" "}
                    {formatCurrency(value)}
                  </p>

                  <p className="mt-1 text-xs text-[#949e98]">
                    {formatEntryDate(entry)}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Mais opções"
                  className="
                    hidden size-9 items-center
                    justify-center rounded-xl
                    text-[#89958e]
                    transition hover:bg-[#edf4ef]
                    sm:flex
                  "
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ReceiptText}
          title="Nenhum lançamento encontrado"
          description="Seus lançamentos mais recentes aparecerão aqui."
        />
      )}
    </motion.article>
  );
}

function AccountsCard({
  accounts,
}: {
  accounts: DashboardAccount[];
}) {
  return (
    <motion.article
      variants={sectionAnimation}
      className={dashboardCardClass}
    >
      <CardHeader
        title="Contas"
        action="Ver todas"
      />

      {accounts.length > 0 ? (
        <div className="mt-5 space-y-3">
          {accounts.map((account, index) => (
            <motion.button
              key={account.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.42 + index * 0.08,
              }}
              whileHover={{ x: 3 }}
              className="
                flex w-full items-center gap-3
                rounded-2xl border
                border-[#e7ece8]
                bg-[#fafcfb] p-4
                text-left transition
                hover:border-[#bcd8c7]
                hover:bg-white
              "
            >
              <div
                className={`
                  flex size-12 shrink-0
                  items-center justify-center
                  rounded-2xl
                  text-base font-bold text-white
                  ${
                    account.type === "CASH"
                      ? "bg-gradient-to-br from-[#128557] to-[#2ac77a]"
                      : "bg-gradient-to-br from-[#6f24bd] to-[#9b35d7]"
                  }
                `}
              >
                {getAccountInitials(account)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {account.name}
                </p>

                <p className="mt-1 text-xs text-[#859087]">
                  {formatAccountType(account.type)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold">
                  {formatCurrency(
                    Number(account.initialBalance),
                  )}
                </p>

                <p className="mt-1 text-xs text-[#8a958e]">
                  Saldo inicial
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={WalletCards}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua primeira conta para organizar seus saldos."
        />
      )}
    </motion.article>
  );
}

function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2
          className="
            text-base font-bold
            tracking-[-0.025em]
          "
        >
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs text-[#87928b]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          className="
            rounded-xl border
            border-[#e0e7e2]
            bg-white px-3 py-2
            text-xs font-semibold
            text-[#4c5a51]
            transition
            hover:border-[#bcd6c6]
            hover:text-[#0c4f38]
          "
        >
          {action}
        </button>
      )}
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />

      <span className="text-[#758079]">{label}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        mt-5 flex min-h-44 flex-col
        items-center justify-center
        rounded-2xl border
        border-dashed border-[#dce5de]
        bg-[#fafcfb] px-5 text-center
      "
    >
      <div
        className="
          flex size-12 items-center justify-center
          rounded-2xl bg-[#e7f5ec]
          text-[#0c8553]
        "
      >
        <Icon className="size-5" />
      </div>

      <p className="mt-4 text-sm font-semibold">
        {title}
      </p>

      <p className="mt-2 max-w-xs text-xs leading-5 text-[#87928b]">
        {description}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-[calc(100dvh-73px)] bg-[#f2f5f2]">
        <div
          className="
            mx-auto max-w-[1600px]
            px-4 py-6
            sm:px-6 lg:px-8
          "
        >
          <div className="h-5 w-44 animate-pulse rounded-lg bg-[#dfe7e1]" />
          <div className="mt-3 h-10 w-72 animate-pulse rounded-xl bg-[#dfe7e1]" />
          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-lg bg-[#e3e9e4]" />

          <div
            className="
              mt-7 grid gap-4
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="
                  h-48 animate-pulse
                  rounded-[1.6rem]
                  border border-[#dfe6e1]
                  bg-white
                "
              />
            ))}
          </div>

          <div
            className="
              mt-5 grid gap-5
              xl:grid-cols-[1.35fr_0.85fr]
            "
          >
            <div
              className="
                h-96 animate-pulse
                rounded-[1.7rem] bg-white
              "
            />

            <div
              className="
                h-96 animate-pulse
                rounded-[1.7rem] bg-white
              "
            />
          </div>
        </div>
    </main>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main
      className="
        flex min-h-[calc(100dvh-73px)] items-center
        justify-center bg-[#f2f5f2]
        px-5
      "
    >
      <div
        className="
          w-full max-w-md
          rounded-[2rem]
          border border-[#dfe6e1]
          bg-white p-7 text-center
          shadow-[0_20px_60px_rgba(20,55,38,0.10)]
        "
      >
        <div
          className="
            mx-auto flex size-14
            items-center justify-center
            rounded-2xl bg-[#e7f5ec]
            text-[#0c8553]
          "
        >
          <RefreshCw className="size-6" />
        </div>

        <h1
          className="
            mt-5 text-2xl font-bold
            tracking-[-0.04em]
          "
        >
          Não foi possível carregar
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
            mt-6 min-h-12 w-full
            rounded-2xl bg-[#0c4f38]
            px-5 font-semibold
            text-white transition
            hover:bg-[#0a422f]
            active:scale-[0.98]
          "
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatAccountType(type: string) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    CHECKING: "Conta corrente",
    SAVINGS: "Poupança",
    CREDIT_CARD: "Cartão de crédito",
    INVESTMENT: "Investimentos",
  };

  return labels[type] ?? type;
}

function getAccountInitials(account: DashboardAccount) {
  if (account.type === "CASH") {
    return "$";
  }

  return account.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function formatEntryDate(entry: DashboardEntry) {
  const date =
    entry.completedAt ??
    entry.dueDate ??
    entry.createdAt;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

function getEntryIcon(entry: DashboardEntry) {
  if (entry.type === "INCOME") {
    return Landmark;
  }

  const icon = entry.category.icon.toLowerCase();

  if (
    icon.includes("utensil") ||
    icon.includes("food")
  ) {
    return Utensils;
  }

  if (
    icon.includes("card") ||
    icon.includes("credit")
  ) {
    return CreditCard;
  }

  return ReceiptText;
}

function createConicGradient(
  categories: CategorySummary[],
) {
  let currentPercentage = 0;

  const segments = categories.map((category) => {
    const start = currentPercentage;
    currentPercentage += category.percentage;

    return `${category.color} ${start}% ${currentPercentage}%`;
  });

  if (currentPercentage < 100) {
    segments.push(
      `#dce9e0 ${currentPercentage}% 100%`,
    );
  }

  return `conic-gradient(${segments.join(", ")})`;
}

const dashboardCardClass = `
  min-w-0
  rounded-[1.7rem]
  border border-[#dfe6e1]
  bg-white p-5
  shadow-[0_14px_42px_rgba(21,53,36,0.055)]
  sm:p-6
`;

const sectionAnimation = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [
        number,
        number,
        number,
        number,
      ],
    },
  },
};
