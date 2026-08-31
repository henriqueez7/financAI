import {
  cancelLatestPendingFinancialAction,
  confirmLatestPendingFinancialAction,
} from "../actions/pending-action.service.js";
import type { IntentResult } from "../intents/intent.types.js";
import {
  formatWriteNotEnabledResponse,
} from "../responses/response.formatter.js";
import type { WhatsAppCommandResult } from "./command.types.js";

export const WHATSAPP_HELP_MESSAGE = [
  "Posso ajudar com:",
  "",
  "• saldo",
  "• gastos",
  "• orçamentos",
  "• metas",
  "• insights",
  "• análise financeira",
  "",
  "Também consigo entender frases de receitas e despesas, mas ainda não registro lançamentos nesta versão.",
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
      return {
        code: "WRITE_NOT_ENABLED",
        message: formatWriteNotEnabledResponse({
          intent: interpretation.intent,
          amount: interpretation.entities.amount,
          description:
            interpretation.entities.description,
        }),
      };

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
          "Não consegui entender essa mensagem.\n\nVocê pode perguntar sobre saldo, gastos, orçamentos, metas ou insights.",
      };

    case "GET_BALANCE":
    case "GET_EXPENSES":
    case "GET_BUDGETS":
    case "GET_GOALS":
    case "GET_INSIGHTS":
    case "ASK_FINANCE_AI":
      return {
        code: "QUERY_ERROR",
        message:
          "Não consegui consultar seus dados agora. Tente novamente em instantes.",
      };
  }
}

function noPendingAction(): WhatsAppCommandResult {
  return {
    code: "NO_PENDING_ACTION",
    message: "Não há ação pendente para confirmar ou cancelar.",
  };
}
