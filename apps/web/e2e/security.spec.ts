import {
  expect,
  test,
  type Page,
} from "@playwright/test";

const futureToken = createBrowserJwt(
  Math.floor(Date.now() / 1000) + 3_600,
);

const testUser = {
  id: "security-user",
  name: "Pessoa Segura",
  email: "pessoa@example.com",
  createdAt: "2026-08-01T00:00:00.000Z",
};

test("aplica CSP e headers sem HSTS no desenvolvimento e sem cache nas rotas autenticadas", async ({
  request,
}) => {
  const loginResponse = await request.get("/login");
  const dashboardResponse = await request.get(
    "/dashboard",
  );
  const csp =
    loginResponse.headers()[
      "content-security-policy"
    ] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("http://localhost:3333");
  expect(csp).toContain("'unsafe-eval'");
  expect(
    loginResponse.headers()[
      "strict-transport-security"
    ],
  ).toBeUndefined();
  expect(
    loginResponse.headers()["x-frame-options"],
  ).toBe("DENY");
  expect(
    dashboardResponse.headers()["cache-control"],
  ).toMatch(/no-store|no-cache/);
});

test("login usa sessionStorage por padrão e preserva a sessão no reload", async ({
  page,
}) => {
  const pageErrors = collectPageErrors(page);
  const authorizationHeaders: Array<
    string | undefined
  > = [];

  await mockLogin(page);
  await mockDashboard(page, {
    onDashboardRequest: (authorization) => {
      authorizationHeaders.push(authorization);
    },
  });

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(testUser.email);
  await page
    .getByRole("textbox", {
      name: "Senha",
      exact: true,
    })
    .fill("FinanceAI123!");
  await page
    .getByRole("button", {
      name: "Entrar na minha conta",
    })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);

  const storedSession = await page.evaluate(() => ({
    localToken: window.localStorage.getItem("token"),
    sessionToken:
      window.sessionStorage.getItem("token"),
  }));

  expect(storedSession.localToken).toBeNull();
  expect(storedSession.sessionToken).toBe(futureToken);

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: /Olá, Pessoa/,
    }),
  ).toBeVisible();
  expect(authorizationHeaders).toContain(
    `Bearer ${futureToken}`,
  );
  expect(pageErrors).toEqual([]);
});

test("token expirado é removido antes da chamada e 401 encerra a sessão", async ({
  page,
}) => {
  const expiredToken = createBrowserJwt(
    Math.floor(Date.now() / 1000) - 60,
  );
  let authorizationHeader: string | undefined;

  await page.goto("/login");
  await page.evaluate(
    ({ token, user }) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem(
        "user",
        JSON.stringify(user),
      );
    },
    { token: expiredToken, user: testUser },
  );

  await mockDashboard(page, {
    dashboardStatus: 401,
    onDashboardRequest: (authorization) => {
      authorizationHeader = authorization;
    },
  });

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  expect(authorizationHeader).toBeUndefined();
  expect(
    await page.evaluate(() => ({
      localToken:
        window.localStorage.getItem("token"),
      localUser: window.localStorage.getItem("user"),
      sessionToken:
        window.sessionStorage.getItem("token"),
      sessionUser:
        window.sessionStorage.getItem("user"),
    })),
  ).toEqual({
    localToken: null,
    localUser: null,
    sessionToken: null,
    sessionUser: null,
  });
});

test("logout limpa os dois storages e funciona na navegação mobile", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 390,
    height: 844,
  });
  await page.goto("/login");
  await page.evaluate(
    ({ token, user }) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem(
        "user",
        JSON.stringify(user),
      );
      window.sessionStorage.setItem(
        "token",
        "stale-session-token",
      );
    },
    { token: futureToken, user: testUser },
  );
  await mockDashboard(page);

  await page.goto("/dashboard");
  await page.getByText("Mais", { exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta" })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => ({
      localToken:
        window.localStorage.getItem("token"),
      localUser: window.localStorage.getItem("user"),
      sessionToken:
        window.sessionStorage.getItem("token"),
      sessionUser:
        window.sessionStorage.getItem("user"),
    })),
  ).toEqual({
    localToken: null,
    localUser: null,
    sessionToken: null,
    sessionUser: null,
  });
});

test("conteúdo textual é escapado e links de dados externos não são renderizados", async ({
  page,
}) => {
  const maliciousName =
    '<img data-xss src=x onerror="window.__xss=true">';

  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem(
        "user",
        JSON.stringify(user),
      );
      (window as Window & { __xss?: boolean }).__xss =
        false;
    },
    {
      token: futureToken,
      user: { ...testUser, name: maliciousName },
    },
  );
  await mockDashboard(page, {
    insight: {
      id: "unsafe-action",
      type: "POSITIVE_RESULT",
      severity: "INFO",
      title: maliciousName,
      message: "Conteúdo deve permanecer como texto.",
      action: {
        label: "Ação externa",
        href: "javascript:alert(1)",
      },
    },
  });

  await page.goto("/dashboard");

  await expect(
    page.getByText(maliciousName).first(),
  ).toBeVisible();
  await expect(
    page.locator("img[data-xss]"),
  ).toHaveCount(0);
  await expect(
    page.locator('a[href^="javascript:"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __xss?: boolean })
          .__xss,
    ),
  ).toBe(false);
});

async function mockLogin(page: Page) {
  await page.route(
    /^http:\/\/localhost:3333\/auth\/login$/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Login realizado com sucesso.",
          token: futureToken,
          user: testUser,
        }),
      });
    },
  );
}

async function mockDashboard(
  page: Page,
  options: {
    dashboardStatus?: number;
    onDashboardRequest?: (
      authorization: string | undefined,
    ) => void;
    insight?: Record<string, unknown>;
  } = {},
) {
  await page.route(
    /^http:\/\/localhost:3333\/dashboard$/,
    async (route) => {
      options.onDashboardRequest?.(
        route.request().headers().authorization,
      );

      if (options.dashboardStatus === 401) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Sessão inválida ou expirada.",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          dashboard: {
            balance: {
              income: 5_200,
              expense: 3_150,
              total: 2_050,
            },
            accounts: [],
            recentEntries: [],
          },
        }),
      });
    },
  );

  await page.route(
    /^http:\/\/localhost:3333\/insights\/overview/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          period: {
            dateFrom: "2026-08-01",
            dateTo: "2026-08-31",
            comparisonLabel: "vs. mês anterior",
            granularity: "DAY",
          },
          summary: {
            totalIncome: 5_200,
            totalExpense: 3_150,
            netResult: 2_050,
            savingsRate: 39.42,
            insightCount: options.insight ? 1 : 0,
          },
          insights: options.insight
            ? [options.insight]
            : [],
        }),
      });
    },
  );
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

function createBrowserJwt(exp: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString(
      "base64url",
    );

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ exp })}.test-signature`;
}
