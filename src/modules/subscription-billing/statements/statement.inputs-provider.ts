// B-ASS-04 — o provedor de entradas do fechamento: CARREGA os dados (assinaturas, add-ons, versões, medições,
// vínculos de veículo, slug da organização) e entrega ao montador puro `buildStatementInputs`. Serve à memória e ao
// Prisma pelas MESMAS portas do B-ASS-02 (`SubscriptionsRepository`, `PlansRepository`, `TenantLookup`); medições e
// vínculos entram por portas próprias, cuja versão Prisma lê sob o GUC da organização (F5).

import type { PlansRepository } from "../plans/plans.repository.js";
import type { SubscriptionPlanVersion } from "../plans/plan-types.js";
import type { SubscriptionsRepository } from "../plans/subscriptions.repository.js";
import type { TenantLookup } from "../plans/subscriptions.service.js";
import { daysInPeriod } from "./statement.engine.js";
import { buildStatementInputs, type UsageDayRow, type VehicleBindingWindow } from "./statement.inputs.js";
import type { StatementInputs, StatementInputsProvider } from "./statement.service.js";

export type UsageSource = { listUsageDays(tenantId: string, fromDate: string, toDate: string): Promise<readonly UsageDayRow[]> };
export type BindingsSource = {
  listVehicleBindings(tenantId: string, fromDate: string, toDate: string): Promise<readonly VehicleBindingWindow[]>;
};

/** Fonte vazia (memória sem medição): o fechamento sai com `warning: no_usage_measured`, nunca cala. */
export const EMPTY_USAGE_SOURCE: UsageSource = { async listUsageDays() { return []; } };
export const EMPTY_BINDINGS_SOURCE: BindingsSource = { async listVehicleBindings() { return []; } };

export class RepositoryStatementInputsProvider implements StatementInputsProvider {
  constructor(
    private readonly subscriptions: SubscriptionsRepository,
    private readonly plans: PlansRepository,
    private readonly tenants: TenantLookup,
    private readonly usage: UsageSource,
    private readonly bindings: BindingsSource,
  ) {}

  async resolve(tenantId: string, period: string, options: { readonly pinnedPlanVersionId: string | null }): Promise<StatementInputs> {
    const tenant = await this.tenants.getTenantById(tenantId);
    const slug = tenant?.slug ?? null;
    const fromDate = `${period}-01`;
    const toDate = `${period}-${String(daysInPeriod(period)).padStart(2, "0")}`;

    const subscriptions = await this.subscriptions.listSubscriptions(tenantId);
    const addons = (await Promise.all(subscriptions.map((row) => this.subscriptions.listAddons(tenantId, row.id)))).flat();
    const planIds = new Set([...subscriptions.map((row) => row.planId), ...addons.map((row) => row.planId)]);
    const versionsByPlan = new Map<string, readonly SubscriptionPlanVersion[]>();
    for (const planId of planIds) versionsByPlan.set(planId, await this.plans.listVersions(planId));

    const [usage, bindings] = await Promise.all([
      this.usage.listUsageDays(tenantId, fromDate, toDate),
      this.bindings.listVehicleBindings(tenantId, fromDate, toDate),
    ]);

    return buildStatementInputs(period, { tenantSlug: slug, subscriptions, addons, versionsByPlan, usage, bindings }, options);
  }
}
