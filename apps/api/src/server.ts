import "dotenv/config";

import { app } from "./app.js";
import { validateProductionConfig } from "./config/production.config.js";

const port = resolvePort();

validateProductionConfig();

app.listen(port, () => {
  console.log(`🚀 Finance AI API executando em http://localhost:${port}`);
});

function resolvePort() {
  const configuredPort = Number(process.env.PORT ?? 3333);

  if (
    !Number.isInteger(configuredPort) ||
    configuredPort < 1 ||
    configuredPort > 65_535
  ) {
    throw new Error("A variável PORT deve ser uma porta TCP válida.");
  }

  return configuredPort;
}
