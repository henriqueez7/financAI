import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getDashboardController } from "./dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(authMiddleware);

dashboardRoutes.get("/", getDashboardController);