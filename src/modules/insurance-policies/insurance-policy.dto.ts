import type { InsurancePolicy, ListInsurancePoliciesResult } from "./insurance-policy.types.js";
import { deriveInsuranceStatus } from "./insurance-policy.validators.js";

/**
 * The DTO exposes `status` as the DERIVED effective status (R4.1): `cancelada`
 * when stored-cancelled, else `vencida` when `vigenciaFim < now`, else
 * `vigente`. The stored column only ever holds `vigente | cancelada`. The
 * external `tenant_id` is never exposed.
 */
export function toInsurancePolicyDto(policy: InsurancePolicy, now: Date = new Date()) {
  return {
    id: policy.id,
    vehicleId: policy.vehicleId,
    seguradora: policy.seguradora,
    numeroApolice: policy.numeroApolice,
    vigenciaInicio: policy.vigenciaInicio.toISOString(),
    vigenciaFim: policy.vigenciaFim.toISOString(),
    valor: policy.valor,
    cobertura: policy.cobertura ?? null,
    status: deriveInsuranceStatus(policy.status, policy.vigenciaFim, now),
    isActive: policy.isActive,
    createdBy: policy.createdBy ?? null,
    updatedBy: policy.updatedBy ?? null,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export function toInsurancePolicyListDto(result: ListInsurancePoliciesResult, now: Date = new Date()) {
  return {
    items: result.items.map((policy) => ({
      id: policy.id,
      vehicleId: policy.vehicleId,
      seguradora: policy.seguradora,
      numeroApolice: policy.numeroApolice,
      vigenciaInicio: policy.vigenciaInicio.toISOString(),
      vigenciaFim: policy.vigenciaFim.toISOString(),
      valor: policy.valor,
      cobertura: policy.cobertura ?? null,
      status: deriveInsuranceStatus(policy.status, policy.vigenciaFim, now),
      isActive: policy.isActive,
      createdAt: policy.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
