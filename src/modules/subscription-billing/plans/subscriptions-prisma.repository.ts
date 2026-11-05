// B-ASS-02 — repositório de assinaturas/add-ons por organização no Prisma. As tabelas
// tenant_subscriptions / tenant_subscription_addons têm RLS ENABLE + FORCE: TODA operação de uma
// organização roda sob `withTenantRls` (GUC app.current_tenant_id), como o molde cloud-cost-allocation.
// A leitura cross-tenant (listActiveSubscriptions, usada no resumo de planos) varre organização por
// organização com `forEachTenantRls`. Dinheiro em CENTAVOS INTEIROS no domínio e Decimal no banco.

import type { Prisma, PrismaClient } from "@prisma/client";

import { forEachTenantRls, withTenantRls } from "../../../database/rls.js";
import { centsToMoney, storageGbToDecimal } from "./plan-money.js";
import type {
  SubscriptionStatus,
  TenantSubscription,
  TenantSubscriptionAddon,
} from "./plan-types.js";
import type {
  CreateAddonRecord,
  CreateSubscriptionRecord,
  SubscriptionsRepository,
} from "./subscriptions.repository.js";

export class PrismaSubscriptionsRepository implements SubscriptionsRepository {
  constructor(private readonly client: PrismaClient) {}

  getActiveSubscription(tenantId: string): Promise<TenantSubscription | null> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const record = await tx.tenantSubscription.findFirst({
        where: { tenant_id: tenantId, valid_to: null },
        orderBy: { valid_from: "desc" },
      });
      return record ? mapSubscription(record) : null;
    });
  }

  listSubscriptions(tenantId: string): Promise<TenantSubscription[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const records = await tx.tenantSubscription.findMany({
        where: { tenant_id: tenantId },
        orderBy: { valid_from: "asc" },
      });
      return records.map(mapSubscription);
    });
  }

  async listActiveSubscriptions(): Promise<TenantSubscription[]> {
    const tenants = await this.client.tenant.findMany({ select: { id: true } });
    if (tenants.length === 0) return [];
    return forEachTenantRls(this.client, tenants.map((tenant) => tenant.id), async (tx) => {
      const records = await tx.tenantSubscription.findMany({
        where: { valid_to: null },
        orderBy: { valid_from: "asc" },
      });
      return records.map(mapSubscription);
    });
  }

  createSubscription(input: CreateSubscriptionRecord): Promise<TenantSubscription> {
    return withTenantRls(this.client, input.tenantId, async (tx) => {
      const record = await tx.tenantSubscription.create({
        data: {
          tenant_id: input.tenantId,
          plan_id: input.planId,
          valid_from: input.validFrom,
          valid_to: input.validTo,
          monthly_price_override:
            input.monthlyPriceOverrideCents === null
              ? null
              : centsToMoney(input.monthlyPriceOverrideCents),
          included_users_override: input.includedUsersOverride,
          included_storage_gb_override:
            input.includedStorageGbOverride === null
              ? null
              : storageGbToDecimal(input.includedStorageGbOverride),
          extra_user_price_override:
            input.extraUserPriceOverrideCents === null
              ? null
              : centsToMoney(input.extraUserPriceOverrideCents),
          extra_gb_price_override:
            input.extraGbPriceOverrideCents === null
              ? null
              : centsToMoney(input.extraGbPriceOverrideCents),
          due_days: input.dueDays,
          status: input.status,
          notes: input.notes,
        },
      });
      return mapSubscription(record);
    });
  }

  async closeSubscription(
    tenantId: string,
    subscriptionId: string,
    validTo: Date,
    reason: string | null,
    endedBy: string | null,
  ): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      await tx.tenantSubscription.updateMany({
        where: { tenant_id: tenantId, id: subscriptionId },
        data: { valid_to: validTo, status: "ended", ended_reason: reason, ended_by: endedBy },
      });
    });
  }

  listAddons(tenantId: string, subscriptionId: string): Promise<TenantSubscriptionAddon[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const records = await tx.tenantSubscriptionAddon.findMany({
        where: { tenant_id: tenantId, subscription_id: subscriptionId },
        orderBy: { valid_from: "asc" },
      });
      return records.map(mapAddon);
    });
  }

  listActiveAddons(tenantId: string, subscriptionId: string): Promise<TenantSubscriptionAddon[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const records = await tx.tenantSubscriptionAddon.findMany({
        where: { tenant_id: tenantId, subscription_id: subscriptionId, valid_to: null },
        orderBy: { valid_from: "asc" },
      });
      return records.map(mapAddon);
    });
  }

  createAddon(input: CreateAddonRecord): Promise<TenantSubscriptionAddon> {
    return withTenantRls(this.client, input.tenantId, async (tx) => {
      const record = await tx.tenantSubscriptionAddon.create({
        data: {
          tenant_id: input.tenantId,
          subscription_id: input.subscriptionId,
          plan_id: input.planId,
          valid_from: input.validFrom,
          valid_to: input.validTo,
          per_vehicle_price_override:
            input.perVehiclePriceOverrideCents === null
              ? null
              : centsToMoney(input.perVehiclePriceOverrideCents),
        },
      });
      return mapAddon(record);
    });
  }

  async closeAddon(tenantId: string, addonId: string, validTo: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      await tx.tenantSubscriptionAddon.updateMany({
        where: { tenant_id: tenantId, id: addonId },
        data: { valid_to: validTo },
      });
    });
  }
}

export async function createPrismaSubscriptionsRepository(): Promise<PrismaSubscriptionsRepository> {
  const { prisma } = await import("../../../database/prisma.js");
  return new PrismaSubscriptionsRepository(prisma);
}

type SubscriptionRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly plan_id: string;
  readonly valid_from: Date;
  readonly valid_to: Date | null;
  readonly monthly_price_override: Prisma.Decimal | number | string | null;
  readonly included_users_override: number | null;
  readonly included_storage_gb_override: Prisma.Decimal | number | string | null;
  readonly extra_user_price_override: Prisma.Decimal | number | string | null;
  readonly extra_gb_price_override: Prisma.Decimal | number | string | null;
  readonly due_days: number;
  readonly status: string;
  readonly ended_reason: string | null;
  readonly ended_by: string | null;
  readonly notes: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type AddonRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly subscription_id: string;
  readonly plan_id: string;
  readonly valid_from: Date;
  readonly valid_to: Date | null;
  readonly per_vehicle_price_override: Prisma.Decimal | number | string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapSubscription(record: SubscriptionRecord): TenantSubscription {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    planId: record.plan_id,
    validFrom: record.valid_from,
    validTo: record.valid_to,
    monthlyPriceOverrideCents:
      record.monthly_price_override === null ? null : decimalToCents(record.monthly_price_override),
    includedUsersOverride: record.included_users_override,
    includedStorageGbOverride:
      record.included_storage_gb_override === null
        ? null
        : decimalToGb(record.included_storage_gb_override),
    extraUserPriceOverrideCents:
      record.extra_user_price_override === null
        ? null
        : decimalToCents(record.extra_user_price_override),
    extraGbPriceOverrideCents:
      record.extra_gb_price_override === null ? null : decimalToCents(record.extra_gb_price_override),
    dueDays: record.due_days,
    status: record.status as SubscriptionStatus,
    endedReason: record.ended_reason,
    endedBy: record.ended_by,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapAddon(record: AddonRecord): TenantSubscriptionAddon {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    subscriptionId: record.subscription_id,
    planId: record.plan_id,
    validFrom: record.valid_from,
    validTo: record.valid_to,
    perVehiclePriceOverrideCents:
      record.per_vehicle_price_override === null
        ? null
        : decimalToCents(record.per_vehicle_price_override),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function decimalToCents(value: Prisma.Decimal | number | string | null): number {
  if (value === null) return 0;
  return Math.round(Number(value.toString()) * 100);
}

function decimalToGb(value: Prisma.Decimal | number | string): number {
  return Math.round(Number(value.toString()) * 1000) / 1000;
}
