import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4C PR-01 — Anexo genérico POLIMÓRFICO. Ator SEMPRE autenticado; tenant resolvido do ator (§2.8).
export type AttachmentActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// storage_key/provider/checksum/file_url são INTERNOS (nunca no DTO — §2.8). `status` é a reserva do
// pipeline AV-assíncrono (default 'stored' no slice síncrono; infected/failed nunca gravam row).
// `deletedAt` = delete lógico.
export type AttachmentStatus = "stored" | "rejected" | "scan_failed" | "pending_review";

export type Attachment = {
  readonly id: string;
  readonly tenantId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly extension?: string;
  readonly contentType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly status: AttachmentStatus;
  readonly clientActionId?: string;
  readonly metadata: Record<string, unknown>;
  readonly uploadedBy?: string;
  readonly createdBy?: string;
  readonly uploadedAt: Date;
  readonly createdAt: Date;
  readonly deletedAt?: Date;
};

export type CreateAttachmentInput = {
  readonly tenantId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly extension?: string;
  readonly contentType?: string;
  readonly sizeBytes?: number;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
  readonly status?: AttachmentStatus;
  readonly clientActionId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly uploadedBy?: string;
  readonly createdBy?: string;
};

export class AttachmentError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "AttachmentError";
  }
}
