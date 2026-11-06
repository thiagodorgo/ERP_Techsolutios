import assert from "node:assert/strict";
import test from "node:test";

import { parseBusinessDate } from "../src/config/business-time.js";
import type { SubscriptionPlanVersion, TenantSubscription, TenantSubscriptionAddon } from "../src/modules/subscription-billing/plans/plan-types.js";
import { BYTES_PER_GB } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { buildStatementInputs, type StatementSourceData } from "../src/modules/subscription-billing/statements/statement.inputs.js";

// B-ASS-04 — montador das entradas do fechamento (§3.3; regras 7 e 8 do §4.4). Cada dia avaliado no início do dia em SP.
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA: termos do 1º dia em vez do último → T-IN-2 vermelho; ignorar a sobrescrita de preço
// → T-IN-3 vermelho; refechar com a versão vigente em vez da gravada → T-IN-4 vermelho; preencher gap → T-IN-6 vermelho.

const sp = (date: string) => parseBusinessDate(date);

function version(id: string, planId: string, from: string, to: string | null, patch: Partial<SubscriptionPlanVersion> = {}): SubscriptionPlanVersion {
  return {
    id, planId, version: 1, validFrom: sp(from), validTo: to ? sp(to) : null,
    monthlyPriceCents: 31_000, includedUsers: 5, includedStorageGb: 5, extraUserPriceCents: 2_000, extraGbPriceCents: 300,
    perVehiclePriceCents: null, pricingUnit: "flat", modules: [], notes: null, inaugural: false,
    createdAt: sp(from), updatedAt: sp(from), ...patch,
  } as SubscriptionPlanVersion;
}

function subscription(id: string, planId: string, from: string, to: string | null, patch: Partial<TenantSubscription> = {}): TenantSubscription {
  return {
    id, tenantId: "t", planId, validFrom: sp(from), validTo: to ? sp(to) : null,
    monthlyPriceOverrideCents: null, includedUsersOverride: null, includedStorageGbOverride: null,
    extraUserPriceOverrideCents: null, extraGbPriceOverrideCents: null, dueDays: 10, status: "active",
    endedReason: null, endedBy: null, notes: null, createdAt: sp(from), updatedAt: sp(from), ...patch,
  } as TenantSubscription;
}

const STARTER = version("v-starter", "starter", "2026-01-01", null, { monthlyPriceCents: 31_000, includedUsers: 5 });
const PRO = version("v-pro", "professional", "2026-01-01", null, { monthlyPriceCents: 62_000, includedUsers: 15, includedStorageGb: 20, extraUserPriceCents: 1_500, extraGbPriceCents: 250 });

function data(patch: Partial<StatementSourceData> = {}): StatementSourceData {
  return {
    tenantSlug: "patio-1",
    subscriptions: [],
    addons: [],
    versionsByPlan: new Map([["starter", [STARTER]], ["professional", [PRO]]]),
    usage: [],
    bindings: [],
    ...patch,
  };
}

function ready(result: ReturnType<typeof buildStatementInputs>) {
  assert.equal(result.kind, "ready", JSON.stringify(result));
  return result as Extract<typeof result, { kind: "ready" }>;
}

test("T-IN-1 · assinatura de 15/10 em diante → 1 segmento de 17 dias (pro-rata)", () => {
  const out = ready(buildStatementInputs("2026-10", data({ subscriptions: [subscription("s1", "starter", "2026-10-15", null)] }), { pin: null }));
  assert.deepEqual(out.computation.segments, [{ subscriptionId: "s1", planVersionId: "v-starter", fromDay: 15, toDay: 31, monthlyPriceCents: 31_000 }]);
});

test("T-IN-2 · troca Starter → Professional no dia 11: 2 segmentos e a franquia do Professional (último dia)", () => {
  const out = ready(buildStatementInputs("2026-10", data({
    subscriptions: [subscription("s1", "starter", "2026-09-01", "2026-10-11"), subscription("s2", "professional", "2026-10-11", null)],
  }), { pin: null }));
  assert.deepEqual(out.computation.segments.map((s) => [s.subscriptionId, s.fromDay, s.toDay, s.monthlyPriceCents]), [["s1", 1, 10, 31_000], ["s2", 11, 31, 62_000]]);
  assert.equal(out.computation.terms.includedUsers, 15);
  assert.equal(out.computation.terms.includedStorageMilliGb, 20_000);
  assert.equal(out.planVersionId, "v-pro");
});

test("T-IN-3 · a sobrescrita da organização vence o preço e a franquia da versão", () => {
  const out = ready(buildStatementInputs("2026-10", data({
    subscriptions: [subscription("s1", "starter", "2026-01-01", null, { monthlyPriceOverrideCents: 25_000, includedUsersOverride: 8 })],
  }), { pin: null }));
  assert.equal(out.computation.segments[0]!.monthlyPriceCents, 25_000);
  assert.equal(out.computation.terms.includedUsers, 8);
});

test("T-IN-4 · refechar um reaberto usa a versão gravada (pinned), mesmo que exista uma versão nova vigente (G5)", () => {
  const newer = version("v-starter-2", "starter", "2026-10-20", null, { monthlyPriceCents: 99_000 });
  const versions = new Map([["starter", [{ ...STARTER, validTo: sp("2026-10-20") }, newer]]]);
  const live = ready(buildStatementInputs("2026-10", data({ versionsByPlan: versions, subscriptions: [subscription("s1", "starter", "2026-01-01", null)] }), { pin: null }));
  assert.equal(live.computation.segments.length, 2, "sem pin, a versão nova entra no dia 20");
  const pinned = ready(buildStatementInputs("2026-10", data({ versionsByPlan: versions, subscriptions: [subscription("s1", "starter", "2026-01-01", null)] }), { pin: { planVersionIds: ["v-starter"], addonPlanVersionId: null } }));
  assert.deepEqual(pinned.computation.segments.map((s) => [s.planVersionId, s.fromDay, s.toDay]), [["v-starter", 1, 31]]);
});

test("T-IN-4b · refechar fixa TAMBÉM a versão do add-on de rastreamento: o preço por veículo não muda (G5, §3.4)", () => {
  const trackOld = version("v-track-1", "tracking_basic", "2026-01-01", "2026-10-20", { monthlyPriceCents: 0, perVehiclePriceCents: 1_990 });
  const trackNew = version("v-track-2", "tracking_basic", "2026-10-20", null, { monthlyPriceCents: 0, perVehiclePriceCents: 9_990 });
  const addon: TenantSubscriptionAddon = { id: "a1", tenantId: "t", subscriptionId: "s1", planId: "tracking_basic", validFrom: sp("2026-01-01"), validTo: null, perVehiclePriceOverrideCents: null, createdAt: sp("2026-01-01"), updatedAt: sp("2026-01-01") };
  const source = data({
    subscriptions: [subscription("s1", "starter", "2026-01-01", null)],
    addons: [addon],
    versionsByPlan: new Map([["starter", [STARTER]], ["tracking_basic", [trackOld, trackNew]]]),
    bindings: [{ vehicleId: "V1", validFrom: "2026-10-01", validTo: null }],
  });
  const live = ready(buildStatementInputs("2026-10", source, { pin: null }));
  assert.deepEqual([live.addonPlanVersionId, live.computation.perVehiclePriceCents], ["v-track-2", 9_990], "sem pin, vale a versão nova");
  const pinned = ready(buildStatementInputs("2026-10", source, { pin: { planVersionIds: ["v-starter"], addonPlanVersionId: "v-track-1" } }));
  assert.deepEqual([pinned.addonPlanVersionId, pinned.computation.perVehiclePriceCents], ["v-track-1", 1_990], "refechar usa a versão gravada");
});

test("T-IN-4c · refechar um mês com troca de plano e troca de versão mantém cada trecho na versão gravada", () => {
  const starter2 = version("v-starter-2", "starter", "2026-10-06", "2026-10-25", { monthlyPriceCents: 40_000 });
  const starter3 = version("v-starter-3", "starter", "2026-10-25", null, { monthlyPriceCents: 99_000 });
  const pro2 = version("v-pro-2", "professional", "2026-10-28", null, { monthlyPriceCents: 99_000 });
  const versions = new Map([
    ["starter", [{ ...STARTER, validTo: sp("2026-10-06") }, starter2, starter3]],
    ["professional", [{ ...PRO, validTo: sp("2026-10-28") }, pro2]],
  ]);
  const source = data({
    versionsByPlan: versions,
    subscriptions: [subscription("s1", "starter", "2026-09-01", "2026-10-11"), subscription("s2", "professional", "2026-10-11", null)],
  });
  const pinned = ready(buildStatementInputs("2026-10", source, { pin: { planVersionIds: ["v-starter", "v-starter-2", "v-pro"], addonPlanVersionId: null } }));
  assert.deepEqual(
    pinned.computation.segments.map((s) => [s.planVersionId, s.fromDay, s.toDay, s.monthlyPriceCents]),
    [["v-starter", 1, 5, 31_000], ["v-starter-2", 6, 10, 40_000], ["v-pro", 11, 31, 62_000]],
    "nenhuma versão publicada depois do fechamento entra, e nenhum trecho cai em plan_without_price",
  );
  assert.equal(pinned.planVersionId, "v-pro");
});

test("T-IN-5 · sem assinatura → no_subscription; dia sem versão → plan_without_price; organização platform → platform_organization", () => {
  assert.deepEqual(buildStatementInputs("2026-10", data(), { pin: null }), { kind: "skip", reason: "no_subscription" });
  assert.deepEqual(
    buildStatementInputs("2026-10", data({ versionsByPlan: new Map(), subscriptions: [subscription("s1", "starter", "2026-01-01", null)] }), { pin: null }),
    { kind: "skip", reason: "plan_without_price" },
  );
  assert.deepEqual(buildStatementInputs("2026-10", data({ tenantSlug: "Platform" }), { pin: null }), { kind: "skip", reason: "platform_organization" });
});

test("T-IN-6 · medições: o maior do mês, espaço com teto a 0,001 GB, gaps declarados e nunca preenchidos", () => {
  const out = ready(buildStatementInputs("2026-10", data({
    subscriptions: [subscription("s1", "starter", "2026-01-01", null)],
    usage: [
      { date: "2026-10-01", activeUsers: 3, dbBytesEstimated: 1n * BYTES_PER_GB, filesBytes: 0n },
      { date: "2026-10-02", activeUsers: 7, dbBytesEstimated: null, filesBytes: null },
      { date: "2026-10-03", activeUsers: 5, dbBytesEstimated: 2n * BYTES_PER_GB, filesBytes: 1n },
      { date: "2026-09-30", activeUsers: 99, dbBytesEstimated: 99n * BYTES_PER_GB, filesBytes: 0n },
    ],
  }), { pin: null }));
  assert.equal(out.computation.measurements.usersPeak, 7);
  assert.equal(out.computation.measurements.storagePeakMilliGb, 2_001, "2 GB + 1 byte → teto 2,001");
  assert.equal(out.daysMeasured, 3);
  assert.equal(out.gaps.length, 28);
  assert.equal(out.gaps[0], "2026-10-04");
});

test("T-IN-7 · add-on de rastreamento vigente no último dia dá o preço por veículo; veículos distintos no mês", () => {
  const tracking = version("v-track", "tracking_basic", "2026-01-01", null, { monthlyPriceCents: 0, perVehiclePriceCents: 1_990 });
  const addon: TenantSubscriptionAddon = { id: "a1", tenantId: "t", subscriptionId: "s1", planId: "tracking_basic", validFrom: sp("2026-01-01"), validTo: null, perVehiclePriceOverrideCents: null, createdAt: sp("2026-01-01"), updatedAt: sp("2026-01-01") };
  const out = ready(buildStatementInputs("2026-10", data({
    subscriptions: [subscription("s1", "starter", "2026-01-01", null)],
    addons: [addon],
    versionsByPlan: new Map([["starter", [STARTER]], ["tracking_basic", [tracking]]]),
    bindings: [{ vehicleId: "X", validFrom: "2026-10-01", validTo: "2026-10-10" }, { vehicleId: "Y", validFrom: "2026-10-11", validTo: null }],
  }), { pin: null }));
  assert.equal(out.computation.perVehiclePriceCents, 1_990);
  assert.equal(out.addonPlanVersionId, "v-track");
  assert.equal(out.computation.measurements.trackedVehicles, 2);
});
