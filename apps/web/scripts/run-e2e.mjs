import {
  spawn,
  spawnSync,
} from "node:child_process";

const host = "127.0.0.1";
const port = "3100";

const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    host,
    "--port",
    port,
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true,
  },
);

let testExitCode = 1;

try {
  await waitForServer(`http://${host}:${port}/login`);

  testExitCode = await runPlaywright();
} finally {
  stopProcessTree(server.pid);
}

process.exit(testExitCode);

async function waitForServer(url) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `O servidor Next encerrou com o código ${server.exitCode}.`,
      );
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // O servidor ainda está inicializando.
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 250),
    );
  }

  throw new Error(
    "O servidor Next não iniciou dentro do tempo esperado.",
  );
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const testProcess = spawn(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        windowsHide: true,
      },
    );

    testProcess.once("error", reject);
    testProcess.once("exit", (code) =>
      resolve(code ?? 1),
    );
  });
}

function stopProcessTree(processId) {
  if (!Number.isInteger(processId)) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync(
      "taskkill",
      ["/PID", String(processId), "/T", "/F"],
      {
        stdio: "ignore",
        windowsHide: true,
      },
    );
    return;
  }

  server.kill("SIGTERM");
}
