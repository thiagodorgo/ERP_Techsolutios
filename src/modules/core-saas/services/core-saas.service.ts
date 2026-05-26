import {
  DEFAULT_ROLES,
  getRolePermissions,
  isValidRole,
  listRoleDefinitions,
  type Permission,
  type Role,
  type RoleDefinition,
  validateRole,
} from "../permissions/catalog.js";
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
import {
  InMemoryCoreSaasStore,
  type CoreSaasStore,
} from "../store/core-saas.store.js";

export class CoreSaasRegistry {
  private tenantSequence = 0;
  private userSequence = 0;
  private auditSequence = 0;

  constructor(private readonly store: CoreSaasStore = new InMemoryCoreSaasStore()) {}

  reset(): void {
    this.store.clear();
    this.tenantSequence = 0;
    this.userSequence = 0;
    this.auditSequence = 0;
  }

  createTenant(input: CreateTenantInput, actor?: AuthenticatedActor): Tenant {
    const name = input.name.trim();

    if (!name) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "tenant_name_required",
        "Tenant name is required.",
      );
    }

    const tenant: Tenant = {
      id: nextId("ten", ++this.tenantSequence),
      name,
      document: input.document?.trim() || undefined,
      status: input.status ?? "active",
      modules: uniqueStrings(input.modules ?? []),
      createdAt: new Date(),
    };

    const savedTenant = this.store.saveTenant(tenant);

    this.recordAudit({
      action: "tenant.created",
      actor_user_id: actor?.userId ?? "system",
      tenant_id: savedTenant.id,
      metadata: {
        tenantId: savedTenant.id,
      },
    });

    return savedTenant;
  }

  listTenants(options: ListTenantOptions = {}): Tenant[] {
    return this.store.listTenants(options);
  }

  listTenantsForTenant(
    tenantId: string,
    options: ListTenantOptions = {},
  ): Tenant[] {
    assertTenantId(tenantId);

    return this.store
      .listTenants(options)
      .filter((tenant) => tenant.id === tenantId);
  }

  getTenantForActor(tenantId: string, actorTenantId: string): Tenant {
    assertTenantId(actorTenantId);

    if (tenantId !== actorTenantId) {
      throw accessDeniedAcrossTenants();
    }

    const tenant = this.store.findTenantById(tenantId);

    if (!tenant) {
      throw notFound("tenant_not_found", `Tenant not found: ${tenantId}`);
    }

    return tenant;
  }

  createUser(input: CreateUserInput, actor?: AuthenticatedActor): User {
    if (actor && input.tenantId !== actor.tenantId) {
      throw accessDeniedAcrossTenants();
    }

    const tenant = this.store.findTenantById(input.tenantId);

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

    const user: User = {
      id: nextId("usr", ++this.userSequence),
      tenantId: tenant.id,
      name,
      email,
      roles,
      branchIds: uniqueStrings(input.branchIds ?? []),
      status: input.status ?? "active",
      createdAt: new Date(),
    };

    const savedUser = this.store.saveUser(user);

    this.recordAudit({
      action: "user.created",
      actor_user_id: actor?.userId ?? "system",
      tenant_id: savedUser.tenantId,
      metadata: {
        userId: savedUser.id,
      },
    });

    return savedUser;
  }

  listUsersByTenant(tenantId: string): User[] {
    assertTenantId(tenantId);

    return this.store.listUsersByTenant(tenantId);
  }

  listUsersForTenant(tenantId: string): User[] {
    return this.listUsersByTenant(tenantId);
  }

  getUserForTenant(userId: string, tenantId: string): User {
    assertTenantId(tenantId);

    const user = this.store.findUserById(userId);

    if (!user) {
      throw notFound("user_not_found", `User not found: ${userId}`);
    }

    if (user.tenantId !== tenantId) {
      throw accessDeniedAcrossTenants();
    }

    return user;
  }

  listRoles(): RoleDefinition[] {
    return listRoleDefinitions();
  }

  getRoleDefinition(role: string): RoleDefinition {
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

  getAuditEventsForTenant(tenantId: string): AuditEvent[] {
    assertTenantId(tenantId);

    return this.store.listAuditEventsByTenant(tenantId);
  }

  recordAudit(input: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const event: AuditEvent = {
      ...input,
      id: nextId("aud", ++this.auditSequence),
      timestamp: new Date(),
    };

    return this.store.saveAuditEvent(event);
  }
}

export { DEFAULT_ROLES };

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

function nextId(prefix: string, sequence: number): string {
  return `${prefix}_${sequence.toString().padStart(6, "0")}`;
}
