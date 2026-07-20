import { isMockMode } from "../../../config/env";
import { apiData } from "../../../services/api/client";
import type { OperationsMapApiContext } from "./operations-map.types";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO) — service frontend do agregado `GET /operations/technician-performance`
 * (índice de conclusão de OS por técnico, ranking gerencial tenant-wide). Backend gateado por
 * `field_dispatch:create` (só quem ALOCA vê o ranking). Consumido pelo Mapa Operacional para ordenar a
 * lista de alocação por "Maior índice de conclusão" e mostrar o índice de cada técnico.
 *
 * Honestidade: `completionRate` é `number | null` — `null` quando o técnico não tem OS atribuída na
 * janela (a UI mostra "—", NUNCA "0%"). D-007: modo mock → lista VAZIA (nada de índice fabricado);
 * erro real de API → lista vazia + `source: "fallback"` (a UI mostra "—" e não mente sobre o dado).
 * §2.8/LGPD: o DTO do backend já OMITE tenant_id e nunca traz coordenada — aqui não há dado sensível.
 */

export type TechnicianPerformanceItem = {
  readonly operatorUserId: string;
  readonly assignedCount: number;
  readonly completedCount: number;
  readonly cancelledCount: number;
  // 0..1 (concluídas ÷ atribuídas); `null` quando assignedCount = 0 (NUNCA 0 fabricado).
  readonly completionRate: number | null;
};

export type TechnicianPerformanceParams = {
  readonly operatorUserId?: string;
  readonly from?: string;
  readonly to?: string;
};

export type TechnicianPerformanceResult = {
  readonly items: readonly TechnicianPerformanceItem[];
  readonly source: "api" | "mock" | "fallback";
};

/** Envelope do backend após `apiData` desembrulhar `{ data }`: `{ items: [...] }`. */
type TechnicianPerformanceEnvelope = { readonly items?: unknown };

// Normaliza uma linha crua do endpoint com defesa total: contagens não-numéricas viram 0 e
// completionRate só é aceito se for um número finito em 0..1 — qualquer outra coisa vira `null`
// (jamais inventa 0% quando o dado não veio). Linhas sem operatorUserId string são descartadas.
function adaptTechnicianPerformanceItem(raw: unknown): TechnicianPerformanceItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const operatorUserId = typeof row.operatorUserId === "string" ? row.operatorUserId : null;
  if (!operatorUserId) return null;

  const rate = row.completionRate;
  const completionRate =
    typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : null;

  return {
    operatorUserId,
    assignedCount: toCount(row.assignedCount),
    completedCount: toCount(row.completedCount),
    cancelledCount: toCount(row.cancelledCount),
    completionRate,
  };
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

export function adaptTechnicianPerformanceItems(raw: unknown): TechnicianPerformanceItem[] {
  if (!Array.isArray(raw)) return [];
  const items: TechnicianPerformanceItem[] = [];
  for (const entry of raw) {
    const adapted = adaptTechnicianPerformanceItem(entry);
    if (adapted) items.push(adapted);
  }
  return items;
}

function buildQuery(params: TechnicianPerformanceParams): string {
  const query = new URLSearchParams();
  if (params.operatorUserId) query.set("operatorUserId", params.operatorUserId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return query.size ? `?${query.toString()}` : "";
}

export async function fetchTechnicianPerformance(
  context: OperationsMapApiContext,
  params: TechnicianPerformanceParams = {},
): Promise<TechnicianPerformanceResult> {
  // D-007: sem índice fabricado em modo mock — a UI mostra "—".
  if (isMockMode()) return { items: [], source: "mock" };

  try {
    const envelope = await apiData<TechnicianPerformanceEnvelope>(
      `/operations/technician-performance${buildQuery(params)}`,
      context,
    );
    return { items: adaptTechnicianPerformanceItems(envelope?.items), source: "api" };
  } catch {
    // Erro real (403 sem permissão, 5xx, rede) → lista vazia + fallback. NUNCA quebra o mapa.
    return { items: [], source: "fallback" };
  }
}

/** Índice por operador para lookup O(1) no ranking de alocação. Vazio quando a fonte não trouxe dado. */
export function toCompletionRateByOperator(
  items: readonly TechnicianPerformanceItem[],
): Map<string, number | null> {
  const byOperator = new Map<string, number | null>();
  for (const item of items) byOperator.set(item.operatorUserId, item.completionRate);
  return byOperator;
}
