import assert from "node:assert/strict";
import test from "node:test";

import { parseBusinessDate } from "../src/config/business-time.js";
import type { SubscriptionPlanVersion, TenantSubscription, TenantSubscriptionAddon } from "../src/modules/subscription-billing/plans/plan-types.js";
import { computeStatement, recompute, snapshotOf, StatementEngineError, type StatementComputationInput, type StatementSnapshot } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { buildStatementInputs, type StatementSourceData, type StatementVersionPin } from "../src/modules/subscription-billing/statements/statement.inputs.js";
import { pinOf } from "../src/modules/subscription-billing/statements/statement.service.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

// B-ASS-12 — a linha de rastreamento do demonstrativo (item 65 do portão). Funções puras: montador + motor.
// Critério do item: 1 linha no demonstrativo; 0 cobrança sem vínculo vigente.
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA: a tabela da Emenda 1 do plano (§E4), E1 a E24 — executadas, 24 mortas.
// Valores de teste, fictícios: nenhum é preço real.

const sp = (date: string) => parseBusinessDate(date);

function version(id: string, planId: string, from: string, to: string | null, patch: Partial<SubscriptionPlanVersion> = {}): SubscriptionPlanVersion {
  return {
    id, planId, version: 1, validFrom: sp(from), validTo: to ? sp(to) : null,
    monthlyPriceCents: 31_000, includedUsers: 5, includedStorageGb: 5, extraUserPriceCents: 2_000, extraGbPriceCents: 300,
    perVehiclePriceCents: null, pricingUnit: "flat", modules: [], notes: null, inaugural: false,
    createdAt: sp(from), updatedAt: sp(from), ...patch,
  } as SubscriptionPlanVersion;
}

function subscription(id: string, from: string, to: string | null): TenantSubscription {
  return {
    id, tenantId: "t", planId: "starter", validFrom: sp(from), validTo: to ? sp(to) : null,
    monthlyPriceOverrideCents: null, includedUsersOverride: null, includedStorageGbOverride: null,
    extraUserPriceOverrideCents: null, extraGbPriceOverrideCents: null, dueDays: 10, status: "active",
    endedReason: null, endedBy: null, notes: null, createdAt: sp(from), updatedAt: sp(from),
  } as TenantSubscription;
}

function addon(id: string, subscriptionId: string, planId: string, from: string, to: string | null, override: number | null = null): TenantSubscriptionAddon {
  return { id, tenantId: "t", subscriptionId, planId, validFrom: sp(from), validTo: to ? sp(to) : null, perVehiclePriceOverrideCents: override, createdAt: sp(from), updatedAt: sp(from) };
}

const binding = (vehicleId: string, validFrom: string, validTo: string | null) => ({ vehicleId, validFrom, validTo });

const STARTER = version("v-starter", "starter", "2026-01-01", null);
const BASIC = version("v-basic", "tracking_basic", "2026-01-01", null, { pricingUnit: "per_vehicle", monthlyPriceCents: 0, perVehiclePriceCents: 1_990 });
const PLUS = version("v-plus", "tracking_plus", "2026-01-01", null, { pricingUnit: "per_vehicle", monthlyPriceCents: 0, perVehiclePriceCents: 2_990 });
const FLAT = version("v-flat", "tracking_basic", "2026-01-01", null, { pricingUnit: "flat", monthlyPriceCents: 5_000, perVehiclePriceCents: null });
const THREE = [binding("x", "2026-09-01", null), binding("y", "2026-09-01", null), binding("z", "2026-09-01", null)];

function source(patch: Partial<StatementSourceData> = {}): StatementSourceData {
  return {
    tenantSlug: "patio-1",
    subscriptions: [subscription("s1", "2026-09-01", null)],
    addons: [],
    versionsByPlan: new Map([["starter", [STARTER]], ["tracking_basic", [BASIC]], ["tracking_plus", [PLUS]]]),
    usage: [],
    bindings: THREE,
    ...patch,
  };
}

function close(data: StatementSourceData, pin: StatementVersionPin | null = null) {
  const inputs = buildStatementInputs("2026-10", data, { pin });
  assert.equal(inputs.kind, "ready", JSON.stringify(inputs));
  const ready = inputs as Extract<typeof inputs, { kind: "ready" }>;
  const input: StatementComputationInput = { ...ready.computation, adjustmentsCents: 0, creditsAppliedCents: 0 };
  return { ready, input, computed: computeStatement(input) };
}

test("T-TRK-1 · por veículo: 3 veículos com vínculo × preço do add-on = uma linha de rastreamento, sem pro-rata", () => {
  const { ready, computed } = close(source({ addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)] }));
  assert.deepEqual(
    [computed.trackingCents, computed.trackingUnit, computed.trackingBilledVehicles, computed.trackedVehicles, computed.totalCents],
    [5_970, "per_vehicle", 3, 3, 36_970],
  );
  assert.deepEqual([ready.addonPlanVersionId, ready.computation.perVehiclePriceCents], ["v-basic", 1_990]);
});

test("T-TRK-2 · mensalidade fixa (flat): o mês cheio cobra a mensalidade; 16 dias de 31 cobram o pro-rata", () => {
  const versions = new Map([["starter", [STARTER]], ["tracking_basic", [FLAT]]]);
  const full = close(source({ versionsByPlan: versions, addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)] }));
  assert.deepEqual([full.computed.trackingCents, full.computed.trackingUnit, full.ready.computation.perVehiclePriceCents], [5_000, "flat", null]);
  const half = close(source({
    versionsByPlan: versions,
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-16"), subscription("s2", "2026-10-16", null)],
    addons: [addon("a2", "s2", "tracking_basic", "2026-10-16", null)],
  }));
  // 5000 × 16 / 31 = 2580,6… → 2581 (half-up)
  assert.deepEqual([half.computed.trackingCents, half.computed.totalCents], [2_581, 33_581]);
});

test("T-TRK-3 · mensalidade fixa sem nenhum veículo com vínculo nos dias do add-on → 0 (0 cobrança sem vínculo vigente)", () => {
  const versions = new Map([["starter", [STARTER]], ["tracking_basic", [FLAT]]]);
  const { computed } = close(source({ versionsByPlan: versions, bindings: [], addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)] }));
  assert.deepEqual([computed.trackingCents, computed.trackingUnit, computed.trackingBilledVehicles], [0, "flat", 0]);
});

test("T-TRK-4 · vínculo que acabou antes de o add-on existir não é cobrado; a medição do mês continua contando o veículo", () => {
  const { computed } = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-30"), subscription("s2", "2026-10-30", null)],
    addons: [addon("a2", "s2", "tracking_basic", "2026-10-30", null)],
    bindings: [binding("x", "2026-09-01", "2026-10-05")],
  }));
  assert.deepEqual([computed.trackingCents, computed.trackingBilledVehicles, computed.trackedVehicles], [0, 0, 1]);
});

test("T-TRK-5 · add-on encerrado no dia 20 (assinatura nova sem add-on) cobra os veículos dos dias com add-on", () => {
  const { ready, computed } = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-20"), subscription("s2", "2026-10-20", null)],
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", "2026-10-20")],
  }));
  assert.deepEqual([computed.trackingCents, computed.trackingBilledVehicles, ready.addonPlanVersionId], [5_970, 3, "v-basic"]);
});

test("T-TRK-6 · organização com vínculos e sem add-on: mede 3, cobra 0, sem versão de add-on", () => {
  const { ready, computed } = close(source());
  assert.deepEqual([computed.trackingCents, computed.trackingUnit, computed.trackedVehicles, ready.addonPlanVersionId, ready.computation.tracking], [0, null, 3, null, null]);
});

test("T-TRK-7 · add-on vigente sem preço NÃO fecha com rastreamento zero: o fechamento é pulado com addon_without_price", () => {
  const semVersao = buildStatementInputs("2026-10", source({
    versionsByPlan: new Map([["starter", [STARTER]]]),
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)],
  }), { pin: null });
  assert.deepEqual(semVersao, { kind: "skip", reason: "addon_without_price" });
  const semPreco = buildStatementInputs("2026-10", source({
    versionsByPlan: new Map([["starter", [STARTER]], ["tracking_basic", [version("v-nulo", "tracking_basic", "2026-01-01", null, { pricingUnit: "per_vehicle", perVehiclePriceCents: null })]]]),
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)],
  }), { pin: null });
  assert.deepEqual(semPreco, { kind: "skip", reason: "addon_without_price" });
});

test("T-TRK-8 · por veículo, troca Básico → Plus no dia 16: um preço só no mês, o do último dia; descer no dia 31 cobra o mês pelo Básico", () => {
  const { ready, computed } = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-16"), subscription("s2", "2026-10-16", null)],
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", "2026-10-16"), addon("a2", "s2", "tracking_plus", "2026-10-16", null)],
  }));
  assert.deepEqual([computed.trackingCents, computed.trackingBilledVehicles, ready.addonPlanVersionId], [8_970, 3, "v-plus"]);
  // A8 da crítica (K2): Plus nos dias 1-30 e Básico só no dia 31 → o mês inteiro pelo Básico. É a regra, dita ao dono.
  const desce = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-31"), subscription("s2", "2026-10-31", null)],
    addons: [addon("a1", "s1", "tracking_plus", "2026-09-01", "2026-10-31"), addon("a2", "s2", "tracking_basic", "2026-10-31", null)],
  }));
  assert.deepEqual([desce.computed.trackingCents, desce.ready.addonPlanVersionId], [5_970, "v-basic"]);
});

test("T-TRK-9 · snapshot gravado antes do B-ASS-12 recalcula igual; o snapshot novo guarda `tracking` e sobrevive ao JSON", () => {
  const antigo = {
    daysInMonth: 31,
    segments: [{ subscriptionId: "s1", planVersionId: "v-starter", fromDay: 1, toDay: 31, monthlyPriceCents: 31_000 }],
    terms: { includedUsers: 5, includedStorageMilliGb: 5_000, extraUserPriceCents: 2_000, extraGbPriceCents: 300 },
    measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 3 },
    perVehiclePriceCents: 1_990,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
  } as StatementSnapshot;
  assert.equal("tracking" in antigo, false);
  assert.deepEqual([computeStatement(antigo).trackingCents, recompute(antigo)], [5_970, 36_970]);

  // O caso em que a regra nova e a antiga DIVERGEM (vínculo fora dos dias do add-on): o snapshot novo tem de carregar `tracking`.
  const { input, computed } = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-30"), subscription("s2", "2026-10-30", null)],
    addons: [addon("a2", "s2", "tracking_basic", "2026-10-30", null)],
    bindings: [binding("x", "2026-09-01", "2026-10-05")],
  }));
  const gravado = JSON.parse(JSON.stringify(snapshotOf(input))) as StatementSnapshot;
  assert.deepEqual(gravado.tracking, {
    billedVehicles: 0,
    perVehicle: { addonPlanVersionId: "v-basic", billedVehicles: 0, perVehiclePriceCents: 1_990 },
    flatSegments: [],
  });
  assert.equal(recompute(gravado), computed.totalCents);
  assert.equal(computed.trackingCents, 0);

  const semAddon = JSON.parse(JSON.stringify(snapshotOf(close(source()).input))) as StatementSnapshot;
  assert.equal(semAddon.tracking, null, "sem add-on o snapshot novo grava tracking: null (não some)");
});

test("T-TRK-10 · a sobrescrita por veículo da organização vence o preço da versão; zero é cortesia explícita", () => {
  const custom = close(source({ addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null, 990)] }));
  assert.equal(custom.computed.trackingCents, 2_970);
  const cortesia = close(source({ addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null, 0)] }));
  assert.deepEqual([cortesia.computed.trackingCents, cortesia.computed.trackingUnit], [0, "per_vehicle"]);
});

test("T-TRK-11 · veículo X nos dias 1-10 e Y nos dias 11-30: add-on o mês todo cobra 2; add-on só a partir do dia 11 cobra 1", () => {
  const bindings = [binding("x", "2026-10-01", "2026-10-10"), binding("y", "2026-10-11", "2026-10-30")];
  const inteiro = close(source({ bindings, addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)] }));
  assert.deepEqual([inteiro.computed.trackingBilledVehicles, inteiro.computed.trackingCents], [2, 3_980]);
  const parcial = close(source({
    bindings,
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-11"), subscription("s2", "2026-10-11", null)],
    addons: [addon("a2", "s2", "tracking_basic", "2026-10-11", null)],
  }));
  assert.deepEqual([parcial.computed.trackingBilledVehicles, parcial.computed.trackedVehicles, parcial.computed.trackingCents], [1, 2, 1_990]);
});

test("T-TRK-12 · o motor recusa quantidade incoerente: cobrados acima dos medidos, trecho fora do mês, trechos sobrepostos, cobrança vazia", () => {
  const base = close(source({ addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)] })).input;
  const perVehicle = { addonPlanVersionId: "v-basic", billedVehicles: 3, perVehiclePriceCents: 1_990 };
  const trecho = (fromDay: number, toDay: number, billedVehicles = 1) => ({ addonId: "a1", addonPlanVersionId: "v-flat", fromDay, toDay, monthlyPriceCents: 5_000, billedVehicles });
  const recusa = (tracking: StatementComputationInput["tracking"], reason: string) =>
    assert.throws(() => computeStatement({ ...base, tracking }), (error) => error instanceof StatementEngineError && error.reason === reason, reason);
  recusa({ billedVehicles: 4, perVehicle, flatSegments: [] }, "invalid_quantity");
  recusa({ billedVehicles: 3, perVehicle: { ...perVehicle, billedVehicles: 4 }, flatSegments: [] }, "invalid_quantity");
  recusa({ billedVehicles: 3, perVehicle: null, flatSegments: [trecho(1, 31, 4)] }, "invalid_quantity");
  recusa({ billedVehicles: 3, perVehicle: null, flatSegments: [trecho(0, 10)] }, "invalid_segment");
  recusa({ billedVehicles: 3, perVehicle: null, flatSegments: [trecho(20, 32)] }, "invalid_segment");
  recusa({ billedVehicles: 3, perVehicle: null, flatSegments: [trecho(1, 15), trecho(15, 31)] }, "overlapping_segments");
  recusa({ billedVehicles: 0, perVehicle: null, flatSegments: [] }, "invalid_tracking");
});

// ---------------------------------------------------------------------------------------------------------------
// Emenda 1 (crítica r1, A2, A3, A6, A7).

const BASIC_ATE_15 = version("v-basic", "tracking_basic", "2026-01-01", "2026-10-15", { pricingUnit: "per_vehicle", monthlyPriceCents: 0, perVehiclePriceCents: 1_990 });
const FLAT_DE_15 = version("v-flat2", "tracking_basic", "2026-10-15", null, { pricingUnit: "flat", monthlyPriceCents: 5_000, perVehiclePriceCents: null });
const F5_ATE_15 = version("v-f5", "tracking_basic", "2026-01-01", "2026-10-15", { pricingUnit: "flat", monthlyPriceCents: 5_000, perVehiclePriceCents: null });
const F8_DE_15 = version("v-f8", "tracking_basic", "2026-10-15", null, { pricingUnit: "flat", monthlyPriceCents: 8_000, perVehiclePriceCents: null });
const PLUS_FLAT = version("v-plusflat", "tracking_plus", "2026-01-01", null, { pricingUnit: "flat", monthlyPriceCents: 9_000, perVehiclePriceCents: null });
const catalogo = (basic: SubscriptionPlanVersion[], plus: SubscriptionPlanVersion[] = [PLUS]) => new Map([["starter", [STARTER]], ["tracking_basic", basic], ["tracking_plus", plus]]);
const mesTodo = (override: number | null = null) => [addon("a1", "s1", "tracking_basic", "2026-09-01", null, override)];
const trechos = (computed: ReturnType<typeof computeStatement>) =>
  computed.trackingSegments.map((segment) => [segment.addonPlanVersionId, segment.fromDay, segment.toDay, segment.days, segment.billedVehicles, segment.cents]);

test("T-TRK-13 · versão de mensalidade fixa nova NÃO apaga a sobrescrita por veículo: a cortesia continua 0 e o preço combinado continua valendo", () => {
  const comFlat = catalogo([BASIC_ATE_15, FLAT_DE_15]);
  // K1 da crítica: cortesia (sobrescrita 0); a plataforma publica uma versão `flat` de 5000 a partir do dia 15.
  const cortesia = close(source({ addons: mesTodo(0), versionsByPlan: comFlat }));
  assert.deepEqual(
    [cortesia.computed.trackingCents, cortesia.computed.trackingUnit, cortesia.computed.trackingBilledVehicles, cortesia.computed.trackingSegments.length],
    [0, "per_vehicle", 3, 0],
    "a cortesia não vira mensalidade fixa",
  );
  assert.deepEqual([cortesia.ready.addonPlanVersionId, cortesia.ready.computation.perVehiclePriceCents], ["v-flat2", 0]);
  // Preço combinado de 990 por veículo: 3 × 990 = 2970, o mês todo, apesar da versão `flat`.
  const combinado = close(source({ addons: mesTodo(990), versionsByPlan: comFlat }));
  assert.deepEqual([combinado.computed.trackingCents, combinado.computed.trackingUnit], [2_970, "per_vehicle"]);
  // Controle: SEM sobrescrita a mesma versão `flat` cobra — por veículo nos dias 1-14 (3 × 1990 = 5970) e a mensalidade
  // fixa nos dias 15-31 (5000 × 17 / 31 = 2741,9… → 2742). 5970 + 2742 = 8712.
  const semSobrescrita = close(source({ addons: mesTodo(), versionsByPlan: comFlat }));
  assert.deepEqual(
    [semSobrescrita.computed.trackingCents, semSobrescrita.computed.trackingUnit, semSobrescrita.computed.trackingPerVehicleCents, semSobrescrita.computed.trackingFlatCents],
    [8_712, "mixed", 5_970, 2_742],
  );
  assert.deepEqual(trechos(semSobrescrita.computed), [["v-flat2", 15, 31, 17, 3, 2_742]]);
});

test("T-TRK-14 · mensalidade fixa cobra POR SEGMENTO de vigência (P17/R-B): o caso exato 5000 até o dia 14 e 8000 do dia 15 em diante = 6645", () => {
  // K6 da crítica. 5000 × 14 / 31 = 2258,06… → 2258;  8000 × 17 / 31 = 4387,09… → 4387;  2258 + 4387 = 6645 (não 8000).
  const k6 = close(source({ addons: mesTodo(), versionsByPlan: catalogo([F5_ATE_15, F8_DE_15]) }));
  assert.deepEqual([k6.computed.trackingCents, k6.computed.trackingUnit, k6.computed.totalCents], [6_645, "flat", 37_645]);
  assert.deepEqual(trechos(k6.computed), [["v-f5", 1, 14, 14, 3, 2_258], ["v-f8", 15, 31, 17, 3, 4_387]]);
  assert.deepEqual([k6.ready.addonPlanVersionId, k6.ready.computation.perVehiclePriceCents], ["v-f8", null]);

  // Half-up POR TRECHO, nunca sobre a soma: 5000 × 2 / 31 = 322,58 → 323;  8000 × 29 / 31 = 7483,87 → 7484;  = 7807.
  // (Arredondar a soma daria 7806,45 → 7806.)
  const porTrecho = close(source({
    addons: mesTodo(),
    versionsByPlan: catalogo([{ ...F5_ATE_15, validTo: sp("2026-10-03") }, { ...F8_DE_15, validFrom: sp("2026-10-03") }]),
  }));
  assert.deepEqual([porTrecho.computed.trackingCents, trechos(porTrecho.computed).map((row) => row[5])], [7_807, [323, 7_484]]);

  // K3 da crítica: Básico por veículo nos dias 1-15 e Plus de mensalidade fixa 9000 do dia 16 em diante.
  // Por veículo, sem pro-rata: 3 × 1990 = 5970.  Fixa: 9000 × 16 / 31 = 4645,16 → 4645.  Total 10615 (não 9000).
  const k3 = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-16"), subscription("s2", "2026-10-16", null)],
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", "2026-10-16"), addon("a2", "s2", "tracking_plus", "2026-10-16", null)],
    versionsByPlan: catalogo([BASIC], [PLUS_FLAT]),
  }));
  assert.deepEqual([k3.computed.trackingCents, k3.computed.trackingUnit, k3.ready.addonPlanVersionId], [10_615, "mixed", "v-plusflat"]);
  assert.deepEqual(trechos(k3.computed), [["v-plusflat", 16, 31, 16, 3, 4_645]]);

  // Recontratação do MESMO add-on fixo no dia 16 (assinatura nova): dois trechos, como na base.
  // 5000 × 15 / 31 = 2419,35 → 2419;  5000 × 16 / 31 = 2580,65 → 2581;  = 5000.
  const recontratado = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-16"), subscription("s2", "2026-10-16", null)],
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", "2026-10-16"), addon("a2", "s2", "tracking_basic", "2026-10-16", null)],
    versionsByPlan: catalogo([FLAT]),
  }));
  assert.deepEqual(trechos(recontratado.computed), [["v-flat", 1, 15, 15, 3, 2_419], ["v-flat", 16, 31, 16, 3, 2_581]]);
  assert.equal(recontratado.computed.trackingCents, 5_000);

  // K5 da crítica: add-on o mês todo e a versão só existe a partir do dia 20 → dia com add-on e sem preço: pula.
  const k5 = buildStatementInputs("2026-10", source({ addons: mesTodo(), versionsByPlan: catalogo([{ ...F8_DE_15, validFrom: sp("2026-10-20") }]) }), { pin: null });
  assert.deepEqual(k5, { kind: "skip", reason: "addon_without_price" });
});

test("T-TRK-15 · cada trecho de mensalidade fixa só cobra se algum veículo teve vínculo NAQUELE trecho", () => {
  // O único vínculo vale nos dias 1-10: o trecho 1-14 cobra (2258); o trecho 15-31 não tem vínculo e não cobra.
  const { computed } = close(source({ addons: mesTodo(), versionsByPlan: catalogo([F5_ATE_15, F8_DE_15]), bindings: [binding("x", "2026-10-01", "2026-10-10")] }));
  assert.deepEqual([computed.trackingCents, computed.trackingBilledVehicles, computed.trackedVehicles], [2_258, 1, 1]);
  assert.deepEqual(trechos(computed), [["v-f5", 1, 14, 14, 1, 2_258], ["v-f8", 15, 31, 17, 0, 0]]);
});

test("T-TRK-16 · borda do vínculo é inclusiva nos dois lados: termina no 1º dia com add-on cobra; começa no último dia com add-on cobra; um dia fora não cobra", () => {
  // Add-on só nos dias 11-20 (assinatura s2 com add-on; s3 a partir do dia 21, sem add-on).
  const janela = (bindings: ReturnType<typeof binding>[]) => close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-11"), subscription("s2", "2026-10-11", "2026-10-21"), subscription("s3", "2026-10-21", null)],
    addons: [addon("a2", "s2", "tracking_basic", "2026-10-11", "2026-10-21")],
    bindings,
  })).computed;
  const cobra = (bindings: ReturnType<typeof binding>[]) => { const c = janela(bindings); return [c.trackingBilledVehicles, c.trackingCents, c.trackedVehicles]; };
  assert.deepEqual(cobra([binding("x", "2026-09-01", "2026-10-11")]), [1, 1_990, 1], "termina no 1º dia com add-on (dia 11)");
  assert.deepEqual(cobra([binding("x", "2026-10-20", null)]), [1, 1_990, 1], "começa no último dia com add-on (dia 20)");
  assert.deepEqual(cobra([binding("x", "2026-09-01", "2026-10-10")]), [0, 0, 1], "terminou na véspera do add-on");
  assert.deepEqual(cobra([binding("x", "2026-10-21", null)]), [0, 0, 1], "começou no dia seguinte ao fim do add-on");
});

test("T-TRK-17 · add-on ABERTO de uma assinatura já encerrada não cobra os dias da assinatura nova (o add-on é o da assinatura do dia)", () => {
  // Dado incoerente que o PUT não atômico pode deixar: s1 fechada no dia 11, o add-on dela ficou aberto, s2 sem add-on.
  const { computed, ready } = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-11"), subscription("s2", "2026-10-11", null)],
    addons: [addon("a1", "s1", "tracking_basic", "2026-09-01", null)],
    bindings: [binding("x", "2026-10-15", null)],
  }));
  assert.deepEqual([computed.trackingBilledVehicles, computed.trackingCents, computed.trackedVehicles, ready.addonPlanVersionId], [0, 0, 1, "v-basic"]);
});

test("T-TRK-18 · refechar fixa TODAS as versões do add-on gravadas no snapshot (a de cada trecho), não só a da coluna", () => {
  const antes = source({ addons: mesTodo(), versionsByPlan: catalogo([F5_ATE_15, F8_DE_15]) });
  const fechado = close(antes);
  assert.equal(fechado.computed.trackingCents, 6_645);
  const statement = {
    planVersionId: fechado.ready.planVersionId,
    addonPlanVersionId: fechado.ready.addonPlanVersionId,
    snapshot: { latest: JSON.parse(JSON.stringify(snapshotOf(fechado.input))) as StatementSnapshot },
  } as unknown as SubscriptionStatement;
  const pin = pinOf(statement);
  assert.deepEqual([...pin.addonPlanVersionIds].sort(), ["v-f5", "v-f8"], "o pin leva a versão de CADA trecho");

  // Depois do fechamento a plataforma publica uma 3ª versão, vigente desde o dia 25 (fecha a v-f8 no dia 25).
  const F9 = version("v-f9", "tracking_basic", "2026-10-25", null, { pricingUnit: "flat", monthlyPriceCents: 20_000, perVehiclePriceCents: null });
  const depois = source({ addons: mesTodo(), versionsByPlan: catalogo([F5_ATE_15, { ...F8_DE_15, validTo: sp("2026-10-25") }, F9]) });
  assert.notEqual(close(depois).computed.trackingCents, 6_645, "pré-condição: sem pin, a versão nova muda o valor");
  const refechado = close(depois, pin);
  assert.deepEqual([refechado.computed.trackingCents, trechos(refechado.computed)], [6_645, trechos(fechado.computed)]);
  // Só a coluna (o pin antigo) deixaria o trecho 1-14 pelo preço de 8000.
  assert.notEqual(close(depois, { planVersionIds: pin.planVersionIds, addonPlanVersionIds: ["v-f8"] }).computed.trackingCents, 6_645);
});

test("T-TRK-19 · o inverso: Plus de mensalidade fixa nos dias 1-15 e Básico por veículo do dia 16 em diante", () => {
  // Fixa: 9000 × 15 / 31 = 4354,8… → 4355.  Por veículo: 3 × 1990 = 5970.  Total 10325.
  const { computed, ready } = close(source({
    subscriptions: [subscription("s1", "2026-09-01", "2026-10-16"), subscription("s2", "2026-10-16", null)],
    addons: [addon("a1", "s1", "tracking_plus", "2026-09-01", "2026-10-16"), addon("a2", "s2", "tracking_basic", "2026-10-16", null)],
    versionsByPlan: catalogo([BASIC], [PLUS_FLAT]),
  }));
  assert.deepEqual([computed.trackingCents, computed.trackingUnit, ready.addonPlanVersionId, ready.computation.perVehiclePriceCents], [10_325, "mixed", "v-basic", 1_990]);
  assert.deepEqual(trechos(computed), [["v-plusflat", 1, 15, 15, 3, 4_355]]);
});
