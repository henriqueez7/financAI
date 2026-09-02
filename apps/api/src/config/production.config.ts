import { requireWhatsAppLinkSecret } from "./whatsapp-link.config.js";

const DEVELOPMENT_FRONTEND_ORIGIN =
  "http://localhost:3000";

export function resolveFrontendOrigin(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const configuredUrl =
    environment.FRONTEND_URL?.trim();

  if (!configuredUrl) {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "FRONTEND_URL é obrigatória em produção.",
      );
    }

    return DEVELOPMENT_FRONTEND_ORIGIN;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error(
      "FRONTEND_URL deve ser uma URL absoluta válida.",
    );
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "FRONTEND_URL deve usar o protocolo HTTP ou HTTPS.",
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      "FRONTEND_URL deve conter somente a origem do frontend.",
    );
  }

  if (environment.NODE_ENV === "production") {
    if (parsedUrl.protocol !== "https:") {
      throw new Error(
        "FRONTEND_URL deve usar HTTPS em produção.",
      );
    }

    if (isLoopbackHostname(parsedUrl.hostname)) {
      throw new Error(
        "FRONTEND_URL não pode apontar para localhost em produção.",
      );
    }
  }

  return parsedUrl.origin;
}

export function validateProductionConfig(
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  const jwtSecret = environment.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET deve ter pelo menos 32 caracteres em produção.",
    );
  }

  const whatsappLinkSecret =
    requireWhatsAppLinkSecret(environment);

  if (whatsappLinkSecret === jwtSecret) {
    throw new Error(
      "WHATSAPP_LINK_SECRET deve ser diferente de JWT_SECRET.",
    );
  }

  resolveFrontendOrigin(environment);
}

function isLoopbackHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    hostname.toLowerCase(),
  );
}
