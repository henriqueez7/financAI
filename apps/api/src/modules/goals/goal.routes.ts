import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

import {
  addGoalContributionController,
  createGoalController,
  deleteGoalContributionController,
  deleteGoalController,
  getGoalController,
  listGoalContributionsController,
  listGoalsController,
  updateGoalController,
} from "./goal.controller.js";

export const goalRoutes = Router();

goalRoutes.use(authMiddleware);

goalRoutes.post("/", createGoalController);
goalRoutes.get("/", listGoalsController);
goalRoutes.get("/:id", getGoalController);
goalRoutes.patch("/:id", updateGoalController);
goalRoutes.delete("/:id", deleteGoalController);

goalRoutes.post(
  "/:id/contributions",
  addGoalContributionController,
);

goalRoutes.get(
  "/:id/contributions",
  listGoalContributionsController,
);

goalRoutes.delete(
  "/:id/contributions/:contributionId",
  deleteGoalContributionController,
);
