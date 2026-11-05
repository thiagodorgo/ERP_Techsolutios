// B-ASS-02 — domínio do catálogo de planos e assinaturas. Tipos e o erro do módulo.
// Dinheiro em CENTAVOS INTEIROS (number, Number.isSafeInteger) — nunca float em preço (§3.3 do plano).
// `includedStorageGb` é quantidade (GB, até 3 casas), não dinheiro.

export const PLAN_KINDS = ["base", "addon_tracking"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const PRICING_UNITS = ["flat", "per_vehicle"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "ended"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionPlan = {
  readonly id: string;
  readonly code: string;
  readonly kind: PlanKind;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SubscriptionPlanVersion = {
  readonly id: string;
  readonly planId: string;
  readonly version: number;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly monthlyPriceCents: number;
  readonly includedUsers: number;
  readonly includedStorageGb: number;
  readonly extraUserPriceCents: number;
  readonly extraGbPriceCents: number;
  readonly perVehiclePriceCents: number | null;
  readonly pricingUnit: PricingUnit;
  readonly modules: readonly string[];
  readonly notes: string | null;
  readonly inaugural: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TenantSubscription = {
  readonly id: string;
  readonly tenantId: string;
  readonly planId: string;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly monthlyPriceOverrideCents: number | null;
  readonly includedUsersOverride: number | null;
  readonly includedStorageGbOverride: number | null;
  readonly extraUserPriceOverrideCents: number | null;
  readonly extraGbPriceOverrideCents: number | null;
  readonly dueDays: number;
  readonly status: SubscriptionStatus;
  readonly endedReason: string | null;
  readonly endedBy: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TenantSubscriptionAddon = {
  readonly id: string;
  readonly tenantId: string;
  readonly subscriptionId: string;
  readonly planId: string;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly perVehiclePriceOverrideCents: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class SubscriptionBillingError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "SubscriptionBillingError";
  }
}
