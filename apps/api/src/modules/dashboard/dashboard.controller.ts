import type { Request, Response } from "express";

import { getDashboard } from "./dashboard.service.js";

export async function getDashboardController(
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

    const dashboard = await getDashboard({
      userId,
    });

    return response.status(200).json({
      dashboard,
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);

    return response.status(500).json({
      message: "Erro interno ao carregar dashboard.",
    });
  }
}