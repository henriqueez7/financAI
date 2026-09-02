export const WHATSAPP_LINK_SECRET_MIN_LENGTH = 32;

export function requireWhatsAppLinkSecret(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const secret = environment.WHATSAPP_LINK_SECRET;

  if (
    !secret ||
    secret.length < WHATSAPP_LINK_SECRET_MIN_LENGTH
  ) {
    throw new Error(
      "WHATSAPP_LINK_SECRET deve ter pelo menos 32 caracteres.",
    );
  }

  return secret;
}
