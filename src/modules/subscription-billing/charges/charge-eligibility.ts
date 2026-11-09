// B-ASS-08 · F7 — porta de elegibilidade da cobrança (R-PRF-1, G12). Antes de enfileirar `charge_create`, o perfil da
// organização tem de estar completo (`tenant_billing_profiles`); incompleto → `billing_profile_missing` com `missing[]`
// visível e NENHUMA chamada ao provedor. Reusa `missingFields` do perfil (B-ASS-04).

import { missingFields, type BillingProfileInput } from "../billing-profile/billing-profile.js";

export type ChargeProfileGate = { readonly ok: true } | { readonly ok: false; readonly reason: "billing_profile_missing"; readonly missing: readonly string[] };

export function chargeProfileGate(profile: BillingProfileInput | null): ChargeProfileGate {
  const missing = missingFields(profile);
  return missing.length === 0 ? { ok: true } : { ok: false, reason: "billing_profile_missing", missing };
}
