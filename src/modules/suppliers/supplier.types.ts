import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type SupplierActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-b — Fornecedor (cadastro). Chave natural = [tenant_id, name] (409 duplicate_name).
// Desativação lógica via is_active=false (sem delete físico).
export type Supplier = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly document?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly category?: string;
  readonly notes?: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListSupplierInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListSupplierResult = {
  readonly items: readonly Supplier[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateSupplierInput = Omit<
  Supplier,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateSupplierInput = Partial<
  Pick<
    Supplier,
    | "name"
    | "document"
    | "email"
    | "phone"
    | "address"
    | "category"
    | "notes"
    | "status"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly supplierId: string;
};

export class SupplierError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "SupplierError";
  }
}
