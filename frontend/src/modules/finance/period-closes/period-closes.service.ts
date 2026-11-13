import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptPeriodDetail, adaptPeriodsList } from "./period-closes.adapter";
import type { ClosePeriodBody, PeriodDetail, PeriodsApiContext, PeriodsData } from "./period-closes.types";

// B-SAN3-24 (24b, P-CONTRATO) — as rotas reais de `src/modules/financial-period-closes/financial-period-close.routes.ts`.
// A lista cai em `fallback` com motivo (a tela mostra erro, nunca lista vazia); leitura pontual e escrita propagam o
// `ApiError` (a tela precisa do `reason`: `pending_items_block_close`, `period_already_closed`,
// `period_closing_in_progress`, `reason_required`). R-E2E-JWT: só TypeScript puro.

export async function listPeriods(context: PeriodsApiContext, page: { readonly limit: number; readonly offset?: number } = { limit: 100 }): Promise<PeriodsData> {
  if (isMockMode()) return { items: [], total: 0, source: "mock" };
  const params = new URLSearchParams({ limit: String(Math.min(page.limit, 100)) });
  if (page.offset) params.set("offset", String(page.offset));
  try {
    return adaptPeriodsList(await apiRequest<unknown>(`/financial-periods?${params}`, context));
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status;
    return { items: [], total: 0, source: "fallback", ...(typeof status === "number" ? { fallbackStatus: status } : {}) };
  }
}

/** Situação, retrato congelado e checklist AO VIVO da competência (sem linha no servidor → `open`, retrato null). */
export async function getPeriod(context: PeriodsApiContext, period: string): Promise<PeriodDetail> {
  return adaptPeriodDetail(await apiRequest<unknown>(`/financial-periods/${encodeURIComponent(period)}`, context));
}

/**
 * Fechar a competência (`financial_period:close`). Sem `force`, título em contestação → 422 `pending_items_block_close`;
 * forçado exige motivo (o servidor carimba `forced` e o motivo no retrato e na auditoria).
 */
export async function closePeriod(context: PeriodsApiContext, period: string, options: { readonly body: ClosePeriodBody }): Promise<PeriodDetail> {
  return adaptPeriodDetail(
    await apiRequest<unknown>(`/financial-periods/${encodeURIComponent(period)}/close`, { ...context, method: "POST", body: options.body }),
  );
}

/** Reabrir (`financial_period:reopen`, só administradores): motivo obrigatório (400 `reason_required`). */
export async function reopenPeriod(context: PeriodsApiContext, period: string, reason: string): Promise<PeriodDetail> {
  return adaptPeriodDetail(
    await apiRequest<unknown>(`/financial-periods/${encodeURIComponent(period)}/reopen`, { ...context, method: "POST", body: { reason } }),
  );
}
