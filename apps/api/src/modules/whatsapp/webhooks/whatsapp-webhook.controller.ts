import type { Request, Response } from "express";

import {
  whatsappWebhookPayloadSchema,
} from "./whatsapp-webhook.schema.js";

import {
  verifyWhatsAppWebhookSignature,
} from "./whatsapp-webhook.signature.js";

import type {
  WhatsAppWebhookProcessor,
} from "./whatsapp-webhook.service.js";

export function verifyWhatsAppWebhookController(
  request: Request,
  response: Response,
  verifyToken: string,
) {
  const mode = readQueryValue(request, "hub.mode");
  const token = readQueryValue(
    request,
    "hub.verify_token",
  );
  const challenge = readQueryValue(
    request,
    "hub.challenge",
  );

  if (
    mode !== "subscribe" ||
    token !== verifyToken ||
    !challenge
  ) {
    return response.status(403).send("Forbidden");
  }

  return response
    .status(200)
    .type("text/plain")
    .send(challenge);
}

export async function receiveWhatsAppWebhookController(
  request: Request,
  response: Response,
  {
    appSecret,
    getProcessor,
  }: {
    appSecret: string;
    getProcessor: () => WhatsAppWebhookProcessor;
  },
) {
  if (!Buffer.isBuffer(request.body)) {
    return response.status(400).json({
      message: "Corpo bruto do webhook ausente.",
    });
  }

  const signature = request.get("x-hub-signature-256");

  const isAuthentic = verifyWhatsAppWebhookSignature({
    appSecret,
    rawBody: request.body,
    signature,
  });

  if (!isAuthentic) {
    console.warn("[whatsapp-webhook] invalid_signature");

    return response.status(401).json({
      message: "Assinatura inválida.",
    });
  }

  let decodedPayload: unknown;

  try {
    decodedPayload = JSON.parse(
      request.body.toString("utf8"),
    );
  } catch {
    return response.status(400).json({
      message: "Payload inválido.",
    });
  }

  const payload = whatsappWebhookPayloadSchema.safeParse(
    decodedPayload,
  );

  if (!payload.success) {
    return response.status(400).json({
      message: "Payload inválido.",
    });
  }

  try {
    const result = await getProcessor().process(
      payload.data,
    );

    if (result.duplicateCount > 0) {
      console.info(
        "[whatsapp-webhook] duplicate_ignored",
        {
          count: result.duplicateCount,
        },
      );
    }

    if (result.processedCount > 0) {
      console.info(
        "[whatsapp-webhook] message_processed",
        {
          count: result.processedCount,
        },
      );
    }

    return response.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "[whatsapp-webhook] processing_failed",
      {
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",

        errorCode:
          typeof error === "object" &&
          error !== null &&
          "code" in error
            ? error.code
            : undefined,

        statusCode:
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? error.statusCode
            : undefined,
      },
    );

    return response.status(500).json({
      message:
        "Não foi possível processar o webhook.",
    });
  }
}

function readQueryValue(
  request: Request,
  key: string,
) {
  const value = request.query[key];

  return typeof value === "string"
    ? value
    : null;
}