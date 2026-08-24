import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getReportOverviewController } from "./report.controller.js";

export const reportRoutes = Router();

reportRoutes.use(authMiddleware);

reportRoutes.get(
  "/overview",
  getReportOverviewController,
);
