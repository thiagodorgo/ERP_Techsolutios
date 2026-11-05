// B-ASS-02 — repositório de planos/versões no Prisma (caminho produção). As tabelas
// subscription_plans / subscription_plan_versions são GLOBAIS (catálogo da plataforma, sem RLS):
// nenhuma leitura ou escrita aqui precisa de GUC. Dinheiro entra e sai em CENTAVOS INTEIROS no
// domínio e Decimal(12,2) no banco; armazenamento em Decimal(12,3).

import type { Prisma, PrismaClient } from "@prisma/client";

import { centsToMoney, storageGbToDecimal } from "./plan-money.js";
import type {
  PlanKind,
  PricingUnit,
  SubscriptionPlan,
  SubscriptionPlanVersion,
} from "./plan-types.js";
import type {
  CreatePlanRecord,
  CreateVersionRecord,
  PlansRepository,
  UpdatePlanRecord,
} from "./plans.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaPlansRepository implements PlansRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async listPlans(): Promise<SubscriptionPlan[]> {
    const records = await this.client.subscriptionPlan.findMany({ orderBy: { code: "asc" } });
    return records.map(mapPlan);
  }

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const record = await this.client.subscriptionPlan.findUnique({ where: { id } });
    return record ? mapPlan(record) : null;
  }

  async getPlanByCode(code: string): Promise<SubscriptionPlan | null> {
    const record = await this.client.subscriptionPlan.findFirst({
      where: { code: { equals: code.trim().toLowerCase(), mode: "insensitive" } },
    });
    return record ? mapPlan(record) : null;
  }

  async createPlan(input: CreatePlanRecord): Promise<SubscriptionPlan> {
    const record = await this.client.subscriptionPlan.create({
      data: {
        code: input.code,
        kind: input.kind,
        name: input.name,
        description: input.description,
        active: input.active,
        created_by: input.createdBy,
      },
    });
    return mapPlan(record);
  }

  async updatePlan(id: string, patch: UpdatePlanRecord): Promise<SubscriptionPlan | null> {
    const record = await this.client.subscriptionPlan.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      },
    });
    return mapPlan(record);
  }

  async listVersions(planId: string): Promise<SubscriptionPlanVersion[]> {
    const records = await this.client.subscriptionPlanVersion.findMany({
      where: { plan_id: planId },
      orderBy: { valid_from: "asc" },
    });
    return records.map(mapVersion);
  }

  async getVersionById(id: string): Promise<SubscriptionPlanVersion | null> {
    const record = await this.client.subscriptionPlanVersion.findUnique({ where: { id } });
    return record ? mapVersion(record) : null;
  }

  async createVersion(input: CreateVersionRecord): Promise<SubscriptionPlanVersion> {
    const record = await this.client.subscriptionPlanVersion.create({
      data: {
        plan_id: input.planId,
        version: input.version,
        valid_from: input.validFrom,
        valid_to: input.validTo,
        monthly_price: centsToMoney(input.monthlyPriceCents),
        included_users: input.includedUsers,
        included_storage_gb: storageGbToDecimal(input.includedStorageGb),
        extra_user_price: centsToMoney(input.extraUserPriceCents),
        extra_gb_price: centsToMoney(input.extraGbPriceCents),
        per_vehicle_price:
          input.perVehiclePriceCents === null ? null : centsToMoney(input.perVehiclePriceCents),
        pricing_unit: input.pricingUnit,
        modules: [...input.modules],
        notes: input.notes,
        inaugural: input.inaugural,
      },
    });
    return mapVersion(record);
  }

  async setVersionValidTo(versionId: string, validTo: Date): Promise<void> {
    await this.client.subscriptionPlanVersion.update({
      where: { id: versionId },
      data: { valid_to: validTo },
    });
  }
}

export async function createPrismaPlansRepository(): Promise<PrismaPlansRepository> {
  const { prisma } = await import("../../../database/prisma.js");
  return new PrismaPlansRepository(prisma);
}

type PlanRecord = {
  readonly id: string;
  readonly code: string;
  readonly kind: string;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly created_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type VersionRecord = {
  readonly id: string;
  readonly plan_id: string;
  readonly version: number;
  readonly valid_from: Date;
  readonly valid_to: Date | null;
  readonly monthly_price: Prisma.Decimal | number | string;
  readonly included_users: number;
  readonly included_storage_gb: Prisma.Decimal | number | string;
  readonly extra_user_price: Prisma.Decimal | number | string;
  readonly extra_gb_price: Prisma.Decimal | number | string;
  readonly per_vehicle_price: Prisma.Decimal | number | string | null;
  readonly pricing_unit: string;
  readonly modules: string[];
  readonly notes: string | null;
  readonly inaugural: boolean;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapPlan(record: PlanRecord): SubscriptionPlan {
  return {
    id: record.id,
    code: record.code,
    kind: record.kind as PlanKind,
    name: record.name,
    description: record.description,
    active: record.active,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapVersion(record: VersionRecord): SubscriptionPlanVersion {
  return {
    id: record.id,
    planId: record.plan_id,
    version: record.version,
    validFrom: record.valid_from,
    validTo: record.valid_to,
    monthlyPriceCents: decimalToCents(record.monthly_price),
    includedUsers: record.included_users,
    includedStorageGb: decimalToGb(record.included_storage_gb),
    extraUserPriceCents: decimalToCents(record.extra_user_price),
    extraGbPriceCents: decimalToCents(record.extra_gb_price),
    perVehiclePriceCents:
      record.per_vehicle_price === null ? null : decimalToCents(record.per_vehicle_price),
    pricingUnit: record.pricing_unit as PricingUnit,
    modules: [...record.modules],
    notes: record.notes,
    inaugural: record.inaugural,
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
