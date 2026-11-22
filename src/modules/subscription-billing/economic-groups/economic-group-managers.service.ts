import { SubscriptionBillingError } from "../plans/plan-types.js";
import { GroupManagerRepositoryError, type EconomicGroupManagersRepository, type GroupManager } from "./economic-group-managers.repository.js";

export class EconomicGroupManagersService {
  constructor(private readonly repository: EconomicGroupManagersRepository, private readonly clock: () => Date = () => new Date()) {}

  async list(groupId: string): Promise<GroupManager[]> {
    const rows = await this.run(() => this.repository.list(groupId, businessDay(this.clock())));
    if (rows === null) throw error(404, "group_not_found");
    return rows;
  }

  async grant(input: { groupId: string; organizationId: string; userId: string; actorTenantId: string; actorUserId: string | null }): Promise<GroupManager> {
    return this.run(() => this.repository.grant({ ...input, today: businessDay(this.clock()) }));
  }

  async revoke(groupId: string, managerId: string, actorUserId: string | null): Promise<void> {
    const revoked = await this.run(() => this.repository.revoke(groupId, managerId, actorUserId));
    if (!revoked) throw error(404, "manager_not_found");
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); } catch (cause) {
      if (!(cause instanceof GroupManagerRepositoryError)) throw cause;
      const status = cause.reason === "platform_organization_missing" ? 503 : cause.reason === "manager_origin_missing" ? 500 : cause.reason === "already_group_manager" ? 409 : cause.reason === "organization_not_in_group" || cause.reason === "user_inactive" ? 422 : 404;
      throw error(status, cause.reason);
    }
  }
}

function error(status: number, reason: string): SubscriptionBillingError { return new SubscriptionBillingError(status, "SUBSCRIPTION_BILLING_GROUP_MANAGER", reason, reason); }
function businessDay(now: Date): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
