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
import jwt from "jsonwebtoken";

import { app } from "../../../app.js";
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  requireJwtSecret,
} from "../../../config/auth.config.js";
import { prisma } from "../../../lib/prisma.js";
import {
  getWhatsAppConnectionStatus,
  revokeWhatsAppConnectionForUser,
  WhatsAppConnectionNotFoundError,
} from "../connections/connection.service.js";
import { FakeWhatsAppProvider } from "../messaging/fake-whatsapp.provider.js";
import { WhatsAppService } from "../whatsapp.service.js";
import {
  hashWhatsAppLinkCode,
  hashWhatsAppLinkSelector,
  normalizeWhatsAppLinkCode,
} from "./link-code.js";
import { resetWhatsAppLinkRateLimitsForTests } from "./link.rate-limit.js";
import {
  consumeWhatsAppLinkCode,
  createWhatsAppLinkChallenge,
  WHATSAPP_LINK_CHALLENGE_TTL_MS,
  WHATSAPP_LINK_MAX_ATTEMPTS,
  WhatsAppLinkAlreadyConnectedError,
  WhatsAppLinkCodeInvalidError,
} from "./link.service.js";

const testSecret =
  "whatsapp-link-integration-secret-32-chars";
const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;
const phoneSuffix = String(Date.now()).slice(-6);
const referenceDate = new Date("2026-09-02T12:00:00.000Z");
const previousLinkSecret =
  process.env.WHATSAPP_LINK_SECRET;

let server: Server;
let baseUrl = "";
let userAId = "";
let userBId = "";
let userCId = "";
let tokenA = "";
let tokenC = "";

before(async () => {
  process.env.WHATSAPP_LINK_SECRET = testSecret;

  const users = await Promise.all(
    ["A", "B", "C"].map((label) =>
      prisma.user.create({
        data: {
          name: `WhatsApp Link ${label}`,
          email: `whatsapp-link-${label.toLowerCase()}-${suffix}@example.com`,
          passwordHash: "not-used-in-test",
        },
      }),
    ),
  );

  userAId = users[0]?.id ?? "";
  userBId = users[1]?.id ?? "";
  userCId = users[2]?.id ?? "";
  tokenA = createToken(userAId);
  tokenC = createToken(userCId);

  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(
      0,
      "127.0.0.1",
      () => resolve(listener),
    );
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  resetWhatsAppLinkRateLimitsForTests();
  await cleanFixtures();
});

after(async () => {
  resetWhatsAppLinkRateLimitsForTests();
  await cleanFixtures();
  await prisma.user.deleteMany({
    where: {
      id: { in: [userAId, userBId, userCId] },
    },
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

  restoreEnv(
    "WHATSAPP_LINK_SECRET",
    previousLinkSecret,
  );
  await prisma.$disconnect();
});

test("endpoints exigem JWT e geração rejeita mass assignment", async () => {
  for (const [path, method] of [
    ["/whatsapp/link", "POST"],
    ["/whatsapp/connection", "GET"],
    ["/whatsapp/connection", "DELETE"],
  ] as const) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers:
        method === "POST"
          ? { "Content-Type": "application/json" }
          : undefined,
      body: method === "POST" ? "{}" : undefined,
    });

    assert.equal(response.status, 401);
  }

  const response = await postLink(tokenA, {
    userId: userBId,
    waId: waId("9"),
    status: "VERIFIED",
    verifiedAt: referenceDate,
    codeHash: "forbidden",
    attempts: 0,
  });

  assert.equal(response.status, 400);
  assert.equal(
    await prisma.whatsAppLinkChallenge.count({
      where: { userId: userAId },
    }),
    0,
  );
});

test("endpoint retorna plaintext uma vez e persiste somente HMAC com TTL", async () => {
  const response = await postLink(tokenA, {});

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    code: string;
    expiresAt: string;
  };
  assert.deepEqual(Object.keys(payload).sort(), [
    "code",
    "expiresAt",
  ]);
  assert.match(
    payload.code,
    /^FIN-[2-9A-HJ-KM-NP-TV-Z]{8}-\d{6}$/,
  );

  const challenge =
    await prisma.whatsAppLinkChallenge.findFirstOrThrow({
      where: { userId: userAId },
    });
  const serialized = JSON.stringify(challenge);
  const normalized = normalizeWhatsAppLinkCode(payload.code);
  assert.ok(normalized);

  assert.equal(challenge.status, "PENDING");
  assert.equal(challenge.attempts, 0);
  assert.equal(
    challenge.maxAttempts,
    WHATSAPP_LINK_MAX_ATTEMPTS,
  );
  assert.equal(
    challenge.expiresAt.getTime() -
      challenge.createdAt.getTime(),
    WHATSAPP_LINK_CHALLENGE_TTL_MS,
  );
  assert.equal(
    challenge.codeHash,
    hashWhatsAppLinkCode(payload.code, testSecret),
  );
  assert.equal(
    challenge.lookupKey,
    hashWhatsAppLinkSelector(
      normalized.selector,
      testSecret,
    ),
  );
  assert.notEqual(
    challenge.lookupKey,
    normalized.selector,
  );
  assert.equal(serialized.includes(payload.code), false);
  assert.equal("code" in challenge, false);
  assert.doesNotMatch(serialized, /phone|waId|JWT/i);
});

test("nova challenge cancela a anterior e somente o código novo vincula", async () => {
  const first = await createChallenge(userAId, referenceDate);
  const second = await createChallenge(
    userAId,
    new Date(referenceDate.getTime() + 1_000),
  );

  await assertInvalidCode(() =>
    consumeCode(userAId, first.code, "1"),
  );
  assert.deepEqual(
    await consumeCode(userAId, second.code, "1"),
    { status: "LINKED" },
  );

  const challenges =
    await prisma.whatsAppLinkChallenge.findMany({
      where: { userId: userAId },
      orderBy: { createdAt: "asc" },
    });

  assert.equal(challenges[0]?.status, "CANCELLED");
  assert.equal(challenges[1]?.status, "CONSUMED");
  assert.equal(
    await prisma.whatsAppConnection.count({
      where: { userId: userAId, status: "VERIFIED" },
    }),
    1,
  );
});

test("gerações concorrentes mantêm somente uma challenge ativa", async () => {
  const generated = await Promise.all([
    createChallenge(userAId, referenceDate),
    createChallenge(
      userAId,
      new Date(referenceDate.getTime() + 1),
    ),
  ]);
  const challenges =
    await prisma.whatsAppLinkChallenge.findMany({
      where: { userId: userAId },
    });

  assert.equal(
    challenges.filter(
      (challenge) => challenge.status === "PENDING",
    ).length,
    1,
  );
  assert.equal(
    challenges.filter(
      (challenge) => challenge.status === "CANCELLED",
    ).length,
    1,
  );
  assert.ok(
    generated.some(({ code }) =>
      challenges.some(
        (challenge) =>
          challenge.status === "PENDING" &&
          challenge.codeHash ===
            hashWhatsAppLinkCode(code, testSecret),
      ),
    ),
  );
});

test("consumo aceita variações normalizadas do mesmo código", async () => {
  for (const variant of [
    (code: string) => code,
    (code: string) => code.toLowerCase(),
    (code: string) => code.replaceAll("-", ""),
    (code: string) => `  ${code}  `,
    (code: string) => code.replaceAll("-", " "),
  ]) {
    const challenge = await createChallenge(
      userAId,
      referenceDate,
    );
    const result = await consumeCode(
      userAId,
      variant(challenge.code),
      "1",
    );

    assert.deepEqual(result, { status: "LINKED" });
    await revokeWhatsAppConnectionForUser({
      userId: userAId,
      now: referenceDate,
    });
  }
});

test("tentativas incorretas incrementam e bloqueiam a challenge", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );
  const wrongCode = changeLastDigit(challenge.code);

  for (
    let attempt = 1;
    attempt <= WHATSAPP_LINK_MAX_ATTEMPTS;
    attempt += 1
  ) {
    await assertInvalidCode(() =>
      consumeCode(userAId, wrongCode, "1"),
    );

    const stored =
      await findChallengeByCode(challenge.code);
    assert.equal(stored.attempts, attempt);
  }

  const blocked = await findChallengeByCode(challenge.code);
  assert.equal(blocked.status, "BLOCKED");
  assert.equal(blocked.activeUserKey, null);

  resetWhatsAppLinkRateLimitsForTests();
  await assertInvalidCode(() =>
    consumeCode(userAId, challenge.code, "1"),
  );
  assert.equal(
    await prisma.whatsAppConnection.count({
      where: { userId: userAId },
    }),
    0,
  );
});

test("códigos malformado, inexistente e expirado usam erro uniforme", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );

  await assertInvalidCode(() =>
    consumeCode(userAId, "FIN-inválido", "1"),
  );
  await assertInvalidCode(() =>
    consumeCode(
      userAId,
      "FIN-2A3B4C5D-123456",
      "1",
    ),
  );
  await prisma.whatsAppConnection.create({
    data: {
      userId: userAId,
      waId: waId("1"),
      phoneNumber: `+${waId("1")}`,
      status: "REVOKED",
    },
  });
  await assertInvalidCode(() =>
    consumeWhatsAppLinkCode(
      {
        waId: waId("1"),
        code: challenge.code,
        now: new Date(
          referenceDate.getTime() +
            WHATSAPP_LINK_CHALLENGE_TTL_MS,
        ),
      },
      { secret: testSecret },
    ),
  );

  assert.equal(
    (await findChallengeByCode(challenge.code)).status,
    "EXPIRED",
  );
  assert.equal(
    (
      await prisma.whatsAppConnection.findUniqueOrThrow({
        where: { userId: userAId },
      })
    ).status,
    "REVOKED",
  );
});

test("challenge consumida é single-use para mesmo ou outro waId", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );

  await consumeCode(userAId, challenge.code, "1");
  await assertInvalidCode(() =>
    consumeCode(userAId, challenge.code, "1"),
  );
  await assertInvalidCode(() =>
    consumeCode(userAId, challenge.code, "2"),
  );

  assert.equal(
    await prisma.whatsAppConnection.count(),
    1,
  );
  assert.equal(
    (await findChallengeByCode(challenge.code)).status,
    "CONSUMED",
  );
});

test("duas validações concorrentes produzem uma vinculação e uma falha segura", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );
  const results = await Promise.allSettled([
    consumeCode(userAId, challenge.code, "1"),
    consumeCode(userAId, challenge.code, "1"),
  ]);

  assert.equal(
    results.filter((result) => result.status === "fulfilled")
      .length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected")
      .length,
    1,
  );
  assert.ok(
    results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      )
      .every(
        (result) =>
          result.reason instanceof
          WhatsAppLinkCodeInvalidError,
      ),
  );
  assert.equal(
    await prisma.whatsAppConnection.count({
      where: { status: "VERIFIED" },
    }),
    1,
  );
  assert.equal(
    (await findChallengeByCode(challenge.code)).status,
    "CONSUMED",
  );
});

test("waId vinculado não é transferido para outro usuário", async () => {
  const waIdA = waId("1");
  const challengeA = await createChallenge(
    userAId,
    referenceDate,
  );
  await consumeCode(userAId, challengeA.code, "1");

  const challengeB = await createChallenge(
    userBId,
    referenceDate,
  );
  await assertInvalidCode(() =>
    consumeWhatsAppLinkCode(
      {
        waId: waIdA,
        code: challengeB.code,
        now: referenceDate,
      },
      { secret: testSecret },
    ),
  );

  const connection =
    await prisma.whatsAppConnection.findUniqueOrThrow({
      where: { waId: waIdA },
    });
  assert.equal(connection.userId, userAId);
  assert.equal(
    (await findChallengeByCode(challengeB.code)).status,
    "PENDING",
  );
});

test("usuário VERIFIED precisa revogar antes de vincular novamente", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );
  await consumeCode(userAId, challenge.code, "1");

  await assert.rejects(
    () => createChallenge(userAId, referenceDate),
    WhatsAppLinkAlreadyConnectedError,
  );

  const original =
    await prisma.whatsAppConnection.findUniqueOrThrow({
      where: { userId: userAId },
    });
  assert.equal(original.waId, waId("1"));
  assert.equal(original.status, "VERIFIED");
});

test("status mascara telefone e revogação remove acesso imediatamente", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );
  await consumeCode(userAId, challenge.code, "1");

  const statusResponse = await fetch(
    `${baseUrl}/whatsapp/connection`,
    { headers: authorizationHeaders(tokenA) },
  );
  const statusPayload = (await statusResponse.json()) as {
    connected: boolean;
    status: string;
    verifiedAt: string;
    phoneNumberMasked: string;
  };

  assert.equal(statusResponse.status, 200);
  assert.equal(statusPayload.connected, true);
  assert.equal(statusPayload.status, "VERIFIED");
  assert.match(statusPayload.phoneNumberMasked, /\*+\d{4}$/);
  assert.equal(
    JSON.stringify(statusPayload).includes(waId("1")),
    false,
  );
  assert.deepEqual(Object.keys(statusPayload).sort(), [
    "connected",
    "phoneNumberMasked",
    "status",
    "verifiedAt",
  ]);

  const service = new WhatsAppService(
    new FakeWhatsAppProvider(),
  );
  const processed = await service.processIncomingText({
    messageId: `test-link-${suffix}-before-revoke`,
    waId: waId("1"),
    text: "ajuda",
    receivedAt: referenceDate,
  });
  assert.equal(processed.status, "PROCESSED");

  const revokeResponse = await fetch(
    `${baseUrl}/whatsapp/connection`,
    {
      method: "DELETE",
      headers: authorizationHeaders(tokenA),
    },
  );
  assert.equal(revokeResponse.status, 204);

  await assert.rejects(
    () =>
      service.processIncomingText({
        messageId: `test-link-${suffix}-after-revoke`,
        waId: waId("1"),
        text: "saldo",
        receivedAt: referenceDate,
      }),
    WhatsAppConnectionNotFoundError,
  );
  assert.deepEqual(
    await getWhatsAppConnectionStatus({ userId: userAId }),
    {
      connected: false,
      status: "REVOKED",
      verifiedAt: null,
      phoneNumberMasked: maskForTest(`+${waId("1")}`),
    },
  );
});

test("revogação também invalida uma challenge ainda pendente", async () => {
  const challenge = await createChallenge(
    userAId,
    referenceDate,
  );
  const response = await fetch(
    `${baseUrl}/whatsapp/connection`,
    {
      method: "DELETE",
      headers: authorizationHeaders(tokenA),
    },
  );

  assert.equal(response.status, 204);
  assert.equal(
    (await findChallengeByCode(challenge.code)).status,
    "CANCELLED",
  );
  await assertInvalidCode(() =>
    consumeCode(userAId, challenge.code, "1"),
  );
  assert.equal(
    await prisma.whatsAppConnection.count(),
    0,
  );
});

test("geração autenticada possui rate limit por usuário", async () => {
  for (let request = 0; request < 3; request += 1) {
    const response = await postLink(tokenC, {});
    assert.equal(response.status, 201);
  }

  const blocked = await postLink(tokenC, {});
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("Retry-After"));
  assert.deepEqual(await blocked.json(), {
    code: "WHATSAPP_LINK_RATE_LIMITED",
    message:
      "Muitas solicitações de vinculação. Aguarde alguns minutos e tente novamente.",
  });
});

test("status sem conexão não revela identificadores internos", async () => {
  const response = await fetch(
    `${baseUrl}/whatsapp/connection`,
    { headers: authorizationHeaders(tokenC) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    connected: false,
    status: "NOT_CONNECTED",
    verifiedAt: null,
    phoneNumberMasked: null,
  });
});

function createChallenge(
  userId: string,
  now: Date,
) {
  return createWhatsAppLinkChallenge(
    { userId, now },
    { secret: testSecret },
  );
}

function consumeCode(
  _userId: string,
  code: string,
  slot: string,
) {
  return consumeWhatsAppLinkCode(
    {
      waId: waId(slot),
      code,
      now: referenceDate,
    },
    { secret: testSecret },
  );
}

async function findChallengeByCode(code: string) {
  const normalized = normalizeWhatsAppLinkCode(code);
  assert.ok(normalized);

  return prisma.whatsAppLinkChallenge.findUniqueOrThrow({
    where: {
      lookupKey: hashWhatsAppLinkSelector(
        normalized.selector,
        testSecret,
      ),
    },
  });
}

async function assertInvalidCode(
  operation: () => Promise<unknown>,
) {
  await assert.rejects(
    operation,
    (error: unknown) => {
      assert.ok(
        error instanceof WhatsAppLinkCodeInvalidError,
      );
      assert.equal(
        error.message,
        "Código inválido ou expirado.",
      );
      return true;
    },
  );
}

function changeLastDigit(code: string) {
  const lastDigit = Number(code.at(-1));
  return `${code.slice(0, -1)}${(lastDigit + 1) % 10}`;
}

function waId(slot: string) {
  return `55117${phoneSuffix}${slot}`;
}

function createToken(userId: string) {
  return jwt.sign({}, requireJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    subject: userId,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: 60 * 60,
  });
}

function authorizationHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function postLink(token: string, body: object) {
  return fetch(`${baseUrl}/whatsapp/link`, {
    method: "POST",
    headers: {
      ...authorizationHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function maskForTest(phoneNumber: string) {
  return `${"*".repeat(
    Math.max(0, phoneNumber.length - 4),
  )}${phoneNumber.slice(-4)}`;
}

async function cleanFixtures() {
  const userIds = [userAId, userBId, userCId].filter(Boolean);

  await prisma.whatsAppMessage.deleteMany({
    where: {
      messageId: { startsWith: `test-link-${suffix}` },
    },
  });
  await prisma.whatsAppConnection.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.whatsAppLinkChallenge.deleteMany({
    where: { userId: { in: userIds } },
  });
}

function restoreEnv(
  name: string,
  previousValue: string | undefined,
) {
  if (previousValue === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = previousValue;
}
