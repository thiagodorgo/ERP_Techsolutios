import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";
import { setTenantRlsContext, withTenantRls, withTenantRlsBudget } from "../../../database/rls.js";
import { AuthSessionRepository } from "../../auth/repositories/auth-session.repository.js";
import { IdentityLinkEventRepository } from "../../auth/repositories/identity-link-event.repository.js";
import { IdentityLinkRepository } from "../../auth/repositories/identity-link.repository.js";
import {
  LocalAuthCredentialRepository,
  type ShareableLocalAuthCredential,
} from "../../auth/repositories/local-auth-credential.repository.js";
import { normalizePairIdentity } from "../../auth/services/identity-resolver.js";
import { EnterpriseAuditLogService } from "../audit/audit-log.service.js";
import {
  AuditLogRepository,
  RoleRepository,
  TenantRepository,
  UserRepository,
  UserRoleRepository,
} from "../repositories/index.js";
import { assertAssignableRole, isValidRole, validateRole, type Role } from "../permissions/catalog.js";
import {
  TENANT_ADMIN_ROLE,
  assertSelfChangeAllowed,
  lastTenantAdminError,
  removesActiveTenantAdmin,
} from "../services/tenant-admin-guard.js";
import { toUserAuditSnapshot } from "../services/user-audit-snapshot.js";
import {
  confirmAccessGrant,
  confirmCreation,
  insertCancelledCreation,
  openCreationLog,
} from "../services/user-creation-log.js";
import {
  EmailInGroupError,
  LoginAmbiguousInGroupError,
  LoginNotFoundInGroupError,
  loginOriginsOf,
  probeGroupPeers,
} from "../services/group-peer-probe.js";
import { isGrantOutsideGroup as checkGrantOutsideGroup } from "../services/grant-group-guard.js";
import {
  CoreSaasError,
  type AuditEvent,
  type CreateTenantInput,
  type CreateUserInput,
  type GrantedUserAccess,
  type GrantUserAccessInput,
  type InitialCredentialInput,
  type ListTenantOptions,
  type Tenant,
  type TenantStatus,
  type User,
  type UserStatus,
} from "../types/core-saas.types.js";
import type {
  AsyncCoreSaasStore,
  CreatePersistentAuditEventInput,
  UpdateUserPersistenceInput,
} from "./async-core-saas.store.js";

type PrismaTenant = Awaited<ReturnType<TenantRepository["create"]>>;
type PrismaUser = NonNullable<Awaited<ReturnType<UserRepository["findByIdForTenant"]>>>;
type PrismaAuditLog = Awaited<ReturnType<AuditLogRepository["create"]>>;

// B-APP-ORG-2S (S1) — orcamento da transacao da criacao: espera por conexao, duracao da transacao
// e timeouts locais de trava/statement. Estourar o lock (a outra criacao do mesmo e-mail segurando
// a linha 'em_curso') vira 503 `creation_unavailable` (K14) e nada muda.
export const USER_CREATION_BUDGET = {
  maxWait: 5_000,
  timeout: 15_000,
  lockTimeoutMs: 2_000,
  statementTimeoutMs: 5_000,
} as const;

export class PrismaCoreSaasStore implements AsyncCoreSaasStore {
  constructor(
    private readonly prismaClient: PrismaClient = prisma,
    private readonly tenants = new TenantRepository(),
    private readonly users = new UserRepository(),
    private readonly roles = new RoleRepository(),
    private readonly userRoles = new UserRoleRepository(),
    private readonly auditLogs = new AuditLogRepository(),
  ) {}

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    return this.prismaClient.$transaction(async (tx) => {
      const txTenants = new TenantRepository(tx);
      const txAudit = new AuditLogRepository(tx);

      const tenant = await txTenants.create({
        name: input.name,
        slug: createTenantSlug(input.name),
        status: input.status ?? "active",
        // Ω-ACESSO — persiste os módulos provisionados (antes ficavam só em memória; prisma perdia).
        modules: input.modules ?? [],
      });

      await setTenantRlsContext(tx, tenant.id);

      // Audit recorded inside the same transaction — if audit fails, tenant creation rolls back.
      // actor_user_id is null because tenant creation precedes any user-based auth.
      await new EnterpriseAuditLogService(txAudit).record({
        tenantId: tenant.id,
        actorId: null,
        actorType: "system",
        action: "tenant.created",
        resourceType: "tenant",
        resourceId: tenant.id,
        outcome: "success",
        severity: "info",
      });

      return mapTenantFromPrisma(tenant);
    });
  }

  async findTenantById(tenantId: string): Promise<Tenant | undefined> {
    const tenant = await this.tenants.findById(tenantId);

    return tenant ? mapTenantFromPrisma(tenant) : undefined;
  }

  async listTenants(options: ListTenantOptions = {}): Promise<Tenant[]> {
    const tenants = options.status
      ? await this.tenants.listByStatus(options.status)
      : await this.tenants.listAll();

    return tenants.map(mapTenantFromPrisma);
  }

  async listTenantsForTenant(
    tenantId: string,
    options: ListTenantOptions = {},
  ): Promise<Tenant[]> {
    const tenants = await this.tenants.listForTenant(tenantId);

    return tenants
      .filter((tenant) => !options.status || tenant.status === options.status)
      .map(mapTenantFromPrisma);
  }

  async createUser(input: CreateUserInput, credential?: InitialCredentialInput): Promise<User> {
    return withTenantRlsBudget(this.prismaClient, input.tenantId, USER_CREATION_BUDGET, async (tx) => {
      const txUsers = new UserRepository(tx);
      const txRoles = new RoleRepository(tx);
      const txUserRoles = new UserRoleRepository(tx);
      const txAudit = new AuditLogRepository(tx);

      // B-APP-ORG-2S (S1) — a trava do e-mail unico no grupo: primeira gravacao e a linha 'em_curso'
      // (o indice unico parcial segura a outra criacao do mesmo e-mail), depois a volta patio a patio.
      const creationSeq = await openCreationLog(tx, input);
      const peers = await probeGroupPeers(tx, input);

      if (peers.users > 0) throw new EmailInGroupError();

      // Step 1: create user record
      const user = await txUsers.createWithRoleAssignments({
        tenant_id: input.tenantId,
        branch_id: input.branchIds?.[0] ?? null,
        name: input.name,
        email: input.email,
        status: input.status ?? "active",
      });
      await confirmCreation(tx, input, creationSeq, user.id);

      // Step 2: assign roles — if any fail, the whole transaction rolls back (no orphaned user)
      for (const role of input.roles.map((value) => validateRole(value))) {
        const roleRecord = await txRoles.findByKeyForTenant(role, input.tenantId);

        if (!roleRecord) {
          throw new Error(`Role is not assignable to tenant: ${role}`);
        }

        await txUserRoles.assignRole({
          tenant_id: input.tenantId,
          user_id: user.id,
          role_id: roleRecord.id,
          branch_id: input.branchIds?.[0] ?? null,
        });
      }

      // Step 2b (B-O6R-01 §3.4): identidade global + vínculo explícito + evento 'backfill' na
      // MESMA transação da criação do usuário. O create() do vínculo é seguro aqui porque o
      // store roda dentro de withTenantRls (GUC de tenant posto quando o RETURNING é avaliado);
      // os INSERTs de identidade e de evento vão pelo caminho SEM RETURNING (§3.1).
      await normalizePairIdentity(tx, input.tenantId, user.id);

      // Step 2c (B-USERS-ACESSO-SEG, S2 — Achado 1): a credencial local do usuário novo, na MESMA transação
      // (falhou a criação, não sobra credencial; falhou a credencial, não sobra usuário). Só o hash da senha
      // PROVISÓRIA chega aqui, com a marca "trocar no próximo acesso" (P1) ligada; o GUC da organização já
      // está posto (withTenantRls).
      if (credential) {
        await new LocalAuthCredentialRepository(tx).upsertTemporaryPassword({
          tenant_id: input.tenantId,
          user_id: user.id,
          email: input.email,
          password_hash: credential.passwordHash,
          password_algorithm: credential.passwordAlgorithm,
        });
      }

      // Step 3: resolve actor within the same transaction (sees the user created above)
      const actorId = isUuid(input.actorUserId ?? "")
        ? (
            await tx.user.findFirst({
              where: { id: input.actorUserId!, tenant_id: input.tenantId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

      // Step 4: audit inside the transaction — if audit fails, user and roles roll back
      await new EnterpriseAuditLogService(txAudit).record({
        tenantId: input.tenantId,
        actorId,
        actorType: actorId ? "user" : "system",
        action: "user.created",
        resourceType: "user",
        resourceId: user.id,
        outcome: "success",
        severity: "info",
        metadata: {
          email: user.email,
          roleCount: input.roles.length,
          branchCount: input.branchIds?.length ?? 0,
          // S2/S8: só o FATO de que nasceu uma credencial provisória — nunca a senha nem o hash.
          temporaryCredential: credential !== undefined,
        },
      });

      const savedUser = await txUsers.findByIdForTenant(user.id, input.tenantId);

      return mapUserFromPrisma(savedUser ?? user);
    });
  }

  async grantAccess(input: GrantUserAccessInput): Promise<GrantedUserAccess> {
    return withTenantRlsBudget(this.prismaClient, input.tenantId, USER_CREATION_BUDGET, async (tx) => {
      const txUsers = new UserRepository(tx);
      const txRoles = new RoleRepository(tx);
      const txUserRoles = new UserRoleRepository(tx);
      const credentials = new LocalAuthCredentialRepository(tx);
      // B-APP-ORG-2S (S2a) — a concessao passa pela MESMA linha 'em_curso' e pela MESMA volta da criacao
      // (1.8.1 §3): quem chega depois espera, e a volta le a vigencia do grupo na hora.
      const creationSeq = await openCreationLog(tx, input);
      const peers = await probeGroupPeers(tx, input);

      // 0 identidade no grupo vigente: o 404 uniforme (G3, G4, G6). Mais de uma (legado): 409, nada criado (G5).
      if (peers.identityIds.length === 0) throw new LoginNotFoundInGroupError();
      if (peers.identityIds.length > 1) throw new LoginAmbiguousInGroupError();

      const user = await txUsers.createWithRoleAssignments({
        tenant_id: input.tenantId,
        branch_id: null,
        name: input.name,
        email: input.email,
        status: "active",
      });
      // A identidade do login que ja existe no grupo, nunca uma identidade nova para o par de Y (MS3).
      const identityId = peers.identityIds[0];

      // A credencial do par de origem, lida com FOR SHARE no contexto de RLS do patio de origem (papel sem
      // bypass): a troca de senha em voo termina antes, e a copia sai com o hash que ficou (MD2).
      const loginOrigins = loginOriginsOf(peers.origins, identityId);
      if (loginOrigins.length === 0) throw new LoginNotFoundInGroupError();
      if (loginOrigins.length > 1) throw new LoginAmbiguousInGroupError();
      const originTenantId = loginOrigins[0].tenantId;
      let origin: ShareableLocalAuthCredential | null = null;

      try {
        await setTenantRlsContext(tx, originTenantId);
        origin = await credentials.findForShareByEmailForTenant(input.email, originTenantId);
      } catch (error) {
        // A reposicao do GUC nunca toma o lugar do erro que ja esta subindo (1.8.3.17, I1): o prazo esgotado na
        // leitura da origem chega inteiro a quem responde 503. So a falha da reposicao e engolida.
        await setTenantRlsContext(tx, input.tenantId).catch(() => undefined);
        throw error;
      }

      await setTenantRlsContext(tx, input.tenantId);

      if (!origin) throw new LoginNotFoundInGroupError();

      const role = await txRoles.findByKeyForTenant("field_technician", input.tenantId);
      if (!role) throw new Error("Role is not assignable to tenant: field_technician");
      await txUserRoles.assignRole({
        tenant_id: input.tenantId,
        user_id: user.id,
        role_id: role.id,
        branch_id: null,
      });

      const actorId = isUuid(input.actorUserId ?? "")
        ? (
            await tx.user.findFirst({
              where: { id: input.actorUserId!, tenant_id: input.tenantId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

      const link = await new IdentityLinkRepository(tx).createForPair({
        identity_id: identityId,
        tenant_id: input.tenantId,
        user_id: user.id,
        attached_via: "concessao",
      });
      await new IdentityLinkEventRepository(tx).append({
        link_id: link.id,
        from_identity_id: null,
        to_identity_id: identityId,
        event: "concessao",
        tenant_id: input.tenantId,
        user_id: user.id,
        actor_tenant_id: input.tenantId,
        actor_user_id: actorId,
      });
      await credentials.insertCopy(input.tenantId, user.id, origin);
      await confirmAccessGrant(tx, input, creationSeq, user.id, originTenantId);

      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        tenantId: input.tenantId,
        actorId,
        actorType: actorId ? "user" : "system",
        action: "user.access_granted",
        resourceType: "user",
        resourceId: user.id,
        outcome: "success",
        severity: "info",
        metadata: {
          email: user.email,
          role: "field_technician",
          temporary_credential_pending: origin.must_change_password,
        },
      });

      const savedUser = await txUsers.findByIdForTenant(user.id, input.tenantId);

      // Uso interno do processo: a identidade e o patio de origem nunca saem pela rota (G1, MS9).
      return { user: mapUserFromPrisma(savedUser ?? user), identityId, originTenantId };
    });
  }


  // B-APP-ORG-2S (S1) — o registro do perdedor, em transacao curta propria: linha 'cancelado' com
  // numero maior que o do vencedor e a auditoria do patio que tentou. Nunca guarda o patio vencedor.
  async recordCancelledCreation(tenantId: string, email: string, actorUserId?: string): Promise<void> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      await insertCancelledCreation(tx, { tenantId, email, actorUserId }, "email_in_group");

      const actorId = isUuid(actorUserId ?? "")
        ? (
            await tx.user.findFirst({
              where: { id: actorUserId!, tenant_id: tenantId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        tenantId,
        actorId,
        actorType: actorId ? "user" : "system",
        action: "user.created",
        resourceType: "user",
        resourceId: null,
        outcome: "denied",
        severity: "warning",
        metadata: { email },
      });
    });
  }

  // B-APP-ORG-2S-c (SC, X6) — o par `concessao` cuja origem saiu do grupo, lido sob o contexto do
  // próprio pátio. Só leitura: o desfecho (inativar, revogar, auditar) acontece na guarda, no uso.
  async isGrantOutsideGroup(tenantId: string, userId: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      return checkGrantOutsideGroup(tx, tenantId, userId);
    });
  }

  async updateUser(input: UpdateUserPersistenceInput): Promise<User> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const txUsers = new UserRepository(tx);
      const txRoles = new RoleRepository(tx);
      const txUserRoles = new UserRoleRepository(tx);
      const txAudit = new AuditLogRepository(tx);

      // Step 0 (B-USERS-ACESSO-SEG, S3/S5): a TRAVA DA ORGANIZAÇÃO. Toda mudança de status ou de papéis
      // passa pela linha da organização em `tenants` (FOR NO KEY UPDATE, o mesmo mutex do
      // cycle-count-prisma.repository.ts: não conflita com o KEY SHARE das FKs para `tenants`, e
      // `tenants` não tem RLS). Dois rebaixamentos, ou uma desativação e um rebaixamento, da mesma
      // organização ficam em fila: quem chega depois relê o estado JÁ gravado pelo primeiro. Uma trava
      // sobre as linhas de `user_role_assignments` não bastaria (Achado 4 da crítica): o rebaixamento
      // apaga e recria o vínculo, e a linha recriada não estaria travada nem visível ao statement que
      // contasse junto com a trava.
      if (input.status !== undefined || input.roles !== undefined) {
        await tx.$queryRaw`SELECT id FROM "tenants" WHERE id = ${input.tenantId}::uuid FOR NO KEY UPDATE`;
      }

      // O estado ATUAL, lido DEPOIS da trava e num statement próprio (em READ COMMITTED, snapshot
      // novo: enxerga o commit de quem estava na frente da fila). Também é o "antes" da auditoria.
      const current = await tx.user.findFirst({
        where: { id: input.userId, tenant_id: input.tenantId },
        select: {
          name: true,
          status: true,
          role_assignments: { select: { role: { select: { key: true } } } },
        },
      });

      if (!current) {
        throw new CoreSaasError(404, "NOT_FOUND", "user_not_found", `User not found: ${input.userId}`);
      }

      const currentRoles = mapRoleAssignmentsFromPrisma(current.role_assignments);
      const currentState = { status: current.status, isTenantAdmin: currentRoles.includes(TENANT_ADMIN_ROLE) };
      const nextState = {
        status: input.status ?? current.status,
        isTenantAdmin:
          input.roles !== undefined ? input.roles.includes(TENANT_ADMIN_ROLE) : currentState.isTenantAdmin,
      };

      assertSelfChangeAllowed({
        isSelf: input.actorUserId !== undefined && input.actorUserId === input.userId,
        requestedStatus: input.status,
        current: currentState,
        next: nextState,
      });

      if (removesActiveTenantAdmin(currentState, nextState)) {
        // Os OUTROS administradores ATIVOS, contados num statement próprio DEPOIS da trava (nunca junto
        // com ela: o EvalPlanQual reavaliaria com o snapshot antigo e não veria a linha recriada por quem
        // estava na frente). Papel por CHAVE (`tenant_admin`), qualquer que seja a linha (global ou da
        // organização). Sob o GUC desta transação, `users` e `user_role_assignments` só mostram a
        // organização do ator.
        const [admins] = await tx.$queryRaw<Array<{ count: number }>>`
          SELECT count(DISTINCT u.id)::int AS count
          FROM users u
          JOIN user_role_assignments ura ON ura.tenant_id = u.tenant_id AND ura.user_id = u.id
          JOIN roles r ON r.id = ura.role_id
          WHERE u.tenant_id = ${input.tenantId}::uuid
            AND u.status = 'active'
            AND r.key = ${TENANT_ADMIN_ROLE}
            AND u.id <> ${input.userId}::uuid
        `;

        if ((admins?.count ?? 0) === 0) {
          throw lastTenantAdminError();
        }
      }

      // Step 1: update scalar profile fields (name/status) when provided.
      if (input.name !== undefined || input.status !== undefined) {
        await txUsers.updateProfile(input.userId, {
          name: input.name,
          status: input.status,
        });
      }

      // Step 1b (B-USERS-ACESSO-SEG, Achado 3): desativar revoga, NA MESMA transação, todas as
      // sessões ativas do par (organização, usuário). O GUC de tenant já está na organização do par
      // (withTenantRls acima), a condição que o repositório exige para não afetar zero linhas sem
      // erro. A renovação passa a recusar por revogação, e a sessão some da lista de ativas.
      // B-USERS-SEG-DESATIVADO (P2 = a, A6): trocar o CONJUNTO de papéis também revoga — a pessoa entra de novo
      // e recebe o perfil novo, e o portão recusa o token antigo na próxima requisição. Renomear, ou mandar os
      // mesmos papéis em outra ordem (o formulário da web manda `roles` sempre), não revoga.
      const rolesChanged = input.roles !== undefined && !hasSameRoleKeys(currentRoles, input.roles);
      const revokedSessions =
        input.status === "inactive" || rolesChanged
          ? (await new AuthSessionRepository(tx).revokeAllActiveByUserForTenant(input.userId, input.tenantId))
              .count
          : undefined;

      // Step 2: replace role assignments when roles were provided. Clearing then
      // reassigning keeps the set exactly equal to the requested roles.
      if (input.roles !== undefined) {
        await txUserRoles.removeAllForUser(input.userId, input.tenantId);

        for (const role of input.roles) {
          const roleRecord = await txRoles.findByKeyForTenant(role, input.tenantId);

          if (!roleRecord) {
            throw new Error(`Role is not assignable to tenant: ${role}`);
          }

          await txUserRoles.assignRole({
            tenant_id: input.tenantId,
            user_id: input.userId,
            role_id: roleRecord.id,
            branch_id: null,
          });
        }
      }

      // Step 3: audit inside the transaction — if audit fails, the update rolls back.
      const actorId = isUuid(input.actorUserId ?? "")
        ? (
            await tx.user.findFirst({
              where: { id: input.actorUserId!, tenant_id: input.tenantId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

      const savedUser = await txUsers.findByIdForTenant(input.userId, input.tenantId);

      if (!savedUser) {
        throw new Error(`User not found after update: ${input.userId}`);
      }

      const updatedUser = mapUserFromPrisma(savedUser);

      // B-USERS-ACESSO-SEG (S8) — antes/depois por LISTA PERMITIDA (nome, status, papéis), mais a
      // contagem de sessões revogadas quando houve desativação. Nada de e-mail nem de credencial.
      await new EnterpriseAuditLogService(txAudit).record({
        tenantId: input.tenantId,
        actorId,
        actorType: actorId ? "user" : "system",
        action: "user.updated",
        resourceType: "user",
        resourceId: input.userId,
        outcome: "success",
        severity: "info",
        metadata: {
          before: toUserAuditSnapshot({ name: current.name, status: current.status, roles: currentRoles }),
          after: toUserAuditSnapshot(updatedUser),
          ...(revokedSessions !== undefined ? { revoked_sessions: revokedSessions } : {}),
        },
      });

      return updatedUser;
    });
  }

  async findUserByIdForTenant(
    userId: string,
    tenantId: string,
  ): Promise<User | undefined> {
    const user = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txUsers = new UserRepository(tx);

      return txUsers.findByIdForTenant(userId, tenantId);
    });

    return user ? mapUserFromPrisma(user) : undefined;
  }

  async listUsersByTenant(tenantId: string): Promise<User[]> {
    const users = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txUsers = new UserRepository(tx);

      return txUsers.listByTenant(tenantId);
    });

    return users.map(mapUserFromPrisma);
  }

  async listRolesByUserForTenant(userId: string, tenantId: string): Promise<Role[]> {
    const assignments = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txUserRoles = new UserRoleRepository(tx);

      return txUserRoles.listByUserForTenant(userId, tenantId);
    });

    return mapRoleAssignmentsFromPrisma(assignments);
  }

  async assignRoleToUser(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly role: Role;
    readonly branchId?: string | null;
  }): Promise<void> {
    // B-O6R-01 (Ω6R-SEC-001) — o ESCRITOR SEM ROTA também valida a allowlist: nenhum caminho de
    // código atribui papel de plataforma por fluxo de tenant, com ou sem rota na frente.
    assertAssignableRole(input.role);

    await withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const txRoles = new RoleRepository(tx);
      const txUserRoles = new UserRoleRepository(tx);
      const role = await txRoles.findByKeyForTenant(input.role, input.tenantId);

      if (!role) {
        throw new Error(`Role is not assignable to tenant: ${input.role}`);
      }

      await txUserRoles.assignRole({
        tenant_id: input.tenantId,
        user_id: input.userId,
        role_id: role.id,
        branch_id: input.branchId ?? null,
      });
    });
  }

  async saveAuditEvent(input: CreatePersistentAuditEventInput): Promise<AuditEvent> {
    const event = await withTenantRls(this.prismaClient, input.tenant_id, async (tx) => {
      const txUsers = new UserRepository(tx);
      const txAuditLogs = new AuditLogRepository(tx);
      const actorUserId = await this.resolveActorUserId(
        txUsers,
        input.actor_user_id,
        input.tenant_id,
      );

      return new EnterpriseAuditLogService(txAuditLogs).record({
        tenantId: input.tenant_id,
        actorId: actorUserId,
        action: input.action,
        resourceType: String(input.metadata?.entity ?? "core_saas"),
        resourceId: readOptionalString(input.metadata?.entity_id),
        outcome: readAuditOutcome(input.metadata?.outcome),
        severity: readAuditSeverity(input.metadata?.severity),
        metadata: toJsonObject(input.metadata),
      });
    });

    return {
      id: event.id,
      action: event.action,
      actor_user_id: event.actorId ?? input.actor_user_id,
      tenant_id: event.tenantId,
      timestamp: event.createdAt,
      metadata: input.metadata,
    };
  }

  async listAuditEventsByTenant(tenantId: string): Promise<AuditEvent[]> {
    const events = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txAuditLogs = new AuditLogRepository(tx);

      return txAuditLogs.listByTenant(tenantId);
    });

    return events.map((event) => mapAuditLogFromPrisma(event));
  }

  private async resolveActorUserId(
    users: UserRepository,
    actorUserId: string,
    tenantId: string,
  ): Promise<string | null> {
    if (!isUuid(actorUserId)) {
      return null;
    }

    const actor = await users.findByIdForTenant(actorUserId, tenantId);

    return actor ? actor.id : null;
  }
}

export function mapTenantFromPrisma(tenant: PrismaTenant): Tenant {
  return {
    id: tenant.id,
    name: tenant.name,
    status: mapTenantStatus(tenant.status),
    // Ω-ACESSO — módulos provisionados de verdade (antes era [] hardcoded → menu vazio p/ todos).
    modules: tenant.modules ?? [],
    createdAt: tenant.created_at,
  };
}

export function mapUserFromPrisma(user: PrismaUser): User {
  return {
    id: user.id,
    tenantId: user.tenant_id,
    name: user.name,
    email: user.email,
    roles: mapRoleAssignmentsFromPrisma(user.role_assignments ?? []),
    branchIds: uniqueStrings([
      user.branch_id,
      ...(user.role_assignments ?? []).map((assignment) => assignment.branch_id),
    ]),
    status: mapUserStatus(user.status),
    createdAt: user.created_at,
  };
}

export function mapAuditLogFromPrisma(
  event: PrismaAuditLog,
  actorUserId = event.actor_user_id ?? "system",
): AuditEvent {
  return {
    id: event.id,
    action: event.action,
    actor_user_id: actorUserId,
    tenant_id: event.tenant_id,
    timestamp: event.created_at,
    metadata: isRecord(event.metadata) ? event.metadata : undefined,
  };
}

export function mapRoleAssignmentsFromPrisma(
  assignments: ReadonlyArray<{ readonly role: { readonly key: string } }>,
): Role[] {
  return uniqueRoles(
    assignments
      .map((assignment) => assignment.role.key)
      .filter(isValidRole)
      .map((role) => validateRole(role)),
  );
}

export function createTenantSlug(name: string): string {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${baseSlug || "tenant"}-${Date.now().toString(36)}`;
}

function mapTenantStatus(status: string): TenantStatus {
  return status === "active" ? "active" : "inactive";
}

function mapUserStatus(status: string): UserStatus {
  return status === "inactive" ? "inactive" : "active";
}

function uniqueStrings(values: ReadonlyArray<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

// B-USERS-SEG-DESATIVADO (A6) — os dois conjuntos de chaves de papel são iguais, sem ordem e sem repetição.
function hasSameRoleKeys(current: readonly string[], next: readonly string[]): boolean {
  const currentKeys = new Set(current);
  const nextKeys = new Set(next);

  if (currentKeys.size !== nextKeys.size) {
    return false;
  }

  for (const key of currentKeys) {
    if (!nextKeys.has(key)) {
      return false;
    }
  }

  return true;
}

function uniqueRoles(values: readonly Role[]): Role[] {
  return [...new Set(values)];
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readAuditOutcome(value: unknown): "success" | "failure" | "denied" | undefined {
  if (value === "success" || value === "failure" || value === "denied") {
    return value;
  }

  return undefined;
}

function readAuditSeverity(value: unknown): "info" | "warning" | "critical" | undefined {
  if (value === "info" || value === "warning" || value === "critical") {
    return value;
  }

  return undefined;
}

function toJsonObject(
  value: Readonly<Record<string, unknown>> | undefined,
): Prisma.InputJsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
