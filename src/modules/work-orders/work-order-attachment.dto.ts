import type { WorkOrderAttachment } from "./work-order-attachment.types.js";

/**
 * §2.8 (allowlist POSITIVA) — o DTO de anexo expõe SÓ campos seguros: id, workOrderId, fileName,
 * mimeType, sizeBytes, status, downloadPath, uploadedBy, createdAt. NUNCA vaza fileUrl, storageKey,
 * storageProvider, checksumSha256, bucket/path, base64 ou tenant_id — a localização do objeto privado
 * fica server-side.
 */
// Ω3F-5b (veto §11.2) — emite também `uploadedByName` (nome legível resolvido no backend): a coluna
// "Enviado por" mostra o NOME, nunca o UUID. `uploadedBy` permanece (não é renderizado pelo front).
export function toWorkOrderAttachmentDto(attachment: WorkOrderAttachment, nameById?: ReadonlyMap<string, string>) {
  return {
    id: attachment.id,
    workOrderId: attachment.workOrderId,
    fileName: attachment.fileName ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    status: attachment.status,
    downloadPath: `/api/v1/work-orders/${encodeURIComponent(attachment.workOrderId)}/attachments/${encodeURIComponent(attachment.id)}/download`,
    uploadedBy: attachment.uploadedBy ?? null,
    uploadedByName: attachment.uploadedBy ? nameById?.get(attachment.uploadedBy) ?? null : null,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function toWorkOrderAttachmentListDto(
  attachments: readonly WorkOrderAttachment[],
  nameById?: ReadonlyMap<string, string>,
) {
  return { items: attachments.map((attachment) => toWorkOrderAttachmentDto(attachment, nameById)) };
}
