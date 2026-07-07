import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type ServiceCatalogActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type ServiceCatalog = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly estimatedDurationMinutes?: number;
  readonly basePrice?: number;
  readonly status: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListServiceCatalogInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListServiceCatalogResult = {
  readonly items: readonly ServiceCatalog[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateServiceCatalogInput = Omit<
  ServiceCatalog,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateServiceCatalogInput = Partial<
  Pick<
    ServiceCatalog,
    | "name"
    | "description"
    | "category"
    | "estimatedDurationMinutes"
    | "basePrice"
    | "status"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly serviceId: string;
};

export class ServiceCatalogError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceCatalogError";
  }
}
