import type { WorkOrderAttachment } from "./work-order-attachment.types.js";

/**
 * §2.8 (allowlist POSITIVA) — o DTO de anexo expõe SÓ campos seguros: id, workOrderId, fileName,
 * mimeType, sizeBytes, status, downloadPath, uploadedBy, createdAt. NUNCA vaza fileUrl, storageKey,
 * storageProvider, checksumSha256, bucket/path, base64 ou tenant_id — a localização do objeto privado
 * fica server-side.
 */
export function toWorkOrderAttachmentDto(attachment: WorkOrderAttachment) {
  return {
    id: attachment.id,
    workOrderId: attachment.workOrderId,
    fileName: attachment.fileName ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    status: attachment.status,
    downloadPath: `/api/v1/work-orders/${encodeURIComponent(attachment.workOrderId)}/attachments/${encodeURIComponent(attachment.id)}/download`,
    uploadedBy: attachment.uploadedBy ?? null,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function toWorkOrderAttachmentListDto(attachments: readonly WorkOrderAttachment[]) {
  return { items: attachments.map(toWorkOrderAttachmentDto) };
}
