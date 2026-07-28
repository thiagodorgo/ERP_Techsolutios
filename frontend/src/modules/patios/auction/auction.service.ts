import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import { adaptAuctionView, auctionActionErrorMessage } from "./auction.adapter";
import type {
  AppraisalInput,
  AuctionApiContext,
  AuctionView,
  DesertedAttemptInput,
  EdictInput,
  SaleInput,
  UnrecoverableInput,
} from "./auction.types";

// Ω5P PR-15a — cliente do Leilão administrativo. TODAS as chamadas passam pelo cliente HTTP COMPARTILHADO
// (`apiRequest`: base URL, Bearer, headers de mock, refresh-retry de 401 + limpeza de sessão) — MESMO caminho de
// transição/liberação/quitação. A UI NÃO reimplementa regra: a FSM de leilão, o gate I8, o sigilo art. 28 e a
// hash-chain vivem no backend. Os corpos vão em snake_case (contrato do auction.service.ts do backend).

// Erro tipado da ação de leilão — carrega o `reason` do corpo do backend (o cliente HTTP guarda `reason` no
// ApiError; aqui o embrulhamos numa mensagem PT-BR white-label, MESMO padrão de ReleaseActionError/TransitionError).
export class AuctionActionError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(auctionActionErrorMessage(reason, status));
    this.name = "AuctionActionError";
  }
}

function auctionPath(processId: string, suffix = ""): string {
  return `/impound-processes/${encodeURIComponent(processId)}/auction${suffix}`;
}

// Traduz o ApiError do cliente HTTP no erro tipado da fatia (preserva o reason discriminador do backend).
function rethrow(error: unknown): never {
  if (error instanceof ApiError) throw new AuctionActionError(error.status, error.reason ?? null);
  throw error;
}

// GET /impound-processes/:id/auction (impound:read). 404 process_not_found → null (EmptyState honesto). D-007:
// modo mock → null (nunca fabrica um leilão).
export async function getAuction(context: AuctionApiContext, processId: string): Promise<AuctionView | null> {
  if (isMockMode() || !processId) return null;
  try {
    const response = await apiRequest<unknown>(auctionPath(processId), context);
    return adaptAuctionView(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// POST .../auction/eligibility (impound:transition) — ACTIVE_CUSTODY→AUCTION_ELIGIBLE. 6 reasons 409 → PT-BR.
export async function markEligible(context: AuctionApiContext, processId: string): Promise<AuctionView | null> {
  try {
    const response = await apiRequest<unknown>(auctionPath(processId, "/eligibility"), { ...context, method: "POST", body: {} });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/edicts (impound:transition) — registro do edital da rodada (idempotente por round_number).
export async function registerEdict(context: AuctionApiContext, processId: string, input: EdictInput): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      round_number: input.roundNumber,
      edict_reference: input.edictReference.trim(),
    };
    if (input.edictPlatform?.trim()) body.edict_platform = input.edictPlatform.trim();
    if (input.publishedAt?.trim()) body.published_at = input.publishedAt.trim();
    if (input.auctioneerRef?.trim()) body.auctioneer_ref = input.auctioneerRef.trim();
    if (input.pncpUrl?.trim()) body.pncp_url = input.pncpUrl.trim();
    if (typeof input.businessDays === "number") body.business_days = input.businessDays;
    if (input.notes?.trim()) body.notes = input.notes.trim();
    await apiRequest<unknown>(auctionPath(processId, "/edicts"), { ...context, method: "POST", body });
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/attempts (impound:transition) — fecho de rodada DESERTA (strike I8).
export async function recordDesertedAttempt(context: AuctionApiContext, processId: string, input: DesertedAttemptInput): Promise<void> {
  try {
    const body: Record<string, unknown> = { round_number: input.roundNumber };
    if (input.notes?.trim()) body.notes = input.notes.trim();
    await apiRequest<unknown>(auctionPath(processId, "/attempts"), { ...context, method: "POST", body });
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/appraisal (auction:appraise, art. 28) — avaliação SIGILOSA (appraisal + min_bid).
export async function setAppraisal(context: AuctionApiContext, processId: string, input: AppraisalInput): Promise<void> {
  try {
    const body: Record<string, unknown> = { round_number: input.roundNumber };
    if (input.appraisalAmount?.trim()) body.appraisal_amount = input.appraisalAmount.trim();
    if (input.minBidAmount?.trim()) body.min_bid_amount = input.minBidAmount.trim();
    await apiRequest<unknown>(auctionPath(processId, "/appraisal"), { ...context, method: "POST", body });
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/reclassify-scrap (impound:transition) — sucata IRREVERSÍVEL por 2 strikes edital-backed.
export async function reclassifyScrap(context: AuctionApiContext, processId: string): Promise<AuctionView | null> {
  try {
    const response = await apiRequest<unknown>(auctionPath(processId, "/reclassify-scrap"), { ...context, method: "POST", body: {} });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/reclassify-unrecoverable (impound:transition, §§16-18) — SCRAP|UNRECOVERABLE + reason (req).
export async function reclassifyUnrecoverable(context: AuctionApiContext, processId: string, input: UnrecoverableInput): Promise<AuctionView | null> {
  try {
    const body: Record<string, unknown> = { classification: input.classification, reason: input.reason.trim() };
    const response = await apiRequest<unknown>(auctionPath(processId, "/reclassify-unrecoverable"), { ...context, method: "POST", body });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/prep (impound:transition) — AUCTION_ELIGIBLE→AUCTION_PREP (CONSERVED + avaliação art. 28).
export async function prepareForAuction(context: AuctionApiContext, processId: string, roundNumber: number): Promise<AuctionView | null> {
  try {
    const response = await apiRequest<unknown>(auctionPath(processId, "/prep"), { ...context, method: "POST", body: { round_number: roundNumber } });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/lot (impound:transition) — AUCTION_PREP→LOTTED (edital completo + min_bid).
export async function lotForAuction(context: AuctionApiContext, processId: string, roundNumber: number): Promise<AuctionView | null> {
  try {
    const response = await apiRequest<unknown>(auctionPath(processId, "/lot"), { ...context, method: "POST", body: { round_number: roundNumber } });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/sale (impound:transition) — LOTTED→AUCTIONED (arremate: winner + sold>=min_bid + nota).
export async function recordSale(context: AuctionApiContext, processId: string, input: SaleInput): Promise<void> {
  try {
    const body: Record<string, unknown> = { round_number: input.roundNumber };
    if (input.winnerRef?.trim()) body.winner_ref = input.winnerRef.trim();
    if (input.soldAmount?.trim()) body.sold_amount = input.soldAmount.trim();
    if (input.saleNoteReference?.trim()) body.sale_note_reference = input.saleNoteReference.trim();
    await apiRequest<unknown>(auctionPath(processId, "/sale"), { ...context, method: "POST", body });
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/close (impound:transition) — AUCTIONED→AUCTION_CLOSED (consumação: pagamento confirmado + nota).
export async function closeAuction(context: AuctionApiContext, processId: string, roundNumber: number): Promise<AuctionView | null> {
  try {
    const response = await apiRequest<unknown>(auctionPath(processId, "/close"), {
      ...context,
      method: "POST",
      body: { round_number: roundNumber, payment_confirmed: true },
    });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/default (impound:transition, art. 42) — AUCTIONED→LOTTED (inadimplência; reintegra o lote).
export async function defaultAuction(context: AuctionApiContext, processId: string, roundNumber: number): Promise<void> {
  try {
    await apiRequest<unknown>(auctionPath(processId, "/default"), { ...context, method: "POST", body: { round_number: roundNumber } });
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/reclaim (impound:transition, art. 26 §1º) — LOTTED→ACTIVE_CUSTODY (reclamado antes da venda).
export async function reclaimBeforeSale(context: AuctionApiContext, processId: string, reason: string): Promise<AuctionView | null> {
  try {
    const response = await apiRequest<unknown>(auctionPath(processId, "/reclaim"), { ...context, method: "POST", body: { reason: reason.trim() } });
    return adaptAuctionView(response);
  } catch (error) {
    rethrow(error);
  }
}
