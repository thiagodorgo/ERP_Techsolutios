import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { computeDuePeriods, summarizeAccrual, type AccrualParams } from "../src/modules/charging/charge.accrual.js";
import {
  createChargeServiceWithResolver,
  getMemoryChargeRepositoryForTests,
  resetChargeRuntimeForTests,
} from "../src/modules/charging/charge.service.js";
import type { ChargeActorContext } from "../src/modules/charging/charge.types.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import type { TariffResolver } from "../src/modules/tariffs/tariff-resolution.js";
import type { Tariff } from "../src/modules/tariffs/tariff.types.js";
import type { DailyCap, DailyModel, ProfileScope } from "../src/modules/jurisdiction/jurisdiction.types.js";

const MS_PER_DAY = 86_400_000;
const SP = "America/Sao_Paulo"; // UTC-3 sem DST (pós-2019)
const NY = "America/New_York"; // DST vivo (spring-forward/fall-back)

// PRNG determinístico (mulberry32) — property-based sem dependência nova (fast-check = junta-5).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function params(over: Partial<AccrualParams> & Pick<AccrualParams, "t0" | "asOf">): AccrualParams {
  return { timezone: SP, model: "ROLLING_24H", cap: "UNLIMITED", suspensions: [], ...over };
}

function makeTariff(unitPrice: number, currency = "BRL"): Tariff {
  const now = new Date();
  return {
    id: randomUUID(),
    tenantId: "tenant",
    priceTableId: randomUUID(),
    name: "Diária",
    unitPrice,
    currency,
    origin: "test",
    status: "active",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

const fixedResolver = (unitPrice: number, currency = "BRL"): TariffResolver => async () => makeTariff(unitPrice, currency);
const undefinedResolver: TariffResolver = async () => undefined;

type ProfileShape = { scope: ProfileScope; model: DailyModel; cap: DailyCap; dailyServiceCatalogId?: string };

async function setup(): Promise<{ tenantId: string; profileId: string }> {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  return { tenantId: randomUUID(), profileId: randomUUID() };
}

async function makeProcess(tenantId: string, profileId: string, t0: Date, profile: ProfileShape, timezone = SP): Promise<string> {
  const impound = getMemoryImpoundRepositoryForTests();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: t0,
    actorId: undefined,
  });
  const chargeRepo = getMemoryChargeRepositoryForTests();
  chargeRepo.setProfileForTests(tenantId, profileId, profile);
  chargeRepo.setTimezoneForTests(tenantId, process.id, timezone);
  return process.id;
}

function actor(tenantId: string): ChargeActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["charging:read", "charging:create"] };
}

// ── 1. ROLLING × CALENDAR: contagem correta + fronteira do 1º dia (property-based) ──────────────────────────
test("ROLLING: nDue = floor(Δ/24h) para 200 pares (t0, Δ) gerados; period_seq contíguo 1..n", () => {
  const rng = mulberry32(0xa5c3);
  for (let i = 0; i < 200; i += 1) {
    const t0 = new Date(Date.UTC(2020, 0, 1) + Math.floor(rng() * 3 * 365 * MS_PER_DAY));
    const deltaMs = Math.floor(rng() * 400 * MS_PER_DAY);
    const asOf = new Date(t0.getTime() + deltaMs);
    const summary = summarizeAccrual(params({ t0, asOf }));
    assert.equal(summary.nDue, Math.floor(deltaMs / MS_PER_DAY), `Δ=${deltaMs}ms`);
    const periods = computeDuePeriods(params({ t0, asOf }));
    periods.forEach((p, idx) => assert.equal(p.periodSeq, idx + 1));
  }
});

test("ROLLING: fronteira do 1º dia — t0+24h-1s → 0; t0+24h → 1 (convenção-piso D-Ω5P-CHG-06)", () => {
  const t0 = new Date("2024-06-01T12:00:00.000Z");
  assert.equal(computeDuePeriods(params({ t0, asOf: new Date(t0.getTime() + MS_PER_DAY - 1000) })).length, 0);
  assert.equal(computeDuePeriods(params({ t0, asOf: new Date(t0.getTime() + MS_PER_DAY) })).length, 1);
  assert.equal(computeDuePeriods(params({ t0, asOf: new Date(t0.getTime()) })).length, 0);
});

test("CALENDAR: entra 23:30 e às 00:10 do dia seguinte = 2 diárias (datas locais distintas)", () => {
  // America/Sao_Paulo (UTC-3): local 23:30 de 2024-03-10 = 02:30Z de 2024-03-11; local 00:10 = 03:10Z.
  const t0 = new Date("2024-03-11T02:30:00.000Z");
  const asOf = new Date("2024-03-11T03:10:00.000Z");
  const periods = computeDuePeriods(params({ t0, asOf, model: "CALENDAR" }));
  assert.equal(periods.length, 2);
  assert.deepEqual(periods.map((p) => p.refDate), ["2024-03-10", "2024-03-11"]);
});

test("CALENDAR: refDates estritamente crescentes por +1 dia; count = dias-calendário locais inclusivos", () => {
  const rng = mulberry32(0x1234);
  for (let i = 0; i < 120; i += 1) {
    const t0 = new Date(Date.UTC(2021, 0, 1) + Math.floor(rng() * 2 * 365 * MS_PER_DAY) + Math.floor(rng() * MS_PER_DAY));
    const asOf = new Date(t0.getTime() + Math.floor(rng() * 90 * MS_PER_DAY));
    const periods = computeDuePeriods(params({ t0, asOf, model: "CALENDAR" }));
    for (let k = 1; k < periods.length; k += 1) {
      const prev = Date.parse(`${periods[k - 1].refDate}T00:00:00Z`);
      const cur = Date.parse(`${periods[k].refDate}T00:00:00Z`);
      assert.equal(cur - prev, MS_PER_DAY, "refDates contíguas por +1 dia");
      assert.equal(periods[k].periodSeq, k + 1);
    }
  }
});

// ── 2. DST — entrada perto da virada: nenhuma diária duplicada nem pulada ────────────────────────────────────
test("DST spring-forward (America/New_York, 2024-03-10): ROLLING conta tempo físico; sem duplicar/pular", () => {
  // Véspera do spring-forward: 2024-03-09 12:00 local (17:00Z, EST UTC-5). +5 dias atravessa a virada.
  const t0 = new Date("2024-03-09T17:00:00.000Z");
  const asOf = new Date(t0.getTime() + 5 * MS_PER_DAY);
  const rolling = computeDuePeriods(params({ t0, asOf, timezone: NY }));
  assert.equal(rolling.length, 5, "ROLLING = tempo físico absoluto, imune a DST");
  const calendar = computeDuePeriods(params({ t0, asOf, timezone: NY, model: "CALENDAR" }));
  // 6 datas-calendário locais (09,10,11,12,13,14 de março): o dia da virada NÃO é pulado nem duplicado.
  assert.equal(calendar.length, 6);
  calendar.forEach((p, idx) => assert.equal(p.periodSeq, idx + 1));
  assert.equal(new Set(calendar.map((p) => p.refDate)).size, 6, "sem refDate duplicada");
});

test("DST fall-back (America/New_York, 2024-11-03): sem diária extra nem faltante", () => {
  const t0 = new Date("2024-11-01T16:00:00.000Z"); // 2024-11-01 12:00 EDT
  const asOf = new Date(t0.getTime() + 5 * MS_PER_DAY);
  assert.equal(computeDuePeriods(params({ t0, asOf, timezone: NY })).length, 5);
  const calendar = computeDuePeriods(params({ t0, asOf, timezone: NY, model: "CALENDAR" }));
  assert.equal(new Set(calendar.map((p) => p.refDate)).size, calendar.length, "period_seq contíguo, sem duplicata");
});

// ── 3. Teto intertemporal (30 legado / 6 meses / ilimitado) — acumulação PARA no teto ───────────────────────
test("THIRTY_DAYS_LEGACY: para em 30 diárias (Tema 124/STJ)", () => {
  const t0 = new Date("2024-01-10T12:00:00.000Z");
  const asOf = new Date(t0.getTime() + 100 * MS_PER_DAY);
  const summary = summarizeAccrual(params({ t0, asOf, cap: "THIRTY_DAYS_LEGACY" }));
  assert.equal(summary.nDue, 100);
  assert.equal(summary.nAccrue, 30);
  assert.equal(summary.capReached, true);
  assert.equal(computeDuePeriods(params({ t0, asOf, cap: "THIRTY_DAYS_LEGACY" })).length, 30);
});

test('SIX_MONTHS: teto passa a 180 diárias (D-DONO-2311-DIARIA-AUDIO, P13 "para tudo"); acumulação PARA', () => {
  const t0 = new Date("2024-01-01T12:00:00.000Z");
  const summaryAt300 = summarizeAccrual(params({ t0, asOf: new Date(t0.getTime() + 300 * MS_PER_DAY), cap: "SIX_MONTHS" }));
  assert.equal(summaryAt300.capCount, 180);
  assert.equal(summaryAt300.nAccrue, 180);
  assert.equal(summaryAt300.capReached, true);
  const summaryAt400 = summarizeAccrual(params({ t0, asOf: new Date(t0.getTime() + 400 * MS_PER_DAY), cap: "SIX_MONTHS" }));
  assert.equal(summaryAt400.nAccrue, 180, "acumulação PARA no teto");
});

test('UNLIMITED (privado): passa a 180 diárias (P13 "para tudo"); acumulação PARA', () => {
  const t0 = new Date("2024-01-01T12:00:00.000Z");
  const asOf = new Date(t0.getTime() + 500 * MS_PER_DAY);
  const summary = summarizeAccrual(params({ t0, asOf, cap: "UNLIMITED" }));
  assert.equal(summary.capCount, 180);
  assert.equal(summary.nAccrue, 180);
  assert.equal(summary.capReached, true);
});

// ── E11.7 / E11.1-E — casos T1 a T6 do motor (vermelho na base 5f57bff07 por asserção de produto) ──────────
test("T1: 200 dias sem leilão → vencidas 200, cobradas 180 (teto)", () => {
  const t0 = new Date("2026-01-10T15:00:00.000Z");
  const summary = summarizeAccrual(params({ t0, asOf: new Date(t0.getTime() + 200 * MS_PER_DAY), cap: "SIX_MONTHS" }));
  assert.equal(summary.nDue, 200);
  assert.equal(summary.capCount, 180);
  assert.equal(summary.nAccrue, 180);
  assert.equal(summary.capReached, true);
});

test("T2: 30 dias em leilão a partir do 200º dia → vencidas 230, cobradas 180", () => {
  const t0 = new Date("2026-01-10T15:00:00.000Z");
  const summary = summarizeAccrual(params({
    t0,
    asOf: new Date(t0.getTime() + 260 * MS_PER_DAY),
    cap: "SIX_MONTHS",
    suspensions: [{ from: new Date(t0.getTime() + 200 * MS_PER_DAY), to: new Date(t0.getTime() + 230 * MS_PER_DAY) }],
  }));
  assert.equal(summary.nDue, 230);
  assert.equal(summary.nAccrue, 180);
  assert.equal(summary.capReached, true);
});

test("T3: período fechado de 30 dias empurra os instantes das diárias 101 e 120", () => {
  const t0 = new Date("2026-01-10T15:00:00.000Z");
  const suspension = { from: new Date(t0.getTime() + 100 * MS_PER_DAY), to: new Date(t0.getTime() + 130 * MS_PER_DAY) };
  const at125 = summarizeAccrual(params({ t0, asOf: new Date(t0.getTime() + 125 * MS_PER_DAY), cap: "SIX_MONTHS", suspensions: [suspension] }));
  assert.equal(at125.nDue, 100);
  assert.equal(at125.nAccrue, 100);
  const at150 = summarizeAccrual(params({ t0, asOf: new Date(t0.getTime() + 150 * MS_PER_DAY), cap: "SIX_MONTHS", suspensions: [suspension] }));
  assert.equal(at150.nDue, 120);
  assert.equal(at150.nAccrue, 120);
  const at400 = summarizeAccrual(params({ t0, asOf: new Date(t0.getTime() + 400 * MS_PER_DAY), cap: "SIX_MONTHS", suspensions: [suspension] }));
  assert.equal(at400.nDue, 370);
  assert.equal(at400.nAccrue, 180);
  const periods = computeDuePeriods(params({ t0, asOf: new Date(t0.getTime() + 400 * MS_PER_DAY), cap: "SIX_MONTHS", suspensions: [suspension] }));
  assert.equal(periods[100].refInstant.getTime(), new Date(t0.getTime() + 130 * MS_PER_DAY).getTime());
  assert.equal(periods[119].refInstant.getTime(), new Date(t0.getTime() + 149 * MS_PER_DAY).getTime());
});

test("T4: período aberto desde o 100º dia → 100 diárias devidas", () => {
  const t0 = new Date("2026-01-10T15:00:00.000Z");
  const summary = summarizeAccrual(params({
    t0,
    asOf: new Date(t0.getTime() + 300 * MS_PER_DAY),
    cap: "SIX_MONTHS",
    suspensions: [{ from: new Date(t0.getTime() + 100 * MS_PER_DAY) }],
  }));
  assert.equal(summary.nDue, 100);
  assert.equal(summary.nAccrue, 100);
  assert.equal(summary.capReached, false);
});

test("T5: CALENDAR desconta as datas inteiramente em leilão (a 10ª é 10/03 e a 11ª é 20/03)", () => {
  const t0 = new Date("2026-03-01T13:00:00.000Z"); // 01/03 10:00 SP (UTC-3)
  const from = new Date("2026-03-10T18:00:00.000Z"); // 10/03 15:00 SP
  const to = new Date("2026-03-20T12:00:00.000Z"); // 20/03 09:00 SP
  const asOf = new Date("2026-03-25T15:00:00.000Z"); // 25/03 12:00 SP
  const periods = computeDuePeriods(params({ t0, asOf, model: "CALENDAR", cap: "SIX_MONTHS", suspensions: [{ from, to }] }));
  assert.equal(periods.length, 16);
  assert.equal(periods[9].refDate, "2026-03-10");
  assert.equal(periods[10].refDate, "2026-03-20");
});

test("T6: UNLIMITED com 200 dias → 180; THIRTY_DAYS_LEGACY segue 30", () => {
  const t0 = new Date("2026-01-10T15:00:00.000Z");
  const asOf = new Date(t0.getTime() + 200 * MS_PER_DAY);
  assert.equal(summarizeAccrual(params({ t0, asOf, cap: "UNLIMITED" })).nAccrue, 180);
  assert.equal(summarizeAccrual(params({ t0, asOf, cap: "THIRTY_DAYS_LEGACY" })).nAccrue, 30);
});

// ── 4. Determinismo (re-run mesma data = mesmo resultado) ────────────────────────────────────────────────────
test("determinismo: computeDuePeriods com o mesmo asOf devolve o mesmo conjunto", () => {
  const t0 = new Date("2024-02-15T08:20:00.000Z");
  const asOf = new Date(t0.getTime() + 47 * MS_PER_DAY + 3 * 3_600_000);
  const a = computeDuePeriods(params({ t0, asOf, model: "CALENDAR", cap: "SIX_MONTHS" }));
  const b = computeDuePeriods(params({ t0, asOf, model: "CALENDAR", cap: "SIX_MONTHS" }));
  assert.deepEqual(a.map((p) => `${p.periodSeq}:${p.refDate}`), b.map((p) => `${p.periodSeq}:${p.refDate}`));
});

// ── 5. Congelamento em frozen_at (para de acumular) via serviço InMemory ─────────────────────────────────────
test("congelamento: asOf = min(now, frozen_at) fecha o período final; runs posteriores no-op", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  // congela em t0+3d10h (3 diárias piso).
  const frozenAt = new Date(t0.getTime() + 3 * MS_PER_DAY + 10 * 3_600_000);
  const impound = getMemoryImpoundRepositoryForTests();
  await impound.applyTransition({
    tenantId,
    processId,
    expectedFrom: "RECEPTION",
    to: "RELEASED",
    setEnteredAt: false,
    setFrozenAt: true,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "RELEASED", reason: null }, occurredAt: frozenAt, actorId: undefined },
  });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  const first = await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 30 * MS_PER_DAY));
  assert.equal(first.accrued, 3, "só 3 diárias até frozen_at (não 30)");
  const second = await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 60 * MS_PER_DAY));
  assert.equal(second.accrued, 0, "run posterior no-op (congelado)");
  const charges = await service.list(actor(tenantId), processId);
  assert.equal(charges.filter((c) => c.kind === "DAILY").length, 3);
});

// ── 6. FAIL-CLOSED: sem tarifa → NÃO cria charge 0, sinaliza (error_count>0) ─────────────────────────────────
test("fail-closed: sem tarifa vigente ⇒ 0 diárias criadas (NÃO amount-0), errors>0; publicada, o run acumula", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const now = new Date(t0.getTime() + 5 * MS_PER_DAY);
  const blocked = createChargeServiceWithResolver(undefinedResolver);
  const r1 = await blocked.accrueProcess(tenantId, processId, now);
  assert.equal(r1.accrued, 0, "sem tarifa NÃO cobra 0");
  assert.ok(r1.errors > 0, "fail-closed sinaliza");
  assert.equal((await blocked.list(actor(tenantId), processId)).filter((c) => c.kind === "DAILY").length, 0);
  // publicada a tarifa, o run seguinte acumula as faltantes (catch-up).
  const published = createChargeServiceWithResolver(fixedResolver(12.5));
  const r2 = await published.accrueProcess(tenantId, processId, now);
  assert.equal(r2.accrued, 5);
  const dailies = (await published.list(actor(tenantId), processId)).filter((c) => c.kind === "DAILY");
  assert.equal(dailies.length, 5);
  assert.ok(dailies.every((c) => c.unitAmount === "12.50" && c.totalAmount === "12.50"), "valor da tarifa, nunca 0");
});

test("fail-closed: daily_service_catalog_id NULL ⇒ 0 diárias, errors>0", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS" }); // sem dailyServiceCatalogId
  const service = createChargeServiceWithResolver(fixedResolver(10));
  const r = await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 4 * MS_PER_DAY));
  assert.equal(r.accrued, 0);
  assert.ok(r.errors > 0);
});

// ── 7. Idempotência + determinismo do serviço + cadeia I2 (CHARGE_ACCRUAL) ───────────────────────────────────
test("idempotência: acumular 2×/3× o mesmo now não duplica; cadeia I2 permanece valid", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  const now = new Date(t0.getTime() + 7 * MS_PER_DAY);
  const r1 = await service.accrueProcess(tenantId, processId, now);
  const r2 = await service.accrueProcess(tenantId, processId, now);
  const r3 = await service.accrueProcess(tenantId, processId, now);
  assert.equal(r1.accrued, 7);
  assert.equal(r2.accrued, 0);
  assert.equal(r3.accrued, 0);
  const dailies = (await service.list(actor(tenantId), processId)).filter((c) => c.kind === "DAILY");
  assert.equal(dailies.length, 7);
  assert.deepEqual(dailies.map((c) => c.periodSeq), [1, 2, 3, 4, 5, 6, 7]);
  // cadeia I2: os CHARGE_ACCRUAL entram na cadeia e o verifyChain continua valid.
  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, processId);
  assert.ok(snapshot);
  const result = verifyChain({ tenantId, processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
  assert.equal(result.valid, true);
  assert.equal(snapshot.events.filter((e) => e.type === "CHARGE_ACCRUAL").length, 7);
});

// ── 8. ADJUSTMENT não sobrescreve (append-only) + verifyChain valid ─────────────────────────────────────────
test("ADJUSTMENT: corrigir uma diária cria NOVA linha + evento ADJUSTMENT; a diária original fica intacta", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 3 * MS_PER_DAY));
  const before = await service.list(actor(tenantId), processId);
  const targetDaily = before.find((c) => c.kind === "DAILY" && c.periodSeq === 2);
  assert.ok(targetDaily);

  const adjustment = await service.createManual(actor(tenantId), processId, {
    kind: "ADJUSTMENT",
    unit_amount: "4.00", // magnitude >= 0; o SINAL vive no total_amount (contrato do ledger / CHECK)
    quantity: "1",
    total_amount: "-4.00",
    ref_date: targetDaily.refDate,
    adjustment_of_charge_id: targetDaily.id,
    description: "Correção de tarifa retroativa",
  });
  assert.equal(adjustment.kind, "ADJUSTMENT");
  assert.equal(adjustment.totalAmount, "-4.00");
  assert.equal(adjustment.adjustmentOfChargeId, targetDaily.id);

  const after = await service.list(actor(tenantId), processId);
  const originalStill = after.find((c) => c.id === targetDaily.id);
  assert.ok(originalStill);
  assert.equal(originalStill.totalAmount, "10.00", "a diária original NÃO é sobrescrita (append-only)");
  assert.equal(after.filter((c) => c.kind === "DAILY").length, 3, "nenhuma diária removida");
  assert.equal(after.filter((c) => c.kind === "ADJUSTMENT").length, 1);

  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, processId);
  assert.ok(snapshot);
  const result = verifyChain({ tenantId, processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
  assert.equal(result.valid, true, "cadeia I2 valid após acumular + ajustar");
  assert.equal(snapshot.events.filter((e) => e.type === "ADJUSTMENT").length, 1);
  // O serviço NÃO expõe caminho de UPDATE/DELETE de charge (só create/list/statement/accrue).
  assert.equal(typeof (service as unknown as Record<string, unknown>).update, "undefined");
});

// ── C3: statement sinaliza inconsistência (freeze retroativo deixa diárias over-acumuladas) ─────────────────
test("statement (C3): #DAILY persistidas > nAccrue projetado ⇒ reconciliationPending + overAccruedDailies", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  // acumula 7 diárias SEM congelamento.
  await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 7 * MS_PER_DAY));
  // congela RETROATIVAMENTE em t0+3d10h → o motor projeta só 3, mas 7 já estão persistidas (ledger append-only).
  const frozenAt = new Date(t0.getTime() + 3 * MS_PER_DAY + 10 * 3_600_000);
  const impound = getMemoryImpoundRepositoryForTests();
  await impound.applyTransition({
    tenantId,
    processId,
    expectedFrom: "RECEPTION",
    to: "RELEASED",
    setEnteredAt: false,
    setFrozenAt: true,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "RELEASED", reason: null }, occurredAt: frozenAt, actorId: undefined },
  });
  const statement = await service.getStatement(actor(tenantId), processId, new Date(t0.getTime() + 30 * MS_PER_DAY));
  assert.equal(statement.cap?.nAccrue, 3, "motor projeta 3 diárias até frozen_at");
  assert.equal(statement.reconciliationPending, true, "sinaliza pendência (não estorna — reconciliação = PR-10)");
  assert.equal(statement.overAccruedDailies, 4, "7 persistidas − 3 projetadas");
});

test("statement (C3): sem over-acúmulo ⇒ reconciliationPending false / overAccruedDailies 0", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 4 * MS_PER_DAY));
  const statement = await service.getStatement(actor(tenantId), processId, new Date(t0.getTime() + 4 * MS_PER_DAY));
  assert.equal(statement.reconciliationPending, false);
  assert.equal(statement.overAccruedDailies, 0);
});

// ── C5: ADJUSTMENT valida o alvo (existe + mesmo processo/tenant) ────────────────────────────────────────────
test("ADJUSTMENT (C5): alvo inexistente ⇒ 422; alvo de OUTRO processo ⇒ 422; alvo=ADJUSTMENT ⇒ 422", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processA = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const processB = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId: randomUUID() });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  await service.accrueProcess(tenantId, processA, new Date(t0.getTime() + 2 * MS_PER_DAY));
  await service.accrueProcess(tenantId, processB, new Date(t0.getTime() + 2 * MS_PER_DAY));
  const chargeB = (await service.list(actor(tenantId), processB)).find((c) => c.kind === "DAILY");
  assert.ok(chargeB);

  // alvo inexistente
  await assert.rejects(
    () => service.createManual(actor(tenantId), processA, { kind: "ADJUSTMENT", unit_amount: "1.00", total_amount: "-1.00", quantity: "1", adjustment_of_charge_id: randomUUID() }),
    (e: unknown) => (e as { reason?: string }).reason === "adjustment_target_not_found",
  );
  // alvo de OUTRO processo (charge de B, ajustando em A) → não encontrado no ledger de A
  await assert.rejects(
    () => service.createManual(actor(tenantId), processA, { kind: "ADJUSTMENT", unit_amount: "1.00", total_amount: "-1.00", quantity: "1", adjustment_of_charge_id: chargeB.id }),
    (e: unknown) => (e as { reason?: string }).reason === "adjustment_target_not_found",
  );
  // ADJUSTMENT válido em A, depois tentar ajustar o próprio ADJUSTMENT → 422
  const targetA = (await service.list(actor(tenantId), processA)).find((c) => c.kind === "DAILY");
  assert.ok(targetA);
  const adj = await service.createManual(actor(tenantId), processA, { kind: "ADJUSTMENT", unit_amount: "1.00", total_amount: "-1.00", quantity: "1", adjustment_of_charge_id: targetA.id });
  await assert.rejects(
    () => service.createManual(actor(tenantId), processA, { kind: "ADJUSTMENT", unit_amount: "1.00", total_amount: "-1.00", quantity: "1", adjustment_of_charge_id: adj.id }),
    (e: unknown) => (e as { reason?: string }).reason === "adjustment_of_adjustment",
  );
});

test("statement (RN-DIA-06): memória de cálculo com subtotais por kind + status do teto", async () => {
  const { tenantId, profileId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, profileId, t0, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "THIRTY_DAYS_LEGACY", dailyServiceCatalogId: randomUUID() });
  const service = createChargeServiceWithResolver(fixedResolver(10));
  await service.createManual(actor(tenantId), processId, { kind: "REMOVAL", unit_amount: "150.00", quantity: "1" });
  await service.accrueProcess(tenantId, processId, new Date(t0.getTime() + 5 * MS_PER_DAY));
  const statement = await service.getStatement(actor(tenantId), processId, new Date(t0.getTime() + 5 * MS_PER_DAY));
  assert.equal(statement.total, "200.00", "150 remoção + 5×10 diárias");
  const dailySubtotal = statement.subtotals.find((s) => s.kind === "DAILY");
  assert.equal(dailySubtotal?.total, "50.00");
  assert.equal(statement.cap?.cap, "THIRTY_DAYS_LEGACY");
  assert.equal(statement.cap?.nDue, 5);
  assert.equal(statement.cap?.capReached, false);
});
