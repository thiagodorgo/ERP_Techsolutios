import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { Attachment, AttachmentStatus, CreateAttachmentInput } from "./attachment.types.js";
import { AttachmentError } from "./attachment.types.js";
import type { AttachmentRepository } from "./attachment.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createAttachment(input: CreateAttachmentInput): Promise<Attachment | undefined> {
    try {
      const record = await this.client.attachment.create({
        data: {
          tenant_id: input.tenantId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          file_url: input.fileUrl,
          file_name: input.fileName ?? null,
          extension: input.extension ?? null,
          content_type: input.contentType ?? null,
          size_bytes: input.sizeBytes ?? null,
          checksum_sha256: input.checksumSha256 ?? null,
          storage_provider: input.storageProvider ?? null,
          storage_key: input.storageKey ?? null,
          status: input.status ?? "stored",
          client_action_id: input.clientActionId ?? null,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          uploaded_by: input.uploadedBy ?? null,
          created_by: input.createdBy ?? null,
        },
      });
      return mapRecord(record);
    } catch (error) {
      // P2002 no índice único parcial de idempotência (tenant, entity_type, entity_id, client_action_id) → 409.
      if (isPrismaError(error, "P2002")) {
        throw new AttachmentError(409, "ATTACHMENT_CONFLICT", "already_uploaded", "An attachment with this client_action_id already exists for this entity.");
      }
      throw error;
    }
  }

  async listAttachments(tenantId: string, entityType: string, entityId: string): Promise<Attachment[]> {
    const items = await this.client.attachment.findMany({
      where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId, deleted_at: null },
      orderBy: [{ created_at: "desc" }],
    });
    return items.map(mapRecord);
  }

  async findById(tenantId: string, attachmentId: string): Promise<Attachment | undefined> {
    const record = await this.client.attachment.findFirst({
      where: { tenant_id: tenantId, id: attachmentId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveByClientActionId(
    tenantId: string,
    entityType: string,
    entityId: string,
    clientActionId: string,
  ): Promise<Attachment | undefined> {
    const record = await this.client.attachment.findFirst({
      where: {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        client_action_id: clientActionId,
        deleted_at: null,
      },
    });
    return record ? mapRecord(record) : undefined;
  }

  async deleteAttachment(tenantId: string, attachmentId: string): Promise<Attachment | undefined> {
    const current = await this.findById(tenantId, attachmentId);
    if (!current) return undefined;
    // Delete LÓGICO (RN-ANEXO-05): carimba deleted_at; a row persiste mas some dos reads.
    const deletedAt = new Date();
    await this.client.attachment.updateMany({
      where: { tenant_id: tenantId, id: attachmentId },
      data: { deleted_at: deletedAt },
    });
    return { ...current, deletedAt };
  }
}

export class RlsPrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createAttachment(input: CreateAttachmentInput): Promise<Attachment | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAttachmentRepository(tx).createAttachment(input));
  }
  listAttachments(tenantId: string, entityType: string, entityId: string): Promise<Attachment[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAttachmentRepository(tx).listAttachments(tenantId, entityType, entityId));
  }
  findById(tenantId: string, attachmentId: string): Promise<Attachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAttachmentRepository(tx).findById(tenantId, attachmentId));
  }
  findActiveByClientActionId(
    tenantId: string,
    entityType: string,
    entityId: string,
    clientActionId: string,
  ): Promise<Attachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAttachmentRepository(tx).findActiveByClientActionId(tenantId, entityType, entityId, clientActionId));
  }
  deleteAttachment(tenantId: string, attachmentId: string): Promise<Attachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAttachmentRepository(tx).deleteAttachment(tenantId, attachmentId));
  }
}

export async function createPrismaAttachmentRepository(): Promise<RlsPrismaAttachmentRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaAttachmentRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly file_url: string;
  readonly file_name: string | null;
  readonly extension: string | null;
  readonly content_type: string | null;
  readonly size_bytes: number | null;
  readonly checksum_sha256: string | null;
  readonly storage_provider: string | null;
  readonly storage_key: string | null;
  readonly status: string;
  readonly client_action_id: string | null;
  readonly metadata: Prisma.JsonValue;
  readonly uploaded_by: string | null;
  readonly created_by: string | null;
  readonly uploaded_at: Date;
  readonly created_at: Date;
  readonly deleted_at: Date | null;
}): Attachment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    entityType: record.entity_type,
    entityId: record.entity_id,
    fileUrl: record.file_url,
    fileName: record.file_name ?? undefined,
    extension: record.extension ?? undefined,
    contentType: record.content_type ?? undefined,
    sizeBytes: record.size_bytes ?? undefined,
    checksumSha256: record.checksum_sha256 ?? undefined,
    storageProvider: record.storage_provider ?? undefined,
    storageKey: record.storage_key ?? undefined,
    status: record.status as AttachmentStatus,
    clientActionId: record.client_action_id ?? undefined,
    metadata: (record.metadata as Record<string, unknown> | null) ?? {},
    uploadedBy: record.uploaded_by ?? undefined,
    createdBy: record.created_by ?? undefined,
    uploadedAt: record.uploaded_at,
    createdAt: record.created_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}
