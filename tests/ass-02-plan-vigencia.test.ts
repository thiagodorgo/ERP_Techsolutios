import assert from "node:assert/strict";
import test from "node:test";

import {
  latestVersion,
  resolveVersionAt,
  validateNewVersionDate,
} from "../src/modules/subscription-billing/plans/plan-versioning.js";
import { PlansService } from "../src/modules/subscription-billing/plans/plans.service.js";
import { SubscriptionBillingError } from "../src/modules/subscription-billing/plans/plan-types.js";
import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";

// Relógio fixo: data civil SP = 2026-11-05 (quinta). current month start = 2026-11-01; previous = 2026-10-01.
const NOW = new Date("2026-11-05T12:00:00-03:00");

function spDate(value: string): Date {
  return new Date(`${value}T00:00:00-03:00`);
}

function newService(): { service: PlansService; repo: InMemoryPlansRepository } {
  const repo = new InMemoryPlansRepository();
  return { service: new PlansService(repo, () => NOW), repo };
}

function reasonOf(error: unknown): string | undefined {
  return error instanceof SubscriptionBillingError ? error.reason : undefined;
}

// --------------------------------------------------------------------------------- R-PLAN-2 (vigência)

test("T-PL-3: versão com validFrom < hoje (SP) → version_retroactive", () => {
  const result = validateNewVersionDate({
    existingVersions: [],
    validFrom: spDate("2026-11-04"),
    inaugural: false,
    now: NOW,
  });
  assert.deepEqual(result, { ok: false, reason: "version_retroactive" });
});

test("T-PL-4: validFrom <= valid_from da última versão (vigente ou futura) → version_not_after_latest", () => {
  const futureLatest = [{ validFrom: spDate("2026-12-01"), validTo: null }];
  assert.deepEqual(
    validateNewVersionDate({ existingVersions: futureLatest, validFrom: spDate("2026-12-01"), inaugural: false, now: NOW }),
    { ok: false, reason: "version_not_after_latest" },
  );
  assert.deepEqual(
    validateNewVersionDate({ existingVersions: futureLatest, validFrom: spDate("2026-11-20"), inaugural: false, now: NOW }),
    { ok: false, reason: "version_not_after_latest" },
  );
});

test("T-PL-17: validFrom = hoje é ACEITO (a borda usa <, não <=)", () => {
  const result = validateNewVersionDate({
    existingVersions: [],
    validFrom: spDate("2026-11-05"),
    inaugural: false,
    now: NOW,
  });
  assert.deepEqual(result, { ok: true });
});

test("T-PL-18: duas versões FUTURAS sobrepostas → compara com a última, não só com a vigente", () => {
  // Nenhuma versão vigente: a única cadastrada é futura. A 2ª com o mesmo validFrom tem de ser recusada.
  const future = [{ validFrom: spDate("2026-12-10"), validTo: null }];
  const result = validateNewVersionDate({
    existingVersions: future,
    validFrom: spDate("2026-12-10"),
    inaugural: false,
    now: NOW,
  });
  assert.deepEqual(result, { ok: false, reason: "version_not_after_latest" });
});

test("T-PL-7: versão inaugural — 1º dia do mês corrente ou anterior; outra data passada recusada", () => {
  assert.deepEqual(
    validateNewVersionDate({ existingVersions: [], validFrom: spDate("2026-11-01"), inaugural: true, now: NOW }),
    { ok: true },
  );
  assert.deepEqual(
    validateNewVersionDate({ existingVersions: [], validFrom: spDate("2026-10-01"), inaugural: true, now: NOW }),
    { ok: true },
  );
  assert.deepEqual(
    validateNewVersionDate({ existingVersions: [], validFrom: spDate("2026-10-15"), inaugural: true, now: NOW }),
    { ok: false, reason: "inaugural_not_allowed" },
  );
});

test("T-PL-19: inaugural em plano que JÁ tem versão → inaugural_not_allowed", () => {
  const result = validateNewVersionDate({
    existingVersions: [{ validFrom: spDate("2026-11-01"), validTo: null }],
    validFrom: spDate("2026-11-01"),
    inaugural: true,
    now: NOW,
  });
  assert.deepEqual(result, { ok: false, reason: "inaugural_not_allowed" });
});

test("T-PL-6: resolveVersionAt devolve a versão cujo intervalo contém a data (bordas)", () => {
  const v1 = { validFrom: spDate("2026-01-01"), validTo: spDate("2026-03-01") };
  const v2 = { validFrom: spDate("2026-03-01"), validTo: spDate("2026-05-01") };
  const v3 = { validFrom: spDate("2026-05-01"), validTo: null };
  const versions = [v1, v2, v3];

  assert.equal(resolveVersionAt(versions, spDate("2026-01-15")), v1);
  assert.equal(resolveVersionAt(versions, spDate("2026-02-28")), v1);
  assert.equal(resolveVersionAt(versions, spDate("2026-03-01")), v2, "borda inicial de v2");
  assert.equal(resolveVersionAt(versions, spDate("2026-04-30")), v2);
  assert.equal(resolveVersionAt(versions, spDate("2026-05-01")), v3, "borda inicial de v3");
  assert.equal(resolveVersionAt(versions, spDate("2026-12-31")), v3, "v3 sem fim");

  assert.equal(latestVersion(versions), v3);
});

// --------------------------------------------------------------------------------- R-PLAN-2 (service) + R-PLAN-1

test("T-PL-5: nova versão válida fecha a anterior (valid_to = validFrom da nova)", async () => {
  const { service, repo } = newService();
  const plan = await service.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });

  const first = await service.addVersion(plan.id, {
    validFrom: spDate("2026-11-05"),
    monthlyPriceCents: 19990,
    includedUsers: 10,
    includedStorageGb: 10,
    extraUserPriceCents: 500,
    extraGbPriceCents: 200,
    perVehiclePriceCents: null,
    pricingUnit: "flat",
    modules: ["dashboard", "users"],
    notes: null,
    inaugural: false,
  });
  const second = await service.addVersion(plan.id, {
    validFrom: spDate("2026-12-01"),
    monthlyPriceCents: 24990,
    includedUsers: 20,
    includedStorageGb: 20,
    extraUserPriceCents: 600,
    extraGbPriceCents: 250,
    perVehiclePriceCents: null,
    pricingUnit: "flat",
    modules: ["dashboard", "users", "mobile"],
    notes: null,
    inaugural: false,
  });

  const versions = await repo.listVersions(plan.id);
  const closed = versions.find((v) => v.id === first.id);
  assert.equal(closed?.validTo?.getTime(), second.validFrom.getTime(), "a anterior ganha valid_to = validFrom da nova");
  assert.equal(second.validTo, null);
  assert.equal(second.version, 2);
});

test("T-PL-1: PATCH de plano com monthlyPrice → 400 unknown_field (preço nunca muda)", async () => {
  const { service } = newService();
  const plan = await service.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });

  await assert.rejects(
    service.patchPlan(plan.id, { monthlyPrice: "199.90" } as never),
    (error: unknown) => {
      assert.equal(reasonOf(error), "unknown_field");
      return true;
    },
  );
});

test("T-PL-2: não existe método de edição de versão (R-PLAN-1 é estrutural)", () => {
  const prototype = PlansService.prototype as Record<string, unknown>;
  for (const name of ["updateVersion", "patchVersion", "editVersion"]) {
    assert.equal(typeof prototype[name], "undefined", `método ${name} não deve existir`);
  }
});
