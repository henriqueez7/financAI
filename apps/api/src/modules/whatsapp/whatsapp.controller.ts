import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  getWhatsAppConnectionStatus,
  revokeWhatsAppConnectionForUser,
} from "./connections/connection.service.js";
import {
  createWhatsAppLinkChallenge,
  WhatsAppLinkAlreadyConnectedError,
} from "./linking/link.service.js";
import { createWhatsAppLinkSchema } from "./whatsapp.schema.js";

export async function createWhatsAppLinkController(
  request: Request,
  response: Response,
) {
  try {
    const userId = request.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    createWhatsAppLinkSchema.parse(request.body ?? {});

    const challenge = await createWhatsAppLinkChallenge({
      userId,
    });

    return response.status(201).json(challenge);
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
      });
    }

    if (
      error instanceof WhatsAppLinkAlreadyConnectedError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    logWhatsAppLinkFailure("challenge_creation_failed", error);

    return response.status(500).json({
      message:
        "Não foi possível iniciar a vinculação do WhatsApp.",
    });
  }
}

export async function getWhatsAppConnectionController(
  request: Request,
  response: Response,
) {
  try {
    const userId = request.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const connection = await getWhatsAppConnectionStatus({
      userId,
    });

    return response.status(200).json(connection);
  } catch (error) {
    logWhatsAppLinkFailure("connection_status_failed", error);

    return response.status(500).json({
      message:
        "Não foi possível consultar a conexão do WhatsApp.",
    });
  }
}

export async function revokeWhatsAppConnectionController(
  request: Request,
  response: Response,
) {
  try {
    const userId = request.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await revokeWhatsAppConnectionForUser({ userId });

    return response.status(204).send();
  } catch (error) {
    logWhatsAppLinkFailure("connection_revocation_failed", error);

    return response.status(500).json({
      message:
        "Não foi possível desconectar o WhatsApp.",
    });
  }
}

function logWhatsAppLinkFailure(
  event: string,
  error: unknown,
) {
  console.error(`[whatsapp-link] ${event}`, {
    errorName:
      error instanceof Error
        ? error.name
        : "UnknownError",
  });
}
