import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import { InMemoryBillingProfileRepository, missingFields, type BillingProfileRepository } from "../subscription-billing/billing-profile/billing-profile.js";
import { InMemoryEconomicGroupsRepository } from "../subscription-billing/economic-groups/economic-groups.repository.js";
import { EconomicGroupsService, type GroupDetail } from "../subscription-billing/economic-groups/economic-groups.service.js";
import type { SubscriptionsService } from "../subscription-billing/plans/subscriptions.service.js";
import { createDefaultSubscriptionsService, getMemoryTenantLookupForTests } from "../subscription-billing/subscription-billing.service.js";
import { getMemoryOverviewTenantListForTests } from "../subscription-billing/overview/overview.factory.js";
import { PlatformModulesService } from "./platform-modules.service.js";
import {
  InMemoryPlatformOrganizationsRepository,
  normalizedOrganizationName,
  OrganizationGroupNameInvalidError,
  OrganizationGroupNameTakenError,
  OrganizationGroupNotFoundError,
  OrganizationGroupTooManyMembersError,
  OrganizationNameConflictError,
  type OrganizationGroupRef,
  type PlatformOrganizationsRepository,
} from "./platform-organizations.repository.js";
import type { CreatePlatformOrganizationResult, CreatePlatformTenantDto, CreateTenantAdminDto, PlatformModule, PlatformOrganization, PlatformOrganizationRecord, ProvisioningStep, UpdatePlatformTenantDto, UpdatePlatformTenantModulesDto, UpdateTenantStatusDto } from "./platform.types.js";

export type PlatformOrganizationsServiceResolver = () => Promise<PlatformOrganizationsService>;

export class PlatformOrganizationsService {
  constructor(
    private readonly organizations: PlatformOrganizationsRepository,
    private readonly groups: EconomicGroupsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly profiles: BillingProfileRepository,
    private readonly core?: ICoreSaasService,
    private readonly registerTenant: (row: PlatformOrganizationRecord) => void = () => undefined,
    private readonly modules = new PlatformModulesService(),
  ) {}

  async listTenants(): Promise<PlatformOrganization[]> {
    const groups = await this.groups.listGroups();
    const byTenant = new Map<string, OrganizationGroupRef>();
    for (const group of groups) {
      const detail = await this.groups.getGroup(group.id);
      for (const member of detail.members) byTenant.set(member.tenantId, { id: group.id, name: group.name });
    }
    const result: PlatformOrganization[] = [];
    for (const row of await this.organizations.list()) result.push(await this.toOrganization(row, byTenant.get(row.id) ?? null));
    return result;
  }
  async getTenant(id: string): Promise<PlatformOrganization> { return this.toOrganization(await this.requireTenant(id)); }

  async createTenant(input: CreatePlatformTenantDto, actorUserId: string): Promise<CreatePlatformOrganizationResult> {
    const newGroupName = "name" in input.group ? input.group.name : null;
    const existingGroup = "id" in input.group ? await this.requireGroup(input.group.id) : null;
    await this.assertOrganizationNameAvailable(existingGroup, input.name);
    if (input.plan) await this.assertPlanAvailable(input.plan.code);
    const created = await this.createRecord(input.name, input.group, actorUserId);
    const row = created.organization;
    this.registerTenant(row);

    let group: ProvisioningStep;
    let resolvedGroup: OrganizationGroupRef | null = created.group ?? existingGroup;
    try {
      if (created.group) group = { status: "done" };
      else {
        if (!resolvedGroup) {
          const memoryGroup = await this.groups.createGroup({ name: newGroupName!, actorId: actorUserId });
          resolvedGroup = await this.groups.getGroup(memoryGroup.id);
        }
        resolvedGroup = await this.groups.addMember(resolvedGroup.id, { tenantId: row.id, actorId: actorUserId });
        group = { status: "done" };
      }
    } catch (error) { group = failed(error); }

    const profile = await this.runOptional(input.profile, async () => { await this.profiles.upsert(row.id, input.profile!, new Date()); });
    const subscription = await this.runOptional(input.plan, async () => { await this.subscriptions.putSubscription(row.id, { planCode: input.plan!.code, validFrom: new Date() }); });
    let temporaryPassword: string | undefined;
    let admin: ProvisioningStep;
    if (!input.admin) admin = { status: "skipped" };
    else if (group.status === "failed") admin = { status: "skipped", reason: "group_step_failed" };
    else {
      try {
        if (!this.core) throw new CoreSaasError(503, "SERVICE_UNAVAILABLE", "core_saas_unavailable", "Core SaaS is unavailable.");
        const created = await this.core.createUser({ tenantId: row.id, name: input.admin.name, email: input.admin.email, roles: ["tenant_admin"], actorUserId });
        temporaryPassword = created.temporaryPassword; admin = { status: "done" };
      } catch (error) { admin = failed(error); }
    }
    const organization = await this.toOrganization(row, resolvedGroup);
    return { organization, provisioning: { group, profile, subscription, admin }, ...(temporaryPassword ? { temporaryPassword } : {}) };
  }

  async updateTenant(id: string, input: UpdatePlatformTenantDto, actorUserId: string): Promise<PlatformOrganization> {
    const current = await this.requireTenant(id); this.assertNotPlatform(current);
    const group = await this.groupOf(current.id); await this.assertOrganizationNameAvailable(group, input.name, current.id);
    try { const changed = await this.organizations.rename(id, input.name, group?.id ?? null, actorUserId); return this.toOrganization(changed!); }
    catch (error) { throw translate(error); }
  }
  async updateTenantStatus(id: string, input: UpdateTenantStatusDto, actorUserId: string): Promise<PlatformOrganization> {
    const current = await this.requireTenant(id); this.assertNotPlatform(current);
    if (current.status === input.status || (current.status !== "active" && input.status === "suspended")) throw new CoreSaasError(422, "UNPROCESSABLE_ENTITY", "invalid_status_transition", "Invalid organization status transition.");
    const changed = await this.organizations.changeStatus(id, input, actorUserId); return this.toOrganization(changed!);
  }
  async listTenantModules(id: string): Promise<PlatformModule[]> {
    const row = await this.requireTenant(id);
    return this.modules.listForTenant({
      enabledModules: row.modules,
      managedBySubscription: await this.subscriptionInForce(id),
    });
  }
  async updateTenantModules(id: string, _input: UpdatePlatformTenantModulesDto): Promise<PlatformModule[]> { await this.requireTenant(id); throw new CoreSaasError(409, "CONFLICT", "module_change_requires_subscription", "Organization modules change only through the subscription."); }
  async createTenantAdminUser(id: string, input: CreateTenantAdminDto, actorUserId: string) {
    const row = await this.requireTenant(id); this.assertNotPlatform(row);
    if (row.status !== "active") throw new CoreSaasError(400, "BAD_REQUEST", "inactive_tenant", "Organization is not active.");
    if (!this.core) throw new CoreSaasError(503, "SERVICE_UNAVAILABLE", "core_saas_unavailable", "Core SaaS is unavailable.");
    const user = await this.core.createUser({ tenantId: id, name: input.name, email: input.email, roles: ["tenant_admin"], actorUserId });
    return { user: { id: user.id, name: user.name, email: user.email }, ...(user.temporaryPassword ? { temporaryPassword: user.temporaryPassword } : {}) };
  }

  private async createRecord(name: string, group: CreatePlatformTenantDto["group"], actorUserId: string) { try { return await this.organizations.create({ name, group, actorUserId }); } catch (error) { throw translate(error); } }
  private async requireTenant(id: string) { const row = await this.organizations.findById(id); if (!row) throw new CoreSaasError(404, "NOT_FOUND", "platform_tenant_not_found", "Platform tenant not found."); return row; }
  private async requireGroup(id: string) { try { return await this.groups.getGroup(id); } catch { throw new CoreSaasError(404, "NOT_FOUND", "group_not_found", "Economic group not found."); } }
  private assertNotPlatform(row: PlatformOrganizationRecord) { if (row.slug === "platform") throw new CoreSaasError(422, "UNPROCESSABLE_ENTITY", "platform_organization", "The platform organization cannot be changed here."); }
  private async assertPlanAvailable(code: string) { const row = (await this.subscriptions.getPlansSummary()).find((plan) => plan.code === code && plan.currentVersion); if (!row) throw new CoreSaasError(422, "UNPROCESSABLE_ENTITY", "plan_not_found", "Plan is unavailable."); }
  // B-PLANOS-MODULOS (§5.3/§5.5) — assinatura em vigor = `valid_to` NULO ou NO FUTURO: a assinatura cancelada que
  // ainda não venceu continua mandando nos módulos da organização (`getSubscription` do repositório olha só
  // `valid_to IS NULL` e deixaria a porta abrir). Se a leitura falhar o erro SOBE: nem a porta nem o painel caem
  // para "sem assinatura" — é falha fechada.
  private async subscriptionInForce(id: string, now: Date = new Date()): Promise<boolean> {
    const history = await this.subscriptions.getHistory(id);
    return history.some(({ subscription }) => subscription.validTo === null || subscription.validTo.getTime() > now.getTime());
  }
  private async assertOrganizationNameAvailable(group: GroupDetail | null, name: string, exceptId?: string) { if (!group) return; const wanted = normalizedOrganizationName(name); for (const member of group.members) { if (member.tenantId === exceptId) continue; const row = await this.organizations.findById(member.tenantId); if (row && normalizedOrganizationName(row.name) === wanted) throw new CoreSaasError(409, "CONFLICT", "organization_name_conflict", "Organization name already exists in this group."); } }
  private async runOptional<T>(value: T | undefined, run: () => Promise<void>): Promise<ProvisioningStep> { if (value === undefined) return { status: "skipped" }; try { await run(); return { status: "done" }; } catch (error) { return failed(error); } }
  private async groupOf(id: string): Promise<GroupDetail | null> { for (const group of await this.groups.listGroups()) { const detail = await this.groups.getGroup(group.id); if (detail.members.some((member) => member.tenantId === id)) return detail; } return null; }
  private async toOrganization(row: PlatformOrganizationRecord, knownGroup?: OrganizationGroupRef | null): Promise<PlatformOrganization> {
    const group = knownGroup === undefined ? await this.groupOf(row.id) : knownGroup;
    const setup = await organizationSetup(row.id, this.subscriptions, this.profiles, this.core);
    return { id: row.id, name: row.name, slug: row.slug, status: row.status === "active" ? "active" : row.status === "pending" ? "pending" : "suspended", createdAt: row.createdAt.toISOString(), system: row.slug === "platform", group: group ? { id: group.id, name: group.name } : null, setup };
  }
}

export async function organizationSetup(id: string, subscriptions: SubscriptionsService, profiles: BillingProfileRepository, core?: ICoreSaasService) {
  const missing: string[] = [];
  try { if (!(await subscriptions.getSubscription(id))) missing.push("plan"); } catch { missing.push("plan"); }
  try { const users = core ? await core.listUsersForTenant(id) : []; if (!users.some((user) => user.status === "active" && user.roles.includes("tenant_admin"))) missing.push("admin"); } catch { missing.push("admin"); }
  try { if (missingFields(await profiles.find(id)).length > 0) missing.push("profile"); } catch { missing.push("profile"); }
  return { complete: missing.length === 0, missing };
}

let memoryService: PlatformOrganizationsService | undefined;
let prismaService: { readonly client: unknown; readonly core: ICoreSaasService | undefined; readonly value: Promise<PlatformOrganizationsService> } | undefined;
export async function createDefaultPlatformOrganizationsService(core?: ICoreSaasService): Promise<PlatformOrganizationsService> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    const database = await import("../../database/prisma.js");
    const client = (globalThis as { prisma?: typeof database.prisma }).prisma ?? database.prisma;
    if (!prismaService || prismaService.client !== client || prismaService.core !== core) {
      prismaService = { client, core, value: createPrismaService(core, client) };
    }
    return prismaService.value;
  }
  if (!memoryService) {
    const repository = new InMemoryPlatformOrganizationsRepository();
    const groupRepository = new InMemoryEconomicGroupsRepository();
    const directory = { getTenant: async (id: string) => { const row = await repository.findById(id); return row ? { id: row.id, slug: row.slug, name: row.name } : null; }, listTenantIds: async () => (await repository.list()).map((row) => row.id) };
    memoryService = new PlatformOrganizationsService(repository, new EconomicGroupsService(groupRepository, directory), await createDefaultSubscriptionsService(), new InMemoryBillingProfileRepository(), core, (row) => { getMemoryTenantLookupForTests().upsert({ id: row.id, slug: row.slug }); getMemoryOverviewTenantListForTests().upsert({ tenantId: row.id, tenantName: row.name, slug: row.slug }); });
  }
  return memoryService;
}
async function createPrismaService(core: ICoreSaasService | undefined, client: typeof import("../../database/prisma.js")["prisma"]) {
  const [repositoryModule, groupsModule, tenantsModule, groupsServiceModule, trailModule, subscriptionsModule, plansModule, tenantLookupModule, modulesWriterModule, profileModule] = await Promise.all([
    import("./platform-organizations-prisma.repository.js"),
    import("../subscription-billing/economic-groups/economic-groups.prisma.js"),
    import("../subscription-billing/overview/tenant-list.prisma.js"),
    import("../subscription-billing/economic-groups/economic-groups.service.js"),
    import("../subscription-billing/overview/overview.trail.js"),
    import("../subscription-billing/plans/subscriptions-prisma.repository.js"),
    import("../subscription-billing/plans/plans-prisma.repository.js"),
    import("../subscription-billing/plans/tenant-lookup.prisma.js"),
    import("../subscription-billing/plans/tenant-modules.prisma.js"),
    import("../subscription-billing/statements/statement.prisma-runtime.js"),
  ]);
  const tenantList = new tenantsModule.PrismaOverviewTenantList(client);
  const directory = {
    async getTenant(id: string) {
      const row = (await tenantList.listTenants()).find((tenant) => tenant.tenantId === id);
      return row ? { id: row.tenantId, name: row.tenantName, slug: row.slug ?? "" } : null;
    },
    async listTenantIds() {
      return (await tenantList.listTenants()).map((tenant) => tenant.tenantId);
    },
  };
  const groups = new groupsServiceModule.EconomicGroupsService(
    new groupsModule.PrismaEconomicGroupsRepository(client),
    directory,
    () => new Date(),
    trailModule.membershipAuditBuilder,
  );
  const subscriptions = new (await import("../subscription-billing/plans/subscriptions.service.js")).SubscriptionsService(
    new subscriptionsModule.PrismaSubscriptionsRepository(client),
    new plansModule.PrismaPlansRepository(client),
    new tenantLookupModule.PrismaTenantLookup(client),
    new modulesWriterModule.PrismaTenantModulesWriter(client),
  );
  return new PlatformOrganizationsService(
    new repositoryModule.PrismaPlatformOrganizationsRepository(client),
    groups,
    subscriptions,
    new profileModule.PrismaBillingProfileRepository(client),
    core,
  );
}
function failed(error: unknown): ProvisioningStep { return { status: "failed", reason: reasonOf(error) }; }
function reasonOf(error: unknown): string { return typeof error === "object" && error !== null && "reason" in error && typeof error.reason === "string" ? error.reason : typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "step_failed"; }
function translate(error: unknown): Error {
  if (error instanceof OrganizationNameConflictError) return new CoreSaasError(409, "CONFLICT", "organization_name_conflict", "Organization name already exists in this group.");
  if (error instanceof OrganizationGroupNotFoundError) return new CoreSaasError(404, "NOT_FOUND", "group_not_found", "Economic group not found.");
  if (error instanceof OrganizationGroupNameInvalidError) return new CoreSaasError(422, "UNPROCESSABLE_ENTITY", "name_invalid", "Economic group name is invalid.");
  if (error instanceof OrganizationGroupNameTakenError) return new CoreSaasError(409, "CONFLICT", "group_name_exists", "Economic group name already exists.");
  if (error instanceof OrganizationGroupTooManyMembersError) return new CoreSaasError(422, "UNPROCESSABLE_ENTITY", "too_many_members", "Economic group has too many organizations.");
  return error instanceof Error ? error : new Error("organization operation failed");
}
