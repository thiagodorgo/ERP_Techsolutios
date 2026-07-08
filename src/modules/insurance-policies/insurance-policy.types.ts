import type { Permission, Role } from "../core-saas/permissions/catalog.js";

/**
 * F4 (Seguros) — status handling.
 *
 * The COLUMN stores ONLY `vigente | cancelada` (R4.1). `vencida` is NEVER
 * persisted: it is a DERIVED effective status computed from `vigencia_fim` at
 * read time (`deriveInsuranceStatus`). The editable transitions are therefore
 * `vigente <-> cancelada` only; any attempt to PATCH `status = "vencida"` is a
 * 422 (`cannot_set_derived_status`).
 */
export const INSURANCE_STORED_STATUSES = ["vigente", "cancelada"] as const;
export type InsuranceStoredStatus = (typeof INSURANCE_STORED_STATUSES)[number];

/** Effective (derived) statuses exposed by the DTO and accepted by the list filter. */
export const INSURANCE_EFFECTIVE_STATUSES = ["vigente", "vencida", "cancelada"] as const;
export type InsuranceEffectiveStatus = (typeof INSURANCE_EFFECTIVE_STATUSES)[number];

export const DEFAULT_INSURANCE_STATUS: InsuranceStoredStatus = "vigente";

export type InsuranceActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type InsurancePolicy = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly seguradora: string;
  readonly numeroApolice: string;
  readonly vigenciaInicio: Date;
  readonly vigenciaFim: Date;
  readonly valor: number;
  readonly cobertura?: string;
  /** STORED status only (`vigente | cancelada`). `vencida` is derived, never stored. */
  readonly status: InsuranceStoredStatus;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListInsurancePoliciesInput = {
  readonly tenantId: string;
  readonly vehicleId?: string;
  readonly storedStatus?: InsuranceStoredStatus;
  /** `vigencia_fim >= X` — used to select still-valid (derived `vigente`) policies. */
  readonly vigenciaFimGte?: Date;
  /** `vigencia_fim < X` — used to select derived `vencida` policies (strict). */
  readonly vigenciaFimLt?: Date;
  /** `vigencia_fim <= X` — used by `expiring_within_days` (due-soon upper bound). */
  readonly vigenciaFimLte?: Date;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListInsurancePoliciesResult = {
  readonly items: readonly InsurancePolicy[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateInsurancePolicyInput = Omit<
  InsurancePolicy,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateInsurancePolicyInput = Partial<
  Pick<
    InsurancePolicy,
    | "vehicleId"
    | "seguradora"
    | "numeroApolice"
    | "vigenciaInicio"
    | "vigenciaFim"
    | "valor"
    | "cobertura"
    | "status"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly insurancePolicyId: string;
};

export class InsurancePolicyError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "InsurancePolicyError";
  }
}
