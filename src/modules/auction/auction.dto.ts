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
  RecordSaleResult,
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
  LOTTED: "Lotado",
  CLOSED: "Encerrado",
};

// §allowlist: tenant_id NUNCA exposto. appraisal_amount/min_bid_amount são SIGILOSOS (art. 28) — só emergem quando
// `canAppraise` (o ator tem auction:appraise); o DTO os OMITE aos demais (não vaza a avaliação sigilosa). auctioneer_ref
// MASCARADO (§2.8: pode ser leiloeiro pessoa). edict_reference é a referência PÚBLICA do edital (visível ao operador
// autorizado). Superfície do CONSOLE AUTENTICADO (impound:read/transition).
export function toAuctionEdictDto(edict: AuctionEdict, canAppraise = false) {
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
    // SIGILO art. 28: os valores da avaliação só entram no payload de quem tem auction:appraise.
    ...(canAppraise
      ? { appraisalAmount: edict.appraisalAmount ?? null, minBidAmount: edict.minBidAmount ?? null }
      : {}),
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
    // Ω5P PR-13b — RESULTADO do certame ARREMATADO (só a linha SOLD carrega). winnerRef MASCARADO (BAIXO-4, §2.8 —
    // como auctioneerRef: nunca o rótulo bruto, que pode ser pessoa); soldAmount é o valor PÚBLICO arrematado (base de
    // I7); saleNoteReference é a ref da nota (art. 34). defaultedSaleRound (só na NO_PAYMENT) amarra a SOLD superada (I7).
    winnerRef: maskEdictReference(attempt.winnerRef),
    soldAmount: attempt.soldAmount ?? null,
    saleNoteReference: attempt.saleNoteReference ?? null,
    defaultedSaleRound: attempt.defaultedSaleRound ?? null,
    recordedBy: attempt.recordedBy ?? null,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  };
}

export function toAuctionViewDto(view: AuctionView, canAppraise = false) {
  return {
    data: {
      strikeCount: view.strikeCount,
      maxAttempts: view.maxAttempts,
      status: view.status,
      // Elegível quando ainda não esgotou o teto de rodadas (visão HINT p/ a UI; o backend é a autoridade).
      strikesRemaining: Math.max(view.maxAttempts - view.strikeCount, 0),
    },
    attempts: view.attempts.map(toAuctionAttemptDto),
    edicts: view.edicts.map((edict) => toAuctionEdictDto(edict, canAppraise)),
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

// Ω5P PR-13b — registro do resultado (arremate SOLD / inadimplência NO_PAYMENT): a linha + created (idempotência).
export function toRecordSaleDto(result: RecordSaleResult) {
  return {
    data: {
      attempt: toAuctionAttemptDto(result.attempt),
      created: result.created,
      status: result.status,
    },
  };
}

// Ω5P PR-13b — registro da AVALIAÇÃO sigilosa (auction:appraise): o edital com os valores expostos (canAppraise=true).
export function toSetAppraisalDto(edict: AuctionEdict) {
  return { data: { edict: toAuctionEdictDto(edict, true) } };
}
