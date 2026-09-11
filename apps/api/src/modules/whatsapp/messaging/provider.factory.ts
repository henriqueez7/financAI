import {
  requireMetaWhatsAppConfig,
  resolveWhatsAppProviderMode,
} from "../../../config/whatsapp-meta.config.js";
import type { MessageProvider } from "./message.provider.js";
import { FakeWhatsAppProvider } from "./fake-whatsapp.provider.js";
import { MetaWhatsAppProvider } from "./meta-whatsapp.provider.js";

export function createConfiguredWhatsAppProvider(
  environment: NodeJS.ProcessEnv = process.env,
): MessageProvider {
  if (resolveWhatsAppProviderMode(environment) === "fake") {
    return new FakeWhatsAppProvider();
  }

  return new MetaWhatsAppProvider(
    requireMetaWhatsAppConfig(environment),
  );
}
