export const DEFAULT_WHATSAPP_GRAPH_API_VERSION =
  "v26.0";
export const DEFAULT_WHATSAPP_HTTP_TIMEOUT_MS = 10_000;

export type WhatsAppProviderMode = "fake" | "meta";

export interface MetaWhatsAppConfig {
  accessToken: string;
  appSecret: string;
  graphApiVersion: string;
  phoneNumberId: string;
  verifyToken: string;
}

export function resolveWhatsAppProviderMode(
  environment: NodeJS.ProcessEnv = process.env,
): WhatsAppProviderMode {
  const configuredMode =
    environment.WHATSAPP_PROVIDER?.trim().toLowerCase();

  if (!configuredMode) {
    return "fake";
  }

  if (
    configuredMode !== "fake" &&
    configuredMode !== "meta"
  ) {
    throw new Error(
      "WHATSAPP_PROVIDER deve ser fake ou meta.",
    );
  }

  return configuredMode;
}

export function requireWhatsAppVerifyToken(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return requireSecret(
    environment.WHATSAPP_VERIFY_TOKEN,
    "WHATSAPP_VERIFY_TOKEN",
  );
}

export function requireWhatsAppAppSecret(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return requireSecret(
    environment.WHATSAPP_APP_SECRET,
    "WHATSAPP_APP_SECRET",
  );
}

export function requireMetaWhatsAppConfig(
  environment: NodeJS.ProcessEnv = process.env,
): MetaWhatsAppConfig {
  const accessToken = requireSecret(
    environment.WHATSAPP_ACCESS_TOKEN,
    "WHATSAPP_ACCESS_TOKEN",
  );
  const appSecret = requireWhatsAppAppSecret(environment);
  const phoneNumberId = requireSecret(
    environment.WHATSAPP_PHONE_NUMBER_ID,
    "WHATSAPP_PHONE_NUMBER_ID",
  );
  const verifyToken = requireWhatsAppVerifyToken(environment);
  const graphApiVersion = requireSecret(
    environment.WHATSAPP_GRAPH_API_VERSION,
    "WHATSAPP_GRAPH_API_VERSION",
  );

  if (!/^\d+$/.test(phoneNumberId)) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID deve conter somente dígitos.",
    );
  }

  if (!/^v[1-9]\d*\.\d+$/.test(graphApiVersion)) {
    throw new Error(
      "WHATSAPP_GRAPH_API_VERSION deve usar o formato vN.N.",
    );
  }

  return {
    accessToken,
    appSecret,
    graphApiVersion,
    phoneNumberId,
    verifyToken,
  };
}

export function validateMetaWhatsAppProductionConfig(
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (resolveWhatsAppProviderMode(environment) !== "meta") {
    throw new Error(
      "WHATSAPP_PROVIDER deve ser meta em produção.",
    );
  }

  const config = requireMetaWhatsAppConfig(environment);

  if (config.appSecret.length < 32) {
    throw new Error(
      "WHATSAPP_APP_SECRET deve ter pelo menos 32 caracteres em produção.",
    );
  }

  if (config.verifyToken.length < 32) {
    throw new Error(
      "WHATSAPP_VERIFY_TOKEN deve ter pelo menos 32 caracteres em produção.",
    );
  }

  if (config.accessToken.length < 20) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN está inválido para produção.",
    );
  }

  return config;
}

function requireSecret(
  value: string | undefined,
  name: string,
) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} é obrigatória.`);
  }

  return normalized;
}
