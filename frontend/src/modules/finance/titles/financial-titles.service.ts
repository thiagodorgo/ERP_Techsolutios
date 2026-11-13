import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFinancialTitleResponse, adaptFinancialTitlesResponse } from "./financial-titles.adapter";
import type {
  FinancialTitle,
  FinancialTitlesApiContext,
  FinancialTitlesData,
  FinancialTitlesFilters,
  PayFinancialTitlePayload,
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

// B-SAN3-12b — releitura de UM título (GET /financial-titles/:id): depois de qualquer não-sucesso da baixa a tela relê
// antes de falar (F3). O erro propaga (a tela decide o que dizer).
export async function getFinancialTitle(context: FinancialTitlesApiContext, titleId: string): Promise<FinancialTitle> {
  const title = adaptFinancialTitleResponse(await apiRequest<unknown>(`/financial-titles/${encodeURIComponent(titleId)}`, context));
  if (!title) throw new Error("invalid_financial_title_response");
  return title;
}

// B-SAN3-12b — a BAIXA (F1): POST /financial-titles/:id/pay. O ERRO do backend NÃO é engolido: a razão (422/409/400)
// decide a mensagem, o bloco do cheque pendente e a releitura.
export async function payFinancialTitle(context: FinancialTitlesApiContext, titleId: string, payload: PayFinancialTitlePayload): Promise<FinancialTitle | null> {
  const response = await apiRequest<unknown>(`/financial-titles/${encodeURIComponent(titleId)}/pay`, { ...context, method: "POST", body: payload });
  return adaptFinancialTitleResponse(response);
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
  if (filters.offset !== undefined) query.set("offset", String(filters.offset));
  return `?${query.toString()}`;
}
