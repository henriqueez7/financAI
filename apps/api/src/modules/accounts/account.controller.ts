import type {
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

import {
  createAccountSchema,
  updateAccountSchema,
} from "./account.schema.js";

import {
  AccountAlreadyExistsError,
  AccountHasEntriesError,
  AccountNotFoundError,
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  updateAccount,
} from "./account.service.js";

interface AccountRouteParams {
  id: string;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function createAccountController(
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

    const input = createAccountSchema.parse(
      request.body,
    );

    const account = await createAccount({
      userId,
      input,
    });

    return response.status(201).json({
      message: "Conta criada com sucesso.",
      account,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (
      error instanceof AccountAlreadyExistsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error("Erro ao criar conta:", error);

    return response.status(500).json({
      message: "Erro interno ao criar conta.",
    });
  }
}

export async function listAccountsController(
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

    const accounts = await listAccounts({
      userId,
    });

    return response.status(200).json({
      accounts,
    });
  } catch (error) {
    console.error(
      "Erro ao listar contas:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao listar contas.",
    });
  }
}

export async function getAccountController(
  request: Request<AccountRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const accountId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const account = await getAccount({
      userId,
      accountId,
    });

    return response.status(200).json({
      account,
    });
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao buscar conta:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao buscar conta.",
    });
  }
}

export async function updateAccountController(
  request: Request<AccountRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const accountId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const input = updateAccountSchema.parse(
      request.body,
    );

    const account = await updateAccount({
      userId,
      accountId,
      input,
    });

    return response.status(200).json({
      message:
        "Conta atualizada com sucesso.",
      account,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof AccountNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (
      error instanceof AccountAlreadyExistsError
    ) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao atualizar conta:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao atualizar conta.",
    });
  }
}

export async function deleteAccountController(
  request: Request<AccountRouteParams>,
  response: Response,
) {
  try {
    const userId = request.userId;
    const accountId = request.params.id;

    if (!userId) {
      return response.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    await deleteAccount({
      userId,
      accountId,
    });

    return response.status(204).send();
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return response.status(404).json({
        message: error.message,
      });
    }

    if (error instanceof AccountHasEntriesError) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error(
      "Erro ao excluir conta:",
      error,
    );

    return response.status(500).json({
      message:
        "Erro interno ao excluir conta.",
    });
  }
}