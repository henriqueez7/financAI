import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";

import {
  createEntryController,
  deleteEntryController,
  getEntryController,
  listEntriesController,
  updateEntryController,
} from "./entry.controller.js";

export const entryRoutes = Router();

entryRoutes.use(authMiddleware);

entryRoutes.post(
  "/",
  createEntryController,
);

entryRoutes.get(
  "/",
  listEntriesController,
);

entryRoutes.get(
  "/:id",
  getEntryController,
);

entryRoutes.patch(
  "/:id",
  updateEntryController,
);

entryRoutes.delete(
  "/:id",
  deleteEntryController,
);