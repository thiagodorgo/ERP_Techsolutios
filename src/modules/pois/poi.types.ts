import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type PoiActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-d — POI (ponto de interesse geográfico). Chave natural = [tenant_id, name] (409 duplicate_name).
// latitude/longitude obrigatórios e validados pelo predicado do mapa Ω1 (finito, faixa, sem sentinela 0/0).
// Desativação lógica via is_active=false (sem delete físico).
export type Poi = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly category?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly address?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListPoiInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListPoiResult = {
  readonly items: readonly Poi[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreatePoiInput = Omit<
  Poi,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdatePoiInput = Partial<
  Pick<
    Poi,
    | "name"
    | "category"
    | "latitude"
    | "longitude"
    | "address"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly poiId: string;
};

export class PoiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "PoiError";
  }
}
