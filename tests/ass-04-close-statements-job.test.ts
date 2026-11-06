// B-ASS-04 · F10 — o job `subscription.close-statements`: janelas de hora marcada, o período fechado, o laço que
// isola a falha de uma organização e a regra G4 (o reaberto NÃO é refechado pelo job — T-ST-45).

import assert from "node:assert/strict";
import test from "node:test";

import { JOB_NAMES } from "../src/infra/jobs/job.types.js";
import {
  closeStatementsPeriod,
  closeTenantsSequentially,
  computeNextCloseStatementsDelayMs,
} from "../src/modules/subscription-billing/subscription-billing.jobs.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, type StatementInputs } from "../src/modules/subscription-billing/statements/statement.service.js";
import { computeStatement } from "../src/modules/subscription-billing/statements/statement.engine.js";

const HOUR = 3_600_000;

function sp(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

test("T-ST-66: as janelas são 02:00, 08:00, 14:00 e 20:00 SP; a do dia 1 vem às 02:00, depois da medição das 23:30", () => {
  assert.equal(computeNextCloseStatementsDelayMs(sp("2026-11-30T23:30:00")), 2.5 * HOUR, "última medição → 02:00 do dia 1");
  assert.equal(computeNextCloseStatementsDelayMs(sp("2026-12-01T02:00:00")), 6 * HOUR, "estritamente depois: 02:00 → 08:00");
  assert.equal(computeNextCloseStatementsDelayMs(sp("2026-12-01T09:00:00")), 5 * HOUR);
  assert.equal(computeNextCloseStatementsDelayMs(sp("2026-12-31T21:00:00")), 5 * HOUR, "virada de ano");
});

test("T-ST-67: o período fechado é o mês anterior na data LOCAL de São Paulo (não em UTC)", () => {
  assert.equal(closeStatementsPeriod(sp("2026-12-01T02:00:00")), "2026-11");
  assert.equal(closeStatementsPeriod(sp("2027-01-01T02:00:00")), "2026-12");
  // 30/11 22:30 SP já é 01/12 em UTC: em SP ainda é novembro, então o mês anterior é outubro.
  assert.equal(closeStatementsPeriod(sp("2026-11-30T22:30:00")), "2026-10");
  assert.ok(JOB_NAMES.includes("subscription.close-statements"));
});

function readyInputs(): StatementInputs {
  const computation = {
    daysInMonth: 30,
    segments: [{ fromDay: 1, toDay: 30, monthlyPriceCents: 10_000 }],
    terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 500, extraGbPriceCents: 200 },
    measurements: { usersPeak: 3, storagePeakMilliGb: 1_000, trackedVehicles: 0 },
    perVehiclePriceCents: null,
  };
  return {
    kind: "ready",
    subscriptionId: "sub_1",
    planVersionId: "pv_1",
    addonPlanVersionId: null,
    computation: computation as never,
    daysMeasured: 30,
    gaps: [],
    dueDays: 10,
  };
}

test("T-ST-45: o reaberto não é fechado pelo job em 3 janelas de 6 h; o laço pula a organização de sistema e isola a falha", async () => {
  const repository = new InMemoryStatementRepository();
  const service = new StatementService(repository, { async resolve() { return readyInputs(); } }, { async record() {} });
  const first = sp("2026-12-01T02:00:00");
  const period = closeStatementsPeriod(first);
  const tenants = [
    { id: "ten_a", slug: "org-a" },
    { id: "ten_sys", slug: "platform" },
    { id: "ten_boom", slug: "org-boom" },
  ];
  const closeOne = async (tenantId: string, now: Date) => {
    if (tenantId === "ten_boom") throw Object.assign(new Error("lock"), { code: "P2034" });
    return (await service.close({ tenantId, period, now, actorId: null, source: "job" })).kind;
  };

  const run1 = await closeTenantsSequentially(tenants, period, (id) => closeOne(id, first));
  assert.deepEqual(run1.counts, { closed: 1, already_closed: 0, skipped: 0 });
  assert.deepEqual(run1.failures, [{ tenantId: "ten_boom", code: "P2034" }], "a falha de uma não para a volta");
  const [statement] = await repository.listStatements("ten_a");
  assert.equal(statement!.status, "closed");
  assert.equal(await repository.listStatements("ten_sys").then((rows) => rows.length), 0, "a organização de sistema não é fechada");

  await service.reopen({ tenantId: "ten_a", statementId: statement!.id, reason: "medição corrigida à mão", actorId: "u", now: first });
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    const now = new Date(first.getTime() + cycle * 6 * HOUR);
    const run = await closeTenantsSequentially(tenants.slice(0, 2), period, (id) => closeOne(id, now));
    assert.deepEqual(run.counts, { closed: 0, already_closed: 0, skipped: 1 }, `janela ${cycle}`);
  }
  const [after] = await repository.listStatements("ten_a");
  assert.equal(after!.status, "reopened", "só o fechamento manual refecha");
});

test("T-ST-68: segunda volta no mesmo período não muda o fechado (idempotente)", async () => {
  const repository = new InMemoryStatementRepository();
  const service = new StatementService(repository, { async resolve() { return readyInputs(); } }, { async record() {} });
  const now = sp("2026-12-01T02:00:00");
  const period = closeStatementsPeriod(now);
  const tenants = [{ id: "ten_a", slug: "org-a" }];
  const closeOne = async (tenantId: string) => (await service.close({ tenantId, period, now, actorId: null, source: "job" })).kind;
  await closeTenantsSequentially(tenants, period, closeOne);
  const [before] = await repository.listStatements("ten_a");
  const again = await closeTenantsSequentially(tenants, period, closeOne);
  assert.deepEqual(again.counts, { closed: 0, already_closed: 1, skipped: 0 });
  const [after] = await repository.listStatements("ten_a");
  assert.deepEqual(after, before);
  assert.equal(after!.totalCents, computeStatement({ ...(readyInputs() as { computation: object }).computation, adjustmentsCents: 0, creditsAppliedCents: 0 } as never).totalCents);
});
