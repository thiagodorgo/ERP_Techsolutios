import assert from "node:assert/strict";
import test from "node:test";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { OUTBOX_MAX_ATTEMPTS, OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { NOW, TENANT_A, enqueue, memoryOutbox, paymentPort, source } from "./helpers/ass-08c3-test-kit.js";

async function orphan(repo: ReturnType<typeof memoryOutbox>, attempts = 1) {
  const row = await enqueue(repo);
  const first = await repo.claimNext({ enabledProviders: ["asaas"], now: NOW, claimedBy: "crash", orphanMs: OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
  assert.equal(first?.kind, "claimed");
  let current = first!.row;
  for (let i = 1; i < attempts; i += 1) {
    const lease = { claimedBy: current.claimedBy!, attemptStartedAt: current.attemptStartedAt! };
    await repo.deferOrphan(TENANT_A, row.id, "provider_unavailable", new Date(NOW.getTime() + i * OUTBOX_ORPHAN_MS), lease);
    const next = await repo.claimNext({ enabledProviders: ["asaas"], now: new Date(NOW.getTime() + (i + 1) * OUTBOX_ORPHAN_MS), claimedBy: "crash", orphanMs: OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
    assert.equal(next?.kind, "claimed");
    current = next!.row;
  }
  return row;
}

test("OR1: falha de uma órfã não rejeita a rodada e a próxima organização é processada", async () => {
  const repo = memoryOutbox();
  await orphan(repo);
  await enqueue(repo, { tenantId: "00000000-0000-4000-8000-0000000000b2", statementId: "20000000-0000-4000-8000-000000000002", seq: 2 });
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => { calls.list += 1; if (calls.list === 1) throw Object.assign(new Error("fora"), { code: "provider_unavailable" }); return []; } });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS) });
  assert.equal(result.outcomes.retry, 1);
  assert.equal(result.outcomes.sent, 1);
  assert.equal(calls.create, 1);
});

test("OR2: órfã falha permanece PROCESSING, é reconsultada e nunca cria", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo);
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => { calls.list += 1; throw Object.assign(new Error("fora"), { code: "provider_unavailable" }); } });
  for (let n = 1; n <= 4; n += 1) {
    await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + n * OUTBOX_ORPHAN_MS) });
    const current = await repo.findById(TENANT_A, row.id);
    assert.equal(current?.status, "PROCESSING");
    assert.equal(current?.lastError, "provider_unavailable");
  }
  assert.equal(calls.create, 0);
});

test("OR3: no teto a órfã vai a NEEDS_REVIEW e não é tocada de novo", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo, OUTBOX_MAX_ATTEMPTS);
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => { calls.list += 1; throw Object.assign(new Error("fora"), { code: "provider_unavailable" }); } });
  await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + (OUTBOX_MAX_ATTEMPTS + 1) * OUTBOX_ORPHAN_MS) });
  assert.equal((await repo.findById(TENANT_A, row.id))?.status, "NEEDS_REVIEW");
  assert.match((await repo.findById(TENANT_A, row.id))?.lastError ?? "", /^orphan_recovery_failed:/);
  const before = calls.list;
  await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + 20 * OUTBOX_ORPHAN_MS) });
  assert.equal(calls.list, before);
});

test("OR4: falha cessa antes do teto e a cobrança listada é adotada sem POST", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo);
  const { port, calls } = paymentPort({
    listChargesByExternalReference: async () => [{ chargeId: "pay_existing", status: "pending", amountCents: 10_000, createdAt: NOW.toISOString() }],
    getCharge: async () => ({ status: "pending", amountCents: 10_000 }),
  });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS) });
  assert.equal(result.outcomes.recovered, 1);
  assert.equal((await repo.findById(TENANT_A, row.id))?.externalId, "pay_existing");
  assert.equal(calls.create, 0);
});

test("mutações M-OR1/M-OR2/M-OR3 têm uma única âncora literal", () => {
  const text = source("src/modules/subscription-billing/outbox/outbox.dispatcher.ts");
  for (const marker of ["[ORFA-TRY]", "[ORFA-DEFER]", "[ORFA-CAP]"]) assert.equal(text.split(marker).length - 1, 1, marker);
});

