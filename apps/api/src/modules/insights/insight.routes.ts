import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getFinancialInsightsController } from "./insight.controller.js";

export const insightRoutes = Router();

insightRoutes.use(authMiddleware);

insightRoutes.get(
  "/overview",
  getFinancialInsightsController,
);
