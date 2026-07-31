import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type VehicleIdentityActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω-VID PR-02 — enum completo (banco: CHECK third_party_vehicle_identities_confidence_chk, 3 valores fechados).
// PROVISIONAL/CONFIRMED são graváveis por este CRUD; MERGED só é atingível pelo fluxo de merge (PR-04, fora de
// escopo desta fatia — este módulo NUNCA grava MERGED nem canonical_identity_id).
export const CONFIDENCE_LEVELS = ["PROVISIONAL", "CONFIRMED", "MERGED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// Subconjunto graváveis por este módulo (create/patch). MERGED fica de fora — só o merge manual (PR-04) o atinge,
// sempre acompanhado de canonical_identity_id (CHECK merge_chk) e do registro em ThirdPartyVehicleIdentityMergeEvent.
export const WRITABLE_CONFIDENCE_LEVELS = ["PROVISIONAL", "CONFIRMED"] as const satisfies readonly ConfidenceLevel[];
export type WritableConfidenceLevel = (typeof WRITABLE_CONFIDENCE_LEVELS)[number];

export type VehicleIdentity = {
  readonly id: string;
  readonly tenantId: string;
  readonly plateRaw?: string;
  readonly plateKey?: string;
  readonly chassis?: string;
  readonly renavamKey?: string;
  readonly brand?: string;
  readonly model?: string;
  readonly color?: string;
  readonly year?: number;
  readonly unidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly confidence: ConfidenceLevel;
  // Só preenchido por MERGED (fora de escopo de escrita deste módulo — pode existir se outra fatia/PR já
  // mesclou a linha; este CRUD apenas o LÊ, nunca o escreve).
  readonly canonicalIdentityId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateVehicleIdentityInput = {
  readonly tenantId: string;
  readonly plateRaw?: string;
  readonly plateKey?: string;
  readonly chassis?: string;
  readonly renavamKey?: string;
  readonly brand?: string;
  readonly model?: string;
  readonly color?: string;
  readonly year?: number;
  readonly unidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly confidence?: WritableConfidenceLevel;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateVehicleIdentityInput = {
  readonly tenantId: string;
  readonly identityId: string;
  readonly plateRaw?: string | null;
  readonly plateKey?: string | null;
  readonly chassis?: string | null;
  readonly renavamKey?: string | null;
  readonly brand?: string | null;
  readonly model?: string | null;
  readonly color?: string | null;
  readonly year?: number | null;
  readonly unidentified?: boolean;
  readonly unidentifiedReason?: string | null;
  readonly confidence?: WritableConfidenceLevel;
  readonly updatedBy?: string;
};

export type ListVehicleIdentityInput = {
  readonly tenantId: string;
  readonly confidence?: ConfidenceLevel;
  readonly plateKey?: string;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListVehicleIdentityResult = {
  readonly items: readonly VehicleIdentity[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export class VehicleIdentityError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "VehicleIdentityError";
  }
}
