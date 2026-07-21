import { randomUUID } from "node:crypto";

import type { Attachment, CreateAttachmentInput } from "./attachment.types.js";
import { AttachmentError } from "./attachment.types.js";

export interface AttachmentRepository {
  createAttachment(input: CreateAttachmentInput): Promise<Attachment | undefined>;
  listAttachments(tenantId: string, entityType: string, entityId: string): Promise<readonly Attachment[]>;
  findById(tenantId: string, attachmentId: string): Promise<Attachment | undefined>;
  findActiveByClientActionId(
    tenantId: string,
    entityType: string,
    entityId: string,
    clientActionId: string,
  ): Promise<Attachment | undefined>;
  deleteAttachment(tenantId: string, attachmentId: string): Promise<Attachment | undefined>;
  reset?(): void;
}

export class InMemoryAttachmentRepository implements AttachmentRepository {
  private readonly attachments = new Map<string, Attachment>();

  async createAttachment(input: CreateAttachmentInput): Promise<Attachment | undefined> {
    // Idempotência TENANT-SCOPED (§6 / RN-ANEXO-06): duplicado ativo com o mesmo client_action_id
    // (dentro do par entity_type/entity_id) → 409.
    if (
      input.clientActionId &&
      (await this.findActiveByClientActionId(input.tenantId, input.entityType, input.entityId, input.clientActionId))
    ) {
      throw new AttachmentError(409, "ATTACHMENT_CONFLICT", "already_uploaded", "An attachment with this client_action_id already exists for this entity.");
    }

    const now = new Date();
    const attachment: Attachment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      extension: input.extension,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      status: input.status ?? "stored",
      clientActionId: input.clientActionId,
      metadata: input.metadata ?? {},
      uploadedBy: input.uploadedBy,
      createdBy: input.createdBy,
      uploadedAt: now,
      createdAt: now,
    };
    this.attachments.set(attachment.id, attachment);
    return attachment;
  }

  async listAttachments(tenantId: string, entityType: string, entityId: string): Promise<readonly Attachment[]> {
    return [...this.attachments.values()]
      .filter((a) => a.tenantId === tenantId && a.entityType === entityType && a.entityId === entityId && !a.deletedAt)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findById(tenantId: string, attachmentId: string): Promise<Attachment | undefined> {
    const attachment = this.attachments.get(attachmentId);
    return attachment && attachment.tenantId === tenantId && !attachment.deletedAt ? attachment : undefined;
  }

  async findActiveByClientActionId(
    tenantId: string,
    entityType: string,
    entityId: string,
    clientActionId: string,
  ): Promise<Attachment | undefined> {
    return [...this.attachments.values()].find(
      (a) =>
        a.tenantId === tenantId &&
        a.entityType === entityType &&
        a.entityId === entityId &&
        a.clientActionId === clientActionId &&
        !a.deletedAt,
    );
  }

  async deleteAttachment(tenantId: string, attachmentId: string): Promise<Attachment | undefined> {
    const current = await this.findById(tenantId, attachmentId);
    if (!current) return undefined;
    // Delete LÓGICO (RN-ANEXO-05): carimba deletedAt; some dos reads.
    const removed: Attachment = { ...current, deletedAt: new Date() };
    this.attachments.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.attachments.clear();
  }
}
