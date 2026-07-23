// PR-SCALE-3 — espelho do DTO de GET /api/v1/audit-events (gate backend `audit.read`). A tela de
// "Auditoria da organização" consome ESTE modelo; o front NUNCA fabrica evento (D-007). §2.8: o view
// NÃO carrega `tenant_id` (nem token/path/bucket) — a organização já vem do ator autenticado. `source`
// distingue api/mock/fallback e `forbidden` marca o 403 do gate para a UI mostrar "acesso não
// permitido" honesto — sem inventar linha nem número.

// Projeção segura para a UI: só o que a tela mostra. Sem tenant_id (§2.8), sem metadados opacos.
export type AuditEventView = {
  readonly id: string;
  readonly when: string; // "dd/mm HH:mm" em America/Sao_Paulo (formatado pelo adapter)
  readonly whenIso: string; // instante ISO original (ordenação / tooltip); "" se o backend não enviou
  readonly actor: string; // actor_user_id honesto (id opaco) — nunca um nome inventado
  readonly action: string;
};

export type AuditEventsSource = "api" | "mock" | "fallback";

export type AuditEventsData = {
  readonly events: readonly AuditEventView[];
  readonly source: AuditEventsSource;
  readonly forbidden: boolean;
  // Ω4C PR-11 (D-Ω4C-AUD-FILTERS) — offset do backend quando há MAIS eventos além da janela carregada
  // (undefined = não há mais). A tela usa isto para o "Carregar mais" honesto (server-side).
  readonly nextOffset?: number;
};

// Filtros server-side (D-Ω4C-AUD-FILTERS): ação/ator exatos + período; `limit` cresce no "Carregar mais".
export type AuditEventsQuery = {
  readonly action?: string;
  readonly actorId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
};

export type AuditEventsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Lista VAZIA honesta (mock/erro/403): sem inventar evento (D-007). A UI mostra o estado honesto.
export function emptyAuditEvents(source: AuditEventsSource): AuditEventsData {
  return { events: [], source, forbidden: false };
}
