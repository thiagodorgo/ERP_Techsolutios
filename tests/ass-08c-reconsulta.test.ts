import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chargeCandidateDecision } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import type { BillingOutboxRow } from "../src/modules/subscription-billing/outbox/outbox.types.js";

const dispatcher = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url), "utf8");
const port = readFileSync(new URL("../src/modules/subscription-billing/providers/payment/payment-provider.port.ts", import.meta.url), "utf8");
const asaas = readFileSync(new URL("../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.ts", import.meta.url), "utf8");

const row: BillingOutboxRow = {
  id: "00000000-0000-0000-0000-000000000001",
  tenantId: "00000000-0000-0000-0000-000000000002",
  statementId: "00000000-0000-0000-0000-000000000003",
  kind: "charge_create",
  provider: "asaas",
  idempotencyKey: "charge_create:statement:1",
  providerIdempotencyKey: "00000000-0000-0000-0000-000000000004",
  payload: { amountCents: 10_000 },
  status: "PROCESSING",
  skipReason: null,
  claimedAt: new Date("2026-11-13T15:00:00Z"),
  claimedBy: "worker",
  attemptStartedAt: new Date("2026-11-13T15:00:00Z"),
  attempts: 2,
  nextAttemptAt: null,
  lastError: "provider_timeout",
  externalId: null,
  occurredAt: new Date("2026-11-13T15:00:00Z"),
  createdAt: new Date("2026-11-13T15:00:00Z"),
  updatedAt: new Date("2026-11-13T15:00:00Z"),
};

test("RV1: nenhuma candidata por valor e data não é adotada", () => {
  assert.match(dispatcher, /amountCents/);
  assert.match(dispatcher, /createdAt/);
  assert.match(dispatcher, /_no_candidate/);
  assert.equal(chargeCandidateDecision(row, [{ chargeId: "wrong-value", status: "pending", amountCents: 9_999, createdAt: "2026-11-13" }], false), "charge_found_no_candidate");
  assert.equal(chargeCandidateDecision(row, [{ chargeId: "wrong-day", status: "pending", amountCents: 10_000, createdAt: "2026-11-12" }], false), "charge_found_no_candidate");
});

test("RV2: exatamente uma candidata pode ser adotada", () => {
  assert.match(dispatcher, /candidates\.length\s*===\s*1/);
  assert.deepEqual(chargeCandidateDecision(row, [{ chargeId: "right", status: "pending", amountCents: 10_000, createdAt: "2026-11-13" }], false), { chargeId: "right", status: "pending", amountCents: 10_000, createdAt: "2026-11-13" });
});

test("RV3: duas candidatas nunca escolhem a primeira; vão para revisão", () => {
  assert.match(dispatcher, /candidates\.length\s*>\s*1/);
  assert.match(dispatcher, /multiple_candidates/);
  assert.equal(chargeCandidateDecision(row, [
    { chargeId: "one", status: "pending", amountCents: 10_000, createdAt: "2026-11-13" },
    { chargeId: "two", status: "pending", amountCents: 10_000, createdAt: "2026-11-13" },
  ], false), "charge_found_multiple_candidates");
});

test("RV4: a porta lista todas as cobranças da referência com valor e data", () => {
  assert.match(port, /listChargesByExternalReference/);
  assert.doesNotMatch(port, /findChargeByExternalReference/);
  assert.match(asaas, /listChargesByExternalReference/);
  assert.doesNotMatch(asaas, /\.find\(\(payment\)/);
});
