import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type CustomerActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type Customer = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly document?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly zipCode?: string;
  readonly isActive: boolean;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListCustomersInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListCustomersResult = {
  readonly items: readonly Customer[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateCustomerInput = Omit<
  Customer,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateCustomerInput = Partial<
  Pick<
    Customer,
    | "name"
    | "document"
    | "phone"
    | "email"
    | "address"
    | "city"
    | "state"
    | "zipCode"
    | "isActive"
    | "notes"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly customerId: string;
};

export class CustomerError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CustomerError";
  }
}
