import { randomUUID } from "node:crypto";

import type { CreateWorkOrderAttachmentInput, WorkOrderAttachment } from "./work-order-attachment.types.js";
import { WorkOrderAttachmentError } from "./work-order-attachment.types.js";

export interface WorkOrderAttachmentRepository {
  createAttachment(input: CreateWorkOrderAttachmentInput): Promise<WorkOrderAttachment | undefined>;
  listAttachments(tenantId: string, workOrderId: string): Promise<readonly WorkOrderAttachment[]>;
  findAttachmentById(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined>;
  findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderAttachment | undefined>;
  deleteAttachment(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined>;
  reset?(): void;
}

export class InMemoryWorkOrderAttachmentRepository implements WorkOrderAttachmentRepository {
  private readonly attachments = new Map<string, WorkOrderAttachment>();

  async createAttachment(input: CreateWorkOrderAttachmentInput): Promise<WorkOrderAttachment | undefined> {
    // Idempotência tenant-scoped (§6 / R5): duplicado ativo com o mesmo client_action_id → 409.
    if (input.clientActionId && (await this.findActiveByClientActionId(input.tenantId, input.workOrderId, input.clientActionId))) {
      throw new WorkOrderAttachmentError(409, "WORK_ORDER_ATTACHMENT_CONFLICT", "already_uploaded", "An attachment with this client_action_id already exists for this work order.");
    }

    const attachment: WorkOrderAttachment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      status: input.status ?? "stored",
      clientActionId: input.clientActionId,
      metadata: input.metadata ?? {},
      uploadedBy: input.uploadedBy,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    this.attachments.set(attachment.id, attachment);
    return attachment;
  }

  async listAttachments(tenantId: string, workOrderId: string): Promise<readonly WorkOrderAttachment[]> {
    return [...this.attachments.values()]
      .filter((a) => a.tenantId === tenantId && a.workOrderId === workOrderId && !a.deletedAt)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findAttachmentById(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined> {
    const attachment = this.attachments.get(attachmentId);
    return attachment && attachment.tenantId === tenantId && attachment.workOrderId === workOrderId && !attachment.deletedAt ? attachment : undefined;
  }

  async findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderAttachment | undefined> {
    return [...this.attachments.values()].find(
      (a) => a.tenantId === tenantId && a.workOrderId === workOrderId && a.clientActionId === clientActionId && !a.deletedAt,
    );
  }

  async deleteAttachment(tenantId: string, workOrderId: string, attachmentId: string): Promise<WorkOrderAttachment | undefined> {
    const current = await this.findAttachmentById(tenantId, workOrderId, attachmentId);
    if (!current) return undefined;
    // Delete LÓGICO (R6): carimba deletedAt; some dos reads.
    const removed: WorkOrderAttachment = { ...current, deletedAt: new Date() };
    this.attachments.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.attachments.clear();
  }
}
