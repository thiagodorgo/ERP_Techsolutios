import { Prisma, type PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateDamageAttachmentInput,
  CreateDamageInput,
  Damage,
  DamageAttachment,
  DamageGravidade,
  DamageMarker,
  DamageStatus,
  JsonRecord,
  ListDamagesInput,
  ListDamagesResult,
  UpdateDamageInput,
} from "./damage.types.js";
import type { DamageRepository } from "./damage.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaDamageRepository implements DamageRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateDamageInput): Promise<Damage> {
    const damage = await this.client.damage.create({
      data: {
        tenant_id: input.tenantId,
        vehicle_id: input.vehicleId,
        work_order_id: input.workOrderId ?? null,
        data: input.data,
        gravidade: input.gravidade,
        descricao: input.descricao,
        status: input.status,
        custo_estimado: input.custoEstimado ?? null,
        custo_real: input.custoReal ?? null,
        is_active: input.isActive ?? true,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? null,
      },
    });

    return mapDamageRecord(damage);
  }

  async list(input: ListDamagesInput): Promise<ListDamagesResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.damage.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.damage.count({ where }),
    ]);

    return {
      items: items.map(mapDamageRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, damageId: string): Promise<Damage | undefined> {
    const damage = await this.client.damage.findFirst({
      where: {
        tenant_id: tenantId,
        id: damageId,
      },
    });

    return damage ? mapDamageRecord(damage) : undefined;
  }

  async update(input: UpdateDamageInput): Promise<Damage | undefined> {
    const updated = await this.client.damage.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.damageId,
      },
      data: compactRecord({
        vehicle_id: input.vehicleId,
        work_order_id: nullable(input.workOrderId),
        data: input.data,
        gravidade: input.gravidade,
        descricao: input.descricao,
        status: input.status,
        custo_estimado: nullable(input.custoEstimado),
        custo_real: nullable(input.custoReal),
        is_active: input.isActive,
        updated_by: nullable(input.updatedBy),
      }),
    });

    return updated[0] ? mapDamageRecord(updated[0]) : undefined;
  }

  async createAttachment(input: CreateDamageAttachmentInput): Promise<DamageAttachment | undefined> {
    const damage = await this.findById(input.tenantId, input.damageId);
    if (!damage) return undefined;

    const attachment = await this.client.damageAttachment.create({
      data: {
        tenant_id: input.tenantId,
        damage_id: input.damageId,
        file_url: input.fileUrl,
        file_name: input.fileName ?? null,
        mime_type: input.mimeType ?? null,
        size_bytes: input.sizeBytes ?? null,
        checksum_sha256: input.checksumSha256 ?? null,
        storage_provider: input.storageProvider ?? null,
        storage_key: input.storageKey ?? null,
        marker: markerToJson(input.marker),
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        created_by: input.createdBy ?? null,
      },
    });

    return mapAttachmentRecord(attachment);
  }

  async listAttachments(tenantId: string, damageId: string): Promise<DamageAttachment[]> {
    const items = await this.client.damageAttachment.findMany({
      where: {
        tenant_id: tenantId,
        damage_id: damageId,
      },
      orderBy: [{ created_at: "asc" }],
    });

    return items.map(mapAttachmentRecord);
  }

  async findAttachmentById(
    tenantId: string,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment | undefined> {
    const attachment = await this.client.damageAttachment.findFirst({
      where: {
        tenant_id: tenantId,
        damage_id: damageId,
        id: attachmentId,
      },
    });

    return attachment ? mapAttachmentRecord(attachment) : undefined;
  }

  async deleteAttachment(
    tenantId: string,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment | undefined> {
    const attachment = await this.findAttachmentById(tenantId, damageId, attachmentId);
    if (!attachment) return undefined;

    await this.client.damageAttachment.deleteMany({
      where: {
        tenant_id: tenantId,
        damage_id: damageId,
        id: attachmentId,
      },
    });

    return attachment;
  }
}

export class RlsPrismaDamageRepository implements DamageRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateDamageInput): Promise<Damage> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaDamageRepository(tx).create(input));
  }

  list(input: ListDamagesInput): Promise<ListDamagesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaDamageRepository(tx).list(input));
  }

  findById(tenantId: string, damageId: string): Promise<Damage | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaDamageRepository(tx).findById(tenantId, damageId));
  }

  update(input: UpdateDamageInput): Promise<Damage | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaDamageRepository(tx).update(input));
  }

  createAttachment(input: CreateDamageAttachmentInput): Promise<DamageAttachment | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaDamageRepository(tx).createAttachment(input));
  }

  listAttachments(tenantId: string, damageId: string): Promise<DamageAttachment[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaDamageRepository(tx).listAttachments(tenantId, damageId));
  }

  findAttachmentById(tenantId: string, damageId: string, attachmentId: string): Promise<DamageAttachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaDamageRepository(tx).findAttachmentById(tenantId, damageId, attachmentId),
    );
  }

  deleteAttachment(tenantId: string, damageId: string, attachmentId: string): Promise<DamageAttachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaDamageRepository(tx).deleteAttachment(tenantId, damageId, attachmentId),
    );
  }
}

export async function createPrismaDamageRepository(): Promise<RlsPrismaDamageRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaDamageRepository(prisma);
}

function buildWhere(input: ListDamagesInput): Prisma.DamageWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.vehicleId ? { vehicle_id: input.vehicleId } : {}),
    ...(input.workOrderId ? { work_order_id: input.workOrderId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.gravidade ? { gravidade: input.gravidade } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search ? { descricao: { contains: input.search, mode: "insensitive" } } : {}),
  };
}

function mapDamageRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly vehicle_id: string;
  readonly work_order_id: string | null;
  readonly data: Date;
  readonly gravidade: string;
  readonly descricao: string;
  readonly status: string;
  readonly custo_estimado: unknown;
  readonly custo_real: unknown;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Damage {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    vehicleId: record.vehicle_id,
    workOrderId: record.work_order_id ?? undefined,
    data: record.data,
    gravidade: record.gravidade as DamageGravidade,
    descricao: record.descricao,
    status: record.status as DamageStatus,
    custoEstimado: optionalDecimal(record.custo_estimado),
    custoReal: optionalDecimal(record.custo_real),
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapAttachmentRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly damage_id: string;
  readonly file_url: string;
  readonly file_name: string | null;
  readonly mime_type: string | null;
  readonly size_bytes: number | null;
  readonly checksum_sha256: string | null;
  readonly storage_provider: string | null;
  readonly storage_key: string | null;
  readonly marker: unknown;
  readonly metadata: unknown;
  readonly created_by: string | null;
  readonly created_at: Date;
}): DamageAttachment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    damageId: record.damage_id,
    fileUrl: record.file_url,
    fileName: record.file_name ?? undefined,
    mimeType: record.mime_type ?? undefined,
    sizeBytes: record.size_bytes ?? undefined,
    checksumSha256: record.checksum_sha256 ?? undefined,
    storageProvider: record.storage_provider ?? undefined,
    storageKey: record.storage_key ?? undefined,
    marker: markerFromJson(record.marker),
    metadata: isJsonRecord(record.metadata) ? record.metadata : {},
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
  };
}

function markerToJson(marker: DamageMarker | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return marker === undefined ? Prisma.DbNull : (marker as unknown as Prisma.InputJsonValue);
}

function markerFromJson(value: unknown): DamageMarker | undefined {
  if (!isJsonRecord(value)) return undefined;
  const { x, y, description } = value;
  if (typeof x !== "number" || typeof y !== "number") return undefined;

  return {
    x,
    y,
    ...(typeof description === "string" ? { description } : {}),
  };
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
