import { findUniqueActiveAccountByName } from "../../accounts/account.service.js";
import { findUniqueActiveCategoryByName } from "../../categories/category.service.js";
import { formatDateOnly } from "../intents/date.parser.js";
import type { IntentResult } from "../intents/intent.types.js";
import { createPendingFinancialAction } from "./pending-action.service.js";
import type { PendingFinancialActionPayload } from "./pending-action.types.js";

interface CreateFinancialActionProposalParams {
  userId: string;
  interpretation: IntentResult;
  now: Date;
}

export type FinancialActionProposalResult =
  | {
      status: "INCOMPLETE";
      missing: "amount" | "description";
    }
  | {
      status: "CREATED";
      type: "CREATE_EXPENSE" | "CREATE_INCOME";
      payload: PendingFinancialActionPayload;
      categoryName?: string;
      accountName?: string;
    };

export async function createFinancialActionProposal({
  userId,
  interpretation,
  now,
}: CreateFinancialActionProposalParams): Promise<FinancialActionProposalResult> {
  if (
    interpretation.intent !== "CREATE_EXPENSE" &&
    interpretation.intent !== "CREATE_INCOME"
  ) {
    throw new TypeError("A intenção não cria uma proposta financeira.");
  }

  const { entities } = interpretation;

  if (entities.amount === undefined) {
    return {
      status: "INCOMPLETE",
      missing: "amount",
    };
  }

  if (!entities.description) {
    return {
      status: "INCOMPLETE",
      missing: "description",
    };
  }

  const entryType =
    interpretation.intent === "CREATE_EXPENSE"
      ? "EXPENSE"
      : "INCOME";
  const [category, account] = await Promise.all([
    entities.categoryHint
      ? findUniqueActiveCategoryByName({
          userId,
          name: entities.categoryHint,
          type: entryType,
        })
      : null,
    entities.accountHint
      ? findUniqueActiveAccountByName({
          userId,
          name: entities.accountHint,
        })
      : null,
  ]);
  const payload: PendingFinancialActionPayload = {
    amount: entities.amount,
    description: entities.description,
    date: entities.date ?? formatDateOnly(now),
    ...(category ? { categoryId: category.id } : {}),
    ...(account ? { accountId: account.id } : {}),
  };

  await createPendingFinancialAction({
    userId,
    type: interpretation.intent,
    payload,
    now,
  });

  return {
    status: "CREATED",
    type: interpretation.intent,
    payload,
    ...(category ? { categoryName: category.name } : {}),
    ...(account ? { accountName: account.name } : {}),
  };
}
