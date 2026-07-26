import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import { PROFILE_SCOPES, type ProfileScope } from "../jurisdiction/jurisdiction.types.js";

export type PriceTableActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-03 (D-Ω5P-TAR-02) — o escopo da tabela tarifária REUSA o MESMO enum de JurisdictionProfile.scope
// (coerência com PR-02): PUBLIC_AGREEMENT (convênio público) | PRIVATE_CONTRACT (contrato privado). O perfil
// normativo dá prazos/teto; a tabela tarifária dá preço. scope NULL = curinga vale-para-os-dois.
export const TARIFF_SCOPES = PROFILE_SCOPES;
export type TariffScope = ProfileScope;

// Ω2-a.1 — status de publicação (RN-CAD-008). Máquina de estado: draft→published, published→archived,
// draft→archived; qualquer outra transição = 422. Tabela "published" PERMANECE editável nesta fatia
// (deferral consciente, sem version-on-publish — ver controle/D-OMEGA2A-*).
export type PriceTableStatus = "draft" | "published" | "archived";

export type PriceTable = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly currency: string;
  readonly version: number;
  readonly validFrom?: Date;
  readonly validTo?: Date;
  readonly status: PriceTableStatus;
  readonly isActive: boolean;
  // Ω5P PR-03 — eixos NULLABLE (curinga quando ausentes; retrocompat total com o legado).
  readonly scope?: TariffScope;
  readonly vehicleCategory?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListPriceTableInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly status?: PriceTableStatus;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListPriceTableResult = {
  readonly items: readonly PriceTable[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreatePriceTableInput = Omit<
  PriceTable,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdatePriceTableInput = Partial<
  Pick<
    PriceTable,
    | "name"
    | "description"
    | "currency"
    | "version"
    | "validFrom"
    | "validTo"
    | "status"
    | "isActive"
    | "scope"
    | "vehicleCategory"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly priceTableId: string;
};

export class PriceTableError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "PriceTableError";
  }
}

// Transições de status permitidas (RN-CAD-008).
export const PRICE_TABLE_STATUS_TRANSITIONS: Record<PriceTableStatus, readonly PriceTableStatus[]> = {
  draft: ["published", "archived"],
  published: ["archived"],
  archived: [],
};
