import {
  cancelLatestPendingFinancialAction,
  confirmLatestPendingFinancialAction,
  createPendingFinancialAction,
} from "../actions/pending-action.service.js";
import type { PendingFinancialActionPayload } from "../actions/pending-action.types.js";
import type { IntentResult } from "../intents/intent.types.js";
import type { WhatsAppCommandResult } from "./command.types.js";

export const WHATSAPP_HELP_MESSAGE = [
  "Nesta fase de testes, reconheço pedidos para:",
  "- consultar saldo e gastos",
  "- acompanhar orçamentos e metas",
  "- ver insights",
  "- preparar receitas e despesas para confirmação",
  "",
  "As consultas e os lançamentos reais ainda não são executados pelo WhatsApp.",
].join("\n");

export async function executeWhatsAppCommand({
  userId,
  interpretation,
  now = new Date(),
}: {
  userId: string;
  interpretation: IntentResult;
  now?: Date;
}): Promise<WhatsAppCommandResult> {
  switch (interpretation.intent) {
    case "CREATE_EXPENSE":
    case "CREATE_INCOME":
      return createActionProposal(
        userId,
        interpretation.intent,
        interpretation,
        now,
      );

    case "CONFIRM": {
      const action =
        await confirmLatestPendingFinancialAction({
          userId,
          now,
        });

      if (!action) {
        return noPendingAction();
      }

      return {
        code: "ACTION_CONFIRMED",
        message:
          "Confirmação registrada. Nenhum lançamento financeiro foi criado nesta fase.",
        pendingActionId: action.id,
      };
    }

    case "CANCEL": {
      const action =
        await cancelLatestPendingFinancialAction({
          userId,
          now,
        });

      if (!action) {
        return noPendingAction();
      }

      return {
        code: "ACTION_CANCELLED",
        message: "Ação pendente cancelada.",
        pendingActionId: action.id,
      };
    }

    case "HELP":
      return {
        code: "HELP",
        message: WHATSAPP_HELP_MESSAGE,
      };

    case "UNKNOWN":
      return {
        code: "UNKNOWN",
        message:
          "Não reconheci esse pedido. Envie “ajuda” para ver as opções disponíveis.",
      };

    case "GET_BALANCE":
    case "GET_EXPENSES":
    case "GET_BUDGETS":
    case "GET_GOALS":
    case "GET_INSIGHTS":
    case "ASK_FINANCE_AI":
      return {
        code: "NOT_IMPLEMENTED",
        message:
          "Reconheci o pedido, mas essa consulta ainda não está disponível pelo WhatsApp.",
      };
  }
}

async function createActionProposal(
  userId: string,
  type: "CREATE_EXPENSE" | "CREATE_INCOME",
  interpretation: IntentResult,
  now: Date,
): Promise<WhatsAppCommandResult> {
  const amount = interpretation.entities.amount;

  if (!amount) {
    return {
      code: "UNKNOWN",
      message:
        "Não consegui identificar um valor válido para preparar a ação.",
    };
  }

  const payload: PendingFinancialActionPayload = {
    amount,
    ...(interpretation.entities.description
      ? {
          description:
            interpretation.entities.description,
        }
      : {}),
    ...(interpretation.entities.date
      ? { date: interpretation.entities.date }
      : {}),
    ...(interpretation.entities.categoryHint
      ? {
          categoryHint:
            interpretation.entities.categoryHint,
        }
      : {}),
    ...(interpretation.entities.accountHint
      ? {
          accountHint:
            interpretation.entities.accountHint,
        }
      : {}),
  };

  const action = await createPendingFinancialAction({
    userId,
    type,
    payload,
    now,
  });

  const operation =
    type === "CREATE_EXPENSE"
      ? "despesa"
      : "receita";

  return {
    code: "PENDING_ACTION_CREATED",
    message: `Preparei uma ${operation} de ${formatCurrency(amount)} para confirmação. Responda “confirmar” ou “cancelar”.`,
    pendingActionId: action.id,
  };
}

function noPendingAction(): WhatsAppCommandResult {
  return {
    code: "NO_PENDING_ACTION",
    message: "Não há ação pendente para confirmar ou cancelar.",
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}
