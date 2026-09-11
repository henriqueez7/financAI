import { z } from "zod";

const boundedIdentifier = z.string().min(1).max(256);
const unixTimestamp = z
  .string()
  .regex(/^\d{1,13}$/)
  .refine(
    (value) => Number(value) <= 8_640_000_000_000,
    "Timestamp fora do intervalo suportado.",
  );

const metadataSchema = z
  .object({
    display_phone_number: z.string().min(1).max(32),
    phone_number_id: boundedIdentifier,
  })
  .passthrough();

const contactSchema = z
  .object({
    wa_id: boundedIdentifier,
    profile: z
      .object({
        name: z.string().min(1).max(256),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const messageSchema = z
  .object({
    id: boundedIdentifier,
    from: boundedIdentifier,
    timestamp: unixTimestamp,
    type: z.string().min(1).max(64),
    text: z
      .object({
        body: z.string().min(1).max(4_096),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .superRefine((message, context) => {
    if (message.type === "text" && !message.text) {
      context.addIssue({
        code: "custom",
        message: "Mensagem de texto sem text.body.",
        path: ["text"],
      });
    }
  });

const statusSchema = z
  .object({
    id: boundedIdentifier,
    status: z.string().min(1).max(64),
    timestamp: unixTimestamp,
    recipient_id: boundedIdentifier,
  })
  .passthrough();

const webhookValueSchema = z
  .object({
    messaging_product: z.literal("whatsapp"),
    metadata: metadataSchema,
    contacts: z.array(contactSchema).max(100).optional(),
    messages: z.array(messageSchema).max(100).optional(),
    statuses: z.array(statusSchema).max(100).optional(),
  })
  .passthrough();

const webhookChangeSchema = z
  .object({
    field: z.literal("messages"),
    value: webhookValueSchema,
  })
  .passthrough();

const webhookEntrySchema = z
  .object({
    id: boundedIdentifier,
    changes: z.array(webhookChangeSchema).min(1).max(100),
  })
  .passthrough();

export const whatsappWebhookPayloadSchema = z
  .object({
    object: z.literal("whatsapp_business_account"),
    entry: z.array(webhookEntrySchema).min(1).max(100),
  })
  .passthrough();

export type WhatsAppWebhookPayload = z.infer<
  typeof whatsappWebhookPayloadSchema
>;

export interface WhatsAppWebhookTextMessage {
  messageId: string;
  receivedAt: Date;
  text: string;
  waId: string;
}

export function extractWhatsAppWebhookMessages(
  payload: WhatsAppWebhookPayload,
) {
  const textMessages: WhatsAppWebhookTextMessage[] = [];
  let statusCount = 0;
  let unsupportedMessageCount = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      statusCount += change.value.statuses?.length ?? 0;

      for (const message of change.value.messages ?? []) {
        if (message.type !== "text") {
          unsupportedMessageCount += 1;
          continue;
        }

        textMessages.push({
          messageId: message.id,
          receivedAt: timestampToDate(message.timestamp),
          text: message.text?.body ?? "",
          waId: message.from,
        });
      }
    }
  }

  return {
    statusCount,
    textMessages,
    unsupportedMessageCount,
  };
}

function timestampToDate(timestamp: string) {
  const milliseconds = Number(timestamp) * 1_000;

  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error("Timestamp de webhook inválido.");
  }

  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Timestamp de webhook inválido.");
  }

  return date;
}
