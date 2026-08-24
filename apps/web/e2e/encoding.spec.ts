import {
  expect,
  test,
  type Page,
} from "@playwright/test";

let runtimeErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  runtimeErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    runtimeErrors.push(error.message);
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("token", "encoding-e2e-token");
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        id: "encoding-user",
        name: "Pessoa Teste",
        email: "pessoa@example.com",
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    );
  });
});

test.afterEach(() => {
  expect(runtimeErrors).toEqual([]);
});

test("dashboard renderiza português correto em desktop e mobile", async ({
  page,
}) => {
  await mockDashboard(page);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: /Olá, Pessoa/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Últimos lançamentos"),
  ).toBeVisible();
  await expectNoMojibake(page);
  await page.screenshot({
    path: "test-results/encoding-dashboard-desktop.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await expect(
    page.getByRole("navigation", {
      name: "Navegação rápida",
    }),
  ).toBeVisible();
  await expectNoMojibake(page);
  await page.screenshot({
    path: "test-results/encoding-dashboard-mobile.png",
    fullPage: true,
  });
});

test("relatórios renderizam português correto em desktop e mobile", async ({
  page,
}) => {
  await mockReports(page);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/reports");

  await expect(
    page.getByRole("heading", { name: "Relatórios" }),
  ).toBeVisible();
  await expect(
    page.getByText("Leitura do período"),
  ).toBeVisible();
  await expectNoMojibake(page);
  await page.screenshot({
    path: "test-results/encoding-reports-desktop.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await expect(
    page.getByRole("navigation", {
      name: "Navegação rápida",
    }),
  ).toBeVisible();
  await expectNoMojibake(page);
  await page.screenshot({
    path: "test-results/encoding-reports-mobile.png",
    fullPage: true,
  });
});

async function mockDashboard(page: Page) {
  await page.route(
    /^http:\/\/localhost:3333\/dashboard$/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          dashboard: {
            balance: {
              income: 5200,
              expense: 3150,
              total: 2050,
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
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          period: {
            dateFrom: "2026-08-01",
            dateTo: "2026-08-31",
            comparisonLabel: "vs. mês anterior",
            granularity: "DAY",
          },
          summary: {
            totalIncome: 5200,
            totalExpense: 3150,
            netResult: 2050,
            savingsRate: 39.42,
            insightCount: 1,
          },
          insights: [
            {
              id: "positive-result",
              type: "POSITIVE_RESULT",
              severity: "POSITIVE",
              title: "Resultado positivo no período",
              message:
                "As receitas superaram as despesas registradas.",
            },
          ],
        }),
      });
    },
  );
}

async function mockReports(page: Page) {
  await page.route(
    /^http:\/\/localhost:3333\/reports\/overview/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          report: {
            period: {
              dateFrom: "2026-08-01",
              dateTo: "2026-08-31",
              granularity: "DAY",
              comparisonLabel: "vs. mês anterior",
            },
            appliedFilters: {
              accountId: null,
              categoryId: null,
              type: null,
            },
            filterOptions: {
              accounts: [],
              categories: [],
            },
            overview: {
              totalIncome: 5200,
              totalExpense: 3150,
              netResult: 2050,
              savingsRate: 39.42,
              transactionCount: 8,
              averageExpense: 525,
              largestExpense: 1200,
              largestIncome: 5200,
              comparison: {
                label: "vs. mês anterior",
                incomeChangePercentage: 4,
                expenseChangePercentage: -3,
                netResultChangePercentage: 18,
              },
            },
            cashFlow: {
              granularity: "DAY",
              series: [
                {
                  period: "2026-08-01",
                  income: 5200,
                  expense: 0,
                  net: 5200,
                },
                {
                  period: "2026-08-10",
                  income: 0,
                  expense: 3150,
                  net: -3150,
                },
              ],
            },
            categories: [],
            accounts: [],
            budgets: {
              totalBudgeted: 0,
              totalSpent: 0,
              remaining: 0,
              percentageUsed: null,
              exceededBudgets: 0,
              budgetsNearLimit: 0,
              items: [],
            },
            goals: {
              activeGoals: 0,
              completedGoals: 0,
              totalTargetAmount: 0,
              totalContributed: 0,
              overallProgressPercentage: 0,
              overdueGoals: 0,
            },
          },
        }),
      });
    },
  );
}

async function expectNoMojibake(page: Page) {
  const visibleText = await page.locator("body").innerText();

  expect(visibleText).not.toMatch(
    /(?:Ã[¡-¿]|Â.|â€|�)/,
  );
}
