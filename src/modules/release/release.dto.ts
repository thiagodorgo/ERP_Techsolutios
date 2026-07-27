import type {
  ImpoundRelease,
  RecipientRelationship,
  ReleaseKind,
  ReleaseRequirementCheck,
  ReleaseStatus,
  ReleaseView,
} from "./release.types.js";

// Labels PT-BR (neutralidade white-label: "autoridade/órgão/proprietário/quem retira", NUNCA "polícia").
const KIND_LABELS: Record<ReleaseKind, string> = {
  STANDARD: "Restituição definitiva",
  FOR_REPAIR: "Saída para reparo",
};

const STATUS_LABELS: Record<ReleaseStatus, string> = {
  IN_PROGRESS: "Em andamento",
  AUTHORIZED: "Autorizada",
  COMPLETED: "Concluída",
  RETURNED: "Retornada",
};

const RELATIONSHIP_LABELS: Record<RecipientRelationship, string> = {
  OWNER: "Proprietário",
  ATTORNEY: "Procurador",
  THIRD_PARTY: "Terceiro autorizado",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). Superfície do CONSOLE AUTENTICADO
// (release:process / impound:read) — recipient_* são dados de domínio visíveis ao operador autorizado (RLS +
// permissão), mas JAMAIS entram no payload da cadeia nem no audit. O portal público (Fase 5) usará DTO minimizado.
export function toImpoundReleaseDto(release: ImpoundRelease) {
  return {
    id: release.id,
    processId: release.processId,
    kind: release.kind,
    kindLabel: KIND_LABELS[release.kind],
    status: release.status,
    statusLabel: STATUS_LABELS[release.status],
    authorityApprovedBy: release.authorityApprovedBy ?? null,
    authorityApprovedAt: release.authorityApprovedAt ? release.authorityApprovedAt.toISOString() : null,
    authorityReference: release.authorityReference ?? null,
    authorityNote: release.authorityNote ?? null,
    recipientName: release.recipientName ?? null,
    recipientDocument: release.recipientDocument ?? null,
    recipientRelationship: release.recipientRelationship ?? null,
    recipientRelationshipLabel: release.recipientRelationship ? RELATIONSHIP_LABELS[release.recipientRelationship] : null,
    releasedAt: release.releasedAt ? release.releasedAt.toISOString() : null,
    repairDeadline: release.repairDeadline ? release.repairDeadline.toISOString() : null,
    // Ω5P PR-10b — observabilidade do estouro do prazo (art. 23 §1º): now > repair_deadline. NÃO muda o estado
    // (o veículo permanece RELEASED_FOR_REPAIR); a coerção (reapreensão/leilão) é Fase 4. Calculado no ato.
    repairOverdue: release.repairDeadline ? Date.now() > release.repairDeadline.getTime() : false,
    settledTotal: release.settledTotal ?? null,
    createdBy: release.createdBy ?? null,
    updatedBy: release.updatedBy ?? null,
    createdAt: release.createdAt.toISOString(),
    updatedAt: release.updatedAt.toISOString(),
  };
}

export function toReleaseRequirementCheckDto(check: ReleaseRequirementCheck) {
  return {
    id: check.id,
    releaseId: check.releaseId,
    code: check.code,
    label: check.label,
    required: check.required,
    satisfied: check.satisfied,
    note: check.note ?? null,
    attachmentId: check.attachmentId ?? null,
    checkedBy: check.checkedBy ?? null,
    checkedAt: check.checkedAt ? check.checkedAt.toISOString() : null,
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
  };
}

export function toReleaseViewDto(view: ReleaseView) {
  return {
    data: toImpoundReleaseDto(view.release),
    checks: view.checks.map(toReleaseRequirementCheckDto),
  };
}
