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

// Ω5P PR-13a — classificação do bem no certame (app-validada; SEM CHECK de enum no banco). Labels PT-BR no DTO.
// CONSERVED     = conservado (segue para leilão de venda — 13b). SCRAP = sucata. UNRECOVERABLE = inservível
// (§§16-18). SCRAP/UNRECOVERABLE são os únicos que autorizam a reciclagem direta (I8, sucata irreversível).
export const AUCTION_CLASSIFICATIONS = ["CONSERVED", "SCRAP", "UNRECOVERABLE"] as const;
export type AuctionClassification = (typeof AUCTION_CLASSIFICATIONS)[number];
// Subconjunto que AUTORIZA a reciclagem por inservibilidade (ACTIVE_CUSTODY→DIRECT_RECYCLING).
export const RECYCLABLE_CLASSIFICATIONS: readonly AuctionClassification[] = ["SCRAP", "UNRECOVERABLE"];

// Status da designação do edital. DESIGNATED = certame designado; LOTTED = rodada ATIVA lotada (13b — a AMARRA
// probatória da venda: recordSale só arremata a rodada cujo edital está LOTTED, no máx. 1 por processo); CLOSED =
// certame encerrado.
export const AUCTION_EDICT_STATUSES = ["DESIGNATED", "LOTTED", "CLOSED"] as const;
export type AuctionEdictStatus = (typeof AUCTION_EDICT_STATUSES)[number];

// Ω5P PR-13a — DESIGNAÇÃO de leilão POR RODADA (projeção MUTÁVEL; a PROVA vive na cadeia). appraisal/min_bid =
// avaliação SIGILOSA art. 28 (NÃO povoados/expostos em 13a — só emergem em 13b sob auction:appraise). auctioneerRef/
// notes minimizados (§2.8: sem PII; NUNCA no payload da cadeia). Dinheiro como string (Decimal(12,2)).
export type AuctionEdict = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly classification?: AuctionClassification;
  readonly appraisalAmount?: string;
  readonly minBidAmount?: string;
  readonly edictReference?: string;
  readonly edictPlatform?: string;
  readonly publishedAt?: Date;
  readonly auctioneerRef?: string;
  readonly pncpUrl?: string;
  readonly businessDays?: number;
  readonly status: AuctionEdictStatus;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Uma rodada de leilão registrada (APPEND-ONLY). round_number = ordinal 1-based (chave de idempotência do fecho de
// rodada). notes = texto de domínio (§2.8: sem PII; JAMAIS entra no payload da cadeia). Ω5P PR-13b: a linha SOLD
// carrega o RESULTADO do certame — winnerRef MINIMIZADO (§2.8: rótulo/máscara, NUNCA CPF/nome), soldAmount (valor
// arrematado, string Decimal(12,2), BASE de I7 no PR-14), saleNoteReference (ref da nota de leilão art. 34).
export type AuctionAttempt = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly outcome: AuctionOutcome;
  readonly notes?: string;
  readonly winnerRef?: string;
  readonly soldAmount?: string;
  readonly saleNoteReference?: string;
  // Ω5P PR-13b (MÉDIO-3) — só na linha NO_PAYMENT: a rodada da SOLD SUPERADA pela inadimplência (art. 42). Torna o
  // I7 base determinístico p/ o PR-14 (a SOLD efetiva = a que atinge AUCTION_CLOSED OU a que NÃO é referenciada por
  // nenhum NO_PAYMENT.defaultedSaleRound). A linha SOLD original permanece IMUTÁVEL (I2/append-only).
  readonly defaultedSaleRound?: number;
  readonly recordedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Projeção consultável (GET): as tentativas + o strikeCount DERIVADO (COUNT(DESERTED)) + o status atual do processo
// + o teto (AUCTION_MAX_ATTEMPTS) + os editais designados por rodada. O status permite à UI saber se já reciclou
// (DIRECT_RECYCLING).
export type AuctionView = {
  readonly attempts: readonly AuctionAttempt[];
  readonly edicts: readonly AuctionEdict[];
  readonly strikeCount: number;
  readonly maxAttempts: number;
  readonly status: ImpoundStatus;
};

// Estado bruto lido/aplicado pelo repositório (status do processo + tentativas + editais). O serviço deriva o
// strikeCount e sobrepõe o maxAttempts (constante federal) para montar a AuctionView.
export type AuctionStateSnapshot = {
  readonly status: ImpoundStatus;
  readonly attempts: readonly AuctionAttempt[];
  readonly edicts: readonly AuctionEdict[];
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

// recordAttemptAtomic: 1 tx — (Ω5P PR-13a) PRÉ-CHECA o auction_edicts da round_number sob o lock (409
// auction_edict_missing se ausente — um strike só conta com certame REAL designado) + INSERT auction_attempts
// (round_number, outcome='DESERTED') + AUCTION_CLOSED na cadeia (payload ganha edictRef mascarado, amarra o strike ao
// edital) + COUNT(DESERTED) sob o lock. IDEMPOTENTE por round_number (partial-unique; pré-check sob lock). NÃO
// transiciona (a reciclagem a sucata é um ATO EXPLÍCITO — reclassifyScrapAtomic).
export type RecordAttemptInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTION_ELIGIBLE
  readonly roundNumber: number;
  readonly notes?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Ω5P PR-13a — REGISTRO do edital da rodada (INSERT auction_edicts + AUCTION_LOTTED na cadeia; appendEvent é PURO —
// NÃO muda o status do processo). IDEMPOTENTE por round_number (partial-unique; pré-check sob lock — 23505 NUNCA no
// catch, que abortaria a tx). Em 13a NÃO aceita appraisal/min_bid (sigilosos art. 28 — 13b sob auction:appraise).
export type RegisterEdictInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly classification?: AuctionClassification;
  readonly edictReference?: string;
  readonly edictPlatform?: string;
  readonly publishedAt?: Date;
  readonly auctioneerRef?: string;
  readonly pncpUrl?: string;
  readonly businessDays?: number;
  readonly notes?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Resultado do registro do edital: o edital + se foi um registro NOVO (false quando a MESMA round_number já existia —
// idempotência: 2º registro é no-op, sem novo AUCTION_LOTTED na cadeia).
export type RegisterEdictResult = {
  readonly edict: AuctionEdict;
  readonly created: boolean;
};

// Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed (AUCTION_ELIGIBLE→DIRECT_RECYCLING, I8). Re-verifica sob FOR
// UPDATE: expectedFrom + COUNT(DESERTED)>=maxAttempts + cada rodada deserta com auction_edicts (prova de 2 certames
// REAIS). setFrozenAt=true (T_stop §5) + STATUS_CHANGE two_strikes_scrap — tudo na MESMA tx. IRREVERSÍVEL (sucata).
export type ReclassifyScrapInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTION_ELIGIBLE
  readonly maxAttempts: number;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE (ACTIVE_CUSTODY→DIRECT_RECYCLING, §§16-18). Re-verifica sob FOR UPDATE:
// expectedFrom + sem liberação em curso (hasActiveRelease). A classificação (SCRAP/UNRECOVERABLE) e o reason
// (fundamento) já foram validados no serviço (guarda PURA). setFrozenAt=true + STATUS_CHANGE unrecoverable_direct.
export type ReclassifyUnrecoverableInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // ACTIVE_CUSTODY
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

// ── Ω5P PR-13b — máquina de VENDA (inputs de repositório) ─────────────────────────────────────────────────────
// Cada método atômico faz FOR UPDATE do processo (expectedFrom) + RE-VERIFICA a guarda PURA sob o lock (anti-TOCTOU,
// espelha reclassifyScrapAtomic) + aplica a transição (applyTransition, set-only) + encadeia o CustodyEvent
// (event-type EXISTENTE) na MESMA tx. Os valores SIGILOSOS (appraisal/min_bid) NUNCA entram na cadeia; só o
// soldAmount (resultado público, base de I7) entra no AUCTION_SOLD como STRING.

// prepareAuctionAtomic: AUCTION_ELIGIBLE→AUCTION_PREP (setFrozenAt=false). Guarda: classification=CONSERVED E
// appraisal_amount>0 (sigilosa art. 28). roundNumber identifica o edital da rodada.
export type PrepareAuctionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTION_ELIGIBLE
  readonly roundNumber: number;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// lotAuctionAtomic: AUCTION_PREP→LOTTED (setFrozenAt=false). Guarda: edital COMPLETO da rodada (ref+published_at+
// business_days>=15) E min_bid_amount>0 (sigiloso art. 28).
export type LotAuctionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTION_PREP
  readonly roundNumber: number;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// recordSaleAtomic: LOTTED→AUCTIONED (setFrozenAt=TRUE — T_stop §5 arrematação). Guarda RE-VERIFICADA sob FOR UPDATE
// (CRÍTICO-1): a rodada vendida TEM de ser a rodada LOTADA (edict.status===LOTTED) E CONSERVED E edital COMPLETO E
// winner presente E sold_amount>=min_bid DESSA rodada E nota presente — o repo LÊ o edital da rodada sob o lock
// (autoritativo; não confia no input). GRAVA a linha SOLD + AUCTION_SOLD na cadeia (§2.8 {event,round,soldAmount
// (string),noteRef(masc),attemptId}). Idempotente por round_number.
export type RecordSaleInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // LOTTED
  readonly roundNumber: number;
  readonly winnerRef?: string;
  readonly soldAmount?: string; // string Decimal(12,2) canônica; undefined ⇒ trata como abaixo do mínimo
  readonly saleNoteReference?: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Resultado da venda: a linha SOLD + created (false = idempotência por round_number).
export type RecordSaleResult = {
  readonly attempt: AuctionAttempt;
  readonly created: boolean;
  readonly status: ImpoundStatus;
};

// closeAuctionAtomic: AUCTIONED→AUCTION_CLOSED (já frozen). Guarda: pagamento confirmado (consumação ≤3d + nota).
// AUCTION_CLOSED na cadeia (payload {event,round,outcome:"SOLD"}).
export type CloseAuctionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTIONED
  readonly roundNumber: number;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// defaultAuctionAtomic: AUCTIONED→LOTTED (inadimplência art. 42). NÃO descongela (set-only; PD-Ω5P-AUC-FROZEN — a
// diária permanece congelada; a penalidade recai sobre o arrematante). REGISTRA NO_PAYMENT (linha append-only nova
// p/ a rodada de reintegração; a linha SOLD original permanece imutável I2) + STATUS_CHANGE default_reintegrated.
export type DefaultAuctionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // AUCTIONED
  readonly roundNumber: number; // rodada da reintegração (append-only; distinta da rodada SOLD)
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Resultado da inadimplência: a linha NO_PAYMENT + created (idempotência por round_number).
export type DefaultAuctionResult = {
  readonly attempt: AuctionAttempt;
  readonly created: boolean;
  readonly status: ImpoundStatus;
};

// reclaimAtomic: LOTTED→ACTIVE_CUSTODY (reclamado art. 26 §1º, antes da consumação). setFrozenAt=false (nunca
// congelou). Guarda: reason (fundamento) obrigatório. Reabre a liberação (PR-10). STATUS_CHANGE reclaimed_before_sale
// (o reason CODIFICADO na cadeia; o fundamento livre vai ao audit, §2.8).
export type ReclaimAuctionInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly expectedFrom: ImpoundStatus; // LOTTED
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// setAppraisalAtomic (auction:appraise, art. 28): UPDATE do edital da rodada com appraisal_amount + min_bid_amount
// (SIGILOSOS — NUNCA na cadeia; sem CustodyEvent). Exige o edital registrado (404 se ausente).
export type SetAppraisalInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly appraisalAmount?: string;
  readonly minBidAmount?: string;
  readonly actorId?: string;
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
