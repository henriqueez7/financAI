import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  after,
  before,
  test,
} from "node:test";

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

interface TestContext {
  ownerToken: string;
  otherToken: string;
  otherCategoryId: string;
}

let server: Server;
let baseUrl = "";
let context: TestContext;

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

const ownerEmail = `insights-owner-${suffix}@example.com`;
const otherEmail = `insights-other-${suffix}@example.com`;
const password = "FinanceAI123!";

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(
      0,
      "127.0.0.1",
      () => resolve(listener),
    );
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const ownerToken = await registerAndLogin(
    ownerEmail,
    "Insights Owner",
  );
  const otherToken = await registerAndLogin(
    otherEmail,
    "Insights Other",
  );

  const account = await requestJson<{
    account: { id: string };
  }>(
    "/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Conta ${suffix}`,
        type: "CHECKING",
        initialBalance: 0,
      }),
    },
    ownerToken,
    201,
  );

  const expenseCategory = await createCategory({
    token: ownerToken,
    name: `Despesa ${suffix}`,
    type: "EXPENSE",
  });

  const incomeCategory = await createCategory({
    token: ownerToken,
    name: `Receita ${suffix}`,
    type: "INCOME",
  });

  const otherCategory = await createCategory({
    token: otherToken,
    name: `Privada ${suffix}`,
    type: "EXPENSE",
  });

  await Promise.all([
    createEntry({
      token: ownerToken,
      accountId: account.account.id,
      categoryId: expenseCategory.id,
      description: "Despesa anterior",
      amount: 300,
      type: "EXPENSE",
      dueDate: "2026-07-15T12:00:00.000Z",
    }),
    createEntry({
      token: ownerToken,
      accountId: account.account.id,
      categoryId: incomeCategory.id,
      description: "Receita atual",
      amount: 500,
      type: "INCOME",
      dueDate: "2026-08-10T12:00:00.000Z",
    }),
    createEntry({
      token: ownerToken,
      accountId: account.account.id,
      categoryId: expenseCategory.id,
      description: "Despesa atual",
      amount: 600,
      type: "EXPENSE",
      dueDate: "2026-08-12T12:00:00.000Z",
    }),
  ]);

  context = {
    ownerToken,
    otherToken,
    otherCategoryId: otherCategory.id,
  };
});

after(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [ownerEmail, otherEmail],
      },
    },
  });

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await prisma.$disconnect();
});

test("GET /insights/overview exige autenticação", async () => {
  const response = await fetch(
    `${baseUrl}/insights/overview`,
  );

  assert.equal(response.status, 401);
});

test("não aceita filtro pertencente a outro usuário", async () => {
  const response = await fetch(
    `${baseUrl}/insights/overview?month=8&year=2026&categoryId=${context.otherCategoryId}`,
    {
      headers: authorizationHeaders(context.ownerToken),
    },
  );

  assert.equal(response.status, 404);
});

test("usuário sem lançamentos não recebe fatos de terceiros", async () => {
  const overview = await requestJson<{
    insights: unknown[];
    summary: {
      totalIncome: number;
      totalExpense: number;
      netResult: number;
      savingsRate: number | null;
      insightCount: number;
    };
  }>(
    "/insights/overview?month=8&year=2026",
    {},
    context.otherToken,
  );

  assert.deepEqual(overview.insights, []);
  assert.deepEqual(overview.summary, {
    totalIncome: 0,
    totalExpense: 0,
    netResult: 0,
    savingsRate: null,
    insightCount: 0,
  });
});

test("insights reutilizam exatamente os totais e filtros de Reports", async () => {
  const [insightsOverview, reportsResponse] =
    await Promise.all([
      requestJson<{
        period: {
          dateFrom: string;
          dateTo: string;
        };
        summary: {
          totalIncome: number;
          totalExpense: number;
          netResult: number;
          savingsRate: number | null;
          insightCount: number;
        };
        insights: Array<{
          type: string;
          severity: string;
        }>;
      }>(
        "/insights/overview?month=8&year=2026",
        {},
        context.ownerToken,
      ),
      requestJson<{
        report: {
          period: {
            dateFrom: string;
            dateTo: string;
          };
          overview: {
            totalIncome: number;
            totalExpense: number;
            netResult: number;
            savingsRate: number | null;
          };
        };
      }>(
        "/reports/overview?month=8&year=2026",
        {},
        context.ownerToken,
      ),
    ]);

  assert.equal(
    insightsOverview.period.dateFrom,
    reportsResponse.report.period.dateFrom,
  );
  assert.equal(
    insightsOverview.period.dateTo,
    reportsResponse.report.period.dateTo,
  );
  assert.deepEqual(
    {
      totalIncome: insightsOverview.summary.totalIncome,
      totalExpense: insightsOverview.summary.totalExpense,
      netResult: insightsOverview.summary.netResult,
      savingsRate: insightsOverview.summary.savingsRate,
    },
    {
      totalIncome:
        reportsResponse.report.overview.totalIncome,
      totalExpense:
        reportsResponse.report.overview.totalExpense,
      netResult:
        reportsResponse.report.overview.netResult,
      savingsRate:
        reportsResponse.report.overview.savingsRate,
    },
  );
  assert.equal(insightsOverview.summary.totalIncome, 500);
  assert.equal(insightsOverview.summary.totalExpense, 600);
  assert.equal(insightsOverview.summary.netResult, -100);
  assert.deepEqual(
    insightsOverview.insights.map((item) => item.type),
    [
      "NEGATIVE_RESULT",
      "EXPENSE_INCREASE",
      "CATEGORY_CONCENTRATION",
    ],
  );
  assert.equal(
    insightsOverview.insights[0]?.severity,
    "CRITICAL",
  );
  assert.equal(
    insightsOverview.summary.insightCount,
    insightsOverview.insights.length,
  );
});

test("endpoint usa a mesma validação de filtros incompatíveis", async () => {
  const response = await fetch(
    `${baseUrl}/insights/overview?month=8&year=2026&categoryId=${context.otherCategoryId}&type=INCOME`,
    {
      headers: authorizationHeaders(context.otherToken),
    },
  );

  assert.equal(response.status, 400);
});

async function registerAndLogin(
  email: string,
  name: string,
) {
  await requestJson(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    },
    undefined,
    201,
  );

  const response = await requestJson<{
    token: string;
  }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );

  return response.token;
}

async function createCategory({
  token,
  name,
  type,
}: {
  token: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}) {
  const response = await requestJson<{
    category: { id: string };
  }>(
    "/categories",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        type,
        icon: null,
        color: "#168956",
      }),
    },
    token,
    201,
  );

  return response.category;
}

async function createEntry({
  token,
  accountId,
  categoryId,
  description,
  amount,
  type,
  dueDate,
}: {
  token: string;
  accountId: string;
  categoryId: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dueDate: string;
}) {
  await requestJson(
    "/entries",
    {
      method: "POST",
      body: JSON.stringify({
        description,
        amount,
        type,
        status: "COMPLETED",
        dueDate,
        accountId,
        categoryId,
      }),
    },
    token,
    201,
  );
}

async function requestJson<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string,
  expectedStatus = 200,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  assert.equal(
    response.status,
    expectedStatus,
    `${options.method ?? "GET"} ${path}`,
  );

  return response.json() as Promise<T>;
}

function authorizationHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}
