import assert from "node:assert/strict";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";

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


// ---------------------------------------------------------------------------------------------------------------------------
// Conserto único do #608 (fix-608b-cl), A-5 (plano §4.7.2, "a mesma regra da regra 1"): o `isChargeKnown` do PRISMA conhece a
// cobrança pela tabela de cobranças OU pelo `external_id` de uma linha do demonstrativo na fila; outra organização não vê nada.
// ---------------------------------------------------------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
const PNOW = new Date("2026-11-20T12:00:00.000Z");
if (!connectionString) {
  test("UR-A5 exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let Repo: any;
  after(async () => {
    await kit?.close();
  });

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_ur");
    Repo = (await import("../src/modules/subscription-billing/outbox/outbox.prisma.js")).PrismaOutboxRepository;
  });

  test("UR-A5 (A-5): a cobrança conhecida só pela linha da fila (external_id, sem linha na tabela) é conhecida", async () => {
    const f = await kit.seedTenant("ura5");
    await kit.seedRow(f, { kind: "charge_create", status: "SENT", externalId: "pay_ONLY_LINE", attempts: 1 });
    await kit.seedCharge(f, "pay_IN_TABLE", "pending");
    const repo = new Repo(kit.role.client, { tenantIds: [f.tenantId] });
    assert.equal(await repo.isChargeKnown(f.tenantId, f.statementId, "pay_ONLY_LINE"), true, "conhecida pela linha da fila");
    assert.equal(await repo.isChargeKnown(f.tenantId, f.statementId, "pay_IN_TABLE"), true, "conhecida pela tabela");
    assert.equal(await repo.isChargeKnown(f.tenantId, f.statementId, "pay_NOBODY"), false);
    const other = await kit.seedTenant("ura5x");
    assert.equal(await repo.isChargeKnown(other.tenantId, f.statementId, "pay_ONLY_LINE"), false, "outra organização não vê a linha");
  });
}
