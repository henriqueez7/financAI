import type {
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

import {
  createEntrySchema,
  listEntriesQuerySchema,
  updateEntrySchema,
} from "./entry.schema.js";

import {
  AccountNotFoundError,
  CategoryNotFoundError,
  CategoryTypeMismatchError,
  EntryNotFoundError,
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  updateEntry,
} from "./entry.service.js";

interface EntryRouteParams {
  id: string;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createEntryController(
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

    const input = createEntrySchema.parse(
      request.body,
    );

    const entry = await createEntry({
      userId,
      input,
    });

    return response.status(201).json({
      message:
        "Lançamento criado com sucesso.",
      entry,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (
      error instanceof AccountNotFoundError ||
      error instanceof CategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof CategoryTypeMismatchError
    ) {
      return response.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao criar lançamento:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao criar lançamento.",
    });
  }
}

export async function listEntriesController(
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

    const query =
      listEntriesQuerySchema.parse(
        request.query,
      );

    if (
      (query.month && !query.year) ||
      (!query.month && query.year)
    ) {
      return response.status(400).json({
        message:
          "Informe month e year juntos para filtrar por período.",
      });
    }

    const entries = await listEntries({
      userId,
      query,
    });

    return response.status(200).json({
      entries,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Filtros inválidos.",
        errors: formatZodError(error),
      });
    }

    console.error(
      "Erro ao listar lançamentos:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao listar lançamentos.",
    });
  }
}

export async function getEntryController(
  request: Request<EntryRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const entryId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const entry = await getEntry({
      userId,
      entryId,
    });

    return response.status(200).json({
      entry,
    });
  } catch (error) {
    if (error instanceof EntryNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao buscar lançamento:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao buscar lançamento.",
    });
  }
}

export async function updateEntryController(
  request: Request<EntryRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const entryId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const input = updateEntrySchema.parse(
      request.body,
    );

    const entry = await updateEntry({
      userId,
      entryId,
      input,
    });

    return response.status(200).json({
      message:
        "Lançamento atualizado com sucesso.",
      entry,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof EntryNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof AccountNotFoundError ||
      error instanceof CategoryNotFoundError
    ) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof CategoryTypeMismatchError
    ) {
      return response.status(400).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao atualizar lançamento:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao atualizar lançamento.",
    });
  }
}

export async function deleteEntryController(
  request: Request<EntryRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const entryId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await deleteEntry({
      userId,
      entryId,
    });

    return response.status(204).send();
  } catch (error) {
    if (error instanceof EntryNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao excluir lançamento:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao excluir lançamento.",
    });
  }
}