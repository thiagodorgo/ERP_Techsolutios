import type { Damage, DamageAttachment, ListDamagesResult } from "./damage.types.js";

/** The external `tenant_id` is never exposed. */
export function toDamageDto(damage: Damage) {
  return {
    id: damage.id,
    vehicleId: damage.vehicleId,
    workOrderId: damage.workOrderId ?? null,
    data: damage.data.toISOString(),
    gravidade: damage.gravidade,
    descricao: damage.descricao,
    status: damage.status,
    custoEstimado: damage.custoEstimado ?? null,
    custoReal: damage.custoReal ?? null,
    isActive: damage.isActive,
    createdBy: damage.createdBy ?? null,
    updatedBy: damage.updatedBy ?? null,
    createdAt: damage.createdAt.toISOString(),
    updatedAt: damage.updatedAt.toISOString(),
  };
}

export function toDamageListDto(result: ListDamagesResult) {
  return {
    items: result.items.map((damage) => ({
      id: damage.id,
      vehicleId: damage.vehicleId,
      workOrderId: damage.workOrderId ?? null,
      data: damage.data.toISOString(),
      gravidade: damage.gravidade,
      descricao: damage.descricao,
      status: damage.status,
      custoEstimado: damage.custoEstimado ?? null,
      custoReal: damage.custoReal ?? null,
      isActive: damage.isActive,
      createdAt: damage.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

/**
 * SECURITY (allowlist 2.8) — the attachment DTO exposes ONLY safe fields:
 * `id`, `fileName`, `mimeType`, `sizeBytes`, `createdAt`, an optional `marker`,
 * and an authenticated `downloadPath`. It NEVER leaks `fileUrl`, `storageKey`,
 * `storageProvider`, `checksumSha256`, bucket/path or base64 — the private object
 * location stays server-side.
 */
export function toDamageAttachmentDto(attachment: DamageAttachment) {
  return {
    id: attachment.id,
    fileName: attachment.fileName ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    marker: attachment.marker ?? null,
    downloadPath: `/api/v1/damages/${encodeURIComponent(attachment.damageId)}/attachments/${encodeURIComponent(attachment.id)}/download`,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function toDamageDetailDto(input: {
  readonly damage: Damage;
  readonly attachments: readonly DamageAttachment[];
}) {
  return {
    ...toDamageDto(input.damage),
    attachments: input.attachments.map(toDamageAttachmentDto),
  };
}

export function toDamageAttachmentListDto(attachments: readonly DamageAttachment[]) {
  return {
    items: attachments.map(toDamageAttachmentDto),
  };
}
