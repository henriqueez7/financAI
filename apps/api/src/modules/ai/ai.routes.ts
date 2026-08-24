import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { analyzeWithAiController } from "./ai.controller.js";
import { aiRateLimitMiddleware } from "./ai.rate-limit.js";

export const aiRoutes = Router();

aiRoutes.use(authMiddleware);
aiRoutes.use(aiRateLimitMiddleware);
aiRoutes.post("/analyze", analyzeWithAiController);
