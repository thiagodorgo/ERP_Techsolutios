import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Branch,
  CreateBranchInput,
  ListBranchInput,
  ListBranchResult,
  UpdateBranchInput,
} from "./branch.types.js";
import { BranchError } from "./branch.types.js";
import type { BranchRepository } from "./branch.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaBranchRepository implements BranchRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateBranchInput): Promise<Branch> {
    try {
      const branch = await this.client.branch.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          code: input.code,
          status: input.status,
        },
      });
      return mapBranchRecord(branch);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BranchError(409, "BRANCH_CONFLICT", "duplicate_code", "A branch with this code already exists.");
      }
      throw error;
    }
  }

  async list(input: ListBranchInput): Promise<ListBranchResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.branch.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.branch.count({ where }),
    ]);
    return { items: items.map(mapBranchRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, branchId: string): Promise<Branch | undefined> {
    const branch = await this.client.branch.findFirst({ where: { tenant_id: tenantId, id: branchId } });
    return branch ? mapBranchRecord(branch) : undefined;
  }

  async update(input: UpdateBranchInput): Promise<Branch | undefined> {
    try {
      const updated = await this.client.branch.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.branchId },
        data: compactRecord({
          name: input.name,
          code: input.code,
          status: input.status,
        }),
      });
      return updated[0] ? mapBranchRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BranchError(409, "BRANCH_CONFLICT", "duplicate_code", "A branch with this code already exists.");
      }
      throw error;
    }
  }
}

export class RlsPrismaBranchRepository implements BranchRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateBranchInput): Promise<Branch> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaBranchRepository(tx).create(input));
  }

  list(input: ListBranchInput): Promise<ListBranchResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaBranchRepository(tx).list(input));
  }

  findById(tenantId: string, branchId: string): Promise<Branch | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaBranchRepository(tx).findById(tenantId, branchId));
  }

  update(input: UpdateBranchInput): Promise<Branch | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaBranchRepository(tx).update(input));
  }
}

export async function createPrismaBranchRepository(): Promise<RlsPrismaBranchRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaBranchRepository(prisma);
}

function buildWhere(input: ListBranchInput): Prisma.BranchWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { code: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapBranchRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly code: string;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Branch {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    code: record.code,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === "P2002";
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
