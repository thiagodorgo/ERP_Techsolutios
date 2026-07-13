import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  TenantSetting,
  ListTenantSettingInput,
  ListTenantSettingResult,
  UpsertTenantSettingInput,
} from "./tenant-setting.types.js";
import type { TenantSettingRepository } from "./tenant-setting.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaTenantSettingRepository implements TenantSettingRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async list(input: ListTenantSettingInput): Promise<ListTenantSettingResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.tenantSetting.findMany({ where, orderBy: [{ key: "asc" }] }),
      this.client.tenantSetting.count({ where }),
    ]);
    return { items: items.map(mapTenantSettingRecord), total };
  }

  async findByKey(tenantId: string, key: string): Promise<TenantSetting | undefined> {
    const record = await this.client.tenantSetting.findFirst({ where: { tenant_id: tenantId, key } });
    return record ? mapTenantSettingRecord(record) : undefined;
  }

  async upsert(input: UpsertTenantSettingInput): Promise<TenantSetting> {
    const record = await this.client.tenantSetting.upsert({
      where: { tenant_id_key: { tenant_id: input.tenantId, key: input.key } },
      create: {
        tenant_id: input.tenantId,
        key: input.key,
        value: input.value,
        category: input.category ?? null,
        description: input.description ?? null,
        updated_by: input.updatedBy ?? null,
      },
      // Merge: value sempre atualiza; category/description só quando definidos (undefined preserva).
      update: compactRecord({
        value: input.value,
        category: input.category,
        description: input.description,
        updated_by: input.updatedBy ?? null,
      }),
    });
    return mapTenantSettingRecord(record);
  }
}

export class RlsPrismaTenantSettingRepository implements TenantSettingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  list(input: ListTenantSettingInput): Promise<ListTenantSettingResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTenantSettingRepository(tx).list(input));
  }

  findByKey(tenantId: string, key: string): Promise<TenantSetting | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaTenantSettingRepository(tx).findByKey(tenantId, key));
  }

  upsert(input: UpsertTenantSettingInput): Promise<TenantSetting> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTenantSettingRepository(tx).upsert(input));
  }
}

export async function createPrismaTenantSettingRepository(): Promise<RlsPrismaTenantSettingRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaTenantSettingRepository(prisma);
}

function buildWhere(input: ListTenantSettingInput): Prisma.TenantSettingWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.category !== undefined ? { category: input.category } : {}),
  };
}

function mapTenantSettingRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly key: string;
  readonly value: string;
  readonly category: string | null;
  readonly description: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): TenantSetting {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    key: record.key,
    value: record.value,
    category: record.category ?? undefined,
    description: record.description ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
