import {
  getRolePermissions,
  isValidRole,
  listRoleDefinitions,
  type Permission,
  type Role,
  type RoleDefinition,
  validateRole,
} from "../permissions/catalog.js";
import { PrismaCoreSaasStore } from "../store/prisma-core-saas.store.js";
import type { AsyncCoreSaasStore } from "../store/async-core-saas.store.js";
import {
  CoreSaasError,
  type AuditEvent,
  type AuthenticatedActor,
  type CreateTenantInput,
  type CreateUserInput,
  type ListTenantOptions,
  type Tenant,
  type User,
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

  roleHasPermission(role: Role, permission: Permission): boolean {
    return getRolePermissions(role).includes(permission);
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
