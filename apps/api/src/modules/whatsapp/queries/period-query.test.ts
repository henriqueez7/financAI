import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCurrentBudgetPeriod,
  resolveReportQuery,
} from "./period-query.js";

const referenceDate = new Date("2026-01-05T18:00:00.000Z");

test("mapeia períodos para filtros oficiais de Reports", () => {
  assert.deepEqual(
    resolveReportQuery("TODAY", referenceDate),
    {
      dateFrom: new Date("2026-01-05T00:00:00.000Z"),
      dateTo: new Date("2026-01-05T00:00:00.000Z"),
    },
  );
  assert.deepEqual(
    resolveReportQuery("CURRENT_MONTH", referenceDate),
    { month: 1, year: 2026 },
  );
  assert.deepEqual(
    resolveReportQuery("PREVIOUS_MONTH", referenceDate),
    { month: 12, year: 2025 },
  );
  assert.deepEqual(
    resolveReportQuery("CURRENT_YEAR", referenceDate),
    {
      dateFrom: new Date("2026-01-01T00:00:00.000Z"),
      dateTo: new Date("2026-12-31T00:00:00.000Z"),
    },
  );
  assert.deepEqual(resolveReportQuery(undefined, referenceDate), {
    month: 1,
    year: 2026,
  });
});

test("resolve mês corrente para Budgets com referência explícita", () => {
  assert.deepEqual(resolveCurrentBudgetPeriod(referenceDate), {
    month: 1,
    year: 2026,
  });
});

test("rejeita referência temporal inválida", () => {
  assert.throws(
    () =>
      resolveReportQuery("CURRENT_MONTH", new Date(Number.NaN)),
    TypeError,
  );
});
