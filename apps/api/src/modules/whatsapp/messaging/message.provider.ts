import type {
  InteractiveMessageInput,
  TextMessageInput,
} from "./message.types.js";

export interface MessageProvider {
  sendText(input: TextMessageInput): Promise<{
    messageId: string;
  }>;

  sendInteractiveMessage?(
    input: InteractiveMessageInput,
  ): Promise<{
    messageId: string;
  }>;
}
