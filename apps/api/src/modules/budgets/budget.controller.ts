import type {
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import {
  createBudgetSchema,
  listBudgetsQuerySchema,
  updateBudgetSchema,
} from "./budget.schema.js";

import {
  BudgetAlreadyExistsError,
  BudgetNotFoundError,
  CategoryNotFoundError,
  InvalidBudgetCategoryError,
  createBudget,
  deleteBudget,
  getBudget,
  listBudgets,
  updateBudget,
} from "./budget.service.js";

interface BudgetRouteParams {
  id: string;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createBudgetController(
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

    const input = createBudgetSchema.parse(
      request.body,
    );

    const budget = await createBudget({
      userId,
      input,
    });

    return response.status(201).json({
      message: "Orçamento criado com sucesso.",
      budget,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof CategoryNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof InvalidBudgetCategoryError
    ) {
      return response.status(400).json({
        message: error.message,
      });
    }

    if (
      error instanceof BudgetAlreadyExistsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error("Erro ao criar orçamento:", error);

    return response.status(500).json({
      message: "Erro interno ao criar orçamento.",
    });
  }
}

export async function listBudgetsController(
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

    const query = listBudgetsQuerySchema.parse(
      request.query,
    );

    const budgets = await listBudgets({
      userId,
      query,
    });

    return response.status(200).json({
      budgets,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Filtros inválidos.",
        errors: formatZodError(error),
      });
    }

    console.error("Erro ao listar orçamentos:", error);

    return response.status(500).json({
      message: "Erro interno ao listar orçamentos.",
    });
  }
}

export async function getBudgetController(
  request: Request<BudgetRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const budgetId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const budget = await getBudget({
      userId,
      budgetId,
    });

    return response.status(200).json({
      budget,
    });
  } catch (error) {
    if (error instanceof BudgetNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error("Erro ao buscar orçamento:", error);

    return response.status(500).json({
      message: "Erro interno ao buscar orçamento.",
    });
  }
}

export async function updateBudgetController(
  request: Request<BudgetRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const budgetId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const input = updateBudgetSchema.parse(
      request.body,
    );

    const budget = await updateBudget({
      userId,
      budgetId,
      input,
    });

    return response.status(200).json({
      message: "Orçamento atualizado com sucesso.",
      budget,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (
      error instanceof BudgetNotFoundError ||
      error instanceof CategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof InvalidBudgetCategoryError
    ) {
      return response.status(400).json({
        message: error.message,
      });
    }

    if (
      error instanceof BudgetAlreadyExistsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error("Erro ao atualizar orçamento:", error);

    return response.status(500).json({
      message: "Erro interno ao atualizar orçamento.",
    });
  }
}

export async function deleteBudgetController(
  request: Request<BudgetRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const budgetId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await deleteBudget({
      userId,
      budgetId,
    });

    return response.status(204).send();
  } catch (error) {
    if (error instanceof BudgetNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error("Erro ao excluir orçamento:", error);

    return response.status(500).json({
      message: "Erro interno ao excluir orçamento.",
    });
  }
}
