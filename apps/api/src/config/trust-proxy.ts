import type { Application } from "express";

export type TrustProxySetting =
  | false
  | number
  | string[];

export function configureTrustProxy(app: Application) {
  app.set(
    "trust proxy",
    resolveTrustProxySetting(process.env.TRUST_PROXY),
  );
}

export function resolveTrustProxySetting(
  configuredValue: string | undefined,
): TrustProxySetting {
  const value = configuredValue?.trim();

  if (!value || value === "0" || value.toLowerCase() === "false") {
    return false;
  }

  if (value.toLowerCase() === "true") {
    throw new Error(
      "TRUST_PROXY=true não é permitido. Configure IPs/CIDRs conhecidos ou um número exato de saltos.",
    );
  }

  if (/^[1-9]\d*$/.test(value)) {
    const trustedHops = Number(value);

    if (!Number.isSafeInteger(trustedHops) || trustedHops > 10) {
      throw new Error(
        "TRUST_PROXY deve informar entre 1 e 10 saltos.",
      );
    }

    return trustedHops;
  }

  const trustedProxies = value
    .split(",")
    .map((proxy) => proxy.trim())
    .filter(Boolean);

  if (
    trustedProxies.some(
      (proxy) => proxy.toLowerCase() === "true",
    )
  ) {
    throw new Error(
      "TRUST_PROXY não aceita confiança irrestrita.",
    );
  }

  if (trustedProxies.length === 0) {
    return false;
  }

  return trustedProxies;
}
