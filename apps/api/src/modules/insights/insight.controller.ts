import type { Request, Response } from "express";
import { ZodError } from "zod";

import { reportQuerySchema } from "../reports/report.schema.js";
import {
  IncompatibleReportFilterError,
  ReportAccountNotFoundError,
  ReportCategoryNotFoundError,
} from "../reports/report.service.js";
import { getFinancialInsights } from "./insight.service.js";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function getFinancialInsightsController(
  request: Request,
  response: Response,
) {
  try {
    const userId = request.userId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const query = reportQuerySchema.parse(
      request.query,
    );

    const overview = await getFinancialInsights({
      userId,
      query,
    });

    return response.status(200).json(overview);
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Filtros inválidos.",
        errors: formatZodError(error),
      });
    }

    if (
      error instanceof ReportAccountNotFoundError ||
      error instanceof ReportCategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof IncompatibleReportFilterError
    ) {
      return response.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao carregar insights financeiros:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao carregar insights financeiros.",
    });
  }
}
