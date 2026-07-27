import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { ImpoundStatus } from "../impound/impound.types.js";
import type { ProfileScope } from "../jurisdiction/jurisdiction.types.js";

export type AuctionActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-12 — enums em INGLÊS validados na APP (SEM CHECK de enum no banco). Labels PT-BR ficam no DTO.
// DESERTED   = rodada de leilão SEM arremate (deserta) — o único outcome que PR-12 GRAVA (regra dos 2-strikes I8).
// SOLD       = arrematado (rodada com venda) — DECLARADO p/ o PR-13 USÁ-LO; PR-12 NÃO produz.
// NO_PAYMENT = arrematante inadimplente (reintegra o lote, art. 42) — DECLARADO p/ o PR-13; PR-12 NÃO produz.
export const AUCTION_OUTCOMES = ["DESERTED", "SOLD", "NO_PAYMENT"] as const;
export type AuctionOutcome = (typeof AUCTION_OUTCOMES)[number];

// Uma rodada de leilão registrada (APPEND-ONLY). round_number = ordinal 1-based (chave de idempotência do fecho de
// rodada). notes = texto de domínio (§2.8: sem PII; JAMAIS entra no payload da cadeia).
export type AuctionAttempt = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly outcome: AuctionOutcome;
  readonly notes?: string;
  readonly recordedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Projeção consultável (GET): as tentativas + o strikeCount DERIVADO (COUNT(DESERTED)) + o status atual do processo
// + o teto (AUCTION_MAX_ATTEMPTS). O status permite à UI saber se já reciclou (DIRECT_RECYCLING).
export type AuctionView = {
  readonly attempts: readonly AuctionAttempt[];
  readonly strikeCount: number;
  readonly maxAttempts: number;
  readonly status: ImpoundStatus;
};

// Estado bruto lido/aplicado pelo repositório (status do processo + tentativas). O serviço deriva o strikeCount e
// sobrepõe o maxAttempts (constante federal) para montar a AuctionView.
export type AuctionStateSnapshot = {
  readonly status: ImpoundStatus;
  readonly attempts: readonly AuctionAttempt[];
};

// Subconjunto do JurisdictionProfile que o gate de elegibilidade lê (scope + os prazos t0-relativos). Injetado por DI
// (Prisma lê jurisdiction_profiles; InMemory injeta por teste). auctionEligibleDay é o prazo do perfil — o PISO
// (>= 60d) é aplicado no auction.eligibility, NUNCA aqui.
export type AuctionProfile = {
  readonly scope: ProfileScope;
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
  readonly auctionEligibleDay: number;
};

// ── Inputs de repositório ─────────────────────────────────────────────────────────────────────────────────────
// markEligibleAtomic: lock do processo (expectedFrom ACTIVE_CUSTODY) + re-verifica sob lock + transição→AUCTION_ELIGIBLE
// (setFrozenAt=false) + STATUS_CHANGE na cadeia — tudo numa operação. O gate (6 pré-condições) já foi resolvido pelo
// serviço via resolveTransition ANTES; aqui re-verifica o expectedFrom + a ausência de liberação em curso (anti-TOCTOU).
export type MarkEligibleInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // ACTIVE_CUSTODY (guarda de corrida sob lock)
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// recordAttemptAtomic: 1 tx — INSERT auction_attempts(round_number, outcome='DESERTED') + AUCTION_CLOSED na cadeia +
// COUNT(DESERTED) sob o lock. IDEMPOTENTE por round_number (partial-unique; pré-check sob lock). PR-12 SÓ registra o
// strike (NÃO transiciona): a reciclagem a sucata AUCTION_ELIGIBLE→DIRECT_RECYCLING é PR-13 (gated no edital por
// rodada) — D-Ω5P-AUC / R-omega5p-pr12-ciclo1.
export type RecordAttemptInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTION_ELIGIBLE
  readonly roundNumber: number;
  readonly notes?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Resultado do fecho de rodada: a tentativa + o strikeCount pós-registro + se foi um registro NOVO (false quando a
// MESMA round_number já existia — idempotência). reclassified é sempre false em PR-12 (a sucata é PR-13); status
// permanece AUCTION_ELIGIBLE. Ambos ficam no shape p/ o PR-13 setá-los.
export type RecordAttemptResult = {
  readonly attempt: AuctionAttempt;
  readonly strikeCount: number;
  readonly reclassified: boolean;
  readonly created: boolean;
  readonly status: ImpoundStatus;
};

export class AuctionError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "AuctionError";
  }
}
