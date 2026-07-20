import { isMockMode } from "../../config/env";
import { ApiError, apiData } from "../../services/api/client";
import { adaptAuditEvents } from "./audit-events.adapter";
import type { AuditEventsApiContext, AuditEventsData } from "./audit-events.types";
import { emptyAuditEvents } from "./audit-events.types";

// PR-SCALE-3 — service frontend do agregado GET /api/v1/audit-events (gate backend `audit.read`).
// D-007: modo mock → lista VAZIA (nada fabricado; a UI mostra o estado honesto); 403 → lista vazia +
// `forbidden:true` (a UI mostra "acesso não permitido", não é erro de sistema); qualquer outro erro
// (5xx/rede) → lista vazia + `source:"fallback"` (a UI avisa e o auto-refresh tenta de novo). O front
// nunca inventa evento nem número.

export async function getAuditEvents(context: AuditEventsApiContext): Promise<AuditEventsData> {
  // D-007: sem evento fabricado em modo mock — a UI mostra o estado vazio honesto.
  if (isMockMode()) return emptyAuditEvents("mock");

  try {
    const raw = await apiData<unknown>("/audit-events", context);
    return { events: adaptAuditEvents(raw), source: "api", forbidden: false };
  } catch (err) {
    // 403 = gate RBAC `audit.read` → estado "acesso não permitido" (não é falha de sistema).
    if (err instanceof ApiError && err.status === 403) {
      return { ...emptyAuditEvents("fallback"), forbidden: true };
    }
    // Erro real (5xx, rede) → lista vazia + fallback. NUNCA fabrica dado; a UI tenta de novo no refresh.
    return emptyAuditEvents("fallback");
  }
}
