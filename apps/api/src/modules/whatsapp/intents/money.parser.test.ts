import assert from "node:assert/strict";
import test from "node:test";

import { extractBrazilianMoney } from "./money.parser.js";

const validCases = [
  ["R$ 10", 10],
  ["10 reais", 10],
  ["10,50", 10.5],
  ["1.000", 1_000],
  ["1.000,50", 1_000.5],
  ["2 mil", 2_000],
  ["2,5 mil", 2_500],
  ["89 conto", 89],
] as const;

test("converte formatos monetários brasileiros sem arredondamento implícito", () => {
  for (const [text, amount] of validCases) {
    assert.equal(extractBrazilianMoney(text)?.amount, amount, text);
  }
});

test("rejeita zero, negativos, precisão excedente, datas e valores fora do schema", () => {
  for (const text of [
    "0 reais",
    "-10 reais",
    "10,505 reais",
    "30/08/2026",
    "10.000.000.000 reais",
    "NaN",
    "Infinity",
    "-Infinity",
  ]) {
    assert.equal(extractBrazilianMoney(text), null, text);
  }
});
