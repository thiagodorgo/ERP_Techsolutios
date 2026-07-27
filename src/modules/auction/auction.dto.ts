import type { AuctionAttempt, AuctionOutcome, AuctionView, RecordAttemptResult } from "./auction.types.js";

// Labels PT-BR (neutralidade white-label: "leilão/arrematação/reciclagem/sucata/autoridade", NUNCA "polícia").
const OUTCOME_LABELS: Record<AuctionOutcome, string> = {
  DESERTED: "Leilão deserto",
  SOLD: "Arrematado",
  NO_PAYMENT: "Arrematante inadimplente",
};

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
