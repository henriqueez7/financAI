import {
  cancelLatestPendingFinancialAction,
  PendingFinancialActionUnavailableError,
} from "../actions/pending-action.service.js";
import { createFinancialActionProposal } from "../actions/action-proposal.service.js";
import { executeLatestPendingFinancialAction } from "../actions/pending-action-execution.service.js";
import type { IntentResult } from "../intents/intent.types.js";
import {
  formatEntryCreatedResponse,
  formatFinancialActionProposal,
  formatIncompleteFinancialAction,
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
  "• registrar receitas",
  "• registrar despesas",
  "",
  "Receitas e despesas só são registradas depois da sua confirmação explícita.",
].join("\n");

interface WhatsAppCommandDependencies {
  proposalCreator?: typeof createFinancialActionProposal;
  pendingExecutor?: typeof executeLatestPendingFinancialAction;
}

export async function executeWhatsAppCommand(
  {
    userId,
    interpretation,
    now = new Date(),
  }: {
    userId: string;
    interpretation: IntentResult;
    now?: Date;
  },
  dependencies: WhatsAppCommandDependencies = {},
): Promise<WhatsAppCommandResult> {
  const proposalCreator =
    dependencies.proposalCreator ??
    createFinancialActionProposal;
  const pendingExecutor =
    dependencies.pendingExecutor ??
    executeLatestPendingFinancialAction;

  switch (interpretation.intent) {
    case "CREATE_EXPENSE":
    case "CREATE_INCOME": {
      try {
        const proposal =
          await proposalCreator({
            userId,
            interpretation,
            now,
          });

        if (proposal.status === "INCOMPLETE") {
          return {
            code: "INCOMPLETE_ACTION",
            message: formatIncompleteFinancialAction(
              proposal.missing,
            ),
          };
        }

        return {
          code: "PENDING_ACTION_CREATED",
          message: formatFinancialActionProposal({
            intent: proposal.type,
            amount: proposal.payload.amount,
            description: proposal.payload.description,
            date: proposal.payload.date,
            categoryName: proposal.categoryName,
            accountName: proposal.accountName,
          }),
        };
      } catch (error) {
        reportWriteError(interpretation.intent, error);

        return writeError();
      }
    }

    case "CONFIRM": {
      try {
        const execution =
          await pendingExecutor({
            userId,
            now,
          });

        switch (execution.status) {
          case "CREATED":
            return {
              code: "ENTRY_CREATED",
              message: formatEntryCreatedResponse(execution),
            };

          case "EXPIRED":
            return {
              code: "ACTION_EXPIRED",
              message:
                "Essa operação expirou. Envie o lançamento novamente.",
            };

          case "INVALID_PAYLOAD":
          case "INVALID_REFERENCE":
            return {
              code: "ACTION_INVALID",
              message:
                "Essa operação não é mais válida. Envie o lançamento novamente.",
            };

          case "NO_PENDING":
            return noPendingAction();
        }
      } catch (error) {
        reportWriteError(interpretation.intent, error);

        return writeError();
      }
    }

    case "CANCEL": {
      try {
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
        };
      } catch (error) {
        if (
          error instanceof PendingFinancialActionUnavailableError
        ) {
          return noPendingAction();
        }

        reportWriteError(interpretation.intent, error);

        return writeError();
      }
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

function writeError(): WhatsAppCommandResult {
  return {
    code: "WRITE_ERROR",
    message:
      "Não consegui registrar essa operação agora. Tente novamente.",
  };
}

function reportWriteError(
  intent: IntentResult["intent"],
  error: unknown,
) {
  console.error("[whatsapp] write_failed", {
    intent,
    errorName:
      error instanceof Error ? error.name : "UnknownError",
    errorCode:
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined,
  });
}
