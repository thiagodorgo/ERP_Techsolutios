// B-ASS-02 — repositório de assinaturas/add-ons por organização. Interface + dublê em memória.
// O caminho Prisma chega na F4 (subscriptions-prisma.repository.ts).

import { randomUUID } from "node:crypto";

import type {
  SubscriptionStatus,
  TenantSubscription,
  TenantSubscriptionAddon,
} from "./plan-types.js";

export type CreateSubscriptionRecord = {
  readonly tenantId: string;
  readonly planId: string;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly monthlyPriceOverrideCents: number | null;
  readonly includedUsersOverride: number | null;
  readonly includedStorageGbOverride: number | null;
  readonly extraUserPriceOverrideCents: number | null;
  readonly extraGbPriceOverrideCents: number | null;
  readonly dueDays: number;
  readonly status: SubscriptionStatus;
  readonly notes: string | null;
};

export type CreateAddonRecord = {
  readonly tenantId: string;
  readonly subscriptionId: string;
  readonly planId: string;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly perVehiclePriceOverrideCents: number | null;
};

export interface SubscriptionsRepository {
  getActiveSubscription(tenantId: string): Promise<TenantSubscription | null>;
  listSubscriptions(tenantId: string): Promise<TenantSubscription[]>;
  listActiveSubscriptions(): Promise<TenantSubscription[]>;
  createSubscription(input: CreateSubscriptionRecord): Promise<TenantSubscription>;
  closeSubscription(
    subscriptionId: string,
    validTo: Date,
    reason: string | null,
    endedBy: string | null,
  ): Promise<void>;
  listAddons(subscriptionId: string): Promise<TenantSubscriptionAddon[]>;
  listActiveAddons(subscriptionId: string): Promise<TenantSubscriptionAddon[]>;
  createAddon(input: CreateAddonRecord): Promise<TenantSubscriptionAddon>;
  closeAddon(addonId: string, validTo: Date): Promise<void>;
}

export class InMemorySubscriptionsRepository implements SubscriptionsRepository {
  private readonly subscriptions = new Map<string, TenantSubscription>();
  private readonly addons = new Map<string, TenantSubscriptionAddon>();
  private readonly byTenant = new Map<string, string[]>();

  async getActiveSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const ids = this.byTenant.get(tenantId) ?? [];
    return ids.map((id) => this.subscriptions.get(id)!).find((sub) => sub.validTo === null) ?? null;
  }

  async listSubscriptions(tenantId: string): Promise<TenantSubscription[]> {
    const ids = this.byTenant.get(tenantId) ?? [];
    return ids
      .map((id) => this.subscriptions.get(id)!)
      .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  }

  async listActiveSubscriptions(): Promise<TenantSubscription[]> {
    return [...this.subscriptions.values()].filter((sub) => sub.validTo === null);
  }

  async createSubscription(input: CreateSubscriptionRecord): Promise<TenantSubscription> {
    const now = new Date();
    const subscription: TenantSubscription = {
      id: randomUUID(),
      tenantId: input.tenantId,
      planId: input.planId,
      validFrom: input.validFrom,
      validTo: input.validTo,
      monthlyPriceOverrideCents: input.monthlyPriceOverrideCents,
      includedUsersOverride: input.includedUsersOverride,
      includedStorageGbOverride: input.includedStorageGbOverride,
      extraUserPriceOverrideCents: input.extraUserPriceOverrideCents,
      extraGbPriceOverrideCents: input.extraGbPriceOverrideCents,
      dueDays: input.dueDays,
      status: input.status,
      endedReason: null,
      endedBy: null,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(subscription.id, subscription);
    const ids = this.byTenant.get(input.tenantId) ?? [];
    ids.push(subscription.id);
    this.byTenant.set(input.tenantId, ids);
    return subscription;
  }

  async closeSubscription(
    subscriptionId: string,
    validTo: Date,
    reason: string | null,
    endedBy: string | null,
  ): Promise<void> {
    const existing = this.subscriptions.get(subscriptionId);
    if (!existing) return;
    this.subscriptions.set(subscriptionId, {
      ...existing,
      validTo,
      status: "ended",
      endedReason: reason,
      endedBy,
      updatedAt: new Date(),
    });
  }

  async listAddons(subscriptionId: string): Promise<TenantSubscriptionAddon[]> {
    return [...this.addons.values()]
      .filter((addon) => addon.subscriptionId === subscriptionId)
      .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  }

  async listActiveAddons(subscriptionId: string): Promise<TenantSubscriptionAddon[]> {
    return (await this.listAddons(subscriptionId)).filter((addon) => addon.validTo === null);
  }

  async createAddon(input: CreateAddonRecord): Promise<TenantSubscriptionAddon> {
    const now = new Date();
    const addon: TenantSubscriptionAddon = {
      id: randomUUID(),
      tenantId: input.tenantId,
      subscriptionId: input.subscriptionId,
      planId: input.planId,
      validFrom: input.validFrom,
      validTo: input.validTo,
      perVehiclePriceOverrideCents: input.perVehiclePriceOverrideCents,
      createdAt: now,
      updatedAt: now,
    };
    this.addons.set(addon.id, addon);
    return addon;
  }

  async closeAddon(addonId: string, validTo: Date): Promise<void> {
    const existing = this.addons.get(addonId);
    if (!existing) return;
    this.addons.set(addonId, { ...existing, validTo, updatedAt: new Date() });
  }
}
