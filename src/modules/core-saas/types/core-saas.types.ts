import type { Permission, Role } from "../permissions/catalog.js";

export type TenantStatus = "active" | "inactive";
export type UserStatus = "active" | "inactive";

export type Tenant = {
  readonly id: string;
  readonly name: string;
  readonly document?: string;
  readonly status: TenantStatus;
  readonly modules: readonly string[];
  readonly createdAt: Date;
};

export type User = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly branchIds: readonly string[];
  readonly status: UserStatus;
  readonly createdAt: Date;
};

export type AuditEvent = {
  readonly id: string;
  readonly action: string;
  readonly actor_user_id: string;
  readonly tenant_id: string;
  readonly timestamp: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type AuthenticatedActor = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly explicitPermissions: boolean;
};

export type CreateTenantInput = {
  readonly name: string;
  readonly document?: string;
  readonly status?: TenantStatus;
  readonly modules?: readonly string[];
  readonly actorUserId?: string;
};

export type CreateUserInput = {
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly branchIds?: readonly string[];
  readonly status?: UserStatus;
  readonly actorUserId?: string;
};

export type ListTenantOptions = {
  readonly status?: TenantStatus;
};

export type TenantMembership = {
  readonly tenant: Tenant;
  readonly user: User;
};

export class CoreSaasError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CoreSaasError";
  }
}
