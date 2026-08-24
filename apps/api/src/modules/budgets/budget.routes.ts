import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

import {
  createBudgetController,
  deleteBudgetController,
  getBudgetController,
  listBudgetsController,
  updateBudgetController,
} from "./budget.controller.js";

export const budgetRoutes = Router();

budgetRoutes.use(authMiddleware);

budgetRoutes.post("/", createBudgetController);
budgetRoutes.get("/", listBudgetsController);
budgetRoutes.get("/:id", getBudgetController);
budgetRoutes.patch("/:id", updateBudgetController);
budgetRoutes.delete("/:id", deleteBudgetController);
