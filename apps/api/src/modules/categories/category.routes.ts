import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  listCategoriesController,
  updateCategoryController,
} from "./category.controller.js";

export const categoryRoutes = Router();

categoryRoutes.use(authMiddleware);

categoryRoutes.post(
  "/",
  createCategoryController,
);

categoryRoutes.get(
  "/",
  listCategoriesController,
);

categoryRoutes.get(
  "/:id",
  getCategoryController,
);

categoryRoutes.patch(
  "/:id",
  updateCategoryController,
);

categoryRoutes.delete(
  "/:id",
  deleteCategoryController,
);