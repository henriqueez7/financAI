const DEVELOPMENT_API_URL =
  "http://localhost:3333";

interface PublicApiEnvironment {
  NODE_ENV?: string;
  NEXT_PUBLIC_API_URL?: string;
}

export function resolvePublicApiUrl(
  environment: PublicApiEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL,
  },
) {
  const configuredUrl =
    environment.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_API_URL é obrigatória no build de produção.",
      );
    }

    return DEVELOPMENT_API_URL;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL deve ser uma URL absoluta válida.",
    );
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL deve usar o protocolo HTTP ou HTTPS.",
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL não pode conter credenciais, query ou fragmento.",
    );
  }

  if (environment.NODE_ENV === "production") {
    if (parsedUrl.protocol !== "https:") {
      throw new Error(
        "NEXT_PUBLIC_API_URL deve usar HTTPS em produção.",
      );
    }

    if (isLoopbackHostname(parsedUrl.hostname)) {
      throw new Error(
        "NEXT_PUBLIC_API_URL não pode apontar para localhost em produção.",
      );
    }
  }

  return parsedUrl.toString().replace(/\/+$/, "");
}

function isLoopbackHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    hostname.toLowerCase(),
  );
}
