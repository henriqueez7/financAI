import assert from "node:assert/strict";
import test from "node:test";

import { WHATSAPP_RESPONSE_LIMITS } from "./response.constants.js";
import {
  formatAiAnalysisResponse,
  formatBalanceResponse,
  formatBudgetsResponse,
  formatCurrency,
  formatEntryCreatedResponse,
  formatExpensesResponse,
  formatFinancialActionProposal,
  formatGoalsResponse,
  formatIncompleteFinancialAction,
  formatInsightsResponse,
  limitWhatsAppResponse,
} from "./response.formatter.js";

test("formata saldo pt-BR, valores negativos e limita contas", () => {
  const message = formatBalanceResponse([
    { name: "Nubank", currentBalance: 2_300 },
    { name: "Carteira", currentBalance: 520.35 },
    { name: "Inter", currentBalance: -100 },
    { name: "Conta 4", currentBalance: 40 },
    { name: "Conta 5", currentBalance: 30 },
    { name: "Conta 6", currentBalance: 20 },
  ]);

  assert.match(message, /R\$ 2\.810,35/);
  assert.match(message, /Inter: -R\$ 100,00/);
  assert.doesNotMatch(message, /Conta 6/);
  assert.equal(formatCurrency(1_234.56), "R$ 1.234,56");
  assert.equal(
    formatBalanceResponse([]),
    "Você ainda não possui contas cadastradas.",
  );
});

test("formata despesas e estados sem dados por período", () => {
  const report = {
    overview: {
      totalExpense: 1_842.3,
      transactionCount: 4,
    },
    categories: [
      { name: "Alimentação", amount: 620 },
    ],
  };

  assert.equal(
    formatExpensesResponse(report, "CURRENT_MONTH"),
    "Você gastou R$ 1.842,30 neste mês.\nMaior categoria: Alimentação — R$ 620,00.",
  );
  assert.equal(
    formatExpensesResponse(
      {
        overview: {
          totalExpense: 0,
          transactionCount: 0,
        },
        categories: [],
      },
      "TODAY",
    ),
    "Você ainda não possui despesas registradas hoje.",
  );
});

test("prioriza e limita orçamentos sem duplicar cálculo financeiro", () => {
  const budgets = Array.from({ length: 7 }, (_, index) => ({
    category: { name: `Categoria ${index + 1}` },
    percentageUsed: index === 6 ? 120 : index * 10,
    exceeded: index === 6,
  }));
  const message = formatBudgetsResponse(budgets);

  assert.match(message, /7 orçamentos ativos/);
  assert.match(message, /⚠️ Categoria 7: 120% utilizado/);
  assert.doesNotMatch(message, /Categoria 1:/);
  assert.equal(
    formatBudgetsResponse([]),
    "Você ainda não possui orçamentos ativos neste mês.",
  );
});

test("formata metas ativas e respeita limite", () => {
  const goals = Array.from({ length: 6 }, (_, index) => ({
    name: `Meta ${index + 1}`,
    percentageCompleted: 10 * (index + 1),
  }));
  const message = formatGoalsResponse(goals);

  assert.match(message, /6 metas ativas/);
  assert.match(message, /Meta 5: 50%/);
  assert.doesNotMatch(message, /Meta 6/);
  assert.equal(
    formatGoalsResponse([]),
    "Você ainda não possui metas ativas.",
  );
});

test("usa somente os três primeiros insights recebidos", () => {
  const message = formatInsightsResponse([
    { severity: "CRITICAL", message: "Crítico" },
    { severity: "WARNING", message: "Alerta" },
    { severity: "POSITIVE", message: "Positivo" },
    { severity: "INFO", message: "Não deve aparecer" },
  ]);

  assert.match(message, /⚠️ Crítico/);
  assert.match(message, /✅ Positivo/);
  assert.doesNotMatch(message, /Não deve aparecer/);
  assert.equal(
    formatInsightsResponse([]),
    "Não encontrei nenhum alerta ou insight relevante para este período.",
  );
});

test("compacta análise existente sem uma segunda geração", () => {
  const message = formatAiAnalysisResponse({
    status: "GENERATED",
    analysis: {
      headline: "Sua situação merece atenção",
      summary: "Resumo consolidado do período.",
      answer: "Resposta direta para a pergunta.",
      priorities: [
        { title: "Prioridade 1", rationale: "Motivo 1" },
        { title: "Prioridade 2", rationale: "Motivo 2" },
        { title: "Prioridade 3", rationale: "Motivo 3" },
      ],
      recommendations: [
        { title: "Ação 1", suggestion: "Sugestão 1" },
        { title: "Ação 2", suggestion: "Sugestão 2" },
      ],
    },
  });

  assert.match(message, /^Sua situação merece atenção/);
  assert.match(message, /Resposta direta para a pergunta/);
  assert.doesNotMatch(message, /Prioridade 3/);
  assert.doesNotMatch(message, /Ação 2/);
  assert.equal(
    formatAiAnalysisResponse({
      status: "INSUFFICIENT_DATA",
      analysis: null,
    }),
    "Ainda não há dados financeiros suficientes para gerar uma análise.",
  );
});

test("formata proposta, dados incompletos e sucesso sem IDs", () => {
  assert.equal(
    formatFinancialActionProposal({
      intent: "CREATE_EXPENSE",
      amount: 89,
      description: "Mercado",
      date: "2026-08-29",
      categoryName: "Alimentação",
      accountName: "Nubank",
    }),
    [
      "Encontrei esta despesa:",
      "",
      "💸 R$ 89,00",
      "📝 Mercado",
      "📅 29/08/2026",
      "🏷️ Alimentação",
      "🏦 Nubank",
      "",
      "Confirma o registro?",
    ].join("\n"),
  );
  assert.equal(
    formatEntryCreatedResponse({
      type: "CREATE_INCOME",
      amount: 2_500,
      description: "Freela",
    }),
    "✅ Receita registrada com sucesso.\n\nR$ 2.500,00 — Freela",
  );
  assert.match(
    formatIncompleteFinancialAction("amount"),
    /identificar o valor/,
  );
});

test("limita respostas longas sem ultrapassar o teto", () => {
  const message = limitWhatsAppResponse(
    "palavra ".repeat(1_000),
  );

  assert.ok(
    message.length <= WHATSAPP_RESPONSE_LIMITS.characters,
  );
  assert.match(message, /…$/);
});
