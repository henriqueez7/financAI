import { prisma } from "../../../lib/prisma.js";

export class WhatsAppMessageNotFoundError extends Error {
  constructor() {
    super("Mensagem do WhatsApp não encontrada.");
    this.name = "WhatsAppMessageNotFoundError";
  }
}

interface RegisterInboundMessageParams {
  messageId: string;
  connectionId: string;
  receivedAt?: Date;
}

export async function registerInboundWhatsAppMessage({
  messageId,
  connectionId,
  receivedAt = new Date(),
}: RegisterInboundMessageParams) {
  const existing =
    await prisma.whatsAppMessage.findUnique({
      where: {
        messageId,
      },
    });

  if (existing) {
    return {
      message: existing,
      isDuplicate: true,
    };
  }

  try {
    const message = await prisma.whatsAppMessage.create({
      data: {
        messageId,
        connectionId,
        direction: "INBOUND",
        type: "TEXT",
        status: "RECEIVED",
        receivedAt,
      },
    });

    return {
      message,
      isDuplicate: false,
    };
  } catch (error) {
    if (!hasPrismaErrorCode(error, "P2002")) {
      throw error;
    }

    const duplicate =
      await prisma.whatsAppMessage.findUniqueOrThrow({
        where: {
          messageId,
        },
      });

    return {
      message: duplicate,
      isDuplicate: true,
    };
  }
}

export async function markWhatsAppMessageProcessed({
  userId,
  messageId,
  processedAt = new Date(),
}: {
  userId: string;
  messageId: string;
  processedAt?: Date;
}) {
  return updateWhatsAppMessageStatus({
    userId,
    messageId,
    status: "PROCESSED",
    processedAt,
  });
}

export async function markWhatsAppMessageFailed({
  userId,
  messageId,
  processedAt = new Date(),
}: {
  userId: string;
  messageId: string;
  processedAt?: Date;
}) {
  return updateWhatsAppMessageStatus({
    userId,
    messageId,
    status: "FAILED",
    processedAt,
  });
}

async function updateWhatsAppMessageStatus({
  userId,
  messageId,
  status,
  processedAt,
}: {
  userId: string;
  messageId: string;
  status: "PROCESSED" | "FAILED";
  processedAt: Date;
}) {
  const message = await prisma.whatsAppMessage.findFirst({
    where: {
      messageId,
      connection: {
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!message) {
    throw new WhatsAppMessageNotFoundError();
  }

  return prisma.whatsAppMessage.update({
    where: {
      id: message.id,
    },
    data: {
      status,
      processedAt,
    },
  });
}

function hasPrismaErrorCode(
  error: unknown,
  code: string,
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
