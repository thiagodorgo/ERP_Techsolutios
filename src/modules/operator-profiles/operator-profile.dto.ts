import type { OperatorProfile, ListOperatorProfileResult } from "./operator-profile.types.js";

export function toOperatorProfileDto(profile: OperatorProfile) {
  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.fullName ?? null,
    cnhNumber: profile.cnhNumber ?? null,
    cnhCategory: profile.cnhCategory ?? null,
    cnhExpiresAt: profile.cnhExpiresAt?.toISOString() ?? null,
    trackingConsent: profile.trackingConsent,
    trackingConsentAt: profile.trackingConsentAt?.toISOString() ?? null,
    phone: profile.phone ?? null,
    notes: profile.notes ?? null,
    isActive: profile.isActive,
    createdBy: profile.createdBy ?? null,
    updatedBy: profile.updatedBy ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toOperatorProfileListDto(result: ListOperatorProfileResult) {
  return {
    items: result.items.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName ?? null,
      // Veto junta Ω2-c (B1/LGPD): a lista NÃO expõe o número da CNH em massa — só um sinal `hasCnh` +
      // a validade, para o selo derivar Vencida/Válida/Sem CNH sem vazar o dado sensível.
      hasCnh: Boolean(profile.cnhNumber && profile.cnhNumber.trim()),
      cnhCategory: profile.cnhCategory ?? null,
      cnhExpiresAt: profile.cnhExpiresAt?.toISOString() ?? null,
      trackingConsent: profile.trackingConsent,
      trackingConsentAt: profile.trackingConsentAt?.toISOString() ?? null,
      phone: profile.phone ?? null,
      isActive: profile.isActive,
      createdAt: profile.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
