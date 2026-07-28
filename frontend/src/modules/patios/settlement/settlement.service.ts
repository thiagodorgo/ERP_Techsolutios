import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import { adaptSettlementView, settlementActionErrorMessage } from "./settlement.adapter";
import type { ClaimBalanceInput, DistributeInput, SettlementApiContext, SettlementView } from "./settlement.types";

// Ω5P PR-15b — cliente da Liquidação em cascata §6º. TODAS as chamadas passam pelo cliente HTTP COMPARTILHADO
// (`apiRequest`: base URL, Bearer, headers de mock, refresh-retry de 401 + limpeza de sessão) — MESMO caminho da
// transição/leilão/liberação/quitação. A UI NÃO reimplementa regra: a cascata I7 (Σ==arremate), o ciclo do saldo
// (§12) e a hash-chain vivem no backend. Os corpos vão em snake_case (contrato do auction.settlement.service.ts).

// Erro tipado da ação de liquidação — carrega o `reason` do corpo do backend (o cliente HTTP guarda `reason` no
// ApiError; aqui o embrulhamos numa mensagem PT-BR white-label, MESMO padrão de AuctionActionError/ReleaseActionError).
export class SettlementActionError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(settlementActionErrorMessage(reason, status));
    this.name = "SettlementActionError";
  }
}

function settlementPath(processId: string, suffix = ""): string {
  return `/impound-processes/${encodeURIComponent(processId)}/auction/settlement${suffix}`;
}

// Traduz o ApiError do cliente HTTP no erro tipado da fatia (preserva o reason discriminador do backend).
function rethrow(error: unknown): never {
  if (error instanceof ApiError) throw new SettlementActionError(error.status, error.reason ?? null);
  throw error;
}

// GET /impound-processes/:id/auction/settlement (impound:read). 404 settlement_not_found → null (EmptyState honesto:
// "Liquidação ainda não distribuída"). D-007: modo mock → null (nunca fabrica uma liquidação).
export async function getSettlement(context: SettlementApiContext, processId: string): Promise<SettlementView | null> {
  if (isMockMode() || !processId) return null;
  try {
    const response = await apiRequest<unknown>(settlementPath(processId), context);
    return adaptSettlementView(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// POST .../auction/settlement (impound:transition) — DISTRIBUIÇÃO em cascata §6º (I7). O arremate (hammer) é apurado
// pelo backend da venda efetiva; a remoção/estada (item I) é COMPUTADA pelo charging — SÓ os 6 tiers declarados vão
// no corpo. Idempotente (2ª chamada devolve a existente). 409 settlement_wrong_state/settlement_sale_missing → PT-BR.
export async function distributeSettlement(context: SettlementApiContext, processId: string, input: DistributeInput): Promise<SettlementView | null> {
  try {
    const response = await apiRequest<unknown>(settlementPath(processId), { ...context, method: "POST", body: toDistributeBody(input) });
    return adaptSettlementView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/settlement/claim-balance (impound:transition, §12) — REGISTRO manual da RETIRADA do saldo pelo
// ex-proprietário (pagamento presencial, SEM PSP — D-Ω5P-07: o sistema REGISTRA a retirada, não movimenta dinheiro).
// Gate REAL no backend (DISTRIBUTED + saldo>0 + dentro do prazo). 409 balance_claim_wrong_state/zero/expired → PT-BR.
export async function claimBalance(context: SettlementApiContext, processId: string, input: ClaimBalanceInput = {}): Promise<SettlementView | null> {
  try {
    const body: Record<string, unknown> = {};
    if (input.claimRecipientRef?.trim()) body.claim_recipient_ref = input.claimRecipientRef.trim();
    const response = await apiRequest<unknown>(settlementPath(processId, "/claim-balance"), { ...context, method: "POST", body });
    return adaptSettlementView(response);
  } catch (error) {
    rethrow(error);
  }
}

// POST .../auction/settlement/revert-funset (impound:transition, §12) — REVERSÃO do saldo NÃO reclamado ao Funset
// após o prazo. Gate REAL no backend (DISTRIBUTED + saldo>0 + prazo vencido). MUTUAMENTE EXCLUSIVO com o claim.
// 409 funset_wrong_state/balance_zero/funset_not_yet_due → PT-BR.
export async function revertToFunset(context: SettlementApiContext, processId: string): Promise<SettlementView | null> {
  try {
    const response = await apiRequest<unknown>(settlementPath(processId, "/revert-funset"), { ...context, method: "POST", body: {} });
    return adaptSettlementView(response);
  } catch (error) {
    rethrow(error);
  }
}

// Corpo em snake_case (contrato REST — auction.settlement.service.ts). SÓ os 6 tiers declarados e preenchidos;
// removal_storage NUNCA vai (é computado pelo backend). Valores já normalizados à string canônica "0.00".
function toDistributeBody(input: DistributeInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.auctionCost?.trim()) body.auction_cost = input.auctionCost.trim();
  if (input.vehicleTaxes?.trim()) body.vehicle_taxes = input.vehicleTaxes.trim();
  if (input.priorityCreditors?.trim()) body.priority_creditors = input.priorityCreditors.trim();
  if (input.realizingAgencyFines?.trim()) body.realizing_agency_fines = input.realizingAgencyFines.trim();
  if (input.otherSntFines?.trim()) body.other_snt_fines = input.otherSntFines.trim();
  if (input.otherDebits?.trim()) body.other_debits = input.otherDebits.trim();
  return body;
}
