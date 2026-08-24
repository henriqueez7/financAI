import cors from "cors";
import express, {
  type ErrorRequestHandler,
} from "express";
import helmet from "helmet";

import { resolveFrontendOrigin } from "./config/production.config.js";
import { configureTrustProxy } from "./config/trust-proxy.js";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { categoryRoutes } from "./modules/categories/category.routes.js";
import { accountRoutes } from "./modules/accounts/account.routes.js";
import { entryRoutes } from "./modules/entries/entry.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { budgetRoutes } from "./modules/budgets/budget.routes.js";
import { goalRoutes } from "./modules/goals/goal.routes.js";
import { reportRoutes } from "./modules/reports/report.routes.js";
import { insightRoutes } from "./modules/insights/insight.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";

export const app = express();

configureTrustProxy(app);

const isProduction =
  process.env.NODE_ENV === "production";

app.use(
  helmet({
    strictTransportSecurity: false,
  }),
);

app.use((request, response, next) => {
  if (
    isProduction &&
    request.secure &&
    !isLoopbackHostname(request.hostname)
  ) {
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  response.setHeader(
    "Cache-Control",
    "no-store, private, max-age=0, must-revalidate",
  );
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.setHeader("Surrogate-Control", "no-store");
  next();
});

app.use(
  cors({
    origin: resolveFrontendOrigin(),
  }),
);

app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "finance-ai-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/database", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao consultar o banco:", error);

    response.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/accounts", accountRoutes);
app.use("/entries", entryRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/budgets", budgetRoutes);
app.use("/goals", goalRoutes);
app.use("/reports", reportRoutes);
app.use("/insights", insightRoutes);
app.use("/ai", aiRoutes);

const safeErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const isInvalidJson =
    error instanceof SyntaxError &&
    "body" in error;

  if (isInvalidJson) {
    response.status(400).json({
      message: "JSON inválido.",
    });
    return;
  }

  const errorStatus =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : null;

  if (errorStatus === 413) {
    response.status(413).json({
      message: "Corpo da requisição excede o limite permitido.",
    });
    return;
  }

  console.error("[http] unhandled_error", {
    errorName:
      error instanceof Error
        ? error.name
        : "UnknownError",
  });

  response.status(500).json({
    message: "Erro interno do servidor.",
  });
};

app.use(safeErrorHandler);

function isLoopbackHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(
    hostname.toLowerCase(),
  );
}
