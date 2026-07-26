import { PHOTO_SET_CODES, type IntakeInspection, type PhotoSetCode } from "./impound.intake.types.js";

// ── I3 — CUSTODIA_ATIVA só com vistoria de recepção completa (art. 9º I) ─────────────────────────────────────
// Predicados PUROS in-module: a guarda I3 lê um estado DETERMINÍSTICO (D-Ω5P-REC-01), sem acoplar o motor
// genérico de checklist. Parametrizado por perfil (não hardcode): os conjuntos obrigatórios vêm do perfil.

// Default federal = a lista COMPLETA de conjuntos (o safe-máximo probatório). A spec federal de imagens ainda
// não saiu (ESTUDO §11a) → o perfil sobrescreve via JurisdictionProfile.required_photo_sets (D-Ω5P-REC-09).
export const DEFAULT_REQUIRED_PHOTO_SETS: readonly PhotoSetCode[] = [...PHOTO_SET_CODES];

// Resolve os conjuntos OBRIGATÓRIOS de um processo: o array configurado no perfil (validado contra os SET codes
// conhecidos) ou, se ausente/vazio/nulo, o default federal completo. Nunca hardcode no ponto de guarda.
export function resolveRequiredPhotoSets(configured: readonly string[] | null | undefined): readonly PhotoSetCode[] {
  if (!configured || configured.length === 0) {
    return DEFAULT_REQUIRED_PHOTO_SETS;
  }
  const known = new Set<string>(PHOTO_SET_CODES);
  const resolved = configured
    .map((code) => String(code).trim().toUpperCase())
    .filter((code): code is PhotoSetCode => known.has(code));
  // Perfil sem NENHUM código válido cai no default (nunca deixa a vistoria "sem requisitos" por config quebrada).
  return resolved.length > 0 ? [...new Set(resolved)] : DEFAULT_REQUIRED_PHOTO_SETS;
}

// Dados mínimos da vistoria (art. 9º I + art. 14 §1º). "nenhum" em internal_objects/missing_equipment é um
// REGISTRO explícito (string não-vazia), não a ausência do campo. signature_status sempre presente (default
// ABSENT). completed_at marcado = o operador declarou a vistoria concluída.
export function hasMinimumIntakeData(inspection: IntakeInspection | undefined): boolean {
  if (!inspection) return false;
  const filled = (value: string | undefined): boolean => typeof value === "string" && value.trim().length > 0;
  return (
    inspection.inspectedAt instanceof Date &&
    filled(inspection.bodyworkState) &&
    filled(inspection.paintState) &&
    filled(inspection.tiresState) &&
    filled(inspection.internalObjects) &&
    filled(inspection.missingEquipment) &&
    typeof inspection.signatureStatus === "string" &&
    inspection.signatureStatus.length > 0
  );
}

// Todos os conjuntos obrigatórios presentes com ≥1 foto armazenada (status=stored, não-deletada) — o repositório
// já filtra por status/deleted_at ao montar `storedSets`.
export function hasAllRequiredPhotoSets(
  storedSets: readonly string[],
  requiredSets: readonly string[],
): boolean {
  const stored = new Set(storedSets.map((code) => code.toUpperCase()));
  return requiredSets.every((code) => stored.has(code.toUpperCase()));
}

// Predicado I3 completo: (i) dados mínimos + completed_at marcado E (ii) todos os conjuntos obrigatórios do
// perfil com ≥1 foto. Usado tanto pela guarda RECEPTION→ACTIVE_CUSTODY quanto (defense-in-depth) na marcação.
export function isIntakeComplete(
  inspection: IntakeInspection | undefined,
  storedSets: readonly string[],
  requiredSets: readonly string[],
): boolean {
  if (!inspection) return false;
  if (!(inspection.completedAt instanceof Date)) return false;
  return hasMinimumIntakeData(inspection) && hasAllRequiredPhotoSets(storedSets, requiredSets);
}

// Motivo estruturado da incompletude (para 400 ao MARCAR completa — ajuda o operador). Não exposto pela guarda
// (que só devolve 409 reception_inspection_incomplete), mas útil no completeInspection.
export function intakeCompletenessGaps(
  inspection: IntakeInspection | undefined,
  storedSets: readonly string[],
  requiredSets: readonly string[],
): readonly string[] {
  const gaps: string[] = [];
  if (!inspection) {
    gaps.push("inspection_missing");
    return gaps;
  }
  if (!hasMinimumIntakeData(inspection)) gaps.push("minimum_data_missing");
  const stored = new Set(storedSets.map((code) => code.toUpperCase()));
  for (const code of requiredSets) {
    if (!stored.has(code.toUpperCase())) gaps.push(`photo_set_missing:${code}`);
  }
  return gaps;
}
