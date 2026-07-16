import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { CreateTagAssignmentInput, TagAssignment } from "./tag-assignment.types.js";
import { duplicateTagAssignmentError, tagNotFoundError } from "./tag-assignment.types.js";
import type { TagAssignmentRepository } from "./tag-assignment.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaTagAssignmentRepository implements TagAssignmentRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateTagAssignmentInput): Promise<TagAssignment> {
    try {
      const record = await this.client.tagAssignment.create({
        data: {
          tenant_id: input.tenantId,
          tag_id: input.tagId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          created_by: input.createdBy ?? null,
        },
      });
      return mapRecord(record);
    } catch (error) {
      // P2002 (unique polimórfico) → 409. P2003 (FK de tag_id inválida/cross-tenant) → 422 tag_not_found:
      // o service já pré-valida a tag, mas se ela for HARD-deletada na janela entre a pré-validação e o
      // attach (TOCTOU, condição critico J-Ω3F-5A), a FK RESTRICT rejeita — traduzimos p/ 422, nunca 500.
      if (isPrismaError(error, "P2002")) {
        throw duplicateTagAssignmentError();
      }
      if (isPrismaError(error, "P2003")) {
        throw tagNotFoundError();
      }
      throw error;
    }
  }

  async listForEntity(tenantId: string, entityType: string, entityId: string): Promise<readonly TagAssignment[]> {
    const records = await this.client.tagAssignment.findMany({
      where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId },
      orderBy: [{ created_at: "asc" }],
    });
    return records.map(mapRecord);
  }

  async hardDelete(tenantId: string, entityType: string, entityId: string, tagId: string): Promise<TagAssignment | undefined> {
    const existing = await this.client.tagAssignment.findFirst({
      where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId, tag_id: tagId },
    });
    if (!existing) return undefined;
    await this.client.tagAssignment.delete({ where: { id: existing.id } });
    return mapRecord(existing);
  }
}

export class RlsPrismaTagAssignmentRepository implements TagAssignmentRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateTagAssignmentInput): Promise<TagAssignment> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTagAssignmentRepository(tx).create(input));
  }
  listForEntity(tenantId: string, entityType: string, entityId: string): Promise<readonly TagAssignment[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaTagAssignmentRepository(tx).listForEntity(tenantId, entityType, entityId));
  }
  hardDelete(tenantId: string, entityType: string, entityId: string, tagId: string): Promise<TagAssignment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaTagAssignmentRepository(tx).hardDelete(tenantId, entityType, entityId, tagId));
  }
}

export async function createPrismaTagAssignmentRepository(): Promise<RlsPrismaTagAssignmentRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaTagAssignmentRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly tag_id: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly created_by: string | null;
  readonly created_at: Date;
}): TagAssignment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    tagId: record.tag_id,
    entityType: record.entity_type,
    entityId: record.entity_id,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}
