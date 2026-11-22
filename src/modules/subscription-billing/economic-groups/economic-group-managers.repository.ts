import { randomUUID } from "node:crypto";

export const PLATFORM_ORGANIZATION_SLUG = "platform";

export type GroupManagerAccount = {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly userId: string;
  readonly userName: string;
};

export type GroupManager = {
  readonly id: string;
  readonly tenantId: string;
  readonly groupId: string;
  readonly identityId: string;
  readonly grantedBy: string | null;
  readonly grantedAt: Date;
  readonly revokedBy: string | null;
  readonly revokedAt: Date | null;
  readonly accounts: readonly GroupManagerAccount[];
};

export type GrantGroupManagerInput = {
  readonly groupId: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly actorTenantId: string;
  readonly actorUserId: string | null;
  readonly today: string;
};

export interface EconomicGroupManagersRepository {
  list(groupId: string, today: string): Promise<GroupManager[] | null>;
  grant(input: GrantGroupManagerInput): Promise<GroupManager>;
  revoke(groupId: string, managerId: string, actorUserId: string | null): Promise<boolean>;
}

export type MemoryManagerCandidate = {
  readonly groupId: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly userId: string;
  readonly userName: string;
  readonly identityId: string;
  readonly active: boolean;
  readonly inGroup: boolean;
};

export class InMemoryEconomicGroupManagersRepository implements EconomicGroupManagersRepository {
  private readonly groups = new Set<string>();
  private readonly candidates: MemoryManagerCandidate[] = [];
  private readonly managers: GroupManager[] = [];

  addGroup(groupId: string): void {
    this.groups.add(groupId);
  }

  addCandidate(candidate: MemoryManagerCandidate): void {
    this.groups.add(candidate.groupId);
    this.candidates.push(candidate);
  }

  async list(groupId: string): Promise<GroupManager[] | null> {
    if (!this.groups.has(groupId)) return null;
    return this.managers.filter((row) => row.groupId === groupId && row.revokedAt === null).map((row) => this.withAccounts(row));
  }

  async grant(input: GrantGroupManagerInput): Promise<GroupManager> {
    if (!this.groups.has(input.groupId)) throw new GroupManagerRepositoryError("group_not_found");
    const candidate = this.candidates.find((row) => row.organizationId === input.organizationId && row.userId === input.userId);
    if (!candidate) throw new GroupManagerRepositoryError("user_not_found");
    if (!candidate.inGroup || candidate.groupId !== input.groupId) throw new GroupManagerRepositoryError("organization_not_in_group");
    if (!candidate.active) throw new GroupManagerRepositoryError("user_inactive");
    if (this.managers.some((row) => row.groupId === input.groupId && row.identityId === candidate.identityId && row.revokedAt === null)) {
      throw new GroupManagerRepositoryError("already_group_manager");
    }
    const manager: GroupManager = {
      id: randomUUID(), tenantId: PLATFORM_ORGANIZATION_SLUG, groupId: input.groupId, identityId: candidate.identityId,
      grantedBy: input.actorUserId, grantedAt: new Date(), revokedBy: null, revokedAt: null, accounts: [],
    };
    this.managers.push(manager);
    return this.withAccounts(manager);
  }

  async revoke(groupId: string, managerId: string, actorUserId: string | null): Promise<boolean> {
    const index = this.managers.findIndex((row) => row.id === managerId && row.groupId === groupId && row.revokedAt === null);
    if (index < 0) return false;
    this.managers[index] = { ...this.managers[index]!, revokedBy: actorUserId, revokedAt: new Date() };
    return true;
  }

  private withAccounts(manager: GroupManager): GroupManager {
    return {
      ...manager,
      accounts: this.candidates.filter((row) => row.groupId === manager.groupId && row.identityId === manager.identityId && row.active && row.inGroup)
        .map((row) => ({ organizationId: row.organizationId, organizationName: row.organizationName, userId: row.userId, userName: row.userName })),
    };
  }
}

export class GroupManagerRepositoryError extends Error {
  constructor(readonly reason: "platform_organization_missing" | "group_not_found" | "user_not_found" | "organization_not_in_group" | "user_inactive" | "identity_link_missing" | "already_group_manager" | "manager_origin_missing") {
    super(reason);
    this.name = "GroupManagerRepositoryError";
  }
}
