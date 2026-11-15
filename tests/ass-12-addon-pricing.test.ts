import assert from "node:assert/strict";
import test from "node:test";

import { ADDON_UNPRICED_CAUSES, resolveAddonPricing, type AddonVersionPrice } from "../src/modules/subscription-billing/plans/addon-pricing.js";
import { PRICING_UNITS, type PricingUnit } from "../src/modules/subscription-billing/plans/plan-types.js";

// B-ASS-12 (Emenda 1.4, J-573) — a autoridade única sobre o preço de um dia de add-on (`resolveAddonPricing`): a lista
// fechada de formas, a sobrescrita e a unidade fora da lista. Valores de teste, fictícios.

const forma = (pricingUnit: string, monthlyPriceCents: number, perVehiclePriceCents: number | null): AddonVersionPrice =>
  ({ pricingUnit: pricingUnit as PricingUnit, monthlyPriceCents, perVehiclePriceCents });

/** Uma versão com preço utilizável por unidade da lista. Unidade nova sem exemplo aqui = teste vermelho. */
const EXEMPLO_COM_PRECO: Readonly<Record<PricingUnit, AddonVersionPrice>> = {
  per_vehicle: forma("per_vehicle", 0, 1_990),
  flat: forma("flat", 5_000, null),
};

test("T-PRECO-1 · as formas da Emenda 1.4 §2: por veículo cobra; flat sem preço por veículo e com mensalidade cobra; a forma antiga e ambígua e o zero calado não cobram", () => {
  const casos: Array<[string, AddonVersionPrice, unknown]> = [
    ["por veículo com preço", forma("per_vehicle", 0, 1_990), { kind: "per_vehicle", perVehiclePriceCents: 1_990, source: "version" }],
    ["por veículo com preço zero explícito", forma("per_vehicle", 0, 0), { kind: "per_vehicle", perVehiclePriceCents: 0, source: "version" }],
    ["por veículo sem preço", forma("per_vehicle", 5_000, null), { kind: "unpriced", cause: "per_vehicle_without_price" }],
    ["flat 50,00 sem preço por veículo", forma("flat", 5_000, null), { kind: "flat", monthlyPriceCents: 5_000 }],
    ["LB: flat 50,00 com preço por veículo (C1-01)", forma("flat", 5_000, 1_990), { kind: "unpriced", cause: "flat_with_per_vehicle_price" }],
    ["G1: flat 0 com preço por veículo (C2-02)", forma("flat", 0, 1_990), { kind: "unpriced", cause: "flat_with_per_vehicle_price" }],
    ["LC: flat 0 sem preço por veículo (C1-02)", forma("flat", 0, null), { kind: "unpriced", cause: "flat_without_monthly_price" }],
    ["unidade fora da lista (C2-01)", forma("per_km", 5_000, 1_990), { kind: "unpriced", cause: "unknown_unit" }],
  ];
  for (const [nome, versao, esperado] of casos) assert.deepEqual(resolveAddonPricing(versao, null), esperado, nome);
});

test("T-PRECO-2 · a sobrescrita define o regime em toda unidade da lista (0 = cortesia), e nunca na unidade fora da lista", () => {
  for (const versao of [forma("per_vehicle", 0, 1_990), forma("per_vehicle", 0, null), forma("flat", 5_000, null), forma("flat", 5_000, 1_990), forma("flat", 0, 1_990), forma("flat", 0, null)]) {
    for (const override of [0, 990]) {
      assert.deepEqual(resolveAddonPricing(versao, override), { kind: "per_vehicle", perVehiclePriceCents: override, source: "override" }, `${JSON.stringify(versao)} + ${override}`);
    }
  }
  for (const override of [null, 0, 990]) {
    assert.deepEqual(resolveAddonPricing(forma("per_km", 0, 1_990), override), { kind: "unpriced", cause: "unknown_unit" }, `fora da lista + ${String(override)}`);
  }
});

test("T-PRECO-3 · a lista é fechada: toda unidade de PRICING_UNITS tem forma com preço, e nenhuma cai em unknown_unit", () => {
  assert.deepEqual(Object.keys(EXEMPLO_COM_PRECO).sort(), [...PRICING_UNITS].sort(), "unidade nova em PRICING_UNITS sem classificação nesta autoridade");
  for (const unit of PRICING_UNITS) {
    assert.notEqual(resolveAddonPricing(EXEMPLO_COM_PRECO[unit], null).kind, "unpriced", unit);
    for (const pv of [null, 0, 1_990]) {
      for (const monthly of [0, 5_000]) {
        const out = resolveAddonPricing(forma(unit, monthly, pv), null);
        assert.ok(out.kind !== "unpriced" || out.cause !== "unknown_unit", `${unit} ${monthly} ${String(pv)} não é desconhecida`);
      }
    }
  }
  assert.deepEqual([...ADDON_UNPRICED_CAUSES].sort(), ["flat_with_per_vehicle_price", "flat_without_monthly_price", "per_vehicle_without_price", "unknown_unit"]);
});
