import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { CreateWorkOrderAttachmentInput, WorkOrderAttachment, WorkOrderAttachmentStatus } from "./work-order-attachment.types.js";
import { WorkOrderAttachmentError } from "./work-order-attachment.types.js";
import type { WorkOrderAttachmentRepository } from "./work-order-attachment.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaWorkOrderAttachmentRepository implements WorkOrderAttachmentRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createAttachment(input: CreateWorkOrderAttachmentInput): Promise<WorkOrderAttachment | undefined> {
    try {
      const record = await this.client.workOrderAttachment.create({
        data: {
          tenant_id: input.tenantId,
          work_order_id: input.workOrderId,
          file_url: input.fileUrl,
          file_name: input.fileName ?? null,
          mime_type: input.mimeType ?? null,
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
      // P2002 no índice único parcial de idempotência (tenant, work_order, client_action_id) → 409.
      if (isPrismaError(error, "P2002")) {
        throw new WorkOrderAttachmentError(409, "WORK_ORDER_ATTACHMENT_CONFLICT", "already_uploaded", "An attachment with this client_action_id already exists for this work order.");
      }
      throw error;
    }
  }

  async listAttachments(tenantId: string, workOrderId: string): Promise<WorkOrderAttachment[]> {
    const items = await this.client.workOrderAttachment.findMany({
      where: { tenant_id: tenantId, work_order_id: workOrderId, deleted_at: null },
      orderBy: [{ created_at: "desc" }],
    });
    return items.map(mapRecord);
  }

  async findAttachmentById(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined> {
    const record = await this.client.workOrderAttachment.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: attachmentId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderAttachment | undefined> {
    const record = await this.client.workOrderAttachment.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, client_action_id: clientActionId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async deleteAttachment(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined> {
    const current = await this.findAttachmentById(tenantId, workOrderId, attachmentId);
    if (!current) return undefined;
    // Delete LÓGICO (R6): carimba deleted_at; a row persiste mas some dos reads.
    await this.client.workOrderAttachment.updateMany({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: attachmentId },
      data: { deleted_at: new Date() },
    });
    return { ...current, deletedAt: new Date() };
  }
}

export class RlsPrismaWorkOrderAttachmentRepository implements WorkOrderAttachmentRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createAttachment(input: CreateWorkOrderAttachmentInput): Promise<WorkOrderAttachment | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderAttachmentRepository(tx).createAttachment(input));
  }
  listAttachments(tenantId: string, workOrderId: string): Promise<WorkOrderAttachment[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderAttachmentRepository(tx).listAttachments(tenantId, workOrderId));
  }
  findAttachmentById(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderAttachmentRepository(tx).findAttachmentById(tenantId, workOrderId, attachmentId));
  }
  findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderAttachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderAttachmentRepository(tx).findActiveByClientActionId(tenantId, workOrderId, clientActionId));
  }
  deleteAttachment(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderAttachmentRepository(tx).deleteAttachment(tenantId, workOrderId, attachmentId));
  }
}

export async function createPrismaWorkOrderAttachmentRepository(): Promise<RlsPrismaWorkOrderAttachmentRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaWorkOrderAttachmentRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string;
  readonly file_url: string;
  readonly file_name: string | null;
  readonly mime_type: string | null;
  readonly size_bytes: number | null;
  readonly checksum_sha256: string | null;
  readonly storage_provider: string | null;
  readonly storage_key: string | null;
  readonly status: string;
  readonly client_action_id: string | null;
  readonly metadata: Prisma.JsonValue;
  readonly uploaded_by: string | null;
  readonly created_by: string | null;
  readonly created_at: Date;
  readonly deleted_at: Date | null;
}): WorkOrderAttachment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id,
    fileUrl: record.file_url,
    fileName: record.file_name ?? undefined,
    mimeType: record.mime_type ?? undefined,
    sizeBytes: record.size_bytes ?? undefined,
    checksumSha256: record.checksum_sha256 ?? undefined,
    storageProvider: record.storage_provider ?? undefined,
    storageKey: record.storage_key ?? undefined,
    status: record.status as WorkOrderAttachmentStatus,
    clientActionId: record.client_action_id ?? undefined,
    metadata: (record.metadata as Record<string, unknown> | null) ?? {},
    uploadedBy: record.uploaded_by ?? undefined,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}
