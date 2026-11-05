// B-ASS-02 — serviço de assinatura por organização (PUT/DELETE + leitura). Regras de vigência e
// vínculo plano → módulo vivem aqui. Persistence-aware via repositórios injetados.

import { businessDateOf, resolveVersionAt, todayBusinessDate } from "./plan-versioning.js";
import {
  SubscriptionBillingError,
  type PlanKind,
  type SubscriptionPlan,
  type SubscriptionPlanVersion,
  type TenantSubscription,
  type TenantSubscriptionAddon,
} from "./plan-types.js";
import type { PlansRepository } from "./plans.repository.js";
import type { SubscriptionsRepository } from "./subscriptions.repository.js";
import type { TenantModulesWriter } from "./tenant-modules.sync.js";

export type TenantRef = { readonly id: string; readonly slug: string };

export interface TenantLookup {
  getTenantById(id: string): Promise<TenantRef | null>;
}

export type SubscriptionOverrides = {
  readonly monthlyPriceCents?: number | null;
  readonly includedUsers?: number | null;
  readonly includedStorageGb?: number | null;
  readonly extraUserPriceCents?: number | null;
  readonly extraGbPriceCents?: number | null;
};

export type AddonAssignment = {
  readonly planCode: string;
  readonly perVehiclePriceOverrideCents?: number | null;
};

export type PutSubscriptionInput = {
  readonly planCode: string;
  readonly validFrom: Date;
  readonly overrides?: SubscriptionOverrides;
  readonly dueDays?: number;
  readonly addons?: readonly AddonAssignment[];
  readonly notes?: string | null;
};

export type DeleteSubscriptionInput = {
  readonly validTo?: Date;
  readonly reason?: string;
};

export type SubscriptionView = {
  readonly subscription: TenantSubscription;
  readonly plan: SubscriptionPlan;
  readonly addons: readonly (TenantSubscriptionAddon & { readonly plan: SubscriptionPlan })[];
};

export type PlanSummaryRow = {
  readonly planId: string;
  readonly code: string;
  readonly kind: PlanKind;
  readonly organizations: number;
  readonly contractedMonthlyAmountCents: number;
  readonly currentVersion: SubscriptionPlanVersion | null;
  readonly nextVersion: SubscriptionPlanVersion | null;
};

export class SubscriptionsService {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly plans: PlansRepository,
    private readonly tenants: TenantLookup,
    private readonly modulesWriter: TenantModulesWriter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getSubscription(tenantId: string): Promise<SubscriptionView | null> {
    await this.requireTenant(tenantId);
    const subscription = await this.subscriptions.getActiveSubscription(tenantId);
    if (!subscription) return null;
    return this.toView(subscription);
  }

  async getHistory(tenantId: string): Promise<SubscriptionView[]> {
    await this.requireTenant(tenantId);
    const subscriptions = await this.subscriptions.listSubscriptions(tenantId);
    const views: SubscriptionView[] = [];
    for (const subscription of subscriptions) {
      views.push(await this.toView(subscription));
    }
    return views;
  }

  async getPlansSummary(): Promise<readonly PlanSummaryRow[]> {
    const now = this.clock();
    const plans = await this.plans.listPlans();
    const activeSubscriptions = await this.subscriptions.listActiveSubscriptions();

    const rows: PlanSummaryRow[] = [];
    for (const plan of plans) {
      const versions = await this.plans.listVersions(plan.id);
      const currentVersion = resolveVersionAt(versions, now);
      const futureVersions = versions
        .filter((version) => version.validFrom.getTime() > now.getTime())
        .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
      const nextVersion = futureVersions[0] ?? null;

      const planSubscriptions = activeSubscriptions.filter((item) => item.planId === plan.id);
      let contractedMonthlyAmountCents = 0;
      for (const subscription of planSubscriptions) {
        contractedMonthlyAmountCents +=
          subscription.monthlyPriceOverrideCents ?? currentVersion?.monthlyPriceCents ?? 0;
      }

      rows.push({
        planId: plan.id,
        code: plan.code,
        kind: plan.kind,
        organizations: planSubscriptions.length,
        contractedMonthlyAmountCents,
        currentVersion,
        nextVersion,
      });
    }
    return rows;
  }

  async putSubscription(tenantId: string, input: PutSubscriptionInput): Promise<SubscriptionView> {
    const tenant = await this.tenants.getTenantById(tenantId);
    if (!tenant) {
      throw new SubscriptionBillingError(
        404,
        "NOT_FOUND",
        "tenant_not_found",
        "Platform tenant not found.",
      );
    }
    if (tenant.slug === "platform") {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "platform_organization",
        "The platform organization does not subscribe to plans.",
      );
    }

    const plan = await this.plans.getPlanByCode(input.planCode);
    if (!plan) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "plan_not_found",
        `Plan "${input.planCode}" not found.`,
      );
    }
    if (plan.kind !== "base") {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "addon_requires_base_plan",
        "An add-on plan cannot be the base of a subscription.",
      );
    }

    const today = todayBusinessDate(this.clock());
    const validFromBiz = businessDateOf(input.validFrom);
    const active = await this.subscriptions.getActiveSubscription(tenantId);
    if (validFromBiz < today) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "subscription_retroactive",
        "validFrom cannot be before today (America/Sao_Paulo).",
      );
    }
    if (active && validFromBiz <= businessDateOf(active.validFrom)) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "subscription_retroactive",
        "validFrom must be after the active subscription's valid_from.",
      );
    }

    const versions = await this.plans.listVersions(plan.id);
    const version = resolveVersionAt(versions, input.validFrom);
    if (!version) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "plan_without_price",
        `Plan "${plan.code}" has no version in effect at validFrom.`,
      );
    }

    const addonPlans = await this.resolveAddons(input.addons);

    // Captura os add-ons vigentes ANTES de fechá-los: quando addons e omitido, eles migram.
    const previousAddons = active ? await this.subscriptions.listActiveAddons(active.id) : [];

    // Fecha a vigente e os add-ons vigentes (a nova assinatura começa em validFrom).
    if (active) {
      await this.subscriptions.closeSubscription(active.id, input.validFrom, null, null);
      for (const addon of previousAddons) {
        await this.subscriptions.closeAddon(addon.id, input.validFrom);
      }
    }

    const dueDays = input.dueDays ?? 10;
    const overrides = input.overrides ?? {};
    const subscription = await this.subscriptions.createSubscription({
      tenantId,
      planId: plan.id,
      validFrom: input.validFrom,
      validTo: null,
      monthlyPriceOverrideCents: overrides.monthlyPriceCents ?? null,
      includedUsersOverride: overrides.includedUsers ?? null,
      includedStorageGbOverride: overrides.includedStorageGb ?? null,
      extraUserPriceOverrideCents: overrides.extraUserPriceCents ?? null,
      extraGbPriceOverrideCents: overrides.extraGbPriceCents ?? null,
      dueDays,
      status: "active",
      notes: input.notes ?? null,
    });

    // addons: omitido → migra os vigentes; [] → encerra; lista → cria os novos.
    const assignments: readonly AddonAssignment[] =
      input.addons !== undefined
        ? input.addons
        : await Promise.all(
            previousAddons.map(async (addon) => ({
              planCode: (await this.findPlanById(addon.planId)).code,
              perVehiclePriceOverrideCents: addon.perVehiclePriceOverrideCents,
            })),
          );

    const createdAddons: (TenantSubscriptionAddon & { plan: SubscriptionPlan })[] = [];
    for (const assignment of assignments) {
      const addonPlan = await this.plans.getPlanByCode(assignment.planCode);
      if (!addonPlan) {
        throw new SubscriptionBillingError(
          422,
          "SUBSCRIPTION_BILLING_INVALID",
          "plan_not_found",
          `Add-on plan "${assignment.planCode}" not found.`,
        );
      }
      const addon = await this.subscriptions.createAddon({
        tenantId,
        subscriptionId: subscription.id,
        planId: addonPlan.id,
        validFrom: input.validFrom,
        validTo: null,
        perVehiclePriceOverrideCents: assignment.perVehiclePriceOverrideCents ?? null,
      });
      createdAddons.push({ ...addon, plan: addonPlan });
    }

    // R-PLAN-3 (G16): tenants.modules = modules[] da versão vigente ∪ módulos dos add-ons vigentes.
    const addonModules = await this.collectAddonModules(assignments, input.validFrom);
    await this.modulesWriter.writeModules(tenantId, this.unionModules(version.modules, addonModules));

    return {
      subscription,
      plan,
      addons: createdAddons,
    };
  }

  async deleteSubscription(tenantId: string, input: DeleteSubscriptionInput): Promise<void> {
    const tenant = await this.tenants.getTenantById(tenantId);
    if (!tenant) {
      throw new SubscriptionBillingError(
        404,
        "NOT_FOUND",
        "tenant_not_found",
        "Platform tenant not found.",
      );
    }
    const active = await this.subscriptions.getActiveSubscription(tenantId);
    if (!active) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "no_active_subscription",
        "Tenant has no active subscription.",
      );
    }

    const effectiveValidTo = input.validTo ?? this.clock();
    if (businessDateOf(effectiveValidTo) < todayBusinessDate(this.clock())) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "valid_to_in_past",
        "validTo cannot be in the past.",
      );
    }

    await this.subscriptions.closeSubscription(active.id, effectiveValidTo, input.reason ?? null, null);
    for (const addon of await this.subscriptions.listActiveAddons(active.id)) {
      await this.subscriptions.closeAddon(addon.id, effectiveValidTo);
    }

    // R-PLAN-3: DELETE não apaga `tenants.modules` — a organização continua com o que tinha.
  }

  private async resolveAddons(
    addons: readonly AddonAssignment[] | undefined,
  ): Promise<ReadonlyMap<string, SubscriptionPlan>> {
    const resolved = new Map<string, SubscriptionPlan>();
    if (!addons) return resolved;

    let trackingCount = 0;
    for (const assignment of addons) {
      const plan = await this.plans.getPlanByCode(assignment.planCode);
      if (!plan) {
        throw new SubscriptionBillingError(
          422,
          "SUBSCRIPTION_BILLING_INVALID",
          "plan_not_found",
          `Add-on plan "${assignment.planCode}" not found.`,
        );
      }
      if (plan.kind !== "addon_tracking") {
        throw new SubscriptionBillingError(
          422,
          "SUBSCRIPTION_BILLING_INVALID",
          "addon_requires_base_plan",
          `"${assignment.planCode}" is not an add-on plan.`,
        );
      }
      if (plan.kind === "addon_tracking") {
        trackingCount += 1;
      }
      resolved.set(plan.code, plan);
    }

    if (trackingCount > 1) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "addon_duplicate_tracking",
        "Only one tracking add-on is allowed per subscription (basic OR plus).",
      );
    }
    return resolved;
  }

  private async collectAddonModules(
    assignments: readonly AddonAssignment[],
    at: Date,
  ): Promise<readonly string[]> {
    const modules: string[] = [];
    for (const assignment of assignments) {
      const addonPlan = await this.plans.getPlanByCode(assignment.planCode);
      if (!addonPlan) continue;
      const versions = await this.plans.listVersions(addonPlan.id);
      const version = resolveVersionAt(versions, at);
      if (version) modules.push(...version.modules);
    }
    return modules;
  }

  private unionModules(a: readonly string[], b: readonly string[]): readonly string[] {
    return [...new Set([...a, ...b])];
  }

  private async findPlanById(planId: string): Promise<SubscriptionPlan> {
    const plans = await this.plans.listPlans();
    const plan = plans.find((item) => item.id === planId);
    if (!plan) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "plan_not_found",
        "Plan not found.",
      );
    }
    return plan;
  }

  private async requireTenant(tenantId: string): Promise<TenantRef> {
    const tenant = await this.tenants.getTenantById(tenantId);
    if (!tenant) {
      throw new SubscriptionBillingError(
        404,
        "NOT_FOUND",
        "tenant_not_found",
        "Platform tenant not found.",
      );
    }
    return tenant;
  }

  private async toView(subscription: TenantSubscription): Promise<SubscriptionView> {
    const plans = await this.plans.listPlans();
    const plan = plans.find((item) => item.id === subscription.planId);
    if (!plan) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "plan_not_found",
        "Subscription plan not found.",
      );
    }
    const addons = await this.subscriptions.listAddons(subscription.id);
    const views: (TenantSubscriptionAddon & { plan: SubscriptionPlan })[] = [];
    for (const addon of addons) {
      const addonPlan = plans.find((item) => item.id === addon.planId);
      if (!addonPlan) continue;
      views.push({ ...addon, plan: addonPlan });
    }
    return { subscription, plan, addons: views };
  }
}
