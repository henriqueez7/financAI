import { Prisma } from "../../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import type { ReportQuery } from "./report.schema.js";

export class ReportAccountNotFoundError extends Error {
  constructor() {
    super("Conta não encontrada.");
    this.name = "ReportAccountNotFoundError";
  }
}

export class ReportCategoryNotFoundError extends Error {
  constructor() {
    super("Categoria não encontrada.");
    this.name = "ReportCategoryNotFoundError";
  }
}

export class IncompatibleReportFilterError extends Error {
  constructor() {
    super(
      "O tipo informado não corresponde ao tipo da categoria selecionada.",
    );
    this.name = "IncompatibleReportFilterError";
  }
}

type ReportEntryType = "INCOME" | "EXPENSE";
type CashFlowGranularity = "DAY" | "MONTH";

interface ReportOverviewParams {
  userId: string;
  query: ReportQuery;
}

interface DateRange {
  start: Date;
  endExclusive: Date;
  previousStart: Date;
  previousEndExclusive: Date;
  comparisonLabel: string;
  granularity: CashFlowGranularity;
}

interface CashFlowDatabaseRow {
  period: Date | string;
  income: unknown;
  expense: unknown;
}

interface BudgetSpendingDatabaseRow {
  categoryId: string | null;
  year: unknown;
  month: unknown;
  amount: unknown;
}

export async function getReportOverview({
  userId,
  query,
}: ReportOverviewParams) {
  const range = resolveDateRange(query);

  await validateFilterOwnership({
    userId,
    query,
  });

  const [
    currentSummaryRows,
    previousSummaryRows,
    cashFlowRows,
    categoryRows,
    accountRows,
    filterAccounts,
    filterCategories,
    budgetRows,
    budgetSpendingRows,
    goals,
    goalContributionRows,
  ] = await Promise.all([
    loadEntrySummary({
      userId,
      query,
      start: range.start,
      endExclusive: range.endExclusive,
    }),
    loadEntrySummary({
      userId,
      query,
      start: range.previousStart,
      endExclusive: range.previousEndExclusive,
    }),
    loadCashFlow({
      userId,
      query,
      range,
    }),
    loadCategorySummary({
      userId,
      query,
      range,
    }),
    loadAccountSummary({
      userId,
      query,
      range,
    }),
    prisma.account.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
      orderBy: [
        { isActive: "desc" },
        { name: "asc" },
      ],
    }),
    prisma.category.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        icon: true,
        color: true,
        isActive: true,
      },
      orderBy: [
        { isActive: "desc" },
        { type: "asc" },
        { name: "asc" },
      ],
    }),
    loadBudgets({
      userId,
      query,
      range,
    }),
    loadBudgetSpending({
      userId,
      query,
      range,
    }),
    prisma.goal.findMany({
      where: {
        userId,
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        targetDate: true,
        status: true,
      },
    }),
    prisma.goalContribution.groupBy({
      by: ["goalId"],
      where: {
        userId,
        goal: {
          status: {
            not: "CANCELLED",
          },
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const overview = summarizeEntries(
    currentSummaryRows,
  );

  const previousOverview = summarizeEntries(
    previousSummaryRows,
  );

  const categoryMap = new Map(
    filterCategories.map((category) => [
      category.id,
      category,
    ]),
  );

  const accountMap = new Map(
    filterAccounts.map((account) => [
      account.id,
      account,
    ]),
  );

  const categories = serializeCategories({
    rows: categoryRows,
    categoryMap,
  });

  const accounts = serializeAccounts({
    rows: accountRows,
    accountMap,
  });

  const budgets = serializeBudgets({
    budgets: budgetRows,
    spendingRows: budgetSpendingRows,
  });

  const goalsSummary = serializeGoals({
    goals,
    contributionRows: goalContributionRows,
  });

  return {
    period: {
      dateFrom: formatDateKey(range.start),
      dateTo: formatDateKey(
        addUtcDays(range.endExclusive, -1),
      ),
      granularity: range.granularity,
      comparisonLabel: range.comparisonLabel,
    },
    appliedFilters: {
      accountId: query.accountId ?? null,
      categoryId: query.categoryId ?? null,
      type: query.type ?? null,
    },
    filterOptions: {
      accounts: filterAccounts,
      categories: filterCategories,
    },
    overview: {
      ...overview,
      comparison:
        previousOverview.transactionCount > 0
          ? {
              label: range.comparisonLabel,
              incomeChangePercentage:
                calculateChangePercentage(
                  overview.totalIncome,
                  previousOverview.totalIncome,
                ),
              expenseChangePercentage:
                calculateChangePercentage(
                  overview.totalExpense,
                  previousOverview.totalExpense,
                ),
              netResultChangePercentage:
                calculateChangePercentage(
                  overview.netResult,
                  previousOverview.netResult,
                ),
            }
          : null,
    },
    cashFlow: {
      granularity: range.granularity,
      series: fillCashFlowSeries({
        rows: cashFlowRows,
        range,
      }),
    },
    categories,
    accounts,
    budgets,
    goals: goalsSummary,
  };
}

async function validateFilterOwnership({
  userId,
  query,
}: {
  userId: string;
  query: ReportQuery;
}) {
  const [account, category] = await Promise.all([
    query.accountId
      ? prisma.account.findFirst({
          where: {
            id: query.accountId,
            userId,
          },
          select: {
            id: true,
          },
        })
      : null,
    query.categoryId
      ? prisma.category.findFirst({
          where: {
            id: query.categoryId,
            userId,
          },
          select: {
            id: true,
            type: true,
          },
        })
      : null,
  ]);

  if (query.accountId && !account) {
    throw new ReportAccountNotFoundError();
  }

  if (query.categoryId && !category) {
    throw new ReportCategoryNotFoundError();
  }

  if (
    category &&
    query.type &&
    category.type !== query.type
  ) {
    throw new IncompatibleReportFilterError();
  }
}

async function loadEntrySummary({
  userId,
  query,
  start,
  endExclusive,
}: {
  userId: string;
  query: ReportQuery;
  start: Date;
  endExclusive: Date;
}) {
  return prisma.entry.groupBy({
    by: ["type"],
    where: createEntryWhere({
      userId,
      query,
      start,
      endExclusive,
    }),
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
    _max: {
      amount: true,
    },
  });
}

async function loadCashFlow({
  userId,
  query,
  range,
}: {
  userId: string;
  query: ReportQuery;
  range: DateRange;
}) {
  const unit =
    range.granularity === "DAY"
      ? "day"
      : "month";

  const where = createEntrySqlWhere({
    userId,
    query,
    start: range.start,
    endExclusive: range.endExclusive,
  });

  return prisma.$queryRaw<CashFlowDatabaseRow[]>(
    Prisma.sql`
      SELECT
        date_trunc(${unit}, e."dueDate") AS period,
        COALESCE(
          SUM(
            CASE
              WHEN e."type" = 'INCOME' THEN e."amount"
              ELSE 0
            END
          ),
          0
        ) AS income,
        COALESCE(
          SUM(
            CASE
              WHEN e."type" = 'EXPENSE' THEN e."amount"
              ELSE 0
            END
          ),
          0
        ) AS expense
      FROM "entries" e
      WHERE ${where}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  );
}

async function loadCategorySummary({
  userId,
  query,
  range,
}: {
  userId: string;
  query: ReportQuery;
  range: DateRange;
}) {
  if (query.type === "INCOME") {
    return [];
  }

  return prisma.entry.groupBy({
    by: ["categoryId"],
    where: {
      ...createEntryWhere({
        userId,
        query,
        start: range.start,
        endExclusive: range.endExclusive,
      }),
      type: "EXPENSE",
    },
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });
}

async function loadAccountSummary({
  userId,
  query,
  range,
}: {
  userId: string;
  query: ReportQuery;
  range: DateRange;
}) {
  return prisma.entry.groupBy({
    by: ["accountId", "type"],
    where: createEntryWhere({
      userId,
      query,
      start: range.start,
      endExclusive: range.endExclusive,
    }),
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });
}

async function loadBudgets({
  userId,
  query,
  range,
}: {
  userId: string;
  query: ReportQuery;
  range: DateRange;
}) {
  if (query.type === "INCOME") {
    return [];
  }

  const periods = createMonthPeriods(range);

  return prisma.budget.findMany({
    where: {
      userId,
      categoryId: query.categoryId,
      OR: periods.map((period) => ({
        month: period.month,
        year: period.year,
      })),
    },
    select: {
      id: true,
      amount: true,
      month: true,
      year: true,
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
    },
  });
}

async function loadBudgetSpending({
  userId,
  query,
  range,
}: {
  userId: string;
  query: ReportQuery;
  range: DateRange;
}) {
  if (query.type === "INCOME") {
    return [];
  }

  const where = createEntrySqlWhere({
    userId,
    query: {
      ...query,
      type: "EXPENSE",
    },
    start: range.start,
    endExclusive: range.endExclusive,
  });

  return prisma.$queryRaw<BudgetSpendingDatabaseRow[]>(
    Prisma.sql`
      SELECT
        e."categoryId" AS "categoryId",
        EXTRACT(YEAR FROM e."dueDate") AS year,
        EXTRACT(MONTH FROM e."dueDate") AS month,
        COALESCE(SUM(e."amount"), 0) AS amount
      FROM "entries" e
      WHERE ${where}
      GROUP BY
        e."categoryId",
        EXTRACT(YEAR FROM e."dueDate"),
        EXTRACT(MONTH FROM e."dueDate")
    `,
  );
}

function createEntryWhere({
  userId,
  query,
  start,
  endExclusive,
}: {
  userId: string;
  query: ReportQuery;
  start: Date;
  endExclusive: Date;
}) {
  return {
    userId,
    status: "COMPLETED",
    dueDate: {
      gte: start,
      lt: endExclusive,
    },
    accountId: query.accountId,
    categoryId: query.categoryId,
    type: query.type,
  } satisfies Prisma.EntryWhereInput;
}

function createEntrySqlWhere({
  userId,
  query,
  start,
  endExclusive,
}: {
  userId: string;
  query: ReportQuery;
  start: Date;
  endExclusive: Date;
}) {
  const clauses = [
    Prisma.sql`e."userId" = ${userId}`,
    Prisma.sql`e."status" = 'COMPLETED'`,
    Prisma.sql`e."dueDate" >= ${start}`,
    Prisma.sql`e."dueDate" < ${endExclusive}`,
  ];

  if (query.accountId) {
    clauses.push(
      Prisma.sql`e."accountId" = ${query.accountId}`,
    );
  }

  if (query.categoryId) {
    clauses.push(
      Prisma.sql`e."categoryId" = ${query.categoryId}`,
    );
  }

  if (query.type) {
    clauses.push(
      Prisma.sql`e."type" = CAST(${query.type} AS "EntryType")`,
    );
  }

  return Prisma.join(clauses, " AND ");
}

type EntrySummaryRows = Awaited<
  ReturnType<typeof loadEntrySummary>
>;

function summarizeEntries(
  rows: EntrySummaryRows,
) {
  const income = rows.find(
    (row) => row.type === "INCOME",
  );

  const expense = rows.find(
    (row) => row.type === "EXPENSE",
  );

  const totalIncome = roundMoney(
    income?._sum.amount?.toNumber() ?? 0,
  );

  const totalExpense = roundMoney(
    expense?._sum.amount?.toNumber() ?? 0,
  );

  const incomeCount = income?._count._all ?? 0;
  const expenseCount = expense?._count._all ?? 0;

  const netResult = roundMoney(
    totalIncome - totalExpense,
  );

  return {
    totalIncome,
    totalExpense,
    netResult,
    savingsRate:
      totalIncome > 0
        ? roundPercentage(
            (netResult / totalIncome) * 100,
          )
        : null,
    transactionCount: incomeCount + expenseCount,
    averageExpense:
      expenseCount > 0
        ? roundMoney(
            totalExpense / expenseCount,
          )
        : null,
    largestExpense:
      expense?._max.amount?.toNumber() ?? null,
    largestIncome:
      income?._max.amount?.toNumber() ?? null,
  };
}

type CategorySummaryRows = Awaited<
  ReturnType<typeof loadCategorySummary>
>;

function serializeCategories({
  rows,
  categoryMap,
}: {
  rows: CategorySummaryRows;
  categoryMap: Map<
    string,
    {
      id: string;
      name: string;
      type: ReportEntryType;
      icon: string | null;
      color: string | null;
      isActive: boolean;
    }
  >;
}) {
  const total = rows.reduce(
    (sum, row) =>
      sum + (row._sum.amount?.toNumber() ?? 0),
    0,
  );

  return rows
    .map((row) => {
      const category = row.categoryId
        ? categoryMap.get(row.categoryId)
        : null;

      const amount = roundMoney(
        row._sum.amount?.toNumber() ?? 0,
      );

      return {
        categoryId: row.categoryId,
        name: category?.name ?? "Sem categoria",
        icon: category?.icon ?? null,
        color: category?.color ?? "#8b9890",
        amount,
        percentage:
          total > 0
            ? roundPercentage(
                (amount / total) * 100,
              )
            : 0,
        transactionCount: row._count._all,
      };
    })
    .sort((first, second) =>
      second.amount - first.amount,
    );
}

type AccountSummaryRows = Awaited<
  ReturnType<typeof loadAccountSummary>
>;

function serializeAccounts({
  rows,
  accountMap,
}: {
  rows: AccountSummaryRows;
  accountMap: Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      isActive: boolean;
    }
  >;
}) {
  const totals = new Map<
    string,
    {
      accountId: string | null;
      name: string;
      type: string | null;
      totalIncome: number;
      totalExpense: number;
      transactionCount: number;
    }
  >();

  for (const row of rows) {
    const key = row.accountId ?? "unassigned";
    const account = row.accountId
      ? accountMap.get(row.accountId)
      : null;

    const current = totals.get(key) ?? {
      accountId: row.accountId,
      name: account?.name ?? "Sem conta",
      type: account?.type ?? null,
      totalIncome: 0,
      totalExpense: 0,
      transactionCount: 0,
    };

    const amount =
      row._sum.amount?.toNumber() ?? 0;

    if (row.type === "INCOME") {
      current.totalIncome += amount;
    } else {
      current.totalExpense += amount;
    }

    current.transactionCount += row._count._all;
    totals.set(key, current);
  }

  return Array.from(totals.values())
    .map((account) => ({
      ...account,
      totalIncome: roundMoney(
        account.totalIncome,
      ),
      totalExpense: roundMoney(
        account.totalExpense,
      ),
      netMovement: roundMoney(
        account.totalIncome -
          account.totalExpense,
      ),
    }))
    .sort(
      (first, second) =>
        second.totalIncome +
          second.totalExpense -
        (first.totalIncome +
          first.totalExpense),
    );
}

type BudgetRows = Awaited<
  ReturnType<typeof loadBudgets>
>;

function serializeBudgets({
  budgets,
  spendingRows,
}: {
  budgets: BudgetRows;
  spendingRows: BudgetSpendingDatabaseRow[];
}) {
  const spendingMap = new Map(
    spendingRows.map((row) => [
      createBudgetKey(
        row.categoryId,
        toNumber(row.year),
        toNumber(row.month),
      ),
      roundMoney(toNumber(row.amount)),
    ]),
  );

  const items = budgets
    .map((budget) => {
      const amount = budget.amount.toNumber();
      const spentAmount =
        spendingMap.get(
          createBudgetKey(
            budget.category.id,
            budget.year,
            budget.month,
          ),
        ) ?? 0;

      const percentageUsed = roundPercentage(
        (spentAmount / amount) * 100,
      );

      return {
        id: budget.id,
        month: budget.month,
        year: budget.year,
        amount,
        spentAmount,
        remainingAmount: roundMoney(
          amount - spentAmount,
        ),
        percentageUsed,
        exceeded: spentAmount >= amount,
        nearLimit:
          percentageUsed >= 80 &&
          percentageUsed < 100,
        category: budget.category,
      };
    })
    .sort(
      (first, second) =>
        second.percentageUsed -
        first.percentageUsed,
    );

  const totalBudgeted = roundMoney(
    items.reduce(
      (sum, item) => sum + item.amount,
      0,
    ),
  );

  const totalSpent = roundMoney(
    items.reduce(
      (sum, item) => sum + item.spentAmount,
      0,
    ),
  );

  return {
    totalBudgeted,
    totalSpent,
    remaining: roundMoney(
      totalBudgeted - totalSpent,
    ),
    percentageUsed:
      totalBudgeted > 0
        ? roundPercentage(
            (totalSpent / totalBudgeted) * 100,
          )
        : null,
    exceededBudgets: items.filter(
      (item) => item.exceeded,
    ).length,
    budgetsNearLimit: items.filter(
      (item) => item.nearLimit,
    ).length,
    items,
  };
}

function serializeGoals({
  goals,
  contributionRows,
}: {
  goals: Array<{
    id: string;
    name: string;
    targetAmount: {
      toNumber(): number;
    };
    targetDate: Date | null;
    status: string;
  }>;
  contributionRows: Array<{
    goalId: string;
    _sum: {
      amount: {
        toNumber(): number;
      } | null;
    };
  }>;
}) {
  const contributions = new Map(
    contributionRows.map((row) => [
      row.goalId,
      row._sum.amount?.toNumber() ?? 0,
    ]),
  );

  const today = new Date();
  const todayStart = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );

  let totalTargetAmount = 0;
  let totalContributed = 0;
  const items = goals.map((goal) => {
    const targetAmount =
      goal.targetAmount.toNumber();

    const currentAmount = roundMoney(
      contributions.get(goal.id) ?? 0,
    );

    const completed =
      goal.status === "COMPLETED" ||
      currentAmount >= targetAmount;

    const overdue =
      goal.status === "ACTIVE" &&
      goal.targetDate !== null &&
      normalizeUtcDate(goal.targetDate) <
        todayStart &&
      !completed;

    totalTargetAmount += targetAmount;
    totalContributed += currentAmount;

    return {
      id: goal.id,
      name: goal.name,
      status: goal.status,
      targetAmount,
      currentAmount,
      remainingAmount: roundMoney(
        Math.max(targetAmount - currentAmount, 0),
      ),
      percentageCompleted: roundPercentage(
        (currentAmount / targetAmount) * 100,
      ),
      targetDate: goal.targetDate,
      completed,
      overdue,
    };
  });

  totalTargetAmount = roundMoney(
    totalTargetAmount,
  );

  totalContributed = roundMoney(
    totalContributed,
  );

  return {
    activeGoals: goals.filter(
      (goal) => goal.status === "ACTIVE",
    ).length,
    completedGoals: goals.filter(
      (goal) => goal.status === "COMPLETED",
    ).length,
    totalTargetAmount,
    totalContributed,
    overallProgressPercentage:
      totalTargetAmount > 0
        ? roundPercentage(
            (totalContributed /
              totalTargetAmount) *
              100,
          )
        : 0,
    overdueGoals: items.filter(
      (goal) => goal.overdue,
    ).length,
    items,
  };
}

function fillCashFlowSeries({
  rows,
  range,
}: {
  rows: CashFlowDatabaseRow[];
  range: DateRange;
}) {
  const values = new Map(
    rows.map((row) => {
      const date = new Date(row.period);
      const key =
        range.granularity === "DAY"
          ? formatDateKey(date)
          : formatMonthKey(date);

      const income = roundMoney(
        toNumber(row.income),
      );

      const expense = roundMoney(
        toNumber(row.expense),
      );

      return [
        key,
        {
          income,
          expense,
          net: roundMoney(income - expense),
        },
      ];
    }),
  );

  const series = [];
  let cursor = new Date(range.start);

  while (cursor < range.endExclusive) {
    const period =
      range.granularity === "DAY"
        ? formatDateKey(cursor)
        : formatMonthKey(cursor);

    const value = values.get(period) ?? {
      income: 0,
      expense: 0,
      net: 0,
    };

    series.push({
      period,
      ...value,
    });

    cursor =
      range.granularity === "DAY"
        ? addUtcDays(cursor, 1)
        : new Date(
            Date.UTC(
              cursor.getUTCFullYear(),
              cursor.getUTCMonth() + 1,
              1,
            ),
          );
  }

  return series;
}

function resolveDateRange(
  query: ReportQuery,
): DateRange {
  let start: Date;
  let endExclusive: Date;
  let previousStart: Date;
  let comparisonLabel: string;

  if (
    query.month !== undefined &&
    query.year !== undefined
  ) {
    start = new Date(
      Date.UTC(query.year, query.month - 1, 1),
    );
    endExclusive = new Date(
      Date.UTC(query.year, query.month, 1),
    );
    previousStart = new Date(
      Date.UTC(query.year, query.month - 2, 1),
    );
    comparisonLabel = "vs. mês anterior";
  } else if (query.dateFrom && query.dateTo) {
    start = normalizeUtcDate(query.dateFrom);
    endExclusive = addUtcDays(
      normalizeUtcDate(query.dateTo),
      1,
    );

    const duration =
      endExclusive.getTime() - start.getTime();

    previousStart = new Date(
      start.getTime() - duration,
    );
    comparisonLabel =
      "vs. período anterior de mesma duração";
  } else {
    const today = new Date();
    start = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        1,
      ),
    );
    endExclusive = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        1,
      ),
    );
    previousStart = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() - 1,
        1,
      ),
    );
    comparisonLabel = "vs. mês anterior";
  }

  const durationInDays = Math.ceil(
    (endExclusive.getTime() - start.getTime()) /
      (24 * 60 * 60 * 1000),
  );

  return {
    start,
    endExclusive,
    previousStart,
    previousEndExclusive: start,
    comparisonLabel,
    granularity:
      durationInDays <= 62 ? "DAY" : "MONTH",
  };
}

function createMonthPeriods(range: DateRange) {
  const periods: Array<{
    month: number;
    year: number;
  }> = [];

  let cursor = new Date(
    Date.UTC(
      range.start.getUTCFullYear(),
      range.start.getUTCMonth(),
      1,
    ),
  );

  while (cursor < range.endExclusive) {
    periods.push({
      month: cursor.getUTCMonth() + 1,
      year: cursor.getUTCFullYear(),
    });

    cursor = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth() + 1,
        1,
      ),
    );
  }

  return periods;
}

function calculateChangePercentage(
  current: number,
  previous: number,
) {
  if (previous === 0) {
    return null;
  }

  return roundPercentage(
    ((current - previous) /
      Math.abs(previous)) *
      100,
  );
}

function createBudgetKey(
  categoryId: string | null,
  year: number,
  month: number,
) {
  return `${categoryId ?? "unassigned"}:${year}:${month}`;
}

function normalizeUtcDate(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    ),
  );
}

function addUtcDays(value: Date, days: number) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate() + days,
    ),
  );
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatMonthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return 0;
}

function roundMoney(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

function roundPercentage(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}
