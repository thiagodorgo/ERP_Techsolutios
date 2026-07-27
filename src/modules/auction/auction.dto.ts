import {
  maskEdictReference,
} from "./auction.validators.js";
import type {
  AuctionAttempt,
  AuctionClassification,
  AuctionEdict,
  AuctionEdictStatus,
  AuctionOutcome,
  AuctionView,
  RecordAttemptResult,
  RegisterEdictResult,
} from "./auction.types.js";

// Labels PT-BR (neutralidade white-label: "leilão/arrematação/reciclagem/sucata/autoridade", NUNCA "polícia").
const OUTCOME_LABELS: Record<AuctionOutcome, string> = {
  DESERTED: "Leilão deserto",
  SOLD: "Arrematado",
  NO_PAYMENT: "Arrematante inadimplente",
};

const CLASSIFICATION_LABELS: Record<AuctionClassification, string> = {
  CONSERVED: "Conservado",
  SCRAP: "Sucata",
  UNRECOVERABLE: "Inservível",
};

const EDICT_STATUS_LABELS: Record<AuctionEdictStatus, string> = {
  DESIGNATED: "Designado",
  CLOSED: "Encerrado",
};

// §allowlist: tenant_id NUNCA exposto. appraisal_amount/min_bid_amount são SIGILOSOS (art. 28) — OMITIDOS no 13a
// (não povoados; sua exposição é 13b sob auction:appraise). auctioneer_ref MASCARADO (§2.8: pode ser leiloeiro
// pessoa). edict_reference é a referência PÚBLICA do edital (visível ao operador autorizado). Superfície do CONSOLE
// AUTENTICADO (impound:read/transition).
export function toAuctionEdictDto(edict: AuctionEdict) {
  return {
    id: edict.id,
    processId: edict.processId,
    roundNumber: edict.roundNumber,
    classification: edict.classification ?? null,
    classificationLabel: edict.classification ? CLASSIFICATION_LABELS[edict.classification] : null,
    edictReference: edict.edictReference ?? null,
    edictPlatform: edict.edictPlatform ?? null,
    publishedAt: edict.publishedAt ? edict.publishedAt.toISOString() : null,
    auctioneerRef: maskEdictReference(edict.auctioneerRef),
    pncpUrl: edict.pncpUrl ?? null,
    businessDays: edict.businessDays ?? null,
    status: edict.status,
    statusLabel: EDICT_STATUS_LABELS[edict.status],
    notes: edict.notes ?? null,
    createdAt: edict.createdAt.toISOString(),
    updatedAt: edict.updatedAt.toISOString(),
  };
}

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado). Superfície do CONSOLE AUTENTICADO
// (impound:read/transition). notes é dado de domínio visível ao operador autorizado (RLS + permissão), mas JAMAIS
// entra no payload da cadeia nem no audit.
export function toAuctionAttemptDto(attempt: AuctionAttempt) {
  return {
    id: attempt.id,
    processId: attempt.processId,
    roundNumber: attempt.roundNumber,
    outcome: attempt.outcome,
    outcomeLabel: OUTCOME_LABELS[attempt.outcome],
    notes: attempt.notes ?? null,
    recordedBy: attempt.recordedBy ?? null,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  };
}

export function toAuctionViewDto(view: AuctionView) {
  return {
    data: {
      strikeCount: view.strikeCount,
      maxAttempts: view.maxAttempts,
      status: view.status,
      // Elegível quando ainda não esgotou o teto de rodadas (visão HINT p/ a UI; o backend é a autoridade).
      strikesRemaining: Math.max(view.maxAttempts - view.strikeCount, 0),
    },
    attempts: view.attempts.map(toAuctionAttemptDto),
    edicts: view.edicts.map(toAuctionEdictDto),
  };
}

// Ω5P PR-13a — resultado do registro do edital: o edital + created (false = idempotência).
export function toRegisterEdictDto(result: RegisterEdictResult) {
  return {
    data: {
      edict: toAuctionEdictDto(result.edict),
      created: result.created,
    },
  };
}

export function toRecordAttemptDto(result: RecordAttemptResult) {
  return {
    data: {
      attempt: toAuctionAttemptDto(result.attempt),
      strikeCount: result.strikeCount,
      // reclassified é sempre false em PR-12 (a reciclagem a sucata é PR-13); status permanece AUCTION_ELIGIBLE.
      reclassified: result.reclassified,
      created: result.created,
      status: result.status,
    },
  };
}
