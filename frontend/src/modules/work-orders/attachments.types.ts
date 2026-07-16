import type { WorkOrdersApiContext } from "./work-orders.types";

// Ω3F-5b — anexos da OS (aba Arquivos do hub). Espelha o DTO do backend (Ω3-d): a UI SÓ enxerga
// downloadPath/fileName/status (§2.8 — NUNCA storageKey/checksum/bucket/base64, que o DTO nem expõe).
// `status` governa o download: só `stored` é baixável; os demais são estados de verificação.

export type WorkOrderAttachmentStatus = "stored" | "rejected" | "scan_failed" | "pending_review";

export type WorkOrderAttachment = {
  readonly id: string;
  readonly workOrderId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly status: WorkOrderAttachmentStatus;
  // Caminho opaco de download servido pelo backend (sem storage key). Só usável quando status=stored.
  readonly downloadPath: string | null;
  readonly uploadedBy: string | null;
  readonly createdAt: string;
};

export type WorkOrderAttachmentList = {
  readonly items: readonly WorkOrderAttachment[];
};

// Upload manual: arquivo obrigatório + descrição opcional (rótulo "Tipo/descrição").
export type WorkOrderAttachmentUploadInput = {
  readonly file: File;
  readonly description?: string;
};

export type WorkOrderAttachmentApiContext = WorkOrdersApiContext;
