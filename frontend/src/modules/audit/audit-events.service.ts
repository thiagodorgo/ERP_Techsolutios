import { isMockMode } from "../../config/env";
import { ApiError, apiRequest } from "../../services/api/client";
import { adaptAuditEvents } from "./audit-events.adapter";
import type { AuditEventsApiContext, AuditEventsData, AuditEventsQuery } from "./audit-events.types";
import { emptyAuditEvents } from "./audit-events.types";

// PR-SCALE-3 + Ω4C PR-11 — service frontend do agregado GET /api/v1/audit-events (gate backend `audit.read`).
// D-Ω4C-AUD-FILTERS: passa filtros server-side (ação/ator/período) + paginação (limit/offset) e lê o
// `nextOffset` do envelope para o "Carregar mais". D-007: modo mock → lista VAZIA (nada fabricado); 403 →
// lista vazia + `forbidden:true`; qualquer outro erro (5xx/rede) → lista vazia + `source:"fallback"`.

export async function getAuditEvents(
  context: AuditEventsApiContext,
  params: AuditEventsQuery = {},
): Promise<AuditEventsData> {
  // D-007: sem evento fabricado em modo mock — a UI mostra o estado vazio honesto.
  if (isMockMode()) return emptyAuditEvents("mock");

  try {
    const payload = await apiRequest<{ data: unknown; nextOffset?: number }>(`/audit-events${buildQuery(params)}`, context);
    return {
      events: adaptAuditEvents(payload.data),
      source: "api",
      forbidden: false,
      nextOffset: typeof payload.nextOffset === "number" ? payload.nextOffset : undefined,
    };
  } catch (err) {
    // 403 = gate RBAC `audit.read` → estado "acesso não permitido" (não é falha de sistema).
    if (err instanceof ApiError && err.status === 403) {
      return { ...emptyAuditEvents("fallback"), forbidden: true };
    }
    // Erro real (5xx, rede) → lista vazia + fallback. NUNCA fabrica dado; a UI tenta de novo no refresh.
    return emptyAuditEvents("fallback");
  }
}

// Monta a query server-side. Ação/ator são match exato (o backend compara `===`); período por from/to. `to`
// vira fim-do-dia para incluir o dia inteiro escolhido no seletor de data. offset sempre 0 (janela cresce por limit).
function buildQuery(params: AuditEventsQuery): string {
  const query = new URLSearchParams();
  if (params.action?.trim()) query.set("action", params.action.trim());
  if (params.actorId?.trim()) query.set("actorId", params.actorId.trim());
  if (params.from?.trim()) query.set("from", toIsoStart(params.from.trim()));
  if (params.to?.trim()) query.set("to", toIsoEnd(params.to.trim()));
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

// "YYYY-MM-DD" (seletor de data) → início/fim do dia ISO. Se já vier um instante ISO completo, usa como está.
function toIsoStart(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
}

function toIsoEnd(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}
