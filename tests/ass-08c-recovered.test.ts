import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import type { PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
const dispatcher = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.dispatcher.ts", import.meta.url), "utf8");
const jobs = readFileSync(new URL("../src/modules/subscription-billing/outbox/channel.jobs.ts", import.meta.url), "utf8");
const port = readFileSync(new URL("../src/modules/subscription-billing/providers/payment/payment-provider.port.ts", import.meta.url), "utf8");

test("R1: a cobrança recuperada passa por recordChargeOutcome, não por markSent", () => {
  assert.match(dispatcher, /recordChargeOutcome/);
  assert.doesNotMatch(dispatcher, /decision === "adopt"[\s\S]{0,300}markSent/);
});

test("R1: ChargeLookup carrega os campos públicos recuperáveis", () => {
  for (const field of ["payUrl", "pixCopyPaste", "boletoLine", "boletoUrl", "dueDate"]) {
    assert.match(port, new RegExp(`readonly ${field}\\?`));
  }
});

test("R1: o job não mantém o registro legado em três transações", () => {
  assert.doesNotMatch(jobs, /onChargeCreated:/);
});

test("RACE-6/R2-01: falha de registro pós-provedor mantém PROCESSING e a órfã adota sem segunda criação", async () => {
  const first = new Date("2026-11-13T15:00:00.000Z");
  let now = first;
  let remoteCreated = false;
  let createCalls = 0;
  let failRecord = true;
  const audits: string[] = [];
  const repo = new InMemoryOutboxRepository({
    readStatement: async () => ({ status: "closed", reopenedAt: null, hasLiveCharge: false, totalCents: 12_345 }),
    clock: () => now,
  });
  repo.configureChargeOutcomeSink?.(async () => {
    if (failRecord) throw Object.assign(new Error("registro indisponível"), { code: "record_unavailable" });
  });
  const enqueued = await repo.enqueue({
    tenantId: "00000000-0000-0000-0000-000000000010",
    statementId: "00000000-0000-0000-0000-000000000011",
    kind: "charge_create",
    provider: "fake",
    seq: 1,
    payload: { amountCents: 12_345, dueDate: "2026-11-20", method: "pix" },
  }, first);
  const payment: PaymentProviderPort = {
    ensureCustomer: async () => ({ customerId: "customer-fake" }),
    createCharge: async () => {
      createCalls += 1;
      remoteCreated = true;
      return { chargeId: "charge-fake-race6", status: "pending" };
    },
    listChargesByExternalReference: async () => remoteCreated
      ? [{ chargeId: "charge-fake-race6", status: "pending", amountCents: 12_345, createdAt: "2026-11-13" }]
      : [],
    getCharge: async () => ({ status: "pending", dueDate: "2026-11-20", raw: {} }),
    cancelCharge: async (chargeId) => ({ chargeId, status: "cancelled" }),
    refund: async (chargeId) => ({ chargeId, status: "refunded" }),
    registerWebhook: async () => ({ manual: true }),
    verifyWebhook: async () => ({ ok: false }),
    supportedMethods: () => ["pix"],
    describe: () => ({ provider: "fake", supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "manual" }),
  };
  const deps = {
    repo,
    ports: { fake: payment },
    resolveCustomer: async () => ({ ok: true as const, customerId: "customer-fake" }),
    now: () => now,
    orphanMs: 60_000,
    onAudit: async (event: { action: string; code: string }) => { audits.push(`${event.action}:${event.code}`); },
  };

  const failedRecord = await runDispatchOutbox(deps);
  assert.equal(failedRecord.outcomes.record_failed, 1);
  assert.equal(createCalls, 1);
  assert.equal((await repo.findById(enqueued.row.tenantId, enqueued.row.id))?.status, "PROCESSING");
  assert.deepEqual(audits, ["billing_outbox.record_failed:record_unavailable"]);

  failRecord = false;
  now = new Date(first.getTime() + 60_001);
  const recovered = await runDispatchOutbox(deps);
  assert.equal(recovered.outcomes.recovered, 1);
  assert.equal(createCalls, 1, "a recuperação por referência não repete a criação remota");
  assert.equal((await repo.findById(enqueued.row.tenantId, enqueued.row.id))?.status, "SENT");
});
