import type {
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import {
  createGoalContributionSchema,
  createGoalSchema,
  listGoalsQuerySchema,
  updateGoalSchema,
} from "./goal.schema.js";

import {
  GoalContributionNotAllowedError,
  GoalContributionNotFoundError,
  GoalNotFoundError,
  InvalidGoalStatusError,
  addGoalContribution,
  createGoal,
  deleteGoal,
  deleteGoalContribution,
  getGoal,
  listGoalContributions,
  listGoals,
  updateGoal,
} from "./goal.service.js";

interface GoalRouteParams {
  id: string;
}

interface GoalContributionRouteParams
  extends GoalRouteParams {
  contributionId: string;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createGoalController(
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

    const input = createGoalSchema.parse(
      request.body,
    );

    const goal = await createGoal({
      userId,
      input,
    });

    return response.status(201).json({
      message: "Meta criada com sucesso.",
      goal,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof InvalidGoalStatusError) {
      return response.status(400).json({
        message: error.message,
      });
    }

    console.error("Erro ao criar meta:", error);

    return response.status(500).json({
      message: "Erro interno ao criar meta.",
    });
  }
}

export async function listGoalsController(
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

    const query = listGoalsQuerySchema.parse(
      request.query,
    );

    const goals = await listGoals({
      userId,
      query,
    });

    return response.status(200).json({
      goals,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Filtros inválidos.",
        errors: formatZodError(error),
      });
    }

    console.error("Erro ao listar metas:", error);

    return response.status(500).json({
      message: "Erro interno ao listar metas.",
    });
  }
}

export async function getGoalController(
  request: Request<GoalRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const goalId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const goal = await getGoal({
      userId,
      goalId,
    });

    return response.status(200).json({
      goal,
    });
  } catch (error) {
    if (error instanceof GoalNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error("Erro ao buscar meta:", error);

    return response.status(500).json({
      message: "Erro interno ao buscar meta.",
    });
  }
}

export async function updateGoalController(
  request: Request<GoalRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const goalId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const input = updateGoalSchema.parse(
      request.body,
    );

    const goal = await updateGoal({
      userId,
      goalId,
      input,
    });

    return response.status(200).json({
      message: "Meta atualizada com sucesso.",
      goal,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof GoalNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (error instanceof InvalidGoalStatusError) {
      return response.status(400).json({
        message: error.message,
      });
    }

    console.error("Erro ao atualizar meta:", error);

    return response.status(500).json({
      message: "Erro interno ao atualizar meta.",
    });
  }
}

export async function deleteGoalController(
  request: Request<GoalRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const goalId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await deleteGoal({
      userId,
      goalId,
    });

    return response.status(204).send();
  } catch (error) {
    if (error instanceof GoalNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error("Erro ao excluir meta:", error);

    return response.status(500).json({
      message: "Erro interno ao excluir meta.",
    });
  }
}

export async function listGoalContributionsController(
  request: Request<GoalRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const goalId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const contributions =
      await listGoalContributions({
        userId,
        goalId,
      });

    return response.status(200).json({
      contributions,
    });
  } catch (error) {
    if (error instanceof GoalNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao listar contribuições da meta:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao listar contribuições da meta.",
    });
  }
}

export async function addGoalContributionController(
  request: Request<GoalRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const goalId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const input =
      createGoalContributionSchema.parse(
        request.body,
      );

    const result = await addGoalContribution({
      userId,
      goalId,
      input,
    });

    return response.status(201).json({
      message: "Contribuição adicionada com sucesso.",
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof GoalNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof GoalContributionNotAllowedError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao adicionar contribuição à meta:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao adicionar contribuição à meta.",
    });
  }
}

export async function deleteGoalContributionController(
  request: Request<GoalContributionRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const goalId = request.params.id;
    const contributionId =
      request.params.contributionId;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await deleteGoalContribution({
      userId,
      goalId,
      contributionId,
    });

    return response.status(204).send();
  } catch (error) {
    if (
      error instanceof GoalNotFoundError ||
      error instanceof GoalContributionNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao excluir contribuição da meta:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao excluir contribuição da meta.",
    });
  }
}
