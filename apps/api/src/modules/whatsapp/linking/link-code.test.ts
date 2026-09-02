import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generateWhatsAppLinkCode,
  hashWhatsAppLinkCode,
  hashWhatsAppLinkSelector,
  normalizeWhatsAppLinkCode,
  safelyMatchesWhatsAppLinkCode,
} from "./link-code.js";

const secret = "whatsapp-link-test-secret-with-32-chars";

test("gera código com CSPRNG no formato digitável e sem caracteres ambíguos", () => {
  const codes = new Set(
    Array.from(
      { length: 50 },
      generateWhatsAppLinkCode,
    ),
  );

  assert.equal(codes.size, 50);

  for (const code of codes) {
    assert.match(
      code,
      /^FIN-[2-9A-HJ-KM-NP-TV-Z]{8}-\d{6}$/,
    );
  }
});

test("normaliza caixa, hífens e espaços sem fuzzy matching", () => {
  const canonical = "FIN-2A3B4C5D-123456";
  const variants = [
    canonical,
    "fin-2a3b4c5d-123456",
    "FIN2A3B4C5D123456",
    "  FIN-2A3B4C5D-123456  ",
    "FIN 2A3B4C5D 123456",
  ];

  for (const variant of variants) {
    assert.deepEqual(
      normalizeWhatsAppLinkCode(variant),
      {
        canonical,
        selector: "2A3B4C5D",
      },
    );
  }

  assert.equal(
    normalizeWhatsAppLinkCode(
      "FIN-2A3B4C5D-123457",
    )?.canonical,
    "FIN-2A3B4C5D-123457",
  );
  assert.equal(
    normalizeWhatsAppLinkCode(
      "FIN-2A3B4C5D-12345X",
    ),
    null,
  );
});

test("HMAC depende do secret e usa comparação segura de tamanho fixo", () => {
  const code = "FIN-2A3B4C5D-123456";
  const hash = hashWhatsAppLinkCode(code, secret);
  const selectorHash = hashWhatsAppLinkSelector(
    "2A3B4C5D",
    secret,
  );

  assert.match(hash, /^[a-f\d]{64}$/);
  assert.match(selectorHash, /^[a-f\d]{64}$/);
  assert.notEqual(selectorHash, "2A3B4C5D");
  assert.notEqual(selectorHash, hash);
  assert.equal(
    safelyMatchesWhatsAppLinkCode(
      hashWhatsAppLinkCode(code, secret),
      hash,
    ),
    true,
  );
  assert.equal(
    safelyMatchesWhatsAppLinkCode(
      hashWhatsAppLinkCode(
        code,
        `${secret}-different`,
      ),
      hash,
    ),
    false,
  );
  assert.equal(
    safelyMatchesWhatsAppLinkCode("invalid", hash),
    false,
  );
});
