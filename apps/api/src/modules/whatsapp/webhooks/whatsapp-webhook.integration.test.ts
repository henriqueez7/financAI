import "dotenv/config";

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import express from "express";

import { prisma } from "../../../lib/prisma.js";
import { createWhatsAppLinkChallenge } from "../linking/link.service.js";
import { FakeWhatsAppProvider } from "../messaging/fake-whatsapp.provider.js";
import type { MessageProvider } from "../messaging/message.provider.js";
import type { TextMessageInput } from "../messaging/message.types.js";
import { createWhatsAppWebhookRoutes } from "./whatsapp-webhook.routes.js";
import { WHATSAPP_NOT_LINKED_MESSAGE } from "./whatsapp-webhook.service.js";

class ControllableTestProvider implements MessageProvider {
  private readonly fake = new FakeWhatsAppProvider();
  private shouldFailNextSend = false;

  async sendText(input: TextMessageInput) {
    if (this.shouldFailNextSend) {
      this.shouldFailNextSend = false;
      throw new Error("simulated-outbound-failure");
    }

    return this.fake.sendText(input);
  }

  clear() {
    this.fake.clear();
    this.shouldFailNextSend = false;
  }

  failNextSend() {
    this.shouldFailNextSend = true;
  }

  getSentMessages() {
    return this.fake.getSentMessages();
  }
}

const appSecret = "webhook-integration-app-secret-32-chars";
const verifyToken = "webhook-integration-verify-token-32";
const linkSecret = "webhook-integration-link-secret-32-char";
const suffix = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;
const waId = `55118${String(Date.now()).slice(-8)}`;
const unlinkedWaId = `55119${String(Date.now()).slice(-8)}`;
let provider: ControllableTestProvider;
const previousLinkSecret = process.env.WHATSAPP_LINK_SECRET;

let server: Server;
let baseUrl = "";
let userId = "";

before(async () => {
  process.env.WHATSAPP_LINK_SECRET = linkSecret;
  provider = new ControllableTestProvider();

  const user = await prisma.user.create({
    data: {
      name: "Webhook Integration User",
      email: `whatsapp-webhook-${suffix}@example.com`,
      passwordHash: "not-used-in-test",
    },
  });
  userId = user.id;
  await prisma.account.create({
    data: {
      userId,
      name: "Conta principal",
      type: "CHECKING",
      initialBalance: 500,
    },
  });

  const testApp = express();
  testApp.use(
    "/webhooks/whatsapp",
    createWhatsAppWebhookRoutes({
      appSecret,
      messageProvider: provider,
      verifyToken,
    }),
  );
  testApp.use(express.json());

  server = await new Promise<Server>((resolve) => {
    const listener = testApp.listen(0, "127.0.0.1", () =>
      resolve(listener),
    );
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  provider.clear();
  await cleanFixtures();
});

after(async () => {
  await cleanFixtures();
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await new Promise<void>((resolve, reject) => {
    server.close((error) =>
      error ? reject(error) : resolve(),
    );
  });
  restoreEnv(
    "WHATSAPP_LINK_SECRET",
    previousLinkSecret,
  );
  await prisma.$disconnect();
});

test("webhook assinado consome código e libera saldo somente após vínculo", async () => {
  const challenge = await createWhatsAppLinkChallenge({
    userId,
  });

  const linkResponse = await postText(
    "wamid.webhook-link",
    waId,
    challenge.code,
  );
  assert.equal(linkResponse.status, 200);

  const connection =
    await prisma.whatsAppConnection.findUniqueOrThrow({
      where: { userId },
    });
  assert.equal(connection.status, "VERIFIED");
  assert.equal(connection.waId, waId);
  assert.match(
    provider.getSentMessages()[0]?.text ?? "",
    /conectado com sucesso/i,
  );

  const balanceResponse = await postText(
    "wamid.webhook-balance",
    waId,
    "saldo",
  );
  assert.equal(balanceResponse.status, 200);
  const balanceReply = provider.getSentMessages()[1]?.text ?? "";
  assert.match(balanceReply, /500/);
  assert.doesNotMatch(balanceReply, /ainda não está conectado/i);

  const duplicate = await postText(
    "wamid.webhook-balance",
    waId,
    "saldo",
  );
  assert.equal(duplicate.status, 200);
  assert.equal(provider.getSentMessages().length, 2);
  assert.equal(
    await prisma.whatsAppMessage.count({
      where: { messageId: "wamid.webhook-balance" },
    }),
    1,
  );
});

test("waId não vinculado recebe orientação sem informação financeira", async () => {
  const response = await postText(
    "wamid.webhook-unlinked",
    unlinkedWaId,
    "saldo",
  );

  assert.equal(response.status, 200);
  assert.equal(
    provider.getSentMessages()[0]?.text,
    WHATSAPP_NOT_LINKED_MESSAGE,
  );
  assert.doesNotMatch(
    provider.getSentMessages()[0]?.text ?? "",
    /R\$|500/,
  );
});

test("messageId deduplica CREATE e CONFIRM do webhook até o Entry", async () => {
  await createVerifiedConnection();

  const createPayload = [
    "wamid.webhook-create",
    waId,
    "Gastei 89 no mercado",
  ] as const;
  assert.equal((await postText(...createPayload)).status, 200);
  assert.equal((await postText(...createPayload)).status, 200);
  assert.equal(
    await prisma.pendingFinancialAction.count({
      where: { userId },
    }),
    1,
  );

  const confirmPayload = [
    "wamid.webhook-confirm",
    waId,
    "sim",
  ] as const;
  assert.equal((await postText(...confirmPayload)).status, 200);
  assert.equal((await postText(...confirmPayload)).status, 200);

  const entries = await prisma.entry.findMany({
    where: { userId, source: "WHATSAPP" },
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.amount.toNumber(), 89);
  assert.equal(entries[0]?.description, "mercado");
  assert.equal(provider.getSentMessages().length, 2);
});

test("falha de outbound não reverte Entry nem permite confirmação duplicada", async () => {
  await createVerifiedConnection();
  assert.equal(
    (
      await postText(
        "wamid.webhook-failed-create",
        waId,
        "Gastei 37 no mercado",
      )
    ).status,
    200,
  );

  provider.failNextSend();
  const failedConfirmation = await postText(
    "wamid.webhook-failed-confirm",
    waId,
    "sim",
  );
  assert.equal(failedConfirmation.status, 500);
  assert.equal(
    await prisma.entry.count({
      where: { userId, source: "WHATSAPP" },
    }),
    1,
  );
  assert.equal(
    (
      await prisma.whatsAppMessage.findUniqueOrThrow({
        where: {
          messageId: "wamid.webhook-failed-confirm",
        },
      })
    ).status,
    "FAILED",
  );

  const retry = await postText(
    "wamid.webhook-failed-confirm",
    waId,
    "sim",
  );
  assert.equal(retry.status, 200);
  assert.equal(
    await prisma.entry.count({
      where: { userId, source: "WHATSAPP" },
    }),
    1,
  );
});

test("status e mídias não suportadas retornam 200 sem executar outbound", async () => {
  const statusResponse = await postPayload({
    statuses: [
      {
        id: "wamid.outbound-status",
        status: "read",
        timestamp: "1788350400",
        recipient_id: waId,
      },
    ],
  });
  const mediaResponse = await postPayload({
    messages: [
      {
        from: waId,
        id: "wamid.webhook-image",
        timestamp: "1788350400",
        type: "image",
        image: { id: "media-test" },
      },
    ],
  });

  assert.equal(statusResponse.status, 200);
  assert.equal(mediaResponse.status, 200);
  assert.equal(provider.getSentMessages().length, 0);
  assert.equal(
    await prisma.whatsAppMessage.count({
      where: { messageId: "wamid.webhook-image" },
    }),
    0,
  );
});

async function createVerifiedConnection() {
  return prisma.whatsAppConnection.create({
    data: {
      userId,
      phoneNumber: `+${waId}`,
      waId,
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });
}

function postText(
  messageId: string,
  senderWaId: string,
  text: string,
) {
  return postPayload({
    contacts: [{ wa_id: senderWaId }],
    messages: [
      {
        from: senderWaId,
        id: messageId,
        timestamp: String(Math.floor(Date.now() / 1_000)),
        type: "text",
        text: { body: text },
      },
    ],
  });
}

function postPayload(value: Record<string, unknown>) {
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-integration-test",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15555555555",
                phone_number_id: "123456789012345",
              },
              ...value,
            },
          },
        ],
      },
    ],
  });
  const signature = `sha256=${createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex")}`;

  return fetch(`${baseUrl}/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature,
    },
    body,
  });
}

async function cleanFixtures() {
  await prisma.whatsAppMessage.deleteMany({
    where: { messageId: { startsWith: "wamid.webhook-" } },
  });
  await prisma.whatsAppConnection.deleteMany({
    where: { userId },
  });
  await prisma.whatsAppLinkChallenge.deleteMany({
    where: { userId },
  });
  await prisma.pendingFinancialAction.deleteMany({
    where: { userId },
  });
  await prisma.entry.deleteMany({
    where: { userId, source: "WHATSAPP" },
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
