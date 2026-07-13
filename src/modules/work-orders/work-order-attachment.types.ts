import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type WorkOrderAttachmentActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω3-d — anexo de OS. storage_key/provider/checksum são INTERNOS (nunca no DTO — §2.8). status é
// reserva para o pipeline AV-assíncrono (default 'stored' no slice síncrono); no fluxo síncrono só
// 'stored' é persistido (infected/failed nunca gravam row). deletedAt = delete lógico.
export type WorkOrderAttachmentStatus = "stored" | "rejected" | "scan_failed" | "pending_review";

export type WorkOrderAttachment = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly status: WorkOrderAttachmentStatus;
  readonly clientActionId?: string;
  readonly metadata: Record<string, unknown>;
  readonly uploadedBy?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
  readonly deletedAt?: Date;
};

export type CreateWorkOrderAttachmentInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly status?: WorkOrderAttachmentStatus;
  readonly clientActionId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly uploadedBy?: string;
  readonly createdBy?: string;
};

export class WorkOrderAttachmentError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderAttachmentError";
  }
}
