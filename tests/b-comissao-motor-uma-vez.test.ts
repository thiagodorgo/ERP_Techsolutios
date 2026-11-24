// B-COMISSAO-MOTOR (F3) — "uma comissão viva por OS" e "regra ambígua não paga" na MEMÓRIA, onde não existe o índice
// único do banco: aqui só a camada 1 (a conferência do código sob a trava) segura (Emenda 1.1 §B.5). O par com banco é
// `tests/b-comissao-motor-uma-vez-db.test.ts`, onde o índice `commission_basis_events_engine_live_key` também recusa.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { InMemoryCommissionRepository } from "../src/modules/commissions/commission.repository.js";
import { reconcileTenantCommissionsWithRepository } from "../src/modules/commissions/commission-reconcile.service.js";

type Org = { readonly repo: InMemoryCommissionRepository; readonly tenantId: string; readonly payeeId: string; readonly actorId: string };

function newOrg(): Org {
  return { repo: new InMemoryCommissionRepository(), tenantId: randomUUID(), payeeId: randomUUID(), actorId: randomUUID() };
}

async function definePayeeRule(org: Org, rateValueText: string, previousRuleId: string | null): Promise<string> {
  return org.repo.runCommissionUnit(org.tenantId, async (unit) => {
    await unit.ensureEnginePolicy(org.tenantId, org.actorId);
    const policyId = await unit.lockCommissionRate(org.tenantId);
    const rule = await unit.replacePayeeRate(
      policyId,
      {
        tenantId: org.tenantId,
        payeeUserId: org.payeeId,
        actorUserId: org.actorId,
        rateType: "percent",
        rateValueText,
        reason: "Regra de teste da memória",
        expectedRuleId: previousRuleId,
        selfChange: false,
      },
      previousRuleId,
      new Date(),
    );
    return rule.ruleId;
  });
}

function seedCompletedWorkOrder(org: Org, items: ReadonlyArray<string>): string {
  const id = randomUUID();
  org.repo.engineWorkOrders.seed(org.tenantId, {
    id,
    code: `OS-${id.slice(0, 8)}`,
    status: "completed",
    assignedUserId: org.payeeId,
    completedAt: new Date(Date.now() + 1000),
    items: items.map((totalAmountText) => ({ totalAmountText })),
  });
  return id;
}

async function engineRows(org: Org) {
  const events = (await org.repo.listBasisEvents({ tenantId: org.tenantId, limit: 100, offset: 0 })).items;
  const calcs = (await org.repo.listCalculations({ tenantId: org.tenantId, limit: 100, offset: 0 })).items;
  return {
    liveEvents: events.filter((e) => e.idempotencyKey.startsWith("engine:wo:") && e.status !== "superseded"),
    allEvents: events,
    calcs,
  };
}

test("[R5] (memória) sem política do motor na organização, a varredura não cria evento nem cálculo", async () => {
  const org = newOrg();
  seedCompletedWorkOrder(org, ["200.00"]);

  const counts = await reconcileTenantCommissionsWithRepository(org.repo, org.tenantId);

  assert.deepEqual(counts, { created: 0, released: 0, recalculated: 0, skipped: 0 });
  const rows = await engineRows(org);
  assert.equal(rows.allEvents.length, 0);
  assert.equal(rows.calcs.length, 0);
});

test("[R3/M4] (memória, só a camada 1) rodar a varredura duas vezes produz exatamente 1 evento vivo e 1 cálculo por OS; a 2ª volta não toca a OS", async () => {
  const org = newOrg();
  await definePayeeRule(org, "10", null);
  const workOrderId = seedCompletedWorkOrder(org, ["150.00", "50.00"]);

  const first = await reconcileTenantCommissionsWithRepository(org.repo, org.tenantId);
  assert.deepEqual(first, { created: 1, released: 0, recalculated: 0, skipped: 0 });

  const second = await reconcileTenantCommissionsWithRepository(org.repo, org.tenantId);
  assert.deepEqual(second, { created: 0, released: 0, recalculated: 0, skipped: 0 }, "a 2ª volta não pode nem tocar a OS");

  const rows = await engineRows(org);
  assert.equal(rows.liveEvents.length, 1);
  assert.equal(rows.liveEvents[0]!.idempotencyKey, `engine:wo:${workOrderId}:v1`);
  assert.equal(rows.calcs.length, 1);
  assert.equal(rows.calcs[0]!.idempotencyKey, `engine:calc:${rows.liveEvents[0]!.id}`);
  // 10% de R$ 200,00 (150,00 + 50,00) = R$ 20,00
  assert.equal(rows.calcs[0]!.amountCents, "2000");
  assert.equal(rows.calcs[0]!.payeeId, org.payeeId);
});

test("[R22/M27] (memória) duas regras vivas para a mesma pessoa: a OS fica em revisão com o motivo ambiguous_rule e nenhum cálculo nasce", async () => {
  const org = newOrg();
  // Duas regras vivas da mesma pessoa, gravadas pela unidade sem fechar a anterior (o que a rota nunca faz; no banco
  // o índice `commission_policy_rules_engine_payee_live_key` recusa a 2ª — drill T-D(c)).
  await definePayeeRule(org, "10", null);
  await definePayeeRule(org, "30", null);
  seedCompletedWorkOrder(org, ["100.00"]);

  const counts = await reconcileTenantCommissionsWithRepository(org.repo, org.tenantId);

  assert.deepEqual(counts, { created: 0, released: 0, recalculated: 0, skipped: 1 });
  const rows = await engineRows(org);
  assert.equal(rows.liveEvents.length, 1);
  assert.equal(rows.liveEvents[0]!.status, "pending_review");
  assert.equal((rows.liveEvents[0]!.payload as Record<string, unknown>).reason, "ambiguous_rule");
  assert.equal(rows.calcs.length, 0, "regra ambígua nunca decide dinheiro");
});
