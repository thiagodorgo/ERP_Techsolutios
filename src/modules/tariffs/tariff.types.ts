import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type TariffActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-a.2 — Tarifa (item de preço de uma Tabela de Valores, RN-CAD-009). Diferente do PriceTable,
// NÃO há máquina de estado: `status` é campo livre curto (default "active"), sem transições.
export type Tariff = {
  readonly id: string;
  readonly tenantId: string;
  readonly priceTableId: string;
  readonly serviceCatalogId?: string;
  readonly customerId?: string;
  readonly name?: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly origin: string;
  readonly rule?: string;
  readonly validFrom?: Date;
  readonly validTo?: Date;
  readonly status: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListTariffInput = {
  readonly tenantId: string;
  readonly priceTableId?: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListTariffResult = {
  readonly items: readonly Tariff[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateTariffInput = Omit<
  Tariff,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateTariffInput = Partial<
  Pick<
    Tariff,
    | "name"
    | "unitPrice"
    | "currency"
    | "origin"
    | "rule"
    | "validFrom"
    | "validTo"
    | "status"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly tariffId: string;
};

export class TariffError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TariffError";
  }
}
