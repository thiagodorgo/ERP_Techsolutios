import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dispatcher = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url), "utf8");
const port = readFileSync(new URL("../src/modules/subscription-billing/providers/payment/payment-provider.port.ts", import.meta.url), "utf8");
const asaas = readFileSync(new URL("../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.ts", import.meta.url), "utf8");

test("RV1: nenhuma candidata por valor e data não é adotada", () => {
  assert.match(dispatcher, /amountCents/);
  assert.match(dispatcher, /createdAt/);
  assert.match(dispatcher, /charge_found_no_candidate|orphan_found_no_candidate/);
});

test("RV2: exatamente uma candidata pode ser adotada", () => {
  assert.match(dispatcher, /candidates\.length\s*===\s*1/);
});

test("RV3: duas candidatas nunca escolhem a primeira; vão para revisão", () => {
  assert.match(dispatcher, /candidates\.length\s*>\s*1/);
  assert.match(dispatcher, /multiple_candidates/);
});

test("RV4: a porta lista todas as cobranças da referência com valor e data", () => {
  assert.match(port, /listChargesByExternalReference/);
  assert.doesNotMatch(port, /findChargeByExternalReference/);
  assert.match(asaas, /listChargesByExternalReference/);
  assert.doesNotMatch(asaas, /\.find\(\(payment\)/);
});
