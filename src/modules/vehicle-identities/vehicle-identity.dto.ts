import type {
  ConfidenceLevel,
  ListVehicleIdentityResult,
  MergeIdentitiesResult,
  UnmergeIdentityResult,
  VehicleIdentity,
} from "./vehicle-identity.types.js";

// Labels PT-BR (§3 CLAUDE.md — nunca termo técnico na UI; a API devolve o rótulo pronto para exibição).
const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  PROVISIONAL: "Provisória",
  CONFIRMED: "Confirmada",
  MERGED: "Mesclada",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). canonicalIdentityId só sai quando
// já preenchido (fluxo de merge do PR-04) — este módulo nunca o escreve fora de merge/unmerge-admin.
// duplicateCandidates (§Parte C, PR-04) — opcional: só o GET de detalhe calcula (list não paga o custo extra).
export function toVehicleIdentityDto(identity: VehicleIdentity, duplicateCandidates?: readonly string[]) {
  return {
    id: identity.id,
    plate: identity.plateRaw ?? null,
    plateKey: identity.plateKey ?? null,
    chassis: identity.chassis ?? null,
    renavam: identity.renavamKey ?? null,
    brand: identity.brand ?? null,
    model: identity.model ?? null,
    color: identity.color ?? null,
    year: identity.year ?? null,
    unidentified: identity.unidentified,
    unidentifiedReason: identity.unidentifiedReason ?? null,
    confidence: identity.confidence,
    confidenceLabel: CONFIDENCE_LABELS[identity.confidence],
    canonicalIdentityId: identity.canonicalIdentityId ?? null,
    ...(duplicateCandidates !== undefined ? { duplicateCandidates } : {}),
    createdBy: identity.createdBy ?? null,
    updatedBy: identity.updatedBy ?? null,
    createdAt: identity.createdAt.toISOString(),
    updatedAt: identity.updatedAt.toISOString(),
  };
}

// Ω-VID PR-04 (§Parte A) — resposta do merge manual.
export function toMergeResultDto(result: MergeIdentitiesResult) {
  return {
    resolvedTargetId: result.resolvedTargetId,
    target: toVehicleIdentityDto(result.target),
    merged: toVehicleIdentityDto(result.merged),
    movedProcessCount: result.movedProcessCount,
  };
}

// Ω-VID PR-04 (§Parte B) — resposta do estorno administrativo. Inclui a limitação de forma explícita (nunca só
// no código-fonte — a API precisa deixar claro para quem chama que ImpoundProcess.identity_id NÃO volta).
export function toUnmergeResultDto(result: UnmergeIdentityResult) {
  return {
    identity: toVehicleIdentityDto(result.identity),
    previousCanonicalIdentityId: result.previousCanonicalIdentityId,
    // Item 4 da junta de revisão — quantos ImpoundProcess ficaram no alvo e NÃO voltaram (a identidade retornou
    // vazia). O admin é avisado explicitamente de que há N processos a religar manualmente (ver `limitation`).
    strandedProcessCount: result.strandedProcessCount,
    limitation:
      "Este estorno reverte confidence/canonicalIdentityId da identidade, mas NÃO reverte automaticamente os " +
      "ImpoundProcess.identity_id que foram movidos pelo merge original — não é possível reconstruir com " +
      "segurança quais processos eram originais sem o snapshot completo de todos os processos afetados. " +
      "strandedProcessCount indica quantos processos continuam apontando para o alvo e exigem religação manual.",
  };
}

export function toVehicleIdentityListDto(result: ListVehicleIdentityResult) {
  return {
    items: result.items.map((identity) => ({
      id: identity.id,
      plate: identity.plateRaw ?? null,
      chassis: identity.chassis ?? null,
      renavam: identity.renavamKey ?? null,
      brand: identity.brand ?? null,
      model: identity.model ?? null,
      unidentified: identity.unidentified,
      confidence: identity.confidence,
      confidenceLabel: CONFIDENCE_LABELS[identity.confidence],
      createdAt: identity.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
