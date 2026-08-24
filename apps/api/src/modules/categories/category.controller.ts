import type {
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.schema.js";

import {
  CategoryAlreadyExistsError,
  CategoryHasBudgetsError,
  CategoryHasEntriesError,
  CategoryNotFoundError,
  DefaultCategoryCannotBeDeletedError,
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from "./category.service.js";

interface CategoryRouteParams {
  id: string;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createCategoryController(
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

    const input = createCategorySchema.parse(
      request.body,
    );

    const category = await createCategory({
      userId,
      input,
    });

    return response.status(201).json({
      message: "Categoria criada com sucesso.",
      category,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (
      error instanceof CategoryAlreadyExistsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao criar categoria:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao criar categoria.",
    });
  }
}

export async function listCategoriesController(
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

    const categories = await listCategories({
      userId,
    });

    return response.status(200).json({
      categories,
    });
  } catch (error) {
    console.error(
      "Erro ao listar categorias:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao listar categorias.",
    });
  }
}

export async function getCategoryController(
  request: Request<CategoryRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const categoryId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const category = await getCategory({
      userId,
      categoryId,
    });

    return response.status(200).json({
      category,
    });
  } catch (error) {
    if (
      error instanceof CategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao buscar categoria:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao buscar categoria.",
    });
  }
}

export async function updateCategoryController(
  request: Request<CategoryRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const categoryId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const input = updateCategorySchema.parse(
      request.body,
    );

    const category = await updateCategory({
      userId,
      categoryId,
      input,
    });

    return response.status(200).json({
      message:
        "Categoria atualizada com sucesso.",
      category,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (
      error instanceof CategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof CategoryAlreadyExistsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    if (
      error instanceof CategoryHasBudgetsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao atualizar categoria:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao atualizar categoria.",
    });
  }
}

export async function deleteCategoryController(
  request: Request<CategoryRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const categoryId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await deleteCategory({
      userId,
      categoryId,
    });

    return response.status(204).send();
  } catch (error) {
    if (
      error instanceof CategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof DefaultCategoryCannotBeDeletedError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    if (
      error instanceof CategoryHasEntriesError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    if (
      error instanceof CategoryHasBudgetsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao excluir categoria:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao excluir categoria.",
    });
  }
}
