// Ω5P PR-15a — Leilão administrativo (console do operador). Consome o módulo backend `auction` (PR-12/13a/13b)
// via /impound-processes/:id/auction/* e as transições da FSM de leilão. A UI NÃO reimplementa regra: a FSM de
// leilão, o gate I8 (2 strikes edict-backed), o sigilo art. 28 (avaliação SIGILOSA) e a hash-chain vivem no
// backend — a UI molda por can(...), exibe os gates como ESPELHO (hint) e delega ao 403/409. Neutralidade
// white-label: "leilão / edital / lote / arrematante / reciclagem / sucata / proprietário / autoridade
// solicitante", NUNCA "polícia" nem termo técnico ("tenant").
//
// §2.8/allowlist: tenant_id NUNCA é renderizado (resolvido pelo ator autenticado). appraisalAmount/minBidAmount
// são SIGILOSOS (art. 28) — só emergem no DTO de quem tem auction:appraise (o backend os OMITE aos demais); a UI
// NUNCA fabrica/infere um valor. winnerRef/auctioneerRef já vêm MASCARADOS do backend (renderiza a máscara, jamais
// CPF/nome cru); recordedBy é UUID de ator interno → SUPRIMIDO na UI (nunca renderizado).

import type { ImpoundStatus } from "../processes/processes.types";

// Enums em inglês (código/claims); rótulo PT-BR vem do backend em *Label (a UI reusa, não recria).
export type AuctionOutcome = "DESERTED" | "SOLD" | "NO_PAYMENT";
export type AuctionClassification = "CONSERVED" | "SCRAP" | "UNRECOVERABLE";
export type AuctionEdictStatus = "DESIGNATED" | "LOTTED" | "CLOSED";

// EdictDto — espelha src/modules/auction/auction.dto.ts toAuctionEdictDto (NÃO inventar campo). appraisalAmount/
// minBidAmount SÓ existem no payload quando o ator tem auction:appraise (SIGILO art. 28); a flag canSeeAppraisal
// registra se o DTO os carregou. auctioneerRef já vem MASCARADO (…sufixo) do backend.
export type AuctionEdictDto = {
  readonly id: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly classification: AuctionClassification | null;
  readonly classificationLabel: string | null;
  readonly edictReference: string | null;
  readonly edictPlatform: string | null;
  readonly publishedAt: string | null;
  readonly auctioneerRef: string | null; // já mascarado pelo backend (§2.8)
  readonly pncpUrl: string | null;
  readonly businessDays: number | null;
  // SIGILO art. 28 — só presentes quando o DTO os trouxe (ator com auction:appraise). null = registrado ainda não.
  readonly canSeeAppraisal: boolean; // o DTO carregou as chaves de avaliação (ator tem a permissão)
  readonly appraisalAmount: string | null;
  readonly minBidAmount: string | null;
  readonly status: AuctionEdictStatus;
  readonly statusLabel: string;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// AttemptDto — espelha toAuctionAttemptDto. winnerRef MASCARADO; soldAmount é o valor PÚBLICO arrematado (base de
// I7); recordedBy é UUID interno → a UI NUNCA o renderiza (suprimido).
export type AuctionAttemptDto = {
  readonly id: string;
  readonly processId: string;
  readonly roundNumber: number;
  readonly outcome: AuctionOutcome;
  readonly outcomeLabel: string;
  readonly notes: string | null;
  readonly winnerRef: string | null; // já mascarado pelo backend (§2.8)
  readonly soldAmount: string | null;
  readonly saleNoteReference: string | null;
  readonly defaultedSaleRound: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// GET /impound-processes/:id/auction → { data:{strikeCount,maxAttempts,status,strikesRemaining}, attempts[], edicts[] }.
export type AuctionView = {
  readonly strikeCount: number;
  readonly maxAttempts: number;
  readonly strikesRemaining: number;
  readonly status: ImpoundStatus;
  readonly attempts: readonly AuctionAttemptDto[];
  readonly edicts: readonly AuctionEdictDto[];
};

// ── Inputs das ações (corpo REST em snake_case — contrato do auction.service.ts) ──────────────────────────────
// Registro do edital da rodada (impound:transition). edictReference OBRIGATÓRIA (piso de designação REAL).
export type EdictInput = {
  readonly roundNumber: number;
  readonly edictReference: string;
  readonly edictPlatform?: string;
  readonly publishedAt?: string;
  readonly auctioneerRef?: string;
  readonly pncpUrl?: string;
  readonly businessDays?: number;
  readonly notes?: string;
};

// Rodada deserta (strike, impound:transition). Exige edital registrado p/ a rodada (auction_edict_missing 409).
export type DesertedAttemptInput = {
  readonly roundNumber: number;
  readonly notes?: string;
};

// Avaliação SIGILOSA (auction:appraise, art. 28) — appraisal_amount + min_bid_amount na designação da rodada.
export type AppraisalInput = {
  readonly roundNumber: number;
  readonly appraisalAmount?: string;
  readonly minBidAmount?: string;
};

// Reciclagem por inservibilidade (impound:transition, §§16-18) — SCRAP|UNRECOVERABLE + reason (fundamento) req.
export type UnrecoverableInput = {
  readonly classification: Extract<AuctionClassification, "SCRAP" | "UNRECOVERABLE">;
  readonly reason: string;
};

// Arremate (impound:transition) — winner + sold_amount + sale_note_reference (art. 34).
export type SaleInput = {
  readonly roundNumber: number;
  readonly winnerRef?: string;
  readonly soldAmount?: string;
  readonly saleNoteReference?: string;
};

export type AuctionApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// ── Gate de sucata (ESPELHO client-side de evaluateScrapEdictGate + isEdictComplete) ─────────────────────────
// As 3 pré-condições DERIVÁVEIS de attempts+edicts (2 strikes DESERTED sequenciais 1..maxAttempts + edital presente
// por rodada + edital completo ref/published_at/business_days>=15). A cadeia I2 (chainBroken) NÃO é derivável aqui
// (o painel de leilão não busca a verificação) — é RE-VERIFICADA no servidor (a UI a expõe como nota, não bloqueia).
export type ScrapGatePrecondition = {
  readonly key: "strikes_insufficient" | "edict_missing" | "edict_incomplete";
  readonly label: string;
  readonly detail: string;
  readonly satisfied: boolean;
};

// Estágio do painel (PURO) — orquestra a UI por process.status (espelha resolveReleaseStage).
export type AuctionStage =
  | "custody" // ACTIVE_CUSTODY: marcar elegível + reciclar por inservibilidade
  | "eligible" // AUCTION_ELIGIBLE: edital + avaliação + rodada deserta + gate de sucata + preparar
  | "prep" // AUCTION_PREP: lotear
  | "lotted" // LOTTED: registrar arremate + reclamar
  | "auctioned" // AUCTIONED: consumar + inadimplência
  | "closed" // AUCTION_CLOSED: encerrado (liquidação na seção abaixo — 15b)
  | "recycling" // DIRECT_RECYCLING: terminal (sucata — baixa no Renavam)
  | "unavailable"; // demais estados (não há ato de leilão disponível)
