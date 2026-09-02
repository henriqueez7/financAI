import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  createWhatsAppLinkController,
  getWhatsAppConnectionController,
  revokeWhatsAppConnectionController,
} from "./whatsapp.controller.js";
import { whatsappLinkGenerationRateLimitMiddleware } from "./linking/link.rate-limit.js";

export const whatsappRoutes = Router();

whatsappRoutes.use(authMiddleware);

whatsappRoutes.post(
  "/link",
  whatsappLinkGenerationRateLimitMiddleware,
  createWhatsAppLinkController,
);
whatsappRoutes.get(
  "/connection",
  getWhatsAppConnectionController,
);
whatsappRoutes.delete(
  "/connection",
  revokeWhatsAppConnectionController,
);
