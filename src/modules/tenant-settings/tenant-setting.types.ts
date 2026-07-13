import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type TenantSettingActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-e — Parâmetro (cadastro key-value). Chave natural = [tenant_id, key] (upsert por chave).
// value pode conter JSON serializado (≤5000). Sem delete físico: upsert sobrescreve o valor.
export type TenantSetting = {
  readonly id: string;
  readonly tenantId: string;
  readonly key: string;
  readonly value: string;
  readonly category?: string;
  readonly description?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListTenantSettingInput = {
  readonly tenantId: string;
  readonly category?: string;
};

export type ListTenantSettingResult = {
  readonly items: readonly TenantSetting[];
  readonly total: number;
};

export type UpsertTenantSettingInput = {
  readonly tenantId: string;
  readonly key: string;
  readonly value: string;
  readonly category?: string;
  readonly description?: string;
  readonly updatedBy?: string;
};

export class TenantSettingError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TenantSettingError";
  }
}
