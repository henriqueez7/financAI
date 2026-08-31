import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDateOnly,
  resolvePeriodHint,
  resolveRelativeDate,
} from "./date.parser.js";

const referenceDate = new Date("2026-08-30T00:30:00.000Z");

test("resolve hoje, ontem e anteontem em UTC", () => {
  assert.equal(formatDateOnly(referenceDate), "2026-08-30");
  assert.equal(
    resolveRelativeDate("foi hoje", referenceDate),
    "2026-08-30",
  );
  assert.equal(
    resolveRelativeDate("foi ontem", referenceDate),
    "2026-08-29",
  );
  assert.equal(
    resolveRelativeDate("foi anteontem", referenceDate),
    "2026-08-28",
  );
});

test("resolve somente períodos financeiros suportados", () => {
  assert.equal(resolvePeriodHint("gastos de hoje"), "TODAY");
  assert.equal(
    resolvePeriodHint("gastos deste mês"),
    "CURRENT_MONTH",
  );
  assert.equal(
    resolvePeriodHint("gastos do mês passado"),
    "PREVIOUS_MONTH",
  );
  assert.equal(
    resolvePeriodHint("gastos neste ano"),
    "CURRENT_YEAR",
  );
  assert.equal(resolvePeriodHint("algum dia"), undefined);
});

test("rejeita data de referência inválida", () => {
  assert.throws(
    () => formatDateOnly(new Date(Number.NaN)),
    TypeError,
  );
});
