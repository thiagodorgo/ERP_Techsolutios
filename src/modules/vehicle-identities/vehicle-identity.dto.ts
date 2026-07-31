import type { ConfidenceLevel, ListVehicleIdentityResult, VehicleIdentity } from "./vehicle-identity.types.js";

// Labels PT-BR (§3 CLAUDE.md — nunca termo técnico na UI; a API devolve o rótulo pronto para exibição).
const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  PROVISIONAL: "Provisória",
  CONFIRMED: "Confirmada",
  MERGED: "Mesclada",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). canonicalIdentityId só sai quando
// já preenchido (fluxo de merge do PR-04) — este módulo nunca o escreve, só pode refletir o que já existir.
export function toVehicleIdentityDto(identity: VehicleIdentity) {
  return {
    id: identity.id,
    plate: identity.plateRaw ?? null,
    plateKey: identity.plateKey ?? null,
    chassis: identity.chassis ?? null,
    renavam: identity.renavamKey ?? null,
    brand: identity.brand ?? null,
    model: identity.model ?? null,
    color: identity.color ?? null,
    year: identity.year ?? null,
    unidentified: identity.unidentified,
    unidentifiedReason: identity.unidentifiedReason ?? null,
    confidence: identity.confidence,
    confidenceLabel: CONFIDENCE_LABELS[identity.confidence],
    canonicalIdentityId: identity.canonicalIdentityId ?? null,
    createdBy: identity.createdBy ?? null,
    updatedBy: identity.updatedBy ?? null,
    createdAt: identity.createdAt.toISOString(),
    updatedAt: identity.updatedAt.toISOString(),
  };
}

export function toVehicleIdentityListDto(result: ListVehicleIdentityResult) {
  return {
    items: result.items.map((identity) => ({
      id: identity.id,
      plate: identity.plateRaw ?? null,
      chassis: identity.chassis ?? null,
      renavam: identity.renavamKey ?? null,
      brand: identity.brand ?? null,
      model: identity.model ?? null,
      unidentified: identity.unidentified,
      confidence: identity.confidence,
      confidenceLabel: CONFIDENCE_LABELS[identity.confidence],
      createdAt: identity.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
