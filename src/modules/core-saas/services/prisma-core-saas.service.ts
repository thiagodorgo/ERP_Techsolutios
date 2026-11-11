import {
  assertAssignableRole,
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
  type CreatedUser,
  type ListTenantOptions,
  type LoginCandidate,
  type Tenant,
  type TenantMembership,
  type UpdateUserInput,
  type User,
  type UserStatus,
} from "../types/core-saas.types.js";
import type { PrismaClient } from "@prisma/client";

import type { AuthenticatedActor as AuthJwtActor } from "../../auth/types/auth.types.js";
import { IdentityLinkRepository } from "../../auth/repositories/identity-link.repository.js";
import { hashPassword } from "../../auth/services/password.service.js";
import { generateInitialPassword } from "../../authority/authority-password.js";

export class PrismaCoreSaasService {
  // B-USERS-ACESSO-SEG (P-SEG-2) — `identityClient` é o client dos fluxos de identidade (listagem de
  // organizações, troca de organização, normalização do par). Opcional: em produção é o global
  // (src/database/prisma.ts); o teste passa o papel efêmero NOSUPERUSER NOBYPASSRLS para medir sob RLS.
  constructor(
    private readonly store: AsyncCoreSaasStore = new PrismaCoreSaasStore(),
    private readonly identityClient?: PrismaClient,
  ) {}

  private async identityPrisma(): Promise<PrismaClient> {
    return this.identityClient ?? (await import("../../../database/prisma.js")).prisma;
  }

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
  ): Promise<CreatedUser> {
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

    // B-O6R-01 (Ω6R-SEC-001) — ponto de validação do CREATE (prisma): allowlist fechada por
    // construção. Papel de plataforma → 403 role_not_assignable, antes de tocar o store.
    const roles = uniqueRoles(
      input.roles.map((role) => assertAssignableRole(this.validateRole(role))),
    );

    // B-USERS-ACESSO-SEG (S2, Achado 1 + UEM-01) — o usuário novo nasce com uma senha PROVISÓRIA: o store grava
    // só o hash, com a marca "trocar no próximo acesso" (P1), na MESMA transação da criação; a provisória em
    // claro volta UMA vez, no 201 (`temporaryPassword`), e não fica em lugar nenhum. O scrypt roda antes da
    // transação (fica curta). Sem canal de e-mail ligado (ajuste 8): a tela mostra a provisória ao admin.
    const temporaryPassword = generateInitialPassword();
    const password = await hashPassword(temporaryPassword);

    // B-USERS-ACESSO-SEG (S6, ajuste 9 da crítica) — e-mail repetido na MESMA organização é recusado
    // pelo índice único (tenant_id, email), que também resolve a corrida de duas criações
    // simultâneas. O 409 sai sem a mensagem do banco (antes, o P2002 caía no 400 genérico de
    // sendRouteError com o texto do Prisma no corpo). A transação do store volta inteira.
    try {
      const user = await this.store.createUser(
        {
          ...input,
          name,
          email,
          roles,
          branchIds: uniqueStrings(input.branchIds ?? []),
          status: input.status ?? "active",
          actorUserId: actor?.userId,
        },
        { passwordHash: password.password_hash, passwordAlgorithm: password.password_algorithm },
      );

      return { ...user, temporaryPassword };
    } catch (error) {
      if (isUserEmailUniqueViolation(error)) {
        throw userEmailConflict();
      }

      throw error;
    }
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

  // B-O6R-01 (Ω6R-SEC-001, "500→400 de carona") — papel fora do catálogo era Error cru; vira
  // CoreSaasError 400 invalid_role. A allowlist de atribuição NÃO vive aqui: este método também
  // serve getRoleDefinition (leitura de papel de plataforma é legítima). Quem barra a ATRIBUIÇÃO
  // é assertAssignableRole nos caminhos de create/update (abaixo).
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

  // B-O6R-01 (Ω6R-SEC-001) — ponto de validação do UPDATE (prisma): mesma allowlist do create.
  // Papel de plataforma → 403 role_not_assignable (o vetor real do achado era o PATCH self).
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

  // B-O6R-01 (Ω6R-TEN-001) — `listTenantsForUserEmail` foi REMOVIDA (correlacionava contas pelo
  // e-mail e emitia acesso sem prova de vínculo). Os quatro consumidores migraram para os
  // métodos de identidade abaixo. A leitura pré-autenticação atravessa a função elevada
  // `auth_login_candidates` (a única entrada cross-tenant por e-mail — §6.3 do plano).

  async listLoginCandidates(email: string): Promise<LoginCandidate[]> {
    const [{ prisma }, { listLoginCandidatesViaFunction }] = await Promise.all([
      import("../../../database/prisma.js"),
      import("../../auth/repositories/login-candidates.repository.js"),
    ]);
    const rows = await listLoginCandidatesViaFunction(prisma, email);

    return rows.map((row) => ({ tenantId: row.tenant_id, userId: row.user_id }));
  }

  async listTenantsForIdentity(actor: AuthJwtActor): Promise<TenantMembership[]> {
    const [{ prisma }, { setIdentityRlsContext, setTenantRlsContext }, { normalizePairIdentity }] =
      await Promise.all([
        import("../../../database/prisma.js"),
        import("../../../database/rls.js"),
        import("../../auth/services/identity-resolver.js"),
      ]);

    // UMA ÚNICA transação (§3.6): o braço de identidade lê os próprios vínculos e o GUC de
    // tenant é TROCADO DENTRO da mesma transação para reler status por organização. Nunca
    // withTenantRls aninhado (não há transação aninhada em Prisma).
    return prisma.$transaction(async (tx) => {
      let identityId = await setIdentityRlsContext(tx, actor);

      if (!identityId) {
        // §3.4 — normalização preguiçosa do par do token (escrita em caminho de leitura,
        // declarado: não roda em réplica de leitura; hoje não há réplica).
        await normalizePairIdentity(tx, actor.tenantId, actor.userId);
        identityId = await setIdentityRlsContext(tx, actor);
      }

      if (!identityId) {
        return [];
      }

      const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);
      const memberships: TenantMembership[] = [];

      for (const link of links) {
        await setTenantRlsContext(tx, link.tenant_id);

        // Replica os dois filtros do consumidor antigo (status de usuário e de organização) —
        // provados por testes em tests/auth-identity-links-db.test.ts (§7, grupo TEN-001).
        const user = await tx.user.findFirst({
          where: {
            id: link.user_id,
            tenant_id: link.tenant_id,
            status: "active",
          },
          include: {
            role_assignments: { include: { role: true } },
          },
        });

        if (!user) {
          continue;
        }

        // `tenants` não tem RLS (nenhum ENABLE ROW LEVEL SECURITY de tenants em migração).
        const tenant = await tx.tenant.findFirst({ where: { id: link.tenant_id } });

        if (!tenant || tenant.status !== "active") {
          continue;
        }

        memberships.push({
          tenant: mapTenantFromPrisma(tenant),
          user: mapUserFromPrisma(user as Parameters<typeof mapUserFromPrisma>[0]),
        });
      }

      return memberships;
    });
  }

  async findMembershipForIdentity(
    actor: AuthJwtActor,
    requestedTenantId: string,
  ): Promise<TenantMembership | null> {
    const [prisma, { setTenantRlsContext }, { resolveIdentityIdForPair, normalizePairIdentity }] =
      await Promise.all([
        this.identityPrisma(),
        import("../../../database/rls.js"),
        import("../../auth/services/identity-resolver.js"),
      ]);

    // §6.5 — SEM GUC de identidade (S2): resolve a identidade do ator por (tenant ativo, sub)
    // sob o braço de tenant, depois lê o vínculo da organização pedida sob o braço de tenant DA
    // ORGANIZAÇÃO PEDIDA, filtrando pela identidade em VARIÁVEL. O identity_id nunca sai do
    // processo (varredura por valor cobre esta rota — §5.7).
    return prisma.$transaction(async (tx) => {
      await setTenantRlsContext(tx, actor.tenantId);

      // B-USERS-ACESSO-SEG (P-SEG-2, Emenda 1) — com a senha provisória ainda não trocada, a sessão
      // não troca de organização. Lido sob o GUC da organização ATIVA do ator, antes de olhar a
      // organização pedida: a recusa não lê nem devolve nada dela.
      const marks = await tx.$queryRaw<Array<{ must_change_password: boolean }>>`
        SELECT must_change_password FROM local_auth_credentials
        WHERE tenant_id = ${actor.tenantId}::uuid AND user_id = ${actor.userId}::uuid
      `;

      if (marks.some((mark) => mark.must_change_password)) {
        throw passwordChangeRequired();
      }

      let identityId = await resolveIdentityIdForPair(tx, actor.tenantId, actor.userId);

      if (!identityId) {
        // C8 — normaliza SOMENTE o par do token corrente; jamais o usuário da organização pedida.
        identityId = await normalizePairIdentity(tx, actor.tenantId, actor.userId);
      }

      if (!identityId) {
        return null;
      }

      await setTenantRlsContext(tx, requestedTenantId);

      const link = await new IdentityLinkRepository(tx).findByIdentityAndTenant(
        identityId,
        requestedTenantId,
      );

      if (!link) {
        return null;
      }

      const user = await tx.user.findFirst({
        where: {
          id: link.user_id,
          tenant_id: link.tenant_id,
          status: "active",
        },
        include: {
          role_assignments: { include: { role: true } },
          local_auth_credentials: { select: { must_change_password: true } },
        },
      });

      if (!user) {
        return null;
      }

      const tenant = await tx.tenant.findFirst({ where: { id: link.tenant_id } });

      if (!tenant || tenant.status !== "active") {
        return null;
      }

      // B-USERS-ACESSO-SEG (P-SESSAO-RESTRITA) — a marca do par de DESTINO, lida sob o GUC de
      // destino junto do usuário: o token da organização pedida nasce restrito se ela estiver
      // ligada. Par sem linha de credencial conta como NÃO marcado (RQ-3).
      const { local_auth_credentials: linhas, ...userRow } = user;

      return {
        tenant: mapTenantFromPrisma(tenant),
        user: mapUserFromPrisma(userRow as Parameters<typeof mapUserFromPrisma>[0]),
        mustChangePassword: linhas.some((linha) => linha.must_change_password === true),
      };
    });
  }

  async resolveIdentityForUser(actor: {
    readonly tenantId: string;
    readonly userId: string;
  }): Promise<string | null> {
    const [prisma, { withTenantRls }, { normalizePairIdentity }] = await Promise.all([
      this.identityPrisma(),
      import("../../../database/rls.js"),
      import("../../auth/services/identity-resolver.js"),
    ]);

    return withTenantRls(prisma, actor.tenantId, (tx) =>
      normalizePairIdentity(tx, actor.tenantId, actor.userId),
    );
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

// B-USERS-ACESSO-SEG (P-SEG-2) — a sessão da senha provisória só troca a senha. Código e motivo fixos,
// os mesmos da religação (identity-link.service.ts).
export function passwordChangeRequired(): CoreSaasError {
  return new CoreSaasError(
    403,
    "FORBIDDEN",
    "password_change_required",
    "Password change is required before this action.",
  );
}

// B-USERS-ACESSO-SEG (S6) — o mesmo código e o mesmo motivo do caminho de memória.
export function userEmailConflict(): CoreSaasError {
  return new CoreSaasError(
    409,
    "CONFLICT",
    "user_email_conflict",
    "A user with this email already exists in this organization.",
  );
}

// P2002 do índice único (tenant_id, email) de `users`. Medido no Postgres 16 do bloco, com o
// adaptador de driver (PrismaPg): sob o SUPERUSUÁRIO o meta traz
// driverAdapterError.cause.constraint.fields = ["tenant_id","email"]; sob o papel de runtime
// (NOSUPERUSER NOBYPASSRLS) NÃO traz — com RLS ligado o Postgres omite o DETAIL com a chave, e o
// adaptador fica só com a mensagem original, que nomeia o índice. Por isso a leitura aceita os dois:
// os campos quando existem, o nome do índice quando não. Um teste só com superusuário veria só o
// primeiro caso e passaria com o código que falha em produção.
const USERS_EMAIL_UNIQUE_INDEX = "users_tenant_id_email_key";

function isUserEmailUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    readonly code?: unknown;
    readonly meta?: {
      readonly modelName?: unknown;
      readonly target?: unknown;
      readonly driverAdapterError?: {
        readonly cause?: {
          readonly originalMessage?: unknown;
          readonly constraint?: { readonly fields?: unknown };
        };
      };
    };
  };

  if (candidate.code !== "P2002" || candidate.meta?.modelName !== "User") {
    return false;
  }

  const cause = candidate.meta.driverAdapterError?.cause;
  const fields = cause?.constraint?.fields ?? candidate.meta.target;

  if (Array.isArray(fields)) {
    return fields.includes("email");
  }

  return typeof cause?.originalMessage === "string" && cause.originalMessage.includes(USERS_EMAIL_UNIQUE_INDEX);
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
