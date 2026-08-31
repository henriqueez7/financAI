import { prisma } from "../../../lib/prisma.js";

import { whatsappConnectionInputSchema } from "./connection.schema.js";

export class WhatsAppConnectionNotFoundError extends Error {
  constructor() {
    super("Conexão do WhatsApp não encontrada.");
    this.name = "WhatsAppConnectionNotFoundError";
  }
}

export class WhatsAppConnectionAlreadyExistsError extends Error {
  constructor() {
    super("Não foi possível criar a conexão do WhatsApp.");
    this.name = "WhatsAppConnectionAlreadyExistsError";
  }
}

export class WhatsAppConnectionUnavailableError extends Error {
  constructor() {
    super("A conexão do WhatsApp não está disponível.");
    this.name = "WhatsAppConnectionUnavailableError";
  }
}

interface CreateWhatsAppConnectionParams {
  userId: string;
  phoneNumber: string;
  waId: string;
}

export async function createWhatsAppConnection({
  userId,
  phoneNumber,
  waId,
}: CreateWhatsAppConnectionParams) {
  const input = whatsappConnectionInputSchema.parse({
    phoneNumber,
    waId,
  });

  try {
    return await prisma.whatsAppConnection.create({
      data: {
        userId,
        phoneNumber: input.phoneNumber,
        waId: input.waId,
      },
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      throw new WhatsAppConnectionAlreadyExistsError();
    }

    throw error;
  }
}

export async function getWhatsAppConnection({
  userId,
  connectionId,
}: {
  userId: string;
  connectionId: string;
}) {
  const connection =
    await prisma.whatsAppConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

  if (!connection) {
    throw new WhatsAppConnectionNotFoundError();
  }

  return connection;
}

export async function verifyWhatsAppConnection({
  userId,
  connectionId,
  verifiedAt = new Date(),
}: {
  userId: string;
  connectionId: string;
  verifiedAt?: Date;
}) {
  const connection = await getWhatsAppConnection({
    userId,
    connectionId,
  });

  if (connection.status === "REVOKED") {
    throw new WhatsAppConnectionUnavailableError();
  }

  if (connection.status === "VERIFIED") {
    return connection;
  }

  const transition =
    await prisma.whatsAppConnection.updateMany({
      where: {
        id: connection.id,
        userId,
        status: "PENDING",
      },
      data: {
        status: "VERIFIED",
        verifiedAt,
      },
    });

  if (transition.count === 0) {
    const current = await getWhatsAppConnection({
      userId,
      connectionId,
    });

    if (current.status === "VERIFIED") {
      return current;
    }

    throw new WhatsAppConnectionUnavailableError();
  }

  return prisma.whatsAppConnection.findUniqueOrThrow({
    where: {
      id: connection.id,
    },
  });
}

export async function revokeWhatsAppConnection({
  userId,
  connectionId,
}: {
  userId: string;
  connectionId: string;
}) {
  const connection = await getWhatsAppConnection({
    userId,
    connectionId,
  });

  return prisma.whatsAppConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      status: "REVOKED",
    },
  });
}

export async function getVerifiedWhatsAppConnectionByWaId(
  waId: string,
) {
  const connection =
    await prisma.whatsAppConnection.findFirst({
      where: {
        waId,
        status: "VERIFIED",
      },
    });

  if (!connection) {
    throw new WhatsAppConnectionNotFoundError();
  }

  return connection;
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
