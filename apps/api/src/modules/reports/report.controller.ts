import type { Request, Response } from "express";
import { ZodError } from "zod";

import { reportQuerySchema } from "./report.schema.js";
import {
  IncompatibleReportFilterError,
  ReportAccountNotFoundError,
  ReportCategoryNotFoundError,
  getReportOverview,
} from "./report.service.js";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function getReportOverviewController(
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

    const report = await getReportOverview({
      userId,
      query,
    });

    return response.status(200).json({
      report,
    });
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
      "Erro ao carregar relatórios:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao carregar relatórios.",
    });
  }
}
