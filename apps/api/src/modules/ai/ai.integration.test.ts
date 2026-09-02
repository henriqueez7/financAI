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
import { resetAiRateLimitForTests } from "./ai.rate-limit.js";

let server: Server;
let baseUrl = "";

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

const ownerEmail = `ai-owner-${suffix}@example.com`;
const otherEmail = `ai-other-${suffix}@example.com`;
const password = "FinanceAI123!";

let ownerToken = "";
let otherToken = "";
let otherCategoryId = "";

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

  ownerToken = await registerAndLogin(
    ownerEmail,
    "AI Owner",
  );
  otherToken = await registerAndLogin(
    otherEmail,
    "AI Other",
  );

  const account = await requestJson<{
    account: { id: string };
  }>(
    "/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Conta AI ${suffix}`,
        type: "CHECKING",
        initialBalance: 0,
      }),
    },
    ownerToken,
    201,
  );

  const ownerCategory = await createCategory({
    token: ownerToken,
    name: `Despesa AI ${suffix}`,
  });
  const otherCategory = await createCategory({
    token: otherToken,
    name: `Privada AI ${suffix}`,
  });

  otherCategoryId = otherCategory.id;

  await requestJson(
    "/entries",
    {
      method: "POST",
      body: JSON.stringify({
        description: "Despesa para configurar IA",
        amount: 250,
        type: "EXPENSE",
        status: "COMPLETED",
        dueDate: "2026-08-12T12:00:00.000Z",
        accountId: account.account.id,
        categoryId: ownerCategory.id,
      }),
    },
    ownerToken,
    201,
  );
});

after(async () => {
  resetAiRateLimitForTests();

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

test("POST /ai/analyze exige autenticação", async () => {
  const response = await fetch(`${baseUrl}/ai/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters: {} }),
  });

  assert.equal(response.status, 401);
});

test("ownership impede filtro pertencente a outro usuário", async () => {
  const response = await fetch(`${baseUrl}/ai/analyze`, {
    method: "POST",
    headers: authorizationHeaders(ownerToken),
    body: JSON.stringify({
      filters: {
        month: 8,
        year: 2026,
        categoryId: otherCategoryId,
      },
    }),
  });

  assert.equal(response.status, 404);
});

test("contexto vazio retorna sem chamar provider e sem chave", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await requestJson<{
      status: string;
      analysis: null;
      sourceInsights: unknown[];
    }>(
      "/ai/analyze",
      {
        method: "POST",
        body: JSON.stringify({
          filters: {
            month: 8,
            year: 2026,
          },
        }),
      },
      otherToken,
    );

    assert.equal(response.status, "INSUFFICIENT_DATA");
    assert.equal(response.analysis, null);
    assert.deepEqual(response.sourceInsights, []);
  } finally {
    restoreEnv("OPENAI_API_KEY", previousApiKey);
  }
});

test("chave ausente é tratada sem expor detalhe técnico", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await fetch(`${baseUrl}/ai/analyze`, {
      method: "POST",
      headers: authorizationHeaders(ownerToken),
      body: JSON.stringify({
        filters: {
          month: 8,
          year: 2026,
        },
      }),
    });

    assert.equal(response.status, 503);

    const payload = (await response.json()) as {
      code: string;
      message: string;
    };

    assert.equal(payload.code, "AI_NOT_CONFIGURED");
    assert.doesNotMatch(
      payload.message,
      /OPENAI_API_KEY|stack|sk-/,
    );
  } finally {
    restoreEnv("OPENAI_API_KEY", previousApiKey);
  }
});

test("rate limit por usuário não transfere contador para outro usuário", async () => {
  resetAiRateLimitForTests();

  for (let requestIndex = 0; requestIndex < 8; requestIndex += 1) {
    const response = await fetch(`${baseUrl}/ai/analyze`, {
      method: "POST",
      headers: authorizationHeaders(otherToken),
      body: JSON.stringify({
        filters: {
          month: 8,
          year: 2026,
        },
      }),
    });

    assert.equal(response.status, 200);
  }

  const limitedResponse = await fetch(
    `${baseUrl}/ai/analyze`,
    {
      method: "POST",
      headers: authorizationHeaders(otherToken),
      body: JSON.stringify({ filters: {} }),
    },
  );

  assert.equal(limitedResponse.status, 429);
  assert.ok(limitedResponse.headers.get("Retry-After"));

  const payload = (await limitedResponse.json()) as {
    code: string;
  };

  assert.equal(payload.code, "AI_RATE_LIMITED");

  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const otherUserResponse = await fetch(
      `${baseUrl}/ai/analyze`,
      {
        method: "POST",
        headers: authorizationHeaders(ownerToken),
        body: JSON.stringify({
          filters: {
            month: 8,
            year: 2026,
          },
        }),
      },
    );

    assert.equal(otherUserResponse.status, 503);
  } finally {
    restoreEnv("OPENAI_API_KEY", previousApiKey);
  }
});

test("rate limit por IP é compartilhado entre contas", async () => {
  resetAiRateLimitForTests();

  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    for (let requestIndex = 0; requestIndex < 6; requestIndex += 1) {
      const emptyContextResponse = await fetch(
        `${baseUrl}/ai/analyze`,
        {
          method: "POST",
          headers: authorizationHeaders(otherToken),
          body: JSON.stringify({ filters: {} }),
        },
      );

      assert.equal(emptyContextResponse.status, 200);

      const configuredContextResponse = await fetch(
        `${baseUrl}/ai/analyze`,
        {
          method: "POST",
          headers: authorizationHeaders(ownerToken),
          body: JSON.stringify({
            filters: {
              month: 8,
              year: 2026,
            },
          }),
        },
      );

      assert.equal(configuredContextResponse.status, 503);
    }

    const blockedResponse = await fetch(
      `${baseUrl}/ai/analyze`,
      {
        method: "POST",
        headers: authorizationHeaders(otherToken),
        body: JSON.stringify({ filters: {} }),
      },
    );

    assert.equal(blockedResponse.status, 429);
    assert.ok(blockedResponse.headers.get("Retry-After"));

    const payload = (await blockedResponse.json()) as {
      code: string;
    };

    assert.equal(payload.code, "AI_RATE_LIMITED");
  } finally {
    restoreEnv("OPENAI_API_KEY", previousApiKey);
  }
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
}: {
  token: string;
  name: string;
}) {
  const response = await requestJson<{
    category: { id: string };
  }>(
    "/categories",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        type: "EXPENSE",
        icon: null,
        color: "#168956",
      }),
    },
    token,
    201,
  );

  return response.category;
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
    "Content-Type": "application/json",
  };
}

function restoreEnv(
  name: string,
  value: string | undefined,
) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
