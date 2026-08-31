import type { PendingFinancialActionPayload } from "../actions/pending-action.types.js";

export type ConversationState =
  | {
      state: "IDLE";
      pendingAction: null;
    }
  | {
      state: "WAITING_CONFIRMATION";
      pendingAction: {
        id: string;
        type: "CREATE_EXPENSE" | "CREATE_INCOME";
        payload: PendingFinancialActionPayload;
        expiresAt: Date;
      };
    };
