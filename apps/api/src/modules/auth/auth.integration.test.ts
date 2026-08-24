import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { app } from "../../app.js";
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_EXPIRES_IN_SECONDS,
  JWT_ISSUER,
  requireJwtSecret,
} from "../../config/auth.config.js";
import { prisma } from "../../lib/prisma.js";
import { resetAuthRateLimitsForTests } from "./auth.rate-limit.js";

let server: Server;
let baseUrl = "";

const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;
const email = `auth-rate-limit-${suffix}@example.com`;
const password = "FinanceAI123!";
let userId = "";

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(
      0,
      "127.0.0.1",
      () => resolve(listener),
    );
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const response = await postJson("/auth/register", {
    name: "Auth Rate Limit",
    email,
    password,
  });

  assert.equal(response.status, 201);

  const payload = (await response.json()) as {
    user: { id: string };
  };
  userId = payload.user.id;
  resetAuthRateLimitsForTests();
});

beforeEach(() => {
  resetAuthRateLimitsForTests();
});

after(async () => {
  resetAuthRateLimitsForTests();

  await prisma.user.deleteMany({
    where: { email },
  });

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await prisma.$disconnect();
});

test("login usa a mesma mensagem para usuário ausente e senha incorreta", async () => {
  const missingUserResponse = await postJson("/auth/login", {
    email: `missing-${suffix}@example.com`,
    password,
  });
  const wrongPasswordResponse = await postJson("/auth/login", {
    email,
    password: "SenhaIncorreta123!",
  });

  assert.equal(missingUserResponse.status, 401);
  assert.equal(wrongPasswordResponse.status, 401);

  const missingUserPayload = await readMessage(
    missingUserResponse,
  );
  const wrongPasswordPayload = await readMessage(
    wrongPasswordResponse,
  );

  assert.equal(
    missingUserPayload.message,
    wrongPasswordPayload.message,
  );
  assert.equal(
    missingUserPayload.message,
    "E-mail ou senha inválidos.",
  );
});

test("login emite HS256 com subject, issuer, audience e expiração de 24 horas", async () => {
  const response = await postJson("/auth/login", {
    email,
    password,
  });

  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    token: string;
  };
  const completeToken = jwt.decode(payload.token, {
    complete: true,
  });

  assert.ok(completeToken);
  assert.equal(
    completeToken.header.alg,
    JWT_ALGORITHM,
  );

  const decoded = jwt.verify(
    payload.token,
    requireJwtSecret(),
    {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  ) as JwtPayload;

  assert.equal(decoded.sub, userId);
  assert.equal(decoded.iss, JWT_ISSUER);
  assert.equal(decoded.aud, JWT_AUDIENCE);
  assert.ok(decoded.iat);
  assert.ok(decoded.exp);
  assert.equal(
    decoded.exp - decoded.iat,
    JWT_EXPIRES_IN_SECONDS,
  );
});

test("sessão válida acessa /auth/me", async () => {
  const loginResponse = await postJson(
    "/auth/login",
    {
      email,
      password,
    },
  );
  const loginPayload = (await loginResponse.json()) as {
    token: string;
  };

  const response = await getJson(
    "/auth/me",
    loginPayload.token,
  );

  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    user: { id: string; email: string };
  };

  assert.equal(payload.user.id, userId);
  assert.equal(payload.user.email, email);
});

test("tokens ausente, malformado, expirado ou com audience incorreta usam erro uniforme", async () => {
  const jwtSecret = requireJwtSecret();
  const invalidTokens = [
    undefined,
    "malformed-token",
    jwt.sign({}, jwtSecret, {
      algorithm: JWT_ALGORITHM,
      subject: userId,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: -1,
    }),
    jwt.sign({}, jwtSecret, {
      algorithm: JWT_ALGORITHM,
      subject: userId,
      issuer: JWT_ISSUER,
      audience: "another-client",
      expiresIn: 60,
    }),
  ];

  for (const token of invalidTokens) {
    const response = await getJson(
      "/auth/me",
      token,
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await readMessage(response), {
      message: "Sessão inválida ou expirada.",
    });
  }
});

test("API evita cache privado, preserva headers e não envia HSTS no ambiente local", async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: {
      Origin: "http://localhost:3000",
    },
  });

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("Cache-Control") ?? "",
    /no-store/,
  );
  assert.equal(
    response.headers.get("Surrogate-Control"),
    "no-store",
  );
  assert.equal(
    response.headers.get("X-Content-Type-Options"),
    "nosniff",
  );
  assert.equal(
    response.headers.get("Strict-Transport-Security"),
    null,
  );
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:3000",
  );
  assert.equal(
    response.headers.get(
      "Access-Control-Allow-Credentials",
    ),
    null,
  );
});

test("POST /auth/login retorna 429 após dez tentativas por IP", async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await postJson("/auth/login", {
      email: `missing-${suffix}@example.com`,
      password,
    });

    assert.equal(response.status, 401);
  }

  const blockedResponse = await postJson("/auth/login", {
    email: `another-${suffix}@example.com`,
    password,
  });

  assert.equal(blockedResponse.status, 429);
  assert.ok(blockedResponse.headers.get("Retry-After"));

  const payload = await readMessage(blockedResponse);

  assert.equal(
    payload.message,
    "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  );
  assert.doesNotMatch(
    payload.message,
    /e-mail existe|tentativas restantes|contador/i,
  );
});

test("POST /auth/register retorna 429 após cinco tentativas por IP", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await postJson("/auth/register", {});
    assert.equal(response.status, 400);
  }

  const blockedResponse = await postJson(
    "/auth/register",
    {},
  );

  assert.equal(blockedResponse.status, 429);
  assert.ok(blockedResponse.headers.get("Retry-After"));

  const payload = await readMessage(blockedResponse);

  assert.equal(
    payload.message,
    "Muitas tentativas de cadastro. Aguarde e tente novamente mais tarde.",
  );
});

function postJson(path: string, body: object) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function getJson(path: string, token?: string) {
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${baseUrl}${path}`, {
    headers,
  });
}

async function readMessage(response: Response) {
  return response.json() as Promise<{ message: string }>;
}
