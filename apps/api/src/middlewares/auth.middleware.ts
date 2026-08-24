import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  requireJwtSecret,
} from "../config/auth.config.js";
import { prisma } from "../lib/prisma.js";

const UNAUTHORIZED_MESSAGE =
  "Sessão inválida ou expirada.";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return response.status(401).json({
        message: UNAUTHORIZED_MESSAGE,
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return response.status(401).json({
        message: UNAUTHORIZED_MESSAGE,
      });
    }

    const jwtSecret = requireJwtSecret();

    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      typeof decoded === "string" ||
      !decoded.sub ||
      typeof decoded.sub !== "string"
    ) {
      return response.status(401).json({
        message: UNAUTHORIZED_MESSAGE,
      });
    }

    const payload = decoded as JwtPayload;

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return response.status(401).json({
        message: UNAUTHORIZED_MESSAGE,
      });
    }

    request.userId = user.id;

    return next();
  } catch {
    return response.status(401).json({
      message: UNAUTHORIZED_MESSAGE,
    });
  }
}
