import type { Request, Response } from "express";
import { ZodError } from "zod";

import { prisma } from "../../lib/prisma.js";
import {
  loginSchema,
  registerSchema,
} from "./auth.schema.js";

import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  loginUser,
  registerUser,
} from "./auth.service.js";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function registerController(
  request: Request,
  response: Response,
) {
  try {
    const input = registerSchema.parse(request.body);
    const user = await registerUser(input);

    return response.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof EmailAlreadyExistsError) {
      return response.status(409).json({
        message: error.message,
      });
    }

    console.error("Erro ao cadastrar usuário:", error);

    return response.status(500).json({
      message: "Erro interno ao cadastrar usuário.",
    });
  }
}

export async function loginController(
  request: Request,
  response: Response,
) {
  try {
    const input = loginSchema.parse(request.body);
    const result = await loginUser(input);

    return response.status(200).json({
      message: "Login realizado com sucesso.",
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        message: "Dados inválidos.",
        errors: formatZodError(error),
      });
    }

    if (error instanceof InvalidCredentialsError) {
      return response.status(401).json({
        message: error.message,
      });
    }

    console.error("Erro ao realizar login:", error);

    return response.status(500).json({
      message: "Erro interno ao realizar login.",
    });
  }
}

export async function meController(
  request: Request,
  response: Response,
) {
  const userId = request.userId;

  if (!userId) {
    return response.status(401).json({
      message: "Usuário não autenticado.",
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return response.status(404).json({
      message: "Usuário não encontrado.",
    });
  }

  return response.status(200).json({
    user,
  });
}