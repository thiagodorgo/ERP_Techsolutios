import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptChequeResponse, adaptChequesList } from "./cheques.adapter";
import type { Cheque, ChequeFilters, ChequesApiContext, ChequesData, EditChequePayload, RegisterChequePayload } from "./cheques.types";

// B-SAN3-24 (24a, P-CONTRATO) — cada ação da tela é a rota real de `src/modules/cheques/cheque.routes.ts`, com o corpo
// que o servidor aceita, e devolve o cheque que o servidor gravou. A LISTA cai em `fallback` com motivo (a tela mostra
// erro, nunca lista vazia); leitura pontual e ESCRITA propagam o `ApiError` (a tela precisa do `reason` para falar e
// para decidir reler). Todo filtro vai ao servidor; o front não filtra dinheiro nem soma.
// R-E2E-JWT: só TypeScript puro (o teste de contrato chama estas funções no job `backend`, sem `frontend/node_modules`).

/** Teto da página do servidor (`parseLimit`: 1..100). */
export const CHEQUES_PAGE_LIMIT = 100;

export function chequesListPath(filters: ChequeFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.direction) params.set("direction", filters.direction);
  if (filters.accountId) params.set("account_id", filters.accountId);
  if (filters.titleId) params.set("title_id", filters.titleId);
  params.set("limit", String(Math.min(filters.limit ?? CHEQUES_PAGE_LIMIT, CHEQUES_PAGE_LIMIT)));
  if (filters.offset) params.set("offset", String(filters.offset));
  return `/cheques?${params}`;
}

export async function listCheques(context: ChequesApiContext, filters: ChequeFilters): Promise<ChequesData> {
  if (isMockMode()) return { items: [], pagination: { limit: 0, offset: 0, total: 0 }, source: "mock" };
  try {
    return adaptChequesList(await apiRequest<unknown>(chequesListPath(filters), context), "api");
  } catch {
    return { items: [], pagination: { limit: 0, offset: 0, total: 0 }, source: "fallback", fallbackReason: "Não foi possível consultar os cheques." };
  }
}

export async function getCheque(context: ChequesApiContext, chequeId: string): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}`, context));
}

/** Registrar (`POST /cheques`, `cheques:create`). Nenhum caixa se move no registro. */
export async function registerCheque(context: ChequesApiContext, payload: RegisterChequePayload): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>("/cheques", { ...context, method: "POST", body: payload }));
}

/** Editar (`PATCH /cheques/:id`, só `registered`): número, banco, "bom para", observações e o 1º vínculo. */
export async function editCheque(context: ChequesApiContext, chequeId: string, payload: EditChequePayload): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}`, { ...context, method: "PATCH", body: payload }));
}

/** Excluir (`DELETE /cheques/:id`, exclusão lógica, só `registered` e sem título). */
export async function deleteCheque(context: ChequesApiContext, chequeId: string): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}`, { ...context, method: "DELETE" }));
}

/** Depositar (`registered → deposited`). Não move caixa. */
export async function depositCheque(context: ChequesApiContext, chequeId: string): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}/deposit`, { ...context, method: "POST" }));
}

/** Cancelar (`registered → cancelled`). Não move caixa; cheque vinculado → 422 `cheque_linked_unlink_first`. */
export async function cancelRegisteredCheque(context: ChequesApiContext, chequeId: string): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}/cancel`, { ...context, method: "POST" }));
}

/**
 * Compensar (`deposited → cleared`). MOVE DINHEIRO: o servidor posta 1 lançamento na competência corrente
 * (recebido entra, emitido sai) e, com título, baixa o título na mesma transação. Mês fechado → 422 `period_closed`.
 */
export async function clearCheque(context: ChequesApiContext, chequeId: string): Promise<Cheque> {
  return adaptChequeResponse(await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}/clear`, { ...context, method: "POST" }));
}

/**
 * Devolver. De `deposited`: sem caixa (o motivo é obrigatório se o cheque tem título). De `cleared`: MOVE DINHEIRO
 * (contra-lançamento no sentido inverso da compensação) e, com título, reabre o título.
 */
export async function bounceCheque(context: ChequesApiContext, chequeId: string, reason: string): Promise<Cheque> {
  return adaptChequeResponse(
    await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}/bounce`, { ...context, method: "POST", body: { reason } }),
  );
}
