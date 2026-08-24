import {
  expect,
  test,
  type Page,
} from "@playwright/test";

let runtimeErrors: string[] = [];

const successfulAnalysis = {
  status: "GENERATED",
  analysis: {
    headline: "Seu resultado está positivo, com um ponto de atenção",
    summary:
      "As receitas superaram as despesas no período, enquanto Alimentação concentrou a maior parcela dos gastos registrados.",
    facts: [
      {
        title: "Resultado positivo",
        description:
          "O resultado consolidado do período foi positivo em R$ 1.200,00.",
        severity: "POSITIVE",
      },
      {
        title: "Categoria concentrada",
        description:
          "Alimentação representa 46% das despesas registradas.",
        severity: "WARNING",
      },
    ],
    priorities: [
      {
        title: "Revisar Alimentação",
        rationale:
          "A categoria tem a maior participação nas despesas do período.",
        severity: "WARNING",
        sourceInsightTypes: ["CATEGORY_CONCENTRATION"],
      },
    ],
    recommendations: [
      {
        title: "Revisar os gastos da categoria",
        suggestion:
          "Você pode verificar se existe espaço para reduzir despesas sem comprometer necessidades essenciais.",
        priority: "MEDIUM",
      },
    ],
    warnings: [],
    answer: null as string | null,
  },
  sourceInsights: [
    {
      id: "positive-result",
      type: "POSITIVE_RESULT",
      severity: "POSITIVE",
      title: "Resultado positivo no período",
      message: "As receitas superaram as despesas.",
    },
  ],
  period: {
    dateFrom: "2026-08-01",
    dateTo: "2026-08-31",
    granularity: "DAY",
    comparisonLabel: "vs. mês anterior",
  },
  generatedAt: "2026-08-12T12:00:00.000Z",
};

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
    window.localStorage.setItem("token", "e2e-token");
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        id: "e2e-user",
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

test("desktop exibe loading, sucesso e pergunta somente por ação explícita", async ({
  page,
}) => {
  let requests = 0;

  await mockAnalysis(page, async (requestBody) => {
    requests += 1;
    await new Promise((resolve) =>
      setTimeout(resolve, 450),
    );

    return {
      ...successfulAnalysis,
      analysis: {
        ...successfulAnalysis.analysis,
        answer: requestBody.question
          ? "A categoria Alimentação merece a primeira revisão."
          : null,
      },
    };
  });

  await page.goto("/ai");

  await expect(
    page.getByLabel("Gerando análise financeira"),
  ).toBeVisible();
  await expect(
    page.getByText("Mês atual", { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /Seu resultado está positivo/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Fatos observados"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A IA explica e prioriza os fatos calculados pelo Finance AI. Ela não substitui os números dos seus relatórios.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Contexto agregado e protegido"),
  ).toBeVisible();
  await expect(
    page.getByText("Próximos passos sugeridos"),
  ).toBeVisible();

  await page.waitForTimeout(300);
  expect(requests).toBe(1);

  await page
    .getByRole("button", {
      name: "Onde posso reduzir gastos neste período?",
    })
    .click();

  await expect(
    page.getByText(
      "A categoria Alimentação merece a primeira revisão.",
    ),
  ).toBeVisible();
  expect(requests).toBe(2);

  await expectNoMojibake(page);
  await page.screenshot({
    path: "test-results/encoding-ai-desktop.png",
    fullPage: true,
  });
});

test("frontend mostra erro amigável e permite tentar novamente", async ({
  page,
}) => {
  let requests = 0;

  await page.route("**/ai/analyze", async (route) => {
    requests += 1;

    if (requests === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "AI_UNAVAILABLE",
          message:
            "Não foi possível concluir a análise agora. Tente novamente depois.",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successfulAnalysis),
    });
  });

  await page.goto("/ai");

  await expect(
    page.getByRole("heading", {
      name: "Análise indisponível agora",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Tentar novamente" })
    .click();

  await expect(
    page.getByRole("heading", {
      name: /Seu resultado está positivo/,
    }),
  ).toBeVisible();
  expect(requests).toBe(2);

  expect(runtimeErrors).toEqual([
    "Failed to load resource: the server responded with a status of 503 (Service Unavailable)",
  ]);
  runtimeErrors = [];
});

test("período vazio orienta a criar um lançamento", async ({
  page,
}) => {
  await mockAnalysis(page, async () => ({
    status: "INSUFFICIENT_DATA",
    analysis: null,
    sourceInsights: [],
    period: successfulAnalysis.period,
    generatedAt: successfulAnalysis.generatedAt,
  }));

  await page.goto("/ai");

  await expect(
    page.getByRole("heading", {
      name: "Ainda faltam fatos para analisar",
    }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/entries/new"]').filter({
      hasText: "Adicionar",
    }),
  ).toBeVisible();
});

test("mobile 390x844 mantém conteúdo e navegação utilizáveis", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 390,
    height: 844,
  });

  await mockAnalysis(page, async () => successfulAnalysis);
  await page.goto("/ai");

  await expect(
    page.getByRole("heading", {
      name: /Seu resultado está positivo/,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator("nav")
      .filter({
        has: page.locator('a[href="/entries/new"]'),
      }),
  ).toBeVisible();

  await page.getByText("Mais", { exact: true }).click();

  const dialog = page.getByRole("dialog");

  await expect(
    dialog.locator('a[href="/ai"]'),
  ).toHaveAttribute("aria-current", "page");
  await expect(dialog.getByText("Em breve")).toHaveCount(0);

  await expectNoMojibake(page);
  await page.screenshot({
    path: "test-results/encoding-ai-mobile.png",
    fullPage: true,
  });
});

async function mockAnalysis(
  page: Page,
  responseFactory: (
    body: { question?: string },
  ) => Promise<unknown>,
) {
  await page.route("**/ai/analyze", async (route) => {
    const body = route.request().postDataJSON() as {
      question?: string;
    };
    const response = await responseFactory(body);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function expectNoMojibake(page: Page) {
  const visibleText = await page.locator("body").innerText();

  expect(visibleText).not.toMatch(
    /(?:Ã[¡-¿]|Â.|â€|�)/,
  );
}
