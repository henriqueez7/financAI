import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_EXPIRES_IN_SECONDS,
  JWT_ISSUER,
  requireJwtSecret,
} from "../../config/auth.config.js";
import { prisma } from "../../lib/prisma.js";
import type {
  LoginInput,
  RegisterInput,
} from "./auth.schema.js";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Já existe uma conta cadastrada com este e-mail.");
    this.name = "EmailAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha inválidos.");
    this.name = "InvalidCredentialsError";
  }
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new EmailAlreadyExistsError();
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const jwtSecret = requireJwtSecret();

  const token = jwt.sign({}, jwtSecret, {
    algorithm: JWT_ALGORITHM,
    subject: user.id,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: JWT_EXPIRES_IN_SECONDS,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  };
}
