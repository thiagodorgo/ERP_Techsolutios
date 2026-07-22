import type { Damage, DamageAttachment, DamageDisposition, DamageStatementDebit, ListDamagesResult } from "./damage.types.js";

// Ω4C PR-09 — "disposição" DERIVADA do próprio dano (espelha a Multa): `statement` quando há profissional
// responsável atribuído; `none` caso contrário. §2.8: expõe o id do PRÓPRIO tenant (não sensível); o
// nome/rótulo do responsável é resolvido no front (lista de Profissionais), JAMAIS a CNH.
function deriveDisposition(damage: Damage): DamageDisposition {
  return damage.responsibleOperatorProfileId !== undefined ? "statement" : "none";
}

/** The external `tenant_id` is never exposed. */
export function toDamageDto(damage: Damage) {
  return {
    id: damage.id,
    vehicleId: damage.vehicleId,
    workOrderId: damage.workOrderId ?? null,
    responsibleOperatorProfileId: damage.responsibleOperatorProfileId ?? null,
    disposition: deriveDisposition(damage),
    data: damage.data.toISOString(),
    gravidade: damage.gravidade,
    descricao: damage.descricao,
    status: damage.status,
    tipo: damage.tipo ?? null,
    origem: damage.origem ?? null,
    objeto: damage.objeto ?? null,
    identificacaoObjeto: damage.identificacaoObjeto ?? null,
    analiseInterna: damage.analiseInterna ?? null,
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
      responsibleOperatorProfileId: damage.responsibleOperatorProfileId ?? null,
      disposition: deriveDisposition(damage),
      data: damage.data.toISOString(),
      gravidade: damage.gravidade,
      descricao: damage.descricao,
      status: damage.status,
      tipo: damage.tipo ?? null,
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

// Ω4C PR-09 (D-Ω4C-DANO-MONEY) — bloco DERIVADO do débito ativo no extrato (§2.8: agregado, sem parcela
// individual/CNH). `null` = sem débito (identificação-só/empresa absorve). Alimenta o badge "lançado no
// extrato" e a trava do front (financeiros bloqueados quando há débito ativo).
export function toDamageStatementDebitDto(statementDebit: DamageStatementDebit | undefined) {
  if (!statementDebit) return null;
  return {
    totalAmount: statementDebit.totalAmount,
    installmentTotal: statementDebit.installmentTotal,
    firstDueDate: statementDebit.firstDueDate.toISOString(),
    hasSettled: statementDebit.hasSettled,
  };
}

export function toDamageDetailDto(input: {
  readonly damage: Damage;
  readonly attachments: readonly DamageAttachment[];
  readonly statementDebit?: DamageStatementDebit;
}) {
  return {
    ...toDamageDto(input.damage),
    statementDebit: toDamageStatementDebitDto(input.statementDebit),
    attachments: input.attachments.map(toDamageAttachmentDto),
  };
}

export function toDamageAttachmentListDto(attachments: readonly DamageAttachment[]) {
  return {
    items: attachments.map(toDamageAttachmentDto),
  };
}
