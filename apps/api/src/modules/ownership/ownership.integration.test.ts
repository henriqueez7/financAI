import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  after,
  before,
  test,
} from "node:test";
import type { z } from "zod";

import { app } from "../../app.js";
import type {
  AiProvider,
  AiStructuredRequest,
} from "../../lib/ai/ai.types.js";
import { prisma } from "../../lib/prisma.js";
import {
  createAccountSchema,
  updateAccountSchema,
} from "../accounts/account.schema.js";
import { generateAiAnalysis } from "../ai/ai.service.js";
import {
  createBudgetSchema,
  updateBudgetSchema,
} from "../budgets/budget.schema.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../categories/category.schema.js";
import {
  createEntrySchema,
  updateEntrySchema,
} from "../entries/entry.schema.js";
import {
  createGoalContributionSchema,
  createGoalSchema,
  updateGoalSchema,
} from "../goals/goal.schema.js";

interface AuthenticatedUser {
  id: string;
  token: string;
}

interface ResourceSet {
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  entryId: string;
  entryDescription: string;
  entryAmount: number;
  budgetId: string;
  budgetAmount: number;
  goalId: string;
  goalName: string;
  goalTargetAmount: number;
  contributionId: string;
  contributionAmount: number;
}

interface OwnershipContext {
  userA: AuthenticatedUser;
  userB: AuthenticatedUser;
  resourcesA: ResourceSet;
  resourcesB: ResourceSet;
}

let server: Server;
let baseUrl = "";
let context: OwnershipContext;

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

const userAEmail = `ownership-a-${suffix}@example.com`;
const userBEmail = `ownership-b-${suffix}@example.com`;
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

  const userA = await registerAndLogin(
    userAEmail,
    "Ownership User A",
  );
  const userB = await registerAndLogin(
    userBEmail,
    "Ownership User B",
  );

  const resourcesA = await createResourceSet({
    token: userA.token,
    marker: `OWNER-A-${suffix}`,
    entryAmount: 9_101.37,
    budgetAmount: 7_707.19,
    goalTargetAmount: 8_808.29,
    contributionAmount: 321.09,
  });

  const resourcesB = await createResourceSet({
    token: userB.token,
    marker: `OWNER-B-${suffix}`,
    entryAmount: 23.45,
    budgetAmount: 55.67,
    goalTargetAmount: 222.34,
    contributionAmount: 22.12,
  });

  context = {
    userA,
    userB,
    resourcesA,
    resourcesB,
  };
});

after(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [userAEmail, userBEmail],
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

test("schemas privados rejeitam mass assignment", async () => {
  const systemFields = {
    userId: context.userB.id,
    id: "00000000-0000-4000-8000-000000000000",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  const schemasAndPayloads: Array<{
    schema: z.ZodType;
    payload: Record<string, unknown>;
  }> = [
    {
      schema: createAccountSchema,
      payload: {
        name: "Conta maliciosa",
        type: "CHECKING",
        initialBalance: 0,
        ...systemFields,
      },
    },
    {
      schema: updateAccountSchema,
      payload: { name: "Conta alterada", ...systemFields },
    },
    {
      schema: createCategorySchema,
      payload: {
        name: "Categoria maliciosa",
        type: "EXPENSE",
        ...systemFields,
      },
    },
    {
      schema: updateCategorySchema,
      payload: { name: "Categoria alterada", ...systemFields },
    },
    {
      schema: createEntrySchema,
      payload: {
        description: "Lancamento malicioso",
        amount: 10,
        type: "EXPENSE",
        dueDate: "2026-08-10T12:00:00.000Z",
        accountId: context.resourcesB.accountId,
        ...systemFields,
      },
    },
    {
      schema: updateEntrySchema,
      payload: { description: "Alterado", ...systemFields },
    },
    {
      schema: createBudgetSchema,
      payload: {
        categoryId: context.resourcesB.categoryId,
        amount: 10,
        month: 8,
        year: 2026,
        ...systemFields,
      },
    },
    {
      schema: updateBudgetSchema,
      payload: { amount: 10, ...systemFields },
    },
    {
      schema: createGoalSchema,
      payload: {
        name: "Meta maliciosa",
        targetAmount: 100,
        ...systemFields,
      },
    },
    {
      schema: updateGoalSchema,
      payload: { name: "Meta alterada", ...systemFields },
    },
    {
      schema: createGoalContributionSchema,
      payload: { amount: 10, ...systemFields },
    },
  ];

  for (const { schema, payload } of schemasAndPayloads) {
    assert.equal(schema.safeParse(payload).success, false);
  }

  await expectStatus(
    "/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Conta HTTP maliciosa",
        type: "CHECKING",
        initialBalance: 0,
        userId: context.userB.id,
      }),
    },
    context.userA.token,
    400,
  );
});

test("contas ficam isoladas em LIST, GET, PATCH e DELETE", async () => {
  const list = await requestJson<{
    accounts: Array<{ id: string }>;
  }>(
    `/accounts?userId=${context.userA.id}`,
    {},
    context.userB.token,
  );

  assert.ok(
    list.accounts.some(
      (account) =>
        account.id === context.resourcesB.accountId,
    ),
  );
  assert.ok(
    list.accounts.every(
      (account) =>
        account.id !== context.resourcesA.accountId,
    ),
  );

  await expectStatus(
    `/accounts/${context.resourcesA.accountId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/accounts/${context.resourcesA.accountId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name: "Intrusao B" }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/accounts/${context.resourcesA.accountId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );

  const ownerView = await requestJson<{
    account: { name: string };
  }>(
    `/accounts/${context.resourcesA.accountId}`,
    {},
    context.userA.token,
  );
  assert.equal(
    ownerView.account.name,
    context.resourcesA.accountName,
  );
});

test("categorias ficam isoladas e nao podem ser referenciadas", async () => {
  const list = await requestJson<{
    categories: Array<{ id: string }>;
  }>(
    `/categories?userId=${context.userA.id}`,
    {},
    context.userB.token,
  );

  assert.ok(
    list.categories.some(
      (category) =>
        category.id === context.resourcesB.categoryId,
    ),
  );
  assert.ok(
    list.categories.every(
      (category) =>
        category.id !== context.resourcesA.categoryId,
    ),
  );

  await expectStatus(
    `/categories/${context.resourcesA.categoryId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/categories/${context.resourcesA.categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name: "Intrusao B" }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/categories/${context.resourcesA.categoryId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );

  const ownerView = await requestJson<{
    category: { name: string };
  }>(
    `/categories/${context.resourcesA.categoryId}`,
    {},
    context.userA.token,
  );
  assert.equal(
    ownerView.category.name,
    context.resourcesA.categoryName,
  );
});

test("lancamentos bloqueiam IDOR e referencias cruzadas", async () => {
  const list = await requestJson<{
    entries: Array<{ id: string }>;
  }>(
    `/entries?userId=${context.userA.id}`,
    {},
    context.userB.token,
  );
  assert.deepEqual(
    list.entries.map((entry) => entry.id),
    [context.resourcesB.entryId],
  );

  const accountFiltered = await requestJson<{
    entries: unknown[];
  }>(
    `/entries?accountId=${context.resourcesA.accountId}`,
    {},
    context.userB.token,
  );
  assert.deepEqual(accountFiltered.entries, []);

  const categoryFiltered = await requestJson<{
    entries: unknown[];
  }>(
    `/entries?categoryId=${context.resourcesA.categoryId}`,
    {},
    context.userB.token,
  );
  assert.deepEqual(categoryFiltered.entries, []);

  await expectStatus(
    `/entries/${context.resourcesA.entryId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/entries/${context.resourcesA.entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ description: "Intrusao B" }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/entries/${context.resourcesA.entryId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );

  await expectStatus(
    "/entries",
    entryPayload({
      accountId: context.resourcesA.accountId,
      categoryId: context.resourcesB.categoryId,
      description: "Conta cruzada",
    }),
    context.userB.token,
    404,
  );
  await expectStatus(
    "/entries",
    entryPayload({
      accountId: context.resourcesB.accountId,
      categoryId: context.resourcesA.categoryId,
      description: "Categoria cruzada",
    }),
    context.userB.token,
    404,
  );
  await expectStatus(
    "/entries",
    entryPayload({
      accountId: context.resourcesB.accountId,
      categoryId: context.resourcesA.categoryId,
      description: "Conta B usada por A",
    }),
    context.userA.token,
    404,
  );
  await expectStatus(
    "/entries",
    entryPayload({
      accountId: context.resourcesA.accountId,
      categoryId: context.resourcesB.categoryId,
      description: "Categoria B usada por A",
    }),
    context.userA.token,
    404,
  );
  await expectStatus(
    `/entries/${context.resourcesB.entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        accountId: context.resourcesA.accountId,
      }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/entries/${context.resourcesB.entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        categoryId: context.resourcesA.categoryId,
      }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/entries/${context.resourcesA.entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        accountId: context.resourcesB.accountId,
      }),
    },
    context.userA.token,
    404,
  );
  await expectStatus(
    `/entries/${context.resourcesA.entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        categoryId: context.resourcesB.categoryId,
      }),
    },
    context.userA.token,
    404,
  );

  const ownEntry = await requestJson<{
    entry: {
      account: { id: string };
      category: { id: string };
    };
  }>(
    `/entries/${context.resourcesB.entryId}`,
    {},
    context.userB.token,
  );
  assert.equal(
    ownEntry.entry.account.id,
    context.resourcesB.accountId,
  );
  assert.equal(
    ownEntry.entry.category.id,
    context.resourcesB.categoryId,
  );
});

test("orcamentos bloqueiam IDOR, categoria cruzada e agregacao alheia", async () => {
  const list = await requestJson<{
    budgets: Array<{
      id: string;
      spentAmount: number;
    }>;
  }>(
    `/budgets?month=8&year=2026&userId=${context.userA.id}`,
    {},
    context.userB.token,
  );
  assert.deepEqual(
    list.budgets.map((budget) => budget.id),
    [context.resourcesB.budgetId],
  );
  assert.equal(
    list.budgets[0]?.spentAmount,
    context.resourcesB.entryAmount,
  );

  const categoryFiltered = await requestJson<{
    budgets: unknown[];
  }>(
    `/budgets?categoryId=${context.resourcesA.categoryId}`,
    {},
    context.userB.token,
  );
  assert.deepEqual(categoryFiltered.budgets, []);

  await expectStatus(
    `/budgets/${context.resourcesA.budgetId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/budgets/${context.resourcesA.budgetId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ amount: 1 }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/budgets/${context.resourcesA.budgetId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );
  await expectStatus(
    "/budgets",
    {
      method: "POST",
      body: JSON.stringify({
        categoryId: context.resourcesA.categoryId,
        amount: 10,
        month: 9,
        year: 2026,
      }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/budgets/${context.resourcesB.budgetId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        categoryId: context.resourcesA.categoryId,
      }),
    },
    context.userB.token,
    404,
  );

  const ownBudget = await requestJson<{
    budget: { category: { id: string } };
  }>(
    `/budgets/${context.resourcesB.budgetId}`,
    {},
    context.userB.token,
  );
  assert.equal(
    ownBudget.budget.category.id,
    context.resourcesB.categoryId,
  );
});

test("metas ficam isoladas em LIST, GET, PATCH e DELETE", async () => {
  const list = await requestJson<{
    goals: Array<{ id: string }>;
  }>(
    `/goals?userId=${context.userA.id}`,
    {},
    context.userB.token,
  );
  assert.deepEqual(
    list.goals.map((goal) => goal.id),
    [context.resourcesB.goalId],
  );

  await expectStatus(
    `/goals/${context.resourcesA.goalId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/goals/${context.resourcesA.goalId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name: "Intrusao B" }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/goals/${context.resourcesA.goalId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );

  const ownerView = await requestJson<{
    goal: { name: string };
  }>(
    `/goals/${context.resourcesA.goalId}`,
    {},
    context.userA.token,
  );
  assert.equal(
    ownerView.goal.name,
    context.resourcesA.goalName,
  );
});

test("contribuicoes validam usuario, meta e combinacao de IDs", async () => {
  await expectStatus(
    `/goals/${context.resourcesA.goalId}/contributions`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/goals/${context.resourcesA.goalId}/contributions`,
    {
      method: "POST",
      body: JSON.stringify({ amount: 10 }),
    },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/goals/${context.resourcesA.goalId}/contributions/${context.resourcesA.contributionId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );
  await expectStatus(
    `/goals/${context.resourcesB.goalId}/contributions/${context.resourcesA.contributionId}`,
    { method: "DELETE" },
    context.userB.token,
    404,
  );

  const ownerContributions = await requestJson<{
    contributions: Array<{ id: string }>;
  }>(
    `/goals/${context.resourcesA.goalId}/contributions`,
    {},
    context.userA.token,
  );
  assert.deepEqual(
    ownerContributions.contributions.map(
      (contribution) => contribution.id,
    ),
    [context.resourcesA.contributionId],
  );

  const ownContributions = await requestJson<{
    contributions: Array<{ id: string }>;
  }>(
    `/goals/${context.resourcesB.goalId}/contributions`,
    {},
    context.userB.token,
  );
  assert.deepEqual(
    ownContributions.contributions.map(
      (contribution) => contribution.id,
    ),
    [context.resourcesB.contributionId],
  );
});

test("reports isolam dados, filtros e agregacoes SQL", async () => {
  const response = await requestJson<{
    report: {
      overview: {
        totalExpense: number;
        transactionCount: number;
      };
    };
  }>(
    `/reports/overview?month=8&year=2026&userId=${context.userA.id}`,
    {},
    context.userB.token,
  );

  assert.equal(
    response.report.overview.totalExpense,
    context.resourcesB.entryAmount,
  );
  assert.equal(response.report.overview.transactionCount, 1);
  assertNoUserAData(response);

  await expectStatus(
    `/reports/overview?month=8&year=2026&accountId=${context.resourcesA.accountId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/reports/overview?month=8&year=2026&categoryId=${context.resourcesA.categoryId}`,
    {},
    context.userB.token,
    404,
  );
});

test("insights usam somente o contexto financeiro autenticado", async () => {
  const response = await requestJson<{
    summary: {
      totalExpense: number;
      netResult: number;
    };
  }>(
    `/insights/overview?month=8&year=2026&userId=${context.userA.id}`,
    {},
    context.userB.token,
  );

  assert.equal(
    response.summary.totalExpense,
    context.resourcesB.entryAmount,
  );
  assert.equal(
    response.summary.netResult,
    -context.resourcesB.entryAmount,
  );
  assertNoUserAData(response);

  await expectStatus(
    `/insights/overview?month=8&year=2026&accountId=${context.resourcesA.accountId}`,
    {},
    context.userB.token,
    404,
  );
  await expectStatus(
    `/insights/overview?month=8&year=2026&categoryId=${context.resourcesA.categoryId}`,
    {},
    context.userB.token,
    404,
  );
});

test("IA recebe contexto B sem dados, valores ou IDs de A", async () => {
  await expectStatus(
    "/ai/analyze",
    {
      method: "POST",
      body: JSON.stringify({
        filters: {
          month: 8,
          year: 2026,
          accountId: context.resourcesA.accountId,
        },
      }),
    },
    context.userB.token,
    404,
  );

  const provider = new CapturingAiProvider();
  const response = await generateAiAnalysis(
    {
      userId: context.userB.id,
      input: {
        filters: {
          month: 8,
          year: 2026,
          accountId: context.resourcesB.accountId,
        },
        question: "Qual ponto merece atencao?",
      },
    },
    {
      provider,
      now: () =>
        new Date("2026-08-20T12:00:00.000Z"),
    },
  );

  assert.equal(response.status, "GENERATED");
  assert.equal(provider.calls, 1);
  assert.match(
    provider.lastInput,
    new RegExp(escapeRegExp(context.resourcesB.accountName)),
  );
  assert.match(
    provider.lastInput,
    new RegExp(escapeRegExp(context.resourcesB.categoryName)),
  );
  assert.match(
    provider.lastInput,
    new RegExp(escapeRegExp(context.resourcesB.goalName)),
  );
  assertNoUserAData(provider.lastInput);
  assert.doesNotMatch(
    provider.lastInput,
    new RegExp([
      context.resourcesB.accountId,
      context.resourcesB.categoryId,
      context.resourcesB.entryId,
      context.resourcesB.budgetId,
      context.resourcesB.goalId,
      context.resourcesB.contributionId,
    ].map(escapeRegExp).join("|")),
  );
});

test("dashboard agrega e lista somente recursos do usuario B", async () => {
  const response = await requestJson<{
    dashboard: {
      balance: { expense: number };
      accounts: Array<{ id: string }>;
      recentEntries: Array<{ id: string }>;
    };
  }>("/dashboard", {}, context.userB.token);

  assert.equal(
    response.dashboard.balance.expense,
    context.resourcesB.entryAmount,
  );
  assert.ok(
    response.dashboard.accounts.some(
      (account) =>
        account.id === context.resourcesB.accountId,
    ),
  );
  assert.ok(
    response.dashboard.accounts.every(
      (account) =>
        account.id !== context.resourcesA.accountId,
    ),
  );
  assert.deepEqual(
    response.dashboard.recentEntries.map(
      (entry) => entry.id,
    ),
    [context.resourcesB.entryId],
  );
  assertNoUserAData(response);
});

class CapturingAiProvider implements AiProvider {
  readonly metadata = {
    provider: "ownership-test-mock",
    model: "ownership-test-model",
  };

  calls = 0;
  lastInput = "";

  async generateStructured<TSchema extends z.ZodType>(
    request: AiStructuredRequest<TSchema>,
  ): Promise<z.infer<TSchema>> {
    this.calls += 1;
    this.lastInput = request.input;

    return {
      headline: "Resumo financeiro controlado",
      summary:
        "Analise produzida pelo provider mockado para validar isolamento de contexto.",
      facts: [],
      priorities: [],
      recommendations: [],
      warnings: [],
      answer: null,
    } as z.infer<TSchema>;
  }
}

async function registerAndLogin(
  email: string,
  name: string,
): Promise<AuthenticatedUser> {
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
    user: { id: string };
  }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );

  return {
    id: response.user.id,
    token: response.token,
  };
}

async function createResourceSet({
  token,
  marker,
  entryAmount,
  budgetAmount,
  goalTargetAmount,
  contributionAmount,
}: {
  token: string;
  marker: string;
  entryAmount: number;
  budgetAmount: number;
  goalTargetAmount: number;
  contributionAmount: number;
}): Promise<ResourceSet> {
  const accountName = `Conta ${marker}`;
  const categoryName = `Categoria ${marker}`;
  const entryDescription = `Lancamento ${marker}`;
  const goalName = `Meta ${marker}`;

  const accountResponse = await requestJson<{
    account: { id: string };
  }>(
    "/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        name: accountName,
        type: "CHECKING",
        initialBalance: 0,
      }),
    },
    token,
    201,
  );

  const categoryResponse = await requestJson<{
    category: { id: string };
  }>(
    "/categories",
    {
      method: "POST",
      body: JSON.stringify({
        name: categoryName,
        type: "EXPENSE",
        color: "#168956",
      }),
    },
    token,
    201,
  );

  const entryResponse = await requestJson<{
    entry: { id: string };
  }>(
    "/entries",
    entryPayload({
      accountId: accountResponse.account.id,
      categoryId: categoryResponse.category.id,
      description: entryDescription,
      amount: entryAmount,
    }),
    token,
    201,
  );

  const budgetResponse = await requestJson<{
    budget: { id: string };
  }>(
    "/budgets",
    {
      method: "POST",
      body: JSON.stringify({
        categoryId: categoryResponse.category.id,
        amount: budgetAmount,
        month: 8,
        year: 2026,
      }),
    },
    token,
    201,
  );

  const goalResponse = await requestJson<{
    goal: { id: string };
  }>(
    "/goals",
    {
      method: "POST",
      body: JSON.stringify({
        name: goalName,
        targetAmount: goalTargetAmount,
        initialAmount: 0,
        status: "ACTIVE",
      }),
    },
    token,
    201,
  );

  const contributionResponse = await requestJson<{
    contribution: { id: string };
  }>(
    `/goals/${goalResponse.goal.id}/contributions`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: contributionAmount,
        notes: `Contribuicao ${marker}`,
      }),
    },
    token,
    201,
  );

  return {
    accountId: accountResponse.account.id,
    accountName,
    categoryId: categoryResponse.category.id,
    categoryName,
    entryId: entryResponse.entry.id,
    entryDescription,
    entryAmount,
    budgetId: budgetResponse.budget.id,
    budgetAmount,
    goalId: goalResponse.goal.id,
    goalName,
    goalTargetAmount,
    contributionId:
      contributionResponse.contribution.id,
    contributionAmount,
  };
}

function entryPayload({
  accountId,
  categoryId,
  description,
  amount = 10,
}: {
  accountId: string;
  categoryId: string;
  description: string;
  amount?: number;
}): RequestInit {
  return {
    method: "POST",
    body: JSON.stringify({
      description,
      amount,
      type: "EXPENSE",
      status: "COMPLETED",
      dueDate: "2026-08-12T12:00:00.000Z",
      accountId,
      categoryId,
    }),
  };
}

async function requestJson<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string,
  expectedStatus = 200,
): Promise<T> {
  const response = await request(
    path,
    options,
    token,
  );

  assert.equal(
    response.status,
    expectedStatus,
    `${options.method ?? "GET"} ${path}`,
  );

  return response.json() as Promise<T>;
}

async function expectStatus(
  path: string,
  options: RequestInit,
  token: string,
  expectedStatus: number,
) {
  const response = await request(
    path,
    options,
    token,
  );

  assert.equal(
    response.status,
    expectedStatus,
    `${options.method ?? "GET"} ${path}`,
  );
}

function request(
  path: string,
  options: RequestInit,
  token?: string,
) {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
}

function assertNoUserAData(value: unknown) {
  const serialized =
    typeof value === "string"
      ? value
      : JSON.stringify(value);

  const forbiddenValues = [
    context.resourcesA.accountId,
    context.resourcesA.accountName,
    context.resourcesA.categoryId,
    context.resourcesA.categoryName,
    context.resourcesA.entryId,
    context.resourcesA.entryDescription,
    context.resourcesA.entryAmount.toString(),
    context.resourcesA.budgetId,
    context.resourcesA.budgetAmount.toString(),
    context.resourcesA.goalId,
    context.resourcesA.goalName,
    context.resourcesA.goalTargetAmount.toString(),
    context.resourcesA.contributionId,
    context.resourcesA.contributionAmount.toString(),
  ];

  for (const forbiddenValue of forbiddenValues) {
    assert.doesNotMatch(
      serialized,
      new RegExp(escapeRegExp(forbiddenValue)),
    );
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
