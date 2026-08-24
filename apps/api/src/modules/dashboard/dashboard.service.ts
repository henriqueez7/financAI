import { prisma } from "../../lib/prisma.js";

interface DashboardParams {
  userId: string;
}

export async function getDashboard({
  userId,
}: DashboardParams) {
  const [income, expense, accounts, recentEntries] =
    await Promise.all([
      prisma.entry.aggregate({
        where: {
          userId,
          type: "INCOME",
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.entry.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.account.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.entry.findMany({
        where: {
          userId,
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ]);

  const totalIncome =
    Number(income._sum.amount ?? 0);

  const totalExpense =
    Number(expense._sum.amount ?? 0);

  return {
    balance: {
      income: totalIncome,
      expense: totalExpense,
      total: totalIncome - totalExpense,
    },

    accounts,

    recentEntries,
  };
}