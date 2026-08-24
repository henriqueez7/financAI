import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  AiInvalidResponseError,
  AiNotConfiguredError,
  AiProviderRateLimitError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from "../../lib/ai/ai.errors.js";
import {
  IncompatibleReportFilterError,
  ReportAccountNotFoundError,
  ReportCategoryNotFoundError,
} from "../reports/report.service.js";
import { aiAnalyzeRequestSchema } from "./ai.schema.js";
import {
  generateAiAnalysis,
  UnsafeAiQuestionError,
} from "./ai.service.js";

export async function analyzeWithAiController(
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

    const input = aiAnalyzeRequestSchema.parse(
      request.body,
    );

    const result = await generateAiAnalysis({
      userId,
      input,
    });

    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos para a análise.",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
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
      error instanceof IncompatibleReportFilterError ||
      error instanceof UnsafeAiQuestionError
    ) {
      return response.status(400).json({
        message: error.message,
      });
    }

    if (error instanceof AiNotConfiguredError) {
      return response.status(503).json({
        code: "AI_NOT_CONFIGURED",
        message:
          "As análises com IA ainda não estão configuradas neste ambiente.",
      });
    }

    if (error instanceof AiProviderTimeoutError) {
      return response.status(504).json({
        code: "AI_TIMEOUT",
        message:
          "A análise demorou mais do que o esperado. Tente novamente.",
      });
    }

    if (error instanceof AiProviderRateLimitError) {
      return response.status(429).json({
        code: "AI_PROVIDER_RATE_LIMITED",
        message:
          "O serviço de IA está ocupado. Aguarde um instante e tente novamente.",
      });
    }

    if (
      error instanceof AiProviderUnavailableError ||
      error instanceof AiInvalidResponseError
    ) {
      return response.status(503).json({
        code: "AI_UNAVAILABLE",
        message:
          "Não foi possível concluir a análise agora. Seus dados continuam seguros; tente novamente depois.",
      });
    }

    console.error("[ai] analysis_failed", {
      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",
    });

    return response.status(500).json({
      code: "AI_INTERNAL_ERROR",
      message:
        "Não foi possível concluir a análise agora.",
    });
  }
}
