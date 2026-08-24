export const JWT_ALGORITHM = "HS256" as const;
export const JWT_ISSUER = "finance-ai-api";
export const JWT_AUDIENCE = "finance-ai-web";
export const JWT_EXPIRES_IN_SECONDS = 24 * 60 * 60;

export function requireJwtSecret(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const jwtSecret = environment.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "A variável JWT_SECRET não foi definida.",
    );
  }

  return jwtSecret;
}
