import type { Prisma, PrismaClient } from "@prisma/client";

import { setTenantRlsContext } from "../../database/rls.js";
import { EnterpriseAuditLogService } from "../core-saas/audit/audit-log.service.js";
import { AuditLogRepository } from "../core-saas/repositories/audit-log.repository.js";
import { createTenantSlug } from "../core-saas/store/prisma-core-saas.store.js";
import { GROUP_MEMBERS_MAX } from "../subscription-billing/economic-groups/economic-groups.service.js";
import { todayBusinessDate } from "../subscription-billing/economic-groups/membership.rules.js";
import { membershipAuditBuilder } from "../subscription-billing/overview/overview.trail.js";
import { pickBillingAuditMetadata } from "../subscription-billing/platform-audit/audit-metadata.js";
import { CANONICAL_MODULE_KEYS } from "./platform-modules.service.js";
import {
  normalizedOrganizationName,
  OrganizationGroupNameInvalidError,
  OrganizationGroupNameTakenError,
  OrganizationGroupNotFoundError,
  OrganizationGroupTooManyMembersError,
  OrganizationNameConflictError,
  planModuleChange,
  subscriptionInForce,
  type CreatedOrganizationRecord,
  type CreateOrganizationRecord,
  type ModuleChange,
  type OrganizationGroupRef,
  type PlatformOrganizationsRepository,
  type ReplaceModulesResult,
} from "./platform-organizations.repository.js";
import type { PlatformOrganizationRecord, UpdateTenantStatusDto } from "./platform.types.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GROUP_NAME_MAX_LENGTH = 120;

type GroupRow = {
  readonly id: string;
  readonly name: string;
  readonly deleted_at: Date | null;
};

export class PrismaPlatformOrganizationsRepository implements PlatformOrganizationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<readonly PlatformOrganizationRecord[]> {
    return (await this.prisma.tenant.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] })).map(mapRow);
  }

  async findById(id: string): Promise<PlatformOrganizationRecord | null> {
    if (!UUID.test(id)) return null;
    const row = await this.prisma.tenant.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async create(input: CreateOrganizationRecord): Promise<CreatedOrganizationRecord> {
    const today = todayBusinessDate(new Date());

    try {
      return await this.prisma.$transaction(async (tx) => {
        const group = await this.resolveAndLockGroup(tx, input.group, input.actorUserId);

        if ("id" in input.group) {
          await this.assertOrganizationNameAvailable(tx, group.id, input.name);
          await this.assertGroupCapacity(tx, group.id, today);
        }

        const tenant = await tx.tenant.create({
          data: {
            name: input.name,
            slug: createTenantSlug(input.name),
            status: "active",
            modules: [],
          },
        });
        await setTenantRlsContext(tx, tenant.id);
        await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
          tenantId: tenant.id,
          actorId: null,
          actorType: "system",
          action: "tenant.created",
          resourceType: "tenant",
          resourceId: tenant.id,
          outcome: "success",
          severity: "info",
        });
        await this.platformAudit(tx, tenant.id, input.actorUserId, "organization.created", {
          status_to: "active",
        });

        await tx.economicGroupMember.create({
          data: {
            tenant_id: tenant.id,
            group_id: group.id,
            valid_from: new Date(`${today}T00:00:00.000Z`),
            created_by: actorColumn(input.actorUserId),
          },
        });
        const membershipEvent = membershipAuditBuilder({
          kind: "joined",
          tenantId: tenant.id,
          groupId: group.id,
          validFrom: today,
          validTo: null,
          actorId: actorColumn(input.actorUserId),
        });
        await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
          tenantId: tenant.id,
          actorId: membershipEvent.actorId,
          actorType: membershipEvent.actorId === null ? "system" : "user",
          action: membershipEvent.action,
          resourceType: "economic_group",
          resourceId: membershipEvent.entityId,
          metadata: membershipEvent.metadata,
        });

        return { organization: mapRow(tenant), group };
      }, { maxWait: 30_000, timeout: 30_000 });
    } catch (error) {
      if ("name" in input.group && isGroupNameTaken(error)) throw new OrganizationGroupNameTakenError();
      throw error;
    }
  }

  async rename(
    id: string,
    name: string,
    groupId: string | null,
    actorUserId: string,
  ): Promise<PlatformOrganizationRecord | null> {
    if (!UUID.test(id)) return null;
    return this.prisma.$transaction(async (tx) => {
      if (groupId !== null) await this.lockExistingGroup(tx, groupId);
      const current = await tx.tenant.findUnique({ where: { id } });
      if (!current) return null;
      if (groupId !== null) await this.assertOrganizationNameAvailable(tx, groupId, name, id);
      const row = await tx.tenant.update({ where: { id }, data: { name } });
      await this.platformAudit(tx, id, actorUserId, "organization.updated", {});
      return mapRow(row);
    });
  }

  async changeStatus(
    id: string,
    input: UpdateTenantStatusDto,
    actorUserId: string,
  ): Promise<PlatformOrganizationRecord | null> {
    if (!UUID.test(id)) return null;
    return this.prisma.$transaction(async (tx) => {
      await setTenantRlsContext(tx, id);
      const current = await tx.tenant.findUnique({ where: { id } });
      if (!current) return null;
      const row = await tx.tenant.update({ where: { id }, data: { status: input.status } });
      if (input.status === "suspended") {
        await tx.authSession.updateMany({
          where: { tenant_id: id, revoked_at: null },
          data: { revoked_at: new Date() },
        });
      }
      const action = input.status === "suspended" ? "suspended" : "reactivated";
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        tenantId: id,
        actorId: null,
        actorType: "system",
        action: `tenant.${action}`,
        resourceType: "tenant",
        resourceId: id,
        outcome: "success",
        severity: "warning",
        metadata: {
          statusFrom: current.status,
          statusTo: input.status,
          reasonCode: input.reason,
        },
      });
      await this.platformAudit(tx, id, actorUserId, `organization.${action}`, {
        status_from: current.status,
        status_to: input.status,
        reason_code: input.reason,
      });
      return mapRow(row);
    });
  }

  // B-PLANOS-MODULOS (D-PLANOS-MODULOS-PORTA-REAL) — a troca de módulos de UMA organização sem assinatura, numa
  // transação só. A ordem é a da Emenda 1 do plano, e o ratchet `san3-05-acessos-de-plataforma` depende dela:
  //   1. o contexto de RLS da organização é a 1ª instrução (só assim o `tx` é "sob contexto");
  //   2. `FOR UPDATE` na linha de `tenants` (sem RLS): a escrita de módulos da assinatura, na mesma linha, espera;
  //   3. a leitura da assinatura (`tenant_subscriptions`, FORCE RLS) vem DEPOIS do contexto: sem ele ela veria zero
  //      linhas e a porta abriria. Em vigor = `valid_to` nulo ou no futuro; achou, nada se escreve;
  //   4. a lista atual × a nova, como conjunto: igual, nada se escreve (nem a trilha);
  //   5. `tenants.modules` e as duas trilhas (`platform_audit_logs` e `audit_logs` da organização) na MESMA transação.
  async replaceModules(
    organizationId: string,
    modules: readonly string[],
    actorUserId: string,
    now: Date,
  ): Promise<ReplaceModulesResult> {
    if (!UUID.test(organizationId)) return { kind: "not_found" };
    const outcome = await this.prisma.$transaction(async (tx): Promise<ReplaceModulesResult> => {
      await setTenantRlsContext(tx, organizationId);
      const locked = await tx.$queryRaw<Array<Parameters<typeof mapRow>[0]>>`
        SELECT id, name, slug, status, modules, created_at, updated_at
        FROM tenants
        WHERE id = ${organizationId}::uuid FOR UPDATE
      `;
      const current = locked[0];
      if (!current) return { kind: "not_found" };
      const subscriptions = await tx.tenantSubscription.findMany({ where: { tenant_id: organizationId }, select: { valid_to: true } });
      if (subscriptions.some((subscription) => subscriptionInForce(subscription.valid_to, now))) return { kind: "subscription_in_force" };
      const change = planModuleChange(current.modules, modules);
      if (!change) return { kind: "unchanged", organization: mapRow(current) };
      const row = await tx.tenant.update({ where: { id: organizationId }, data: { modules: [...change.next] } });
      const trail = modulesTrailMetadata(change);
      await tx.platformAuditLog.create({
        data: {
          actor_user_id: actorColumn(actorUserId),
          tenant_id: organizationId,
          action: "organization.modules_changed",
          entity: "organization",
          entity_id: organizationId,
          metadata: { ...pickBillingAuditMetadata({ actor_user_id: actorUserId }), ...trail } as Prisma.InputJsonObject,
        },
      });
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        tenantId: organizationId,
        actorId: null,
        actorType: "system",
        action: "tenant.modules_changed",
        resourceType: "tenant",
        resourceId: organizationId,
        outcome: "success",
        severity: "warning",
        metadata: { modules_added: trail.modules_added, modules_removed: trail.modules_removed },
      });
      return { kind: "changed", organization: mapRow(row) };
    }, { maxWait: 30_000, timeout: 30_000 });
    return outcome;
  }

  private async resolveAndLockGroup(
    tx: Prisma.TransactionClient,
    input: CreateOrganizationRecord["group"],
    actorUserId: string,
  ): Promise<OrganizationGroupRef> {
    if ("id" in input) return this.lockExistingGroup(tx, input.id);

    const name = input.name.trim();
    if (name.length < 1 || name.length > GROUP_NAME_MAX_LENGTH) throw new OrganizationGroupNameInvalidError();
    const group = await tx.economicGroup.create({
      data: {
        name,
        notes: null,
        created_by: actorColumn(actorUserId),
        updated_by: actorColumn(actorUserId),
      },
      select: { id: true, name: true },
    });
    const metadata = pickBillingAuditMetadata({ actor_user_id: actorUserId, group_id: group.id });
    await tx.platformAuditLog.create({
      data: {
        actor_user_id: actorColumn(actorUserId),
        tenant_id: null,
        action: "economic_group.created",
        entity: "economic_group",
        entity_id: group.id,
        metadata: { ...metadata } as Prisma.InputJsonObject,
      },
    });
    return group;
  }

  private async lockExistingGroup(tx: Prisma.TransactionClient, groupId: string): Promise<OrganizationGroupRef> {
    if (!UUID.test(groupId)) throw new OrganizationGroupNotFoundError();
    const rows = await tx.$queryRaw<GroupRow[]>`
      SELECT id, name, deleted_at
      FROM economic_groups
      WHERE id = ${groupId}::uuid
      FOR UPDATE
    `;
    const group = rows[0];
    if (!group || group.deleted_at !== null) throw new OrganizationGroupNotFoundError();
    return { id: group.id, name: group.name };
  }

  private async assertOrganizationNameAvailable(
    tx: Prisma.TransactionClient,
    groupId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const wanted = normalizedOrganizationName(name);
    const tenants = await tx.tenant.findMany({ select: { id: true, name: true } });
    const today = new Date(`${todayBusinessDate(new Date())}T00:00:00.000Z`);

    for (const tenant of tenants) {
      if (tenant.id === exceptId || normalizedOrganizationName(tenant.name) !== wanted) continue;
      await setTenantRlsContext(tx, tenant.id);
      const member = await tx.economicGroupMember.findFirst({
        where: {
          tenant_id: tenant.id,
          group_id: groupId,
          OR: [{ valid_to: null }, { valid_to: { gt: today } }],
        },
        select: { id: true },
      });
      if (member) throw new OrganizationNameConflictError();
    }
  }

  private async assertGroupCapacity(tx: Prisma.TransactionClient, groupId: string, today: string): Promise<void> {
    const tenantIds = await tx.tenant.findMany({ select: { id: true } });
    const day = new Date(`${today}T00:00:00.000Z`);
    let members = 0;

    for (const tenant of tenantIds) {
      await setTenantRlsContext(tx, tenant.id);
      members += await tx.economicGroupMember.count({
        where: {
          tenant_id: tenant.id,
          group_id: groupId,
          OR: [{ valid_to: null }, { valid_to: { gt: day } }],
        },
      });
    }
    if (members >= GROUP_MEMBERS_MAX) throw new OrganizationGroupTooManyMembersError();
  }

  private async platformAudit(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const filtered = pickBillingAuditMetadata({ actor_user_id: actorUserId, ...metadata });
    await tx.platformAuditLog.create({
      data: {
        actor_user_id: actorColumn(actorUserId),
        tenant_id: tenantId,
        action,
        entity: "organization",
        entity_id: tenantId,
        metadata: filtered as Prisma.InputJsonObject,
      },
    });
  }
}

function actorColumn(value: string | null): string | null {
  return value !== null && UUID.test(value) ? value : null;
}

// B-PLANOS-MODULOS — a função LOCAL de metadados da trilha de módulos (§5.4 do plano). As listas só levam chave do
// catálogo fechado, no máximo 50 (a regra `codeList` da casa derrubaria `tenant-admin`, por causa do hífen); a chave
// antiga fora do catálogo sai só como contagem, sem o texto dela. Nada de e-mail, nome, token, caminho ou `tenant_id`
// externo (§2.8). O `actor_user_id` continua passando por `pickBillingAuditMetadata`.
function modulesTrailMetadata(change: ModuleChange): {
  readonly modules_added: string[];
  readonly modules_removed: string[];
  readonly modules_removed_other: number;
} {
  const catalog = new Set(CANONICAL_MODULE_KEYS);
  const only = (keys: readonly string[]): string[] => keys.filter((key) => catalog.has(key)).slice(0, 50);
  return {
    modules_added: only(change.added),
    modules_removed: only(change.removed),
    modules_removed_other: Number.isSafeInteger(change.removedOther) && change.removedOther > 0 ? change.removedOther : 0,
  };
}

function isGroupNameTaken(error: unknown): boolean {
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    meta?: { target?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown; originalMessage?: unknown } } };
    cause?: { originalCode?: unknown; originalMessage?: unknown };
  } | null;
  const state = candidate?.cause?.originalCode ?? candidate?.meta?.driverAdapterError?.cause?.originalCode;
  const text = `${String(candidate?.message ?? "")} ${String(candidate?.cause?.originalMessage ?? "")} ${String(candidate?.meta?.driverAdapterError?.cause?.originalMessage ?? "")}`;
  const target = Array.isArray(candidate?.meta?.target) ? candidate.meta.target : [];
  return (
    text.includes("economic_groups_name_active_key") ||
    (candidate?.code === "P2002" && target.includes("name")) ||
    (state === "23505" && text.includes("economic_groups"))
  );
}

function mapRow(row: {
  id: string;
  name: string;
  slug: string;
  status: string;
  modules: string[];
  created_at: Date;
  updated_at: Date;
}): PlatformOrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    modules: row.modules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
