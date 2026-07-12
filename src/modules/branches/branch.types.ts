import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type BranchActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω2-b — Filial (cadastro). O model Branch pré-existe (migration 20260608000000) e NÃO tem
// is_active/created_by/updated_by: desativação lógica = status "inactive" (sem delete físico).
export type Branch = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly code: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListBranchInput = {
  readonly tenantId: string;
  readonly status?: string;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListBranchResult = {
  readonly items: readonly Branch[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateBranchInput = Omit<Branch, "id" | "createdAt" | "updatedAt">;

export type UpdateBranchInput = Partial<Pick<Branch, "name" | "code" | "status">> & {
  readonly tenantId: string;
  readonly branchId: string;
};

export class BranchError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "BranchError";
  }
}
