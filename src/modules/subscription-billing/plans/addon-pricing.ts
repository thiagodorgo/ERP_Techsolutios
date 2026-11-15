// B-ASS-12 (Emenda 1.4) — a AUTORIDADE ÚNICA sobre o preço de um dia de add-on de rastreamento. Função PURA, sem banco.
// Quem decide por ela, e só por ela: a trava de escrita (`addVersion` no `plans.service`; o `PUT` e a migração dos
// add-ons no `subscriptions.service`) e o montador do demonstrativo (`statement.inputs`). A trava aceita ⇔ o montador cobra.
//
// A unidade é classificada por LISTA FECHADA: `switch` exaustivo sobre `PricingUnit`, com `never` no `default`. Uma
// unidade nova em `PRICING_UNITS` sem `case` não compila; um valor fora da lista em tempo de execução (cast, dado fora do
// CHECK do banco) cai em `unknown_unit` e não é cobrado: falha fechado (J-573, C2-01).
//
// A forma antiga e ambígua (a coluna `pricing_unit` com o DEFAULT `flat` que a API antiga inventava) não é lida por
// ninguém: `flat` com preço por veículo, ou `flat` sem mensalidade positiva, é `unpriced` (Emenda 1.1 §1: falhar fechado,
// sem escolher pelo dono a leitura do dado antigo; J-573, C1-01, C1-02 e C2-02).

import type { PricingUnit, SubscriptionPlanVersion } from "./plan-types.js";

/** Por que não há preço utilizável. O montador pula com `addon_without_price`; a trava de escrita recusa com 422. */
export const ADDON_UNPRICED_CAUSES = [
  "per_vehicle_without_price",
  "flat_with_per_vehicle_price",
  "flat_without_monthly_price",
  "unknown_unit",
] as const;
export type AddonUnpricedCause = (typeof ADDON_UNPRICED_CAUSES)[number];

export type AddonPricing =
  /** Por veículo, sem pro-rata (P10): `veículos × perVehiclePriceCents`. `override` = a sobrescrita da organização. */
  | { readonly kind: "per_vehicle"; readonly perVehiclePriceCents: number; readonly source: "version" | "override" }
  /** Mensalidade fixa, por trecho (P17): `halfUpDiv(monthlyPriceCents × dias, dias do mês)`. */
  | { readonly kind: "flat"; readonly monthlyPriceCents: number }
  | { readonly kind: "unpriced"; readonly cause: AddonUnpricedCause };

export type AddonVersionPrice = Pick<SubscriptionPlanVersion, "pricingUnit" | "monthlyPriceCents" | "perVehiclePriceCents">;

/** A forma da versão sozinha, sem a sobrescrita. Privada: quem decide é o `resolveAddonPricing`. */
function versionShape(version: AddonVersionPrice): AddonPricing {
  const unit: PricingUnit = version.pricingUnit;
  switch (unit) {
    case "per_vehicle":
      if (version.perVehiclePriceCents === null) return { kind: "unpriced", cause: "per_vehicle_without_price" };
      return { kind: "per_vehicle", perVehiclePriceCents: version.perVehiclePriceCents, source: "version" };
    case "flat":
      if (version.perVehiclePriceCents !== null) return { kind: "unpriced", cause: "flat_with_per_vehicle_price" };
      if (!(version.monthlyPriceCents > 0)) return { kind: "unpriced", cause: "flat_without_monthly_price" };
      return { kind: "flat", monthlyPriceCents: version.monthlyPriceCents };
    default: {
      const unclassified: never = unit;
      void unclassified;
      return { kind: "unpriced", cause: "unknown_unit" };
    }
  }
}

/**
 * O preço de UM dia de add-on: a versão vigente no dia e a sobrescrita por veículo da contratação (`null` = sem
 * sobrescrita). A sobrescrita define o regime da organização em qualquer unidade CONHECIDA (Emenda 1, E2.1: zero é
 * cortesia); na unidade desconhecida nada é cobrado. Sem sobrescrita, vale a forma da versão.
 */
export function resolveAddonPricing(version: AddonVersionPrice, perVehiclePriceOverrideCents: number | null): AddonPricing {
  const shape = versionShape(version);
  if (shape.kind === "unpriced" && shape.cause === "unknown_unit") return shape;
  if (perVehiclePriceOverrideCents !== null) return { kind: "per_vehicle", perVehiclePriceCents: perVehiclePriceOverrideCents, source: "override" };
  return shape;
}
