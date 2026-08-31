export interface TextMessageInput {
  recipient: string;
  text: string;
}

export interface InteractiveMessageInput {
  recipient: string;
  text: string;
  options: Array<{
    id: string;
    title: string;
  }>;
}

export interface SentTextMessage extends TextMessageInput {
  id: string;
  sentAt: Date;
}
