import type { Prisma, PrismaClient } from "@prisma/client";

import { setTenantRlsContext } from "../../database/rls.js";
import { EnterpriseAuditLogService } from "../core-saas/audit/audit-log.service.js";
import { AuditLogRepository } from "../core-saas/repositories/audit-log.repository.js";
import { createTenantSlug } from "../core-saas/store/prisma-core-saas.store.js";
import { GROUP_MEMBERS_MAX } from "../subscription-billing/economic-groups/economic-groups.service.js";
import { todayBusinessDate } from "../subscription-billing/economic-groups/membership.rules.js";
import { membershipAuditBuilder } from "../subscription-billing/overview/overview.trail.js";
import { pickBillingAuditMetadata } from "../subscription-billing/platform-audit/audit-metadata.js";
import {
  canonicalModuleList,
  diffModuleKeys,
  sameModuleSet,
  CANONICAL_MODULE_KEYS,
  type ModuleSetDiff,
} from "./platform-modules.service.js";
import {
  normalizedOrganizationName,
  OrganizationGroupNameInvalidError,
  OrganizationGroupNameTakenError,
  OrganizationGroupNotFoundError,
  OrganizationGroupTooManyMembersError,
  OrganizationNameConflictError,
  type CreatedOrganizationRecord,
  type CreateOrganizationRecord,
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

  // B-PLANOS-MODULOS (§5.5, item 3, com a ordem da Emenda 1) — a escrita real da porta, numa transação só:
  //   1. o GUC da organização PRIMEIRO. `tenant_subscriptions` e `audit_logs` têm RLS ENABLE+FORCE: sem o contexto
  //      a leitura da assinatura devolve zero linhas e a porta abriria para quem TEM assinatura. Falha fechada.
  //   2. o `FOR UPDATE` na linha de `tenants`, que serializa esta escrita com a escrita de módulos que a própria
  //      atribuição de assinatura faz na mesma linha (`putSubscription` → `writeModules`).
  //   3. a leitura da assinatura em vigor (`valid_to` NULO ou NO FUTURO): achou, recusa sem escrever.
  //   4. o atalho de "sem mudança": conjunto igual ao atual não escreve e não trilha.
  //   5. a gravação de `tenants.modules` e as DUAS trilhas, todas dentro da mesma transação (D9: falha na trilha
  //      desfaz a escrita).
  // O `setTenantRlsContext` é um `set_config` e não toma trava de linha, então a ordem 1→2 preserva ao mesmo tempo
  // o invariante do §5.5 (ler a assinatura sempre depois do setter) e a trava que a corrida do D6 mede.
  async replaceModules(
    id: string,
    modules: readonly string[],
    actorUserId: string,
    now: Date,
  ): Promise<ReplaceModulesResult> {
    if (!UUID.test(id)) return { kind: "not_found" };
    return this.prisma.$transaction(async (tx) => {
      await setTenantRlsContext(tx, id);
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.tenant.findUnique({ where: { id } });
      if (!current) return { kind: "not_found" } as const;
      const subscription = await tx.tenantSubscription.findFirst({
        where: { tenant_id: id, OR: [{ valid_to: null }, { valid_to: { gt: now } }] },
        select: { id: true },
      });
      if (subscription) return { kind: "subscription_in_force" } as const;
      const next = canonicalModuleList(modules);
      if (sameModuleSet(current.modules, next)) return { kind: "unchanged", organization: mapRow(current) } as const;
      const row = await tx.tenant.update({ where: { id }, data: { modules: next } });
      const diff = diffModuleKeys(current.modules, next);
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        tenantId: id,
        actorId: null,
        actorType: "system",
        action: "tenant.modules_changed",
        resourceType: "tenant",
        resourceId: id,
        outcome: "success",
        severity: "info",
        metadata: {
          modules_added: [...diff.added],
          modules_removed: [...diff.removed],
          modules_removed_other: diff.removedOther,
        },
      });
      await tx.platformAuditLog.create({
        data: {
          actor_user_id: actorColumn(actorUserId),
          tenant_id: id,
          action: "organization.modules_changed",
          entity: "organization",
          entity_id: id,
          metadata: modulesChangedMetadata(actorUserId, diff) as Prisma.InputJsonObject,
        },
      });
      return { kind: "changed", organization: mapRow(row) } as const;
    }, { maxWait: 30_000, timeout: 30_000 });
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

// B-PLANOS-MODULOS (§5.4) — os metadados da trilha de plataforma. `actor_user_id` continua passando pela allowlist
// da casa; as DUAS LISTAS NÃO passam, e não podem passar: a regra `codeList` de `BILLING_AUDIT_RULES` exige
// `/^[a-z][a-z0-9_]{0,39}$/` e derrubaria a chave canônica `tenant-admin` por causa do hífen (M9). Acrescentar uma
// regra nova em `audit-metadata.ts` está fora do escopo deste bloco, e `tests/ass-05b-audit-allowlist.test.ts`
// congela a lista de chaves dela. O filtro é local e mais estrito que o necessário: só chave do catálogo canônico,
// sem repetição e no máximo 50 itens — a lista nunca carrega texto livre vindo do corpo da requisição.
const MODULES_METADATA_MAX_ITEMS = 50;

function canonicalModuleMetadataList(values: readonly string[]): string[] {
  const known = new Set(CANONICAL_MODULE_KEYS);
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !known.has(value) || out.includes(value)) continue;
    out.push(value);
    if (out.length >= MODULES_METADATA_MAX_ITEMS) break;
  }
  return out;
}

function modulesChangedMetadata(actorUserId: string, diff: ModuleSetDiff): Record<string, unknown> {
  return {
    ...pickBillingAuditMetadata({ actor_user_id: actorUserId }, ["actor_user_id"]),
    modules_added: canonicalModuleMetadataList(diff.added),
    modules_removed: canonicalModuleMetadataList(diff.removed),
    modules_removed_other: Number.isInteger(diff.removedOther) && diff.removedOther > 0 ? diff.removedOther : 0,
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
