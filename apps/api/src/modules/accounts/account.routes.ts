import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

import {
  createAccountController,
  deleteAccountController,
  getAccountController,
  listAccountsController,
  updateAccountController,
} from "./account.controller.js";

export const accountRoutes = Router();

accountRoutes.use(authMiddleware);

accountRoutes.post(
  "/",
  createAccountController,
);

accountRoutes.get(
  "/",
  listAccountsController,
);

accountRoutes.get(
  "/:id",
  getAccountController,
);

accountRoutes.patch(
  "/:id",
  updateAccountController,
);

accountRoutes.delete(
  "/:id",
  deleteAccountController,
);