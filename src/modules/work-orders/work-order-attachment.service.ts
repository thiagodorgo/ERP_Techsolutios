import { createHash } from "node:crypto";

import { env } from "../../config/env.js";
import { WorkOrderError } from "./work-order.types.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "./work-order.service.js";
import {
  InMemoryWorkOrderAttachmentRepository,
  type WorkOrderAttachmentRepository,
} from "./work-order-attachment.repository.js";
import {
  deleteStoredWorkOrderAttachmentFile,
  getWorkOrderAttachmentScanner,
  resolveWorkOrderAttachmentDownload,
  saveWorkOrderAttachmentFile,
  type WorkOrderAttachmentDownload,
  type WorkOrderAttachmentUpload,
} from "./work-order-attachment.storage.js";
import type { WorkOrderAttachment, WorkOrderAttachmentActorContext } from "./work-order-attachment.types.js";
import { WorkOrderAttachmentError } from "./work-order-attachment.types.js";

export class WorkOrderAttachmentService {
  constructor(
    private readonly repository: WorkOrderAttachmentRepository,
    private readonly workOrderService: WorkOrderService,
  ) {}

  async listAttachments(actor: WorkOrderAttachmentActorContext, workOrderId: string): Promise<readonly WorkOrderAttachment[]> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    return this.repository.listAttachments(actor.tenantId, workOrder.id);
  }

  /**
   * Ω3-d — upload: SCAN antes de STORE (R2). infected → 422 / failed → 503 (nada persistido, sem blob).
   * clean → store no provider de checklist (D-014) → grava a row status='stored'. Cleanup de órfão:
   * se o insert falha após o store, o blob é removido.
   */
  async createUploadedAttachment(
    actor: WorkOrderAttachmentActorContext,
    workOrderId: string,
    upload: WorkOrderAttachmentUpload,
  ): Promise<WorkOrderAttachment> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);

    // Idempotência tenant-scoped (§6/R5): duplicado ativo com o mesmo client_action_id → 409, ANTES
    // de escanear/armazenar (não gasta scan nem storage num retry já resolvido).
    if (upload.clientActionId) {
      const existing = await this.repository.findActiveByClientActionId(actor.tenantId, workOrder.id, upload.clientActionId);
      if (existing) {
        throw new WorkOrderAttachmentError(409, "WORK_ORDER_ATTACHMENT_CONFLICT", "already_uploaded", "An attachment with this client_action_id already exists for this work order.");
      }
    }

    // R2 — AV-scan ANTES de armazenar; malware nunca chega ao store.
    const checksumSha256 = createHash("sha256").update(upload.file.buffer).digest("hex");
    const scan = await getWorkOrderAttachmentScanner().scan({
      tenantId: actor.tenantId,
      evidenceId: workOrder.id,
      clientEvidenceId: upload.clientActionId ?? "",
      mimeType: upload.file.mimeType,
      sizeBytes: upload.file.sizeBytes,
      checksumSha256,
      buffer: upload.file.buffer,
    });
    if (scan.status === "infected") {
      throw new WorkOrderAttachmentError(422, "WORK_ORDER_ATTACHMENT_REJECTED", "evidence_rejected", "Attachment failed the malware scan.");
    }
    if (scan.status === "failed") {
      throw new WorkOrderAttachmentError(503, "WORK_ORDER_ATTACHMENT_SCAN_UNAVAILABLE", "scan_unavailable", "Attachment scanner is unavailable; retry later.");
    }

    const stored = await saveWorkOrderAttachmentFile({ tenantId: actor.tenantId, workOrderId: workOrder.id, upload: upload.file });

    try {
      const attachment = await this.repository.createAttachment({
        tenantId: actor.tenantId,
        workOrderId: workOrder.id,
        fileUrl: stored.fileUrl,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksum,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        status: "stored",
        clientActionId: upload.clientActionId,
        metadata: upload.description ? { description: upload.description } : {},
        uploadedBy: actor.userId,
        createdBy: actor.userId,
      });
      if (!attachment) {
        throw new WorkOrderAttachmentError(404, "WORK_ORDER_NOT_FOUND", "work_order_not_found", "Work order was not found.");
      }
      return attachment;
    } catch (error) {
      // Cleanup de órfão: o insert falhou após o store → remove o blob.
      await deleteStoredWorkOrderAttachmentFile(stored.storageKey, stored.storageProvider);
      throw error;
    }
  }

  async getAttachmentDownload(
    actor: WorkOrderAttachmentActorContext,
    workOrderId: string,
    attachmentId: string,
  ): Promise<WorkOrderAttachmentDownload> {
    const attachment = await this.getAttachmentEntity(actor, workOrderId, attachmentId);
    // Gate de download (R4, forward-compat AV-assíncrono): só 'stored' pode ser baixado.
    if (attachment.status !== "stored") {
      throw new WorkOrderAttachmentError(409, "WORK_ORDER_ATTACHMENT_NOT_READY", "attachment_not_ready", "Attachment is not ready for download.");
    }
    return resolveWorkOrderAttachmentDownload(attachment);
  }

  async deleteAttachment(
    actor: WorkOrderAttachmentActorContext,
    workOrderId: string,
    attachmentId: string,
  ): Promise<WorkOrderAttachment> {
    const attachment = await this.getAttachmentEntity(actor, workOrderId, attachmentId);
    const removed = await this.repository.deleteAttachment(actor.tenantId, attachment.workOrderId, attachment.id);
    if (!removed) {
      throw new WorkOrderAttachmentError(404, "WORK_ORDER_ATTACHMENT_NOT_FOUND", "attachment_not_found", "Work order attachment was not found.");
    }
    if (removed.storageKey) {
      await deleteStoredWorkOrderAttachmentFile(removed.storageKey, removed.storageProvider === "s3" ? "s3" : "local");
    }
    return removed;
  }

  // OS in-tenant? senão 404 (não vaza cross-tenant). Reusa o WorkOrderService (mesmo módulo).
  private async assertWorkOrder(actor: WorkOrderAttachmentActorContext, workOrderId: string) {
    try {
      return await this.workOrderService.get(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw new WorkOrderAttachmentError(404, "WORK_ORDER_NOT_FOUND", "work_order_not_found", "Work order was not found.");
      }
      throw error;
    }
  }

  private async getAttachmentEntity(
    actor: WorkOrderAttachmentActorContext,
    workOrderId: string,
    attachmentId: string,
  ): Promise<WorkOrderAttachment> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const attachment = await this.repository.findAttachmentById(actor.tenantId, workOrder.id, attachmentId);
    if (!attachment) {
      throw new WorkOrderAttachmentError(404, "WORK_ORDER_ATTACHMENT_NOT_FOUND", "attachment_not_found", "Work order attachment was not found.");
    }
    return attachment;
  }
}

const memoryRepository = new InMemoryWorkOrderAttachmentRepository();
let defaultServicePromise: Promise<WorkOrderAttachmentService> | undefined;

export function createMemoryWorkOrderAttachmentService(): WorkOrderAttachmentService {
  return new WorkOrderAttachmentService(memoryRepository, createMemoryWorkOrderService());
}

export function getMemoryWorkOrderAttachmentRepositoryForTests(): InMemoryWorkOrderAttachmentRepository {
  return memoryRepository;
}

export async function createDefaultWorkOrderAttachmentService(): Promise<WorkOrderAttachmentService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderAttachmentService();
  }
  defaultServicePromise ??= createPrismaWorkOrderAttachmentService();
  return defaultServicePromise;
}

export function resetWorkOrderAttachmentRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaWorkOrderAttachmentService(): Promise<WorkOrderAttachmentService> {
  const { createPrismaWorkOrderAttachmentRepository } = await import("./work-order-attachment-prisma.repository.js");
  const repository = await createPrismaWorkOrderAttachmentRepository();
  const workOrderService = await createDefaultWorkOrderService();
  return new WorkOrderAttachmentService(repository, workOrderService);
}
