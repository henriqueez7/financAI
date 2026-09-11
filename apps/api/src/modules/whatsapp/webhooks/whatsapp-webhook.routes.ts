import express, { Router } from "express";

import {
  requireWhatsAppAppSecret,
  requireWhatsAppVerifyToken,
} from "../../../config/whatsapp-meta.config.js";
import type { MessageProvider } from "../messaging/message.provider.js";
import { createConfiguredWhatsAppProvider } from "../messaging/provider.factory.js";
import {
  receiveWhatsAppWebhookController,
  verifyWhatsAppWebhookController,
} from "./whatsapp-webhook.controller.js";
import {
  WhatsAppWebhookService,
  type WhatsAppWebhookProcessor,
} from "./whatsapp-webhook.service.js";

interface WhatsAppWebhookRoutesOptions {
  appSecret?: string;
  messageProvider?: MessageProvider;
  processor?: WhatsAppWebhookProcessor;
  verifyToken?: string;
}

export function createWhatsAppWebhookRoutes(
  options: WhatsAppWebhookRoutesOptions = {},
) {
  const routes = Router();
  let runtimeProvider: MessageProvider | undefined;
  let runtimeProcessor: WhatsAppWebhookProcessor | undefined;

  const getProvider = () => {
    runtimeProvider ??=
      options.messageProvider ??
      createConfiguredWhatsAppProvider();
    return runtimeProvider;
  };
  const getProcessor = () => {
    runtimeProcessor ??=
      options.processor ??
      new WhatsAppWebhookService(getProvider());
    return runtimeProcessor;
  };

  routes.get("/", (request, response) => {
    try {
      return verifyWhatsAppWebhookController(
        request,
        response,
        options.verifyToken ??
          requireWhatsAppVerifyToken(),
      );
    } catch (error) {
      logConfigurationFailure(error);
      return response.status(503).json({
        message: "Webhook não configurado.",
      });
    }
  });

  routes.post(
    "/",
    express.raw({
      type: "application/json",
      limit: "256kb",
    }),
    async (request, response) => {
      try {
        return await receiveWhatsAppWebhookController(
          request,
          response,
          {
            appSecret:
              options.appSecret ??
              requireWhatsAppAppSecret(),
            getProcessor,
          },
        );
      } catch (error) {
        logConfigurationFailure(error);
        return response.status(503).json({
          message: "Webhook não configurado.",
        });
      }
    },
  );

  return routes;
}

export const whatsappWebhookRoutes =
  createWhatsAppWebhookRoutes();

function logConfigurationFailure(error: unknown) {
  console.error("[whatsapp-webhook] configuration_error", {
    errorName:
      error instanceof Error ? error.name : "UnknownError",
  });
}
