import {
  DEFAULT_ROLES,
  assertAssignableRole,
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
  type LoginCandidate,
  type Tenant,
  type TenantMembership,
  type UpdateUserInput,
  type User,
} from "../types/core-saas.types.js";
import { MAX_LOGIN_CANDIDATES } from "../../auth/anonymous-login.constants.js";
import {
  InMemoryCoreSaasStore,
  type CoreSaasStore,
} from "../store/core-saas.store.js";

// B-O6R-01 — modelo de identidade em memória (espelho do prisma: auth_identities +
// auth_identity_links + trilha). `attachedVia` espelha a coluna `attached_via` (opção A da
// terceira armadilha — proveniência na linha do vínculo).
type MemoryIdentityLink = {
  readonly id: string;
  identityId: string;
  readonly tenantId: string;
  readonly userId: string;
  attachedVia: "backfill" | "religacao" | "desvinculo";
  readonly createdAt: Date;
};

type MemoryIdentityLinkEvent = {
  readonly id: string;
  readonly linkId: string;
  readonly fromIdentityId: string | null;
  readonly toIdentityId: string;
  readonly event: "backfill" | "religacao" | "desvinculo";
  readonly tenantId: string;
  readonly userId: string;
  readonly occurredAt: Date;
};

export class CoreSaasRegistry {
  private tenantSequence = 0;
  private userSequence = 0;
  private auditSequence = 0;
  private identitySequence = 0;
  private readonly identities = new Map<string, { readonly id: string; readonly createdAt: Date }>();
  private readonly identityLinksByPair = new Map<string, MemoryIdentityLink>();
  private readonly identityLinkEvents: MemoryIdentityLinkEvent[] = [];

  constructor(private readonly store: CoreSaasStore = new InMemoryCoreSaasStore()) {}

  reset(): void {
    this.store.clear();
    this.tenantSequence = 0;
    this.userSequence = 0;
    this.auditSequence = 0;
    this.identitySequence = 0;
    this.identities.clear();
    this.identityLinksByPair.clear();
    this.identityLinkEvents.length = 0;
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

    // B-O6R-01 (Ω6R-SEC-001) — ponto de validação do CREATE (memória): a MESMA allowlist do
    // caminho prisma. Papel de plataforma → 403 role_not_assignable.
    const roles = uniqueRoles(
      input.roles.map((role) => assertAssignableRole(this.validateRole(role))),
    );

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

    // B-O6R-01 (§3.4) — criação de usuário cria identidade + vínculo + evento 'backfill' na
    // mesma operação (espelho do caminho prisma).
    this.ensureIdentityLinkForPair(savedUser.tenantId, savedUser.id);

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

  updateUser(input: UpdateUserInput, actor?: AuthenticatedActor): User {
    assertTenantId(input.tenantId);

    const user = this.store.findUserById(input.userId);

    // Tenant-scoped resolution: a user outside the actor's tenant is reported as
    // not_found (404) so we never leak the existence of another tenant's resource.
    if (!user || user.tenantId !== input.tenantId) {
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

    let name = user.name;

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

    let roles = user.roles;

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

    let status = user.status;

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

    const updatedUser: User = {
      ...user,
      name,
      roles,
      status,
    };

    const savedUser = this.store.saveUser(updatedUser);

    this.recordAudit({
      action: "user.updated",
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

  // B-O6R-01 (Ω6R-TEN-001) — `listTenantsForUserEmail` foi REMOVIDA também aqui: o e-mail nunca
  // decide entre organizações (I1). Os métodos abaixo espelham o caminho prisma.

  // Leitura pré-autenticação (login sem organização). O teto é o mesmo da função elevada
  // (MAX_LOGIN_CANDIDATES + 1 = a linha sentinela do teto). A memória não modela credenciais —
  // o filtro "credencial existente" é do caminho prisma; aqui a senha decide no passo seguinte.
  listLoginCandidates(email: string): LoginCandidate[] {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return [];
    }

    return this.store
      .listUsersByEmail(normalizedEmail)
      .filter((user) => {
        if (user.status !== "active") {
          return false;
        }

        const tenant = this.store.findTenantById(user.tenantId);

        return tenant?.status === "active";
      })
      .sort((a, b) => a.tenantId.localeCompare(b.tenantId))
      .slice(0, MAX_LOGIN_CANDIDATES + 1)
      .map((user) => ({ tenantId: user.tenantId, userId: user.id }));
  }

  // Normalização preguiçosa do par (tenant, user) — cria identidade + vínculo + evento
  // 'backfill' quando o par ainda não tem vínculo. Par inexistente → null (fail-closed).
  resolveIdentityForUser(actor: { readonly tenantId: string; readonly userId: string }): string | null {
    const user = this.store.findUserById(actor.userId);

    if (!user || user.tenantId !== actor.tenantId) {
      return null;
    }

    return this.ensureIdentityLinkForPair(actor.tenantId, actor.userId);
  }

  listTenantsForIdentity(actor: { readonly tenantId: string; readonly userId: string }): TenantMembership[] {
    const identityId = this.resolveIdentityForUser(actor);

    if (!identityId) {
      return [];
    }

    const memberships: TenantMembership[] = [];

    for (const link of this.identityLinksByPair.values()) {
      if (link.identityId !== identityId) {
        continue;
      }

      const user = this.store.findUserById(link.userId);

      if (!user || user.status !== "active") {
        continue;
      }

      const tenant = this.store.findTenantById(link.tenantId);

      if (!tenant || tenant.status !== "active") {
        continue;
      }

      memberships.push({ tenant, user });
    }

    return memberships.sort((a, b) => a.tenant.id.localeCompare(b.tenant.id));
  }

  findMembershipForIdentity(
    actor: { readonly tenantId: string; readonly userId: string },
    requestedTenantId: string,
  ): TenantMembership | null {
    // C8 — normaliza SOMENTE o par do token corrente; jamais o usuário da organização pedida.
    const identityId = this.resolveIdentityForUser(actor);

    if (!identityId) {
      return null;
    }

    const link =
      [...this.identityLinksByPair.values()].find(
        (candidate) =>
          candidate.tenantId === requestedTenantId && candidate.identityId === identityId,
      ) ?? null;

    if (!link) {
      return null;
    }

    const user = this.store.findUserById(link.userId);

    if (!user || user.status !== "active") {
      return null;
    }

    const tenant = this.store.findTenantById(link.tenantId);

    if (!tenant || tenant.status !== "active") {
      return null;
    }

    return { tenant, user };
  }

  private ensureIdentityLinkForPair(tenantId: string, userId: string): string {
    const key = pairKey(tenantId, userId);
    const existing = this.identityLinksByPair.get(key);

    if (existing) {
      return existing.identityId;
    }

    const identityId = nextId("idn", ++this.identitySequence);
    const link: MemoryIdentityLink = {
      id: nextId("lnk", this.identitySequence),
      identityId,
      tenantId,
      userId,
      attachedVia: "backfill",
      createdAt: new Date(),
    };

    this.identities.set(identityId, { id: identityId, createdAt: new Date() });
    this.identityLinksByPair.set(key, link);
    this.identityLinkEvents.push({
      id: nextId("evt", this.identityLinkEvents.length + 1),
      linkId: link.id,
      fromIdentityId: null,
      toIdentityId: identityId,
      event: "backfill",
      tenantId,
      userId,
      occurredAt: new Date(),
    });

    return identityId;
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

  // B-O6R-01 (Ω6R-SEC-001, "500→400 de carona") — papel fora do catálogo vira CoreSaasError 400
  // invalid_role (era Error cru). A allowlist de atribuição não vive aqui (getRoleDefinition lê
  // papéis de plataforma legitimamente); vive nos caminhos de create/update.
  validateRole(role: string): Role {
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

  // B-O6R-01 (Ω6R-SEC-001) — ponto de validação do UPDATE (memória): mesma allowlist do create.
  private validateUserRole(role: string): Role {
    if (!isValidRole(role)) {
      throw new CoreSaasError(
        400,
        "BAD_REQUEST",
        "invalid_role",
        `Invalid role: ${role}`,
      );
    }

    return assertAssignableRole(validateRole(role));
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

function pairKey(tenantId: string, userId: string): string {
  return `${tenantId}::${userId}`;
}
