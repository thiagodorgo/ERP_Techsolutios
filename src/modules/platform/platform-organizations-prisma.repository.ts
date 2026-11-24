import type { Prisma, PrismaClient } from "@prisma/client";
import { EnterpriseAuditLogService } from "../core-saas/audit/audit-log.service.js";
import { AuditLogRepository } from "../core-saas/repositories/audit-log.repository.js";
import { createTenantSlug } from "../core-saas/store/prisma-core-saas.store.js";
import { setTenantRlsContext } from "../../database/rls.js";
import { pickBillingAuditMetadata } from "../subscription-billing/platform-audit/audit-metadata.js";
import { normalizedOrganizationName, OrganizationNameConflictError, type CreateOrganizationRecord, type PlatformOrganizationsRepository } from "./platform-organizations.repository.js";
import type { PlatformOrganizationRecord, UpdateTenantStatusDto } from "./platform.types.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PrismaPlatformOrganizationsRepository implements PlatformOrganizationsRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async list(): Promise<readonly PlatformOrganizationRecord[]> { return (await this.prisma.tenant.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] })).map(mapRow); }
  async findById(id: string): Promise<PlatformOrganizationRecord | null> { if (!UUID.test(id)) return null; const row = await this.prisma.tenant.findUnique({ where: { id } }); return row ? mapRow(row) : null; }
  async create(input: CreateOrganizationRecord): Promise<PlatformOrganizationRecord> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockName(tx, input.groupId, input.name);
      await this.assertOrganizationNameAvailable(tx, input.groupId, input.name);
      const tenant = await tx.tenant.create({ data: { name: input.name, slug: createTenantSlug(input.name), status: "active", modules: [] } });
      await setTenantRlsContext(tx, tenant.id);
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({ tenantId: tenant.id, actorId: null, actorType: "system", action: "tenant.created", resourceType: "tenant", resourceId: tenant.id, outcome: "success", severity: "info" });
      await this.platformAudit(tx, tenant.id, input.actorUserId, "organization.created", { status_to: "active" });
      return mapRow(tenant);
    });
  }
  async rename(id: string, name: string, groupId: string | null, actorUserId: string): Promise<PlatformOrganizationRecord | null> {
    if (!UUID.test(id)) return null;
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.tenant.findUnique({ where: { id } }); if (!current) return null;
      await this.lockName(tx, groupId, name); await this.assertOrganizationNameAvailable(tx, groupId, name, id);
      const row = await tx.tenant.update({ where: { id }, data: { name } });
      await this.platformAudit(tx, id, actorUserId, "organization.updated", {}); return mapRow(row);
    });
  }
  async changeStatus(id: string, input: UpdateTenantStatusDto, actorUserId: string): Promise<PlatformOrganizationRecord | null> {
    if (!UUID.test(id)) return null;
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.tenant.findUnique({ where: { id } }); if (!current) return null;
      const row = await tx.tenant.update({ where: { id }, data: { status: input.status } });
      await setTenantRlsContext(tx, id);
      if (input.status === "suspended") await tx.authSession.updateMany({ where: { tenant_id: id, revoked_at: null }, data: { revoked_at: new Date() } });
      const action = input.status === "suspended" ? "suspended" : "reactivated";
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({ tenantId: id, actorId: null, actorType: "system", action: `tenant.${action}`, resourceType: "tenant", resourceId: id, outcome: "success", severity: "warning", metadata: { statusFrom: current.status, statusTo: input.status, reasonCode: input.reason } });
      await this.platformAudit(tx, id, actorUserId, `organization.${action}`, { status_from: current.status, status_to: input.status, reason_code: input.reason });
      return mapRow(row);
    });
  }
  private async lockName(tx: Prisma.TransactionClient, groupId: string | null, name: string): Promise<void> { const key = `${groupId ?? "new-group"}:${normalizedOrganizationName(name)}`; await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`; }
  private async assertOrganizationNameAvailable(tx: Prisma.TransactionClient, groupId: string | null, name: string, exceptId?: string): Promise<void> {
    if (!groupId) return;
    const wanted = normalizedOrganizationName(name);
    const tenants = await tx.tenant.findMany({ select: { id: true, name: true } });
    for (const tenant of tenants) {
      if (tenant.id === exceptId || normalizedOrganizationName(tenant.name) !== wanted) continue;
      await setTenantRlsContext(tx, tenant.id);
      const member = await tx.economicGroupMember.findFirst({ where: { tenant_id: tenant.id, group_id: groupId, valid_to: null }, select: { id: true } });
      if (member) throw new OrganizationNameConflictError();
    }
  }
  private async platformAudit(tx: Prisma.TransactionClient, tenantId: string, actorUserId: string, action: string, metadata: Record<string, unknown>): Promise<void> {
    const filtered = pickBillingAuditMetadata({ actor_user_id: actorUserId, ...metadata });
    await tx.platformAuditLog.create({ data: { actor_user_id: UUID.test(actorUserId) ? actorUserId : null, tenant_id: tenantId, action, entity: "organization", entity_id: tenantId, metadata: filtered as Prisma.InputJsonObject } });
  }
}

function mapRow(row: { id: string; name: string; slug: string; status: string; modules: string[]; created_at: Date; updated_at: Date }): PlatformOrganizationRecord { return { id: row.id, name: row.name, slug: row.slug, status: row.status, modules: row.modules, createdAt: row.created_at, updatedAt: row.updated_at }; }
