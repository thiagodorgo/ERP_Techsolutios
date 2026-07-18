import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFinancialTitleResponse, adaptFinancialTitlesResponse } from "./financial-titles.adapter";
import type {
  ChangeFinancialTitleStatusPayload,
  CreateFinancialTitlePayload,
  FinancialTitle,
  FinancialTitlesApiContext,
  FinancialTitlesData,
  FinancialTitlesFilters,
} from "./financial-titles.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
// A leitura tolera lista vazia como resultado legítimo (não é erro): sem títulos, a tela mostra o vazio
// honesto e KPIs zerados (o front nunca inventa número).
export async function listFinancialTitlesFromApi(
  context: FinancialTitlesApiContext,
  filters: FinancialTitlesFilters,
): Promise<FinancialTitlesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/financial-titles${buildQuery(filters)}`, context);
    return adaptFinancialTitlesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason:
        filters.direction === "receivable"
          ? "Não foi possível consultar as cobranças."
          : "Não foi possível consultar os pagamentos.",
    };
  }
}

// Criação — o ERRO do backend (400/422) NÃO é engolido: o modal precisa do status para explicar a falha.
// Em modo mock devolve o título sintetizado do payload (o fluxo do modal conclui no modo demonstração).
export async function createFinancialTitle(
  context: FinancialTitlesApiContext,
  payload: CreateFinancialTitlePayload,
): Promise<FinancialTitle> {
  if (isMockMode()) return synthesizeFromPayload(payload);

  const response = await apiRequest<unknown>("/financial-titles", {
    ...context,
    method: "POST",
    body: payload,
  });
  const created = adaptFinancialTitleResponse(response);
  if (!created) throw new Error("invalid_financial_title_response");
  return created;
}

// Transição de status (PATCH /:id/status). Como o cancelamento de OS, o ERRO NÃO é engolido: a máquina de
// estado do backend é a autoridade e uma transição inválida (422) precisa chegar à linha/modal.
export async function changeFinancialTitleStatus(
  context: FinancialTitlesApiContext,
  titleId: string,
  payload: ChangeFinancialTitleStatusPayload,
): Promise<FinancialTitle> {
  if (isMockMode()) return { ...synthesizeStatusEcho(titleId, payload.status) };

  const response = await apiRequest<unknown>(`/financial-titles/${encodeURIComponent(titleId)}/status`, {
    ...context,
    method: "PATCH",
    body: payload.reason ? { status: payload.status, reason: payload.reason } : { status: payload.status },
  });
  const updated = adaptFinancialTitleResponse(response);
  if (!updated) throw new Error("invalid_financial_title_response");
  return updated;
}

function buildQuery(filters: FinancialTitlesFilters): string {
  const query = new URLSearchParams();
  query.set("direction", filters.direction);
  if (filters.status) query.set("status", filters.status);
  if (filters.partyType) query.set("party_type", filters.partyType);
  if (filters.overdue) query.set("overdue", "true");
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.limit) query.set("limit", String(filters.limit));
  return `?${query.toString()}`;
}

function synthesizeFromPayload(payload: CreateFinancialTitlePayload): FinancialTitle {
  const now = new Date();
  return {
    id: "mock-created-financial-title",
    direction: payload.direction,
    partyType: payload.party_type,
    partyName: payload.party_name,
    document: payload.document ?? null,
    category: payload.category ?? null,
    description: payload.description ?? null,
    amount: payload.amount,
    currency: "BRL",
    issueDate: now.toISOString(),
    dueDate: payload.due_date,
    paidAmount: 0,
    status: "open",
    competencia: `${now.getUTCFullYear()}-${`${now.getUTCMonth() + 1}`.padStart(2, "0")}`,
    accountId: null,
    overdue: false,
    active: true,
    createdAt: now.toISOString(),
  };
}

function synthesizeStatusEcho(titleId: string, status: ChangeFinancialTitleStatusPayload["status"]): FinancialTitle {
  const now = new Date();
  return {
    id: titleId,
    direction: "receivable",
    partyType: "customer",
    partyName: "—",
    document: null,
    category: null,
    description: null,
    amount: 0,
    currency: "BRL",
    issueDate: now.toISOString(),
    dueDate: now.toISOString(),
    paidAmount: 0,
    status,
    competencia: `${now.getUTCFullYear()}-${`${now.getUTCMonth() + 1}`.padStart(2, "0")}`,
    accountId: null,
    overdue: false,
    active: status !== "cancelled",
    createdAt: now.toISOString(),
  };
}
