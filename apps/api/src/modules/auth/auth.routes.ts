import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  loginController,
  meController,
  registerController,
} from "./auth.controller.js";
import {
  loginRateLimitMiddleware,
  registerRateLimitMiddleware,
} from "./auth.rate-limit.js";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  registerRateLimitMiddleware,
  registerController,
);
authRoutes.post(
  "/login",
  loginRateLimitMiddleware,
  loginController,
);
authRoutes.get("/me", authMiddleware, meController);
