import type { MessageProvider } from "./message.provider.js";
import type {
  SentTextMessage,
  TextMessageInput,
} from "./message.types.js";

export class FakeWhatsAppProvider
  implements MessageProvider
{
  private readonly sentMessages: SentTextMessage[] = [];
  private sequence = 0;

  constructor(
    private readonly now: () => Date = () => new Date(),
  ) {}

  async sendText(input: TextMessageInput) {
    this.sequence += 1;

    const message = {
      id: `fake-${this.sequence}`,
      recipient: input.recipient,
      text: input.text,
      sentAt: this.now(),
    };

    this.sentMessages.push(message);

    return {
      messageId: message.id,
    };
  }

  getSentMessages() {
    return this.sentMessages.map((message) => ({
      ...message,
      sentAt: new Date(message.sentAt),
    }));
  }

  clear() {
    this.sentMessages.length = 0;
    this.sequence = 0;
  }
}
