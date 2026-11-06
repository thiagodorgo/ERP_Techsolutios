import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BYTES_PER_GB,
  activeDayRange,
  bytesToMilliGbCeil,
  computeStatement,
  countDistinctVehiclesInMonth,
  daysInPeriod,
  gbToMilli,
  halfUpDiv,
  prorate,
  recompute,
  snapshotOf,
  type StatementComputationInput,
} from "../src/modules/subscription-billing/statements/statement.engine.js";

// B-ASS-04 · F1 — o motor do demonstrativo (plano §4.4 R-ST-1 e R-ST-4; §3.3). Dinheiro em centavos inteiros.
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA (plano): "half-even" no caso (c) → T-ST-3 vermelho; `Math.round` sobre float no
// total → T-ST-8 (guard de texto) vermelho; esquecer o add-on → T-ST-4 vermelho; usar a versão do 1º dia em vez do
// último → T-ST-39 vermelho (o teste confere a franquia do Professional); `max` diário dos veículos → T-ST-41 vermelho.

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TERMS = { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 1_500, extraGbPriceCents: 250 };

function base(overrides: Partial<StatementComputationInput> = {}): StatementComputationInput {
  return {
    daysInMonth: 30,
    segments: [{ subscriptionId: "s1", planVersionId: "v1", fromDay: 1, toDay: 30, monthlyPriceCents: 31_000 }],
    terms: TERMS,
    measurements: { usersPeak: 10, storagePeakMilliGb: 9_000, trackedVehicles: 0 },
    perVehiclePriceCents: null,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
    ...overrides,
  };
}

test("T-ST-1 (a) · sem excedente → total = base", () => {
  const result = computeStatement(base());
  assert.equal(result.baseCents, 31_000);
  assert.equal(result.usersExtraCents, 0);
  assert.equal(result.storageExtraCents, 0);
  assert.equal(result.trackingCents, 0);
  assert.equal(result.totalCents, 31_000);
});

test("T-ST-2 (b) · 12 usuários / 10 incluídos × R$ 15,00 → R$ 30,00 de excedente", () => {
  const result = computeStatement(base({ measurements: { usersPeak: 12, storagePeakMilliGb: 0, trackedVehicles: 0 } }));
  assert.equal(result.usersExtra, 2);
  assert.equal(result.usersExtraCents, 3_000);
  assert.equal(result.totalCents, 31_000 + 3_000);
});

test("T-ST-3 (c) · 10,2345 GB / 10 incluídos × R$ 2,50 → 0,235 GB (teto a 0,001) e R$ 0,59 (0,5875 half-up)", () => {
  // 10,2345 GB em bytes: o teto a 0,001 GB dá 10,235.
  const bytes = (102_345n * BYTES_PER_GB + 9_999n) / 10_000n;
  const peakMilli = bytesToMilliGbCeil(bytes);
  assert.equal(peakMilli, 10_235);
  const result = computeStatement(base({ measurements: { usersPeak: 0, storagePeakMilliGb: peakMilli, trackedVehicles: 0 } }));
  assert.equal(result.storageExtraMilliGb, 235);
  assert.equal(result.storageExtraCents, 59, "0,5875 sobe para 0,59 (half-up); half-even daria 0,59 também, então o caso de borda abaixo decide");
  // Borda que separa half-up de half-even: 0,5 centavo exato. 2 milésimos × R$ 2,50 = 0,005 → 1 centavo (half-up).
  assert.equal(halfUpDiv(2 * 250, 1000), 1);
  assert.equal(halfUpDiv(6 * 250, 1000), 2, "1,5 → 2 (half-up); half-even também daria 2");
  assert.equal(halfUpDiv(10 * 250, 1000), 3, "2,5 → 3 (half-up); half-even daria 2 — este caso mata a mutação");
});

test("T-ST-4 (d) · 3 veículos × R$ 19,90 = R$ 59,70; (f) sem add-on → 0", () => {
  const withAddon = computeStatement(
    base({ perVehiclePriceCents: 1_990, measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 3 } }),
  );
  assert.equal(withAddon.trackingCents, 5_970);
  assert.equal(withAddon.totalCents, 31_000 + 5_970);
  const without = computeStatement(base({ measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 3 } }));
  assert.equal(without.trackingCents, 0);
});

test("T-ST-5 (e) · o preço efetivo do segmento (sobrescrita da organização) é o que entra na base", () => {
  const override = computeStatement(
    base({ segments: [{ subscriptionId: "s1", planVersionId: "v1", fromDay: 1, toDay: 30, monthlyPriceCents: 25_000 }] }),
  );
  assert.equal(override.baseCents, 25_000);
});

test("T-ST-6 · ajustes e créditos entram no total; tudo segue em centavos inteiros", () => {
  const result = computeStatement(base({ adjustmentsCents: -1_000, creditsAppliedCents: 500 }));
  assert.equal(result.totalCents, 31_000 - 1_000 - 500);
  assert.throws(() => computeStatement(base({ adjustmentsCents: 0.5 })), /safe integer/);
});

test("T-ST-7 (g) · recompute(snapshot) reproduz o total em 50 casos gerados (propriedade)", () => {
  let seed = 20_261_106;
  const next = (max: number) => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed % max;
  };
  for (let i = 0; i < 50; i += 1) {
    const daysInMonth = 28 + next(4);
    const split = 1 + next(daysInMonth - 1);
    const input: StatementComputationInput = {
      daysInMonth,
      segments: [
        { subscriptionId: "a", planVersionId: "va", fromDay: 1, toDay: split, monthlyPriceCents: next(100_000) },
        ...(split < daysInMonth
          ? [{ subscriptionId: "b", planVersionId: "vb", fromDay: split + 1, toDay: daysInMonth, monthlyPriceCents: next(100_000) }]
          : []),
      ],
      terms: { includedUsers: next(50), includedStorageMilliGb: next(50_000), extraUserPriceCents: next(5_000), extraGbPriceCents: next(1_000) },
      measurements: { usersPeak: next(80), storagePeakMilliGb: next(80_000), trackedVehicles: next(40) },
      perVehiclePriceCents: next(2) === 0 ? null : next(5_000),
      adjustmentsCents: next(10_000) - 5_000,
      creditsAppliedCents: next(1_000),
    };
    const result = computeStatement(input);
    assert.equal(recompute(snapshotOf(input)), result.totalCents, `caso ${i}`);
    assert.ok(Number.isSafeInteger(result.totalCents));
  }
});

test("T-ST-8 (h) · guard de texto: o motor não usa ponto flutuante para dinheiro (toFixed, Math.round, parseFloat)", () => {
  const source = readFileSync(path.join(REPO, "src/modules/subscription-billing/statements/statement.engine.ts"), "utf8");
  const code = source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const forbidden of ["toFixed(", "Math.round(", "parseFloat(", "Math.floor(", "Math.ceil("]) {
    assert.equal(code.includes(forbidden), false, `o motor não pode usar ${forbidden}`);
  }
});

test("T-ST-37 · pro-rata: assinatura de 15/10 a 31/10, mês de 31 dias, R$ 310,00 → R$ 170,00 (17 dias), 1 segmento", () => {
  const range = activeDayRange("2026-10", 31, { validFrom: "2026-10-15", validTo: null });
  assert.deepEqual(range, { fromDay: 15, toDay: 31 });
  const { segments, baseCents } = prorate(
    [{ subscriptionId: "s1", planVersionId: "v1", fromDay: 15, toDay: 31, monthlyPriceCents: 31_000 }],
    31,
  );
  assert.equal(segments.length, 1);
  assert.equal(segments[0]!.days, 17);
  assert.equal(baseCents, 17_000);
});

test("T-ST-38 · troca de Starter (R$ 310) para Professional (R$ 620) no dia 11 → R$ 100 + R$ 420 = R$ 520", () => {
  const starter = activeDayRange("2026-10", 31, { validFrom: "2026-09-01", validTo: "2026-10-11" });
  const professional = activeDayRange("2026-10", 31, { validFrom: "2026-10-11", validTo: null });
  assert.deepEqual(starter, { fromDay: 1, toDay: 10 });
  assert.deepEqual(professional, { fromDay: 11, toDay: 31 });
  const { baseCents, segments } = prorate(
    [
      { subscriptionId: "s1", planVersionId: "starter", ...starter!, monthlyPriceCents: 31_000 },
      { subscriptionId: "s2", planVersionId: "pro", ...professional!, monthlyPriceCents: 62_000 },
    ],
    31,
  );
  assert.deepEqual(segments.map((s) => s.baseCents), [10_000, 42_000]);
  assert.equal(baseCents, 52_000);
});

test("T-ST-39 · franquia e unitários são os do ÚLTIMO dia (Professional), não os do 1º (Starter)", () => {
  const starterTerms = { includedUsers: 5, includedStorageMilliGb: 5_000, extraUserPriceCents: 2_000, extraGbPriceCents: 300 };
  const professionalTerms = { includedUsers: 15, includedStorageMilliGb: 20_000, extraUserPriceCents: 1_500, extraGbPriceCents: 250 };
  const result = computeStatement({
    daysInMonth: 31,
    segments: [
      { subscriptionId: "s1", planVersionId: "starter", fromDay: 1, toDay: 10, monthlyPriceCents: 31_000 },
      { subscriptionId: "s2", planVersionId: "pro", fromDay: 11, toDay: 31, monthlyPriceCents: 62_000 },
    ],
    terms: professionalTerms, // quem monta o input escolhe os termos do último dia (serviço, F2)
    measurements: { usersPeak: 12, storagePeakMilliGb: 0, trackedVehicles: 0 },
    perVehiclePriceCents: null,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
  });
  assert.equal(result.usersExtra, 0, "12 usuários cabem nos 15 do Professional (com o Starter seriam 7 extras)");
  assert.notDeepEqual(professionalTerms, starterTerms);
});

test("T-ST-40 · segmentos fora do mês, sobrepostos ou fora de ordem são recusados; mês e dias corretos", () => {
  assert.throws(() => prorate([{ subscriptionId: "s", planVersionId: "v", fromDay: 0, toDay: 5, monthlyPriceCents: 1 }], 30), /inside the month/);
  assert.throws(
    () =>
      prorate(
        [
          { subscriptionId: "s", planVersionId: "v", fromDay: 1, toDay: 10, monthlyPriceCents: 1 },
          { subscriptionId: "t", planVersionId: "w", fromDay: 10, toDay: 20, monthlyPriceCents: 1 },
        ],
        30,
      ),
    /overlap/,
  );
  assert.equal(daysInPeriod("2026-02"), 28);
  assert.equal(daysInPeriod("2028-02"), 29);
  assert.equal(daysInPeriod("2026-10"), 31);
  assert.equal(activeDayRange("2026-10", 31, { validFrom: "2026-11-01", validTo: null }), null, "começa depois do mês");
  assert.equal(activeDayRange("2026-10", 31, { validFrom: "2026-01-01", validTo: "2026-10-01" }), null, "termina antes do mês");
  assert.equal(gbToMilli(10.235), 10_235);
});

test("T-ST-41 · veículo X nos dias 1-10 e Y nos dias 11-30 → 2 (distintos no mês, nunca o máximo diário)", () => {
  const count = countDistinctVehiclesInMonth("2026-09", [
    { vehicleId: "X", validFrom: "2026-09-01", validTo: "2026-09-10" },
    { vehicleId: "Y", validFrom: "2026-09-11", validTo: null },
    { vehicleId: "X", validFrom: "2026-09-20", validTo: "2026-09-21" },
    { vehicleId: "Z", validFrom: "2026-10-01", validTo: null },
    { vehicleId: "W", validFrom: "2026-01-01", validTo: "2026-08-31" },
  ]);
  assert.equal(count, 2);
});
