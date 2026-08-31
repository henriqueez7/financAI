import assert from "node:assert/strict";
import test from "node:test";

import { interpretWhatsAppIntent } from "./intent.service.js";
import type { WhatsAppIntent } from "./intent.types.js";

const exactCases: Array<{
  text: string;
  intent: WhatsAppIntent;
}> = [
  { text: "saldo", intent: "GET_BALANCE" },
  { text: "Qual meu saldo?", intent: "GET_BALANCE" },
  { text: "meus gastos", intent: "GET_EXPENSES" },
  { text: "orçamento", intent: "GET_BUDGETS" },
  {
    text: "como estão meus orçamentos",
    intent: "GET_BUDGETS",
  },
  { text: "minhas metas", intent: "GET_GOALS" },
  { text: "meus insights", intent: "GET_INSIGHTS" },
  { text: "confirmo", intent: "CONFIRM" },
  { text: "sim", intent: "CONFIRM" },
  { text: "não", intent: "CANCEL" },
  { text: "cancela", intent: "CANCEL" },
  { text: "ajuda", intent: "HELP" },
  { text: "o que você faz?", intent: "HELP" },
];

test("reconhece os comandos determinísticos em português", () => {
  for (const testCase of exactCases) {
    const result = interpretWhatsAppIntent(
      testCase.text,
    );

    assert.equal(result.intent, testCase.intent);
    assert.equal(result.confidence, "EXACT");
    assert.deepEqual(result.entities, {});
  }
});

test("extrai proposta simples de despesa sem remover acentos", () => {
  const result = interpretWhatsAppIntent(
    "Gastei 48,50 reais no almoço",
  );

  assert.equal(result.intent, "CREATE_EXPENSE");
  assert.equal(result.confidence, "PATTERN");
  assert.deepEqual(result.entities, {
    amount: 48.5,
    description: "almoço",
  });
});

test("extrai proposta simples de receita", () => {
  const result = interpretWhatsAppIntent(
    "Recebi R$ 1250 de salário",
  );

  assert.equal(result.intent, "CREATE_INCOME");
  assert.equal(result.confidence, "PATTERN");
  assert.deepEqual(result.entities, {
    amount: 1_250,
    description: "salário",
  });
});

test("retorna UNKNOWN sem recorrer a provider externo", () => {
  const result = interpretWhatsAppIntent(
    "conte algo que você não conhece",
  );

  assert.equal(result.intent, "UNKNOWN");
  assert.equal(result.confidence, "NONE");
  assert.equal(
    result.rawText,
    "conte algo que você não conhece",
  );
});
