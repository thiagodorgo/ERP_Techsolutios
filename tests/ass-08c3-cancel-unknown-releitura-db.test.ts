import assert from "node:assert/strict";
import test from "node:test";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { NOW, TENANT_A, enqueue, memoryOutbox, paymentPort, source } from "./helpers/ass-08c3-test-kit.js";

async function cancelUnknown(known: boolean) {
  const repo = memoryOutbox();
  const original = repo.isChargeKnown.bind(repo);
  repo.isChargeKnown = async () => known;
  const row = await enqueue(repo, { kind: "charge_cancel", payload: { chargeId: "pay_X", unknown: true, reason: "conferido" } });
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => [{ chargeId: "pay_X", status: "pending" }] });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => NOW });
  repo.isChargeKnown = original;
  return { repo, row, calls, result };
}

test("UR1: cancel-unknown que se tornou conhecido vai a revisão e não chama DELETE", async () => {
  const { repo, row, calls, result } = await cancelUnknown(true);
  assert.equal(result.outcomes.needs_review, 1);
  assert.equal((await repo.findById(TENANT_A, row.id))?.lastError, "unknown_charge_became_known");
  assert.equal(calls.cancel, 0);
});

test("UR2: cancel-unknown ainda desconhecido segue para um DELETE", async () => {
  const { calls, result } = await cancelUnknown(false);
  assert.equal(result.outcomes.sent, 1);
  assert.equal(calls.cancel, 1);
});

test("M-UR: a releitura tem exatamente uma âncora", () => {
  assert.equal(source("src/modules/subscription-billing/outbox/outbox.dispatcher.ts").split("[UNKNOWN-REREAD]").length - 1, 1);
});

