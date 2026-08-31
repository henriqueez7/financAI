import assert from "node:assert/strict";
import test from "node:test";

import { FakeWhatsAppProvider } from "./fake-whatsapp.provider.js";

const fixedDate = new Date("2026-08-30T12:00:00.000Z");

test("envia e armazena uma mensagem sem rede", async () => {
  const provider = new FakeWhatsAppProvider(
    () => fixedDate,
  );

  const result = await provider.sendText({
    recipient: "5511999999999",
    text: "Mensagem local",
  });

  assert.equal(result.messageId, "fake-1");
  assert.deepEqual(provider.getSentMessages(), [
    {
      id: "fake-1",
      recipient: "5511999999999",
      text: "Mensagem local",
      sentAt: fixedDate,
    },
  ]);
});

test("preserva a ordem de envio", async () => {
  const provider = new FakeWhatsAppProvider();

  await provider.sendText({
    recipient: "a",
    text: "primeira",
  });
  await provider.sendText({
    recipient: "b",
    text: "segunda",
  });

  assert.deepEqual(
    provider
      .getSentMessages()
      .map((message) => message.text),
    ["primeira", "segunda"],
  );
});

test("clear remove mensagens e reinicia a sequência", async () => {
  const provider = new FakeWhatsAppProvider();

  await provider.sendText({
    recipient: "a",
    text: "descartar",
  });
  provider.clear();
  const result = await provider.sendText({
    recipient: "a",
    text: "nova",
  });

  assert.equal(result.messageId, "fake-1");
  assert.equal(provider.getSentMessages().length, 1);
});

test("instâncias mantêm estado isolado", async () => {
  const providerA = new FakeWhatsAppProvider();
  const providerB = new FakeWhatsAppProvider();

  await providerA.sendText({
    recipient: "a",
    text: "somente A",
  });

  assert.equal(providerA.getSentMessages().length, 1);
  assert.equal(providerB.getSentMessages().length, 0);
});
