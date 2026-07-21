import type { Attachment } from "./attachment.types.js";

/**
 * §2.8 (allowlist POSITIVA) — o DTO de anexo expõe SÓ campos seguros: id, entityType, entityId,
 * fileName, extension, contentType, sizeBytes, status, downloadPath, uploadedBy, uploadedByName,
 * uploadedAt. NUNCA vaza fileUrl, storageKey, storageProvider, checksumSha256, bucket/path, base64
 * ou tenant_id — a localização do objeto privado fica server-side.
 *
 * `uploadedByName` (§11.2) = nome legível resolvido no backend: a coluna "Enviado por" mostra o NOME,
 * nunca o UUID. `uploadedBy` permanece (não é renderizado pelo front).
 */
export function toAttachmentDto(attachment: Attachment, nameById?: ReadonlyMap<string, string>) {
  return {
    id: attachment.id,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    fileName: attachment.fileName ?? null,
    extension: attachment.extension ?? null,
    contentType: attachment.contentType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    status: attachment.status,
    downloadPath: `/api/v1/attachments/${encodeURIComponent(attachment.id)}/download`,
    uploadedBy: attachment.uploadedBy ?? null,
    uploadedByName: attachment.uploadedBy ? nameById?.get(attachment.uploadedBy) ?? null : null,
    uploadedAt: attachment.uploadedAt.toISOString(),
  };
}

export function toAttachmentListDto(
  attachments: readonly Attachment[],
  nameById?: ReadonlyMap<string, string>,
) {
  return { items: attachments.map((attachment) => toAttachmentDto(attachment, nameById)) };
}
