// B-ASS-02 — repositório de planos/versões. Interface + dublê em memória (dev/teste sem Postgres).
// O caminho Prisma chega na F4 (plans-prisma.repository.ts), espelhando o cloud-cost-allocation.

import { randomUUID } from "node:crypto";

import type {
  PlanKind,
  PricingUnit,
  SubscriptionPlan,
  SubscriptionPlanVersion,
} from "./plan-types.js";

export type CreatePlanRecord = {
  readonly code: string;
  readonly kind: PlanKind;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly createdBy: string | null;
};

export type UpdatePlanRecord = {
  readonly name?: string;
  readonly description?: string;
  readonly active?: boolean;
};

export type CreateVersionRecord = {
  readonly planId: string;
  readonly version: number;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly monthlyPriceCents: number;
  readonly includedUsers: number;
  readonly includedStorageGb: number;
  readonly extraUserPriceCents: number;
  readonly extraGbPriceCents: number;
  readonly perVehiclePriceCents: number | null;
  readonly pricingUnit: PricingUnit;
  readonly modules: readonly string[];
  readonly notes: string | null;
  readonly inaugural: boolean;
};

export interface PlansRepository {
  listPlans(): Promise<SubscriptionPlan[]>;
  getPlanById(id: string): Promise<SubscriptionPlan | null>;
  getPlanByCode(code: string): Promise<SubscriptionPlan | null>;
  createPlan(input: CreatePlanRecord): Promise<SubscriptionPlan>;
  updatePlan(id: string, patch: UpdatePlanRecord): Promise<SubscriptionPlan | null>;
  listVersions(planId: string): Promise<SubscriptionPlanVersion[]>;
  getVersionById(id: string): Promise<SubscriptionPlanVersion | null>;
  createVersion(input: CreateVersionRecord): Promise<SubscriptionPlanVersion>;
  setVersionValidTo(versionId: string, validTo: Date): Promise<void>;
}

export class InMemoryPlansRepository implements PlansRepository {
  private readonly plans = new Map<string, SubscriptionPlan>();
  private readonly versions = new Map<string, SubscriptionPlanVersion>();
  private readonly planIdByCode = new Map<string, string>();

  async listPlans(): Promise<SubscriptionPlan[]> {
    return [...this.plans.values()];
  }

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    return this.plans.get(id) ?? null;
  }

  async getPlanByCode(code: string): Promise<SubscriptionPlan | null> {
    const id = this.planIdByCode.get(code.trim().toLowerCase());
    return id ? (this.plans.get(id) ?? null) : null;
  }

  async createPlan(input: CreatePlanRecord): Promise<SubscriptionPlan> {
    const now = new Date();
    const plan: SubscriptionPlan = {
      id: randomUUID(),
      code: input.code,
      kind: input.kind,
      name: input.name,
      description: input.description,
      active: input.active,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.plans.set(plan.id, plan);
    this.planIdByCode.set(plan.code.trim().toLowerCase(), plan.id);
    return plan;
  }

  async updatePlan(id: string, patch: UpdatePlanRecord): Promise<SubscriptionPlan | null> {
    const existing = this.plans.get(id);
    if (!existing) return null;
    const updated: SubscriptionPlan = {
      ...existing,
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      active: patch.active ?? existing.active,
      updatedAt: new Date(),
    };
    this.plans.set(id, updated);
    return updated;
  }

  async listVersions(planId: string): Promise<SubscriptionPlanVersion[]> {
    return [...this.versions.values()]
      .filter((version) => version.planId === planId)
      .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  }

  async getVersionById(id: string): Promise<SubscriptionPlanVersion | null> {
    return this.versions.get(id) ?? null;
  }

  async createVersion(input: CreateVersionRecord): Promise<SubscriptionPlanVersion> {
    const now = new Date();
    const version: SubscriptionPlanVersion = {
      id: randomUUID(),
      planId: input.planId,
      version: input.version,
      validFrom: input.validFrom,
      validTo: input.validTo,
      monthlyPriceCents: input.monthlyPriceCents,
      includedUsers: input.includedUsers,
      includedStorageGb: input.includedStorageGb,
      extraUserPriceCents: input.extraUserPriceCents,
      extraGbPriceCents: input.extraGbPriceCents,
      perVehiclePriceCents: input.perVehiclePriceCents,
      pricingUnit: input.pricingUnit,
      modules: [...input.modules],
      notes: input.notes,
      inaugural: input.inaugural,
      createdAt: now,
      updatedAt: now,
    };
    this.versions.set(version.id, version);
    return version;
  }

  async setVersionValidTo(versionId: string, validTo: Date): Promise<void> {
    const existing = this.versions.get(versionId);
    if (!existing) return;
    this.versions.set(versionId, { ...existing, validTo, updatedAt: new Date() });
  }
}
