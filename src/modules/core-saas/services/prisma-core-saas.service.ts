import {
  getRolePermissions,
  isValidRole,
  listRoleDefinitions,
  type Permission,
  type Role,
  type RoleDefinition,
  validateRole,
} from "../permissions/catalog.js";
import { PrismaCoreSaasStore, mapTenantFromPrisma, mapUserFromPrisma } from "../store/prisma-core-saas.store.js";
import type { AsyncCoreSaasStore } from "../store/async-core-saas.store.js";
import {
  CoreSaasError,
  type AuditEvent,
  type AuthenticatedActor,
  type CreateTenantInput,
  type CreateUserInput,
  type ListTenantOptions,
  type Tenant,
  type TenantMembership,
  type UpdateUserInput,
  type User,
  type UserStatus,
} from "../types/core-saas.types.js";

export class PrismaCoreSaasService {
  constructor(private readonly store: AsyncCoreSaasStore = new PrismaCoreSaasStore()) {}

  async createTenant(
    input: CreateTenantInput,
    actor?: AuthenticatedActor,
  ): Promise<Tenant> {
    const name = input.name.trim();

    if (!name) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "tenant_name_required",
        "Tenant name is required.",
      );
    }

    const tenant = await this.store.createTenant({
      ...input,
      name,
      modules: uniqueStrings(input.modules ?? []),
      actorUserId: actor?.userId,
    });

    return tenant;
  }

  async listTenants(options: ListTenantOptions = {}): Promise<Tenant[]> {
    return this.store.listTenants(options);
  }

  async listTenantsForTenant(
    tenantId: string,
    options: ListTenantOptions = {},
  ): Promise<Tenant[]> {
    assertTenantId(tenantId);

    return this.store.listTenantsForTenant(tenantId, options);
  }

  async getTenantForActor(
    tenantId: string,
    actorTenantId: string,
  ): Promise<Tenant> {
    assertTenantId(actorTenantId);

    if (tenantId !== actorTenantId) {
      throw accessDeniedAcrossTenants();
    }

    const tenant = await this.store.findTenantById(tenantId);

    if (!tenant) {
      throw notFound("tenant_not_found", `Tenant not found: ${tenantId}`);
    }

    return tenant;
  }

  async createUser(
    input: CreateUserInput,
    actor?: AuthenticatedActor,
  ): Promise<User> {
    if (actor && input.tenantId !== actor.tenantId) {
      throw accessDeniedAcrossTenants();
    }

    const tenant = await this.store.findTenantById(input.tenantId);

    if (!tenant) {
      throw notFound("tenant_not_found", `Tenant not found: ${input.tenantId}`);
    }

    if (tenant.status !== "active") {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "inactive_tenant",
        "Cannot create users for inactive tenants.",
      );
    }

    const name = input.name.trim();

    if (!name) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "user_name_required",
        "User name is required.",
      );
    }

    const email = input.email.trim().toLowerCase();

    if (!isEmail(email)) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "invalid_user_email",
        "User email is invalid.",
      );
    }

    if (input.roles.length === 0) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "user_role_required",
        "User must have at least one role.",
      );
    }

    const roles = uniqueRoles(input.roles.map((role) => this.validateRole(role)));
    const user = await this.store.createUser({
      ...input,
      name,
      email,
      roles,
      branchIds: uniqueStrings(input.branchIds ?? []),
      status: input.status ?? "active",
      actorUserId: actor?.userId,
    });

    return user;
  }

  async updateUser(
    input: UpdateUserInput,
    actor?: AuthenticatedActor,
  ): Promise<User> {
    assertTenantId(input.tenantId);

    // Tenant-scoped resolution: a user outside the tenant is reported as not_found
    // (404) so we never leak the existence of another tenant's resource.
    const existing = await this.store.findUserByIdForTenant(
      input.userId,
      input.tenantId,
    );

    if (!existing) {
      throw notFound("user_not_found", `User not found: ${input.userId}`);
    }

    const hasName = input.name !== undefined;
    const hasRoles = input.roles !== undefined;
    const hasStatus = input.status !== undefined;

    if (!hasName && !hasRoles && !hasStatus) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "user_update_empty",
        "At least one field is required to update the user.",
      );
    }

    let name: string | undefined;

    if (hasName) {
      name = (input.name ?? "").trim();

      if (!name) {
        throw new CoreSaasError(
          400,
          "BAD_REQUEST",
          "user_name_required",
          "User name is required.",
        );
      }
    }

    let roles: Role[] | undefined;

    if (hasRoles) {
      const providedRoles = input.roles ?? [];

      if (providedRoles.length === 0) {
        throw new CoreSaasError(
          400,
          "BAD_REQUEST",
          "user_role_required",
          "User must have at least one role.",
        );
      }

      roles = uniqueRoles(providedRoles.map((role) => this.validateUserRole(role)));
    }

    let status: UserStatus | undefined;

    if (hasStatus) {
      if (input.status !== "active" && input.status !== "inactive") {
        throw new CoreSaasError(
          400,
          "BAD_REQUEST",
          "invalid_user_status",
          "User status must be active or inactive.",
        );
      }

      status = input.status;
    }

    return this.store.updateUser({
      userId: input.userId,
      tenantId: input.tenantId,
      name,
      roles,
      status,
      actorUserId: actor?.userId,
    });
  }

  async listUsersForTenant(tenantId: string): Promise<User[]> {
    assertTenantId(tenantId);

    return this.store.listUsersByTenant(tenantId);
  }

  async getUserForTenant(userId: string, tenantId: string): Promise<User> {
    assertTenantId(tenantId);

    const user = await this.store.findUserByIdForTenant(userId, tenantId);

    if (!user) {
      throw notFound("user_not_found", `User not found: ${userId}`);
    }

    return user;
  }

  async listRoles(): Promise<RoleDefinition[]> {
    return listRoleDefinitions();
  }

  async getRoleDefinition(role: string): Promise<RoleDefinition> {
    const normalizedRole = this.validateRole(role);

    return {
      role: normalizedRole,
      permissions: [...getRolePermissions(normalizedRole)],
    };
  }

  isValidRole(role: string): boolean {
    return isValidRole(role);
  }

  validateRole(role: string): Role {
    try {
      return validateRole(role);
    } catch {
      throw new Error(`Invalid role: ${role}`);
    }
  }

  private validateUserRole(role: string): Role {
    if (!isValidRole(role)) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "invalid_role",
        `Invalid role: ${role}`,
      );
    }

    return validateRole(role);
  }

  roleHasPermission(role: Role, permission: Permission): boolean {
    return getRolePermissions(role).includes(permission);
  }

  async listTenantsForUserEmail(email: string): Promise<TenantMembership[]> {
    // Cross-tenant query: intentionally bypasses RLS to list all orgs for a user's own email.
    const { prisma } = await import("../../../database/prisma.js");
    const normalizedEmail = email.trim().toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: any[] = await (prisma as any).user.findMany({
      where: { email: normalizedEmail, status: "active" },
      include: {
        tenant: true,
        role_assignments: { include: { role: true } },
      },
    });

    return users
      .filter((u: { tenant: { status: string } }) => u.tenant.status === "active")
      .map((u: { tenant: unknown; [key: string]: unknown }) => ({
        tenant: mapTenantFromPrisma(u.tenant as Parameters<typeof mapTenantFromPrisma>[0]),
        user: mapUserFromPrisma(
          u as unknown as Parameters<typeof mapUserFromPrisma>[0],
        ),
      }));
  }

  async getAuditEventsForTenant(tenantId: string): Promise<AuditEvent[]> {
    assertTenantId(tenantId);

    return this.store.listAuditEventsByTenant(tenantId);
  }

  async recordAudit(input: Omit<AuditEvent, "id" | "timestamp">): Promise<AuditEvent> {
    assertTenantId(input.tenant_id);

    return this.store.saveAuditEvent(input);
  }
}

function assertTenantId(tenantId: string): void {
  if (!tenantId.trim()) {
    throw new CoreSaasError(
      403,
      "FORBIDDEN",
      "tenant_required",
      "Tenant context is required.",
    );
  }
}

function accessDeniedAcrossTenants(): CoreSaasError {
  return new CoreSaasError(
    403,
    "FORBIDDEN",
    "tenant_access_denied",
    "Cross-tenant access is denied.",
  );
}

function notFound(reason: string, message: string): CoreSaasError {
  return new CoreSaasError(404, "NOT_FOUND", reason, message);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueRoles(values: readonly Role[]): Role[] {
  return [...new Set(values)];
}

function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
