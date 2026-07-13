import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Tag,
  CreateTagInput,
  ListTagInput,
  ListTagResult,
  UpdateTagInput,
} from "./tag.types.js";
import { TagError } from "./tag.types.js";
import type { TagRepository } from "./tag.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaTagRepository implements TagRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateTagInput): Promise<Tag> {
    try {
      const tag = await this.client.tag.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          color: input.color ?? null,
          description: input.description ?? null,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapTagRecord(tag);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TagError(409, "TAG_CONFLICT", "duplicate_name", "A tag with this name already exists.");
      }
      throw error;
    }
  }

  async list(input: ListTagInput): Promise<ListTagResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.tag.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.tag.count({ where }),
    ]);
    return { items: items.map(mapTagRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, tagId: string): Promise<Tag | undefined> {
    const tag = await this.client.tag.findFirst({ where: { tenant_id: tenantId, id: tagId } });
    return tag ? mapTagRecord(tag) : undefined;
  }

  async update(input: UpdateTagInput): Promise<Tag | undefined> {
    try {
      const updated = await this.client.tag.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.tagId },
        data: compactRecord({
          name: input.name,
          color: nullable(input.color),
          description: nullable(input.description),
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapTagRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TagError(409, "TAG_CONFLICT", "duplicate_name", "A tag with this name already exists.");
      }
      throw error;
    }
  }
}

export class RlsPrismaTagRepository implements TagRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateTagInput): Promise<Tag> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTagRepository(tx).create(input));
  }

  list(input: ListTagInput): Promise<ListTagResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTagRepository(tx).list(input));
  }

  findById(tenantId: string, tagId: string): Promise<Tag | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaTagRepository(tx).findById(tenantId, tagId));
  }

  update(input: UpdateTagInput): Promise<Tag | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTagRepository(tx).update(input));
  }
}

export async function createPrismaTagRepository(): Promise<RlsPrismaTagRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaTagRepository(prisma);
}

function buildWhere(input: ListTagInput): Prisma.TagWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapTagRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly color: string | null;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Tag {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    color: record.color ?? undefined,
    description: record.description ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === "P2002";
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
