import { getActivePendingFinancialAction } from "../actions/pending-action.service.js";
import type { PendingFinancialActionPayload } from "../actions/pending-action.types.js";
import type { ConversationState } from "./conversation.types.js";

export async function getConversationState({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<ConversationState> {
  const action = await getActivePendingFinancialAction({
    userId,
    now,
  });

  if (!action) {
    return {
      state: "IDLE",
      pendingAction: null,
    };
  }

  return {
    state: "WAITING_CONFIRMATION",
    pendingAction: {
      id: action.id,
      type: action.type,
      payload:
        action.payload as unknown as PendingFinancialActionPayload,
      expiresAt: action.expiresAt,
    },
  };
}
