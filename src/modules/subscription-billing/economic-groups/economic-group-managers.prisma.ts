import type { Prisma, PrismaClient } from "@prisma/client";

import { forEachTenantRls, setTenantRlsContext, withTenantRls } from "../../../database/rls.js";
import {
  GroupManagerRepositoryError,
  PLATFORM_ORGANIZATION_SLUG,
  type EconomicGroupManagersRepository,
  type GrantGroupManagerInput,
  type GroupManager,
  type GroupManagerAccount,
} from "./economic-group-managers.repository.js";

type ManagerRow = { id: string; tenant_id: string; group_id: string; identity_id: string; granted_by: string | null; granted_at: Date; revoked_by: string | null; revoked_at: Date | null };

export class PrismaEconomicGroupManagersRepository implements EconomicGroupManagersRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(groupId: string, today: string): Promise<GroupManager[] | null> {
    const group = await this.client.economicGroup.findFirst({ where: { id: groupId, deleted_at: null }, select: { id: true } });
    if (!group) return null;
    const platformTenantId = await this.resolvePlatformTenantId();
    const rows = await withTenantRls(this.client, platformTenantId, (tx) => tx.economicGroupManager.findMany({ where: { group_id: groupId, revoked_at: null }, orderBy: { granted_at: "asc" } }));
    const accountsByIdentity = await this.accounts(groupId, rows.map((row) => row.identity_id), today);
    return rows.map((row) => mapManager(row, accountsByIdentity.get(row.identity_id) ?? []));
  }

  async grant(input: GrantGroupManagerInput): Promise<GroupManager> {
    const group = await this.client.economicGroup.findFirst({ where: { id: input.groupId, deleted_at: null }, select: { id: true } });
    if (!group) throw new GroupManagerRepositoryError("group_not_found");
    const platformTenantId = await this.resolvePlatformTenantId();
    try {
      const row = await this.client.$transaction(async (tx) => {
        await setTenantRlsContext(tx, input.organizationId);
        const membership = await tx.economicGroupMember.findFirst({ where: { tenant_id: input.organizationId, group_id: input.groupId, valid_from: { lte: new Date(`${input.today}T00:00:00.000Z`) }, OR: [{ valid_to: null }, { valid_to: { gt: new Date(`${input.today}T00:00:00.000Z`) } }] } });
        if (!membership) throw new GroupManagerRepositoryError("organization_not_in_group");
        const user = await tx.user.findFirst({ where: { tenant_id: input.organizationId, id: input.userId } });
        if (!user) throw new GroupManagerRepositoryError("user_not_found");
        if (user.status !== "active") throw new GroupManagerRepositoryError("user_inactive");
        const link = await tx.authIdentityLink.findFirst({ where: { tenant_id: input.organizationId, user_id: input.userId } });
        if (!link) throw new GroupManagerRepositoryError("identity_link_missing");
        await setTenantRlsContext(tx, platformTenantId);
        return tx.economicGroupManager.create({ data: { tenant_id: platformTenantId, group_id: input.groupId, identity_id: link.identity_id, granted_by: uuidOrNull(input.actorUserId) } });
      });
      return mapManager(row, await this.accountsForIdentity(input.groupId, row.identity_id, input.today));
    } catch (error) {
      if (error instanceof GroupManagerRepositoryError) throw error;
      if (isUnique(error)) throw new GroupManagerRepositoryError("already_group_manager");
      throw error;
    }
  }

  async revoke(groupId: string, managerId: string, actorUserId: string | null): Promise<boolean> {
    const platformTenantId = await this.resolvePlatformTenantId();
    return withTenantRls(this.client, platformTenantId, async (tx) => {
      const updated = await tx.economicGroupManager.updateMany({ where: { id: managerId, group_id: groupId, revoked_at: null }, data: { revoked_at: new Date(), revoked_by: uuidOrNull(actorUserId) } });
      return updated.count === 1;
    });
  }

  private async resolvePlatformTenantId(): Promise<string> {
    const tenant = await this.client.tenant.findUnique({ where: { slug: PLATFORM_ORGANIZATION_SLUG }, select: { id: true } });
    if (!tenant) throw new GroupManagerRepositoryError("platform_organization_missing");
    return tenant.id;
  }

  private async accounts(groupId: string, identityIds: readonly string[], today: string): Promise<Map<string, GroupManagerAccount[]>> {
    const map = new Map<string, GroupManagerAccount[]>();
    for (const identityId of identityIds) map.set(identityId, await this.accountsForIdentity(groupId, identityId, today));
    return map;
  }

  private async accountsForIdentity(groupId: string, identityId: string, today: string): Promise<GroupManagerAccount[]> {
    const tenants = await this.client.tenant.findMany({ where: { status: "active" }, select: { id: true } });
    const day = new Date(`${today}T00:00:00.000Z`);
    return forEachTenantRls(this.client, tenants.map((tenant) => tenant.id), async (tx, tenantId) => {
      const membership = await tx.economicGroupMember.findFirst({ where: { tenant_id: tenantId, group_id: groupId, valid_from: { lte: day }, OR: [{ valid_to: null }, { valid_to: { gt: day } }] } });
      if (!membership) return [];
      const link = await tx.authIdentityLink.findFirst({ where: { tenant_id: tenantId, identity_id: identityId }, include: { tenant: true, user: true } });
      if (!link || link.user.status !== "active") return [];
      return [{ organizationId: tenantId, organizationName: link.tenant.name, userId: link.user_id, userName: link.user.name }];
    });
  }
}

function mapManager(row: ManagerRow, accounts: readonly GroupManagerAccount[]): GroupManager {
  return { id: row.id, tenantId: row.tenant_id, groupId: row.group_id, identityId: row.identity_id, grantedBy: row.granted_by, grantedAt: row.granted_at, revokedBy: row.revoked_by, revokedAt: row.revoked_at, accounts };
}

function uuidOrNull(value: string | null): string | null { return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null; }
function isUnique(error: unknown): boolean { const e = error as { code?: unknown; meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } } }; return e?.code === "P2002" || e?.meta?.driverAdapterError?.cause?.originalCode === "23505"; }
