import { haversineKm, isRingAvailable, isValidMapCoordinate } from "./map/mapMarkers";
import type { DispatchStatus } from "../dispatches/dispatches.types";
import type { FieldLocationItem } from "./operations-map.types";

/**
 * J-MAPAS-7 (SPRINT ALOCAÇÃO) — helpers PUROS e determinísticos do console de alocação do Mapa.
 * Zero WebGL, zero rede, zero `Date.now` implícito (nowMs é injetável) → 100% testável em node.
 *
 * HONESTIDADE (regra do dono, crítica):
 *  - DISTÂNCIA = haversine (linha reta), SEMPRE rotulada "~X km (linha reta)". Não é distância por rota.
 *  - TEMPO = ESTIMATIVA rotulada "~Y min (estimado, sem trânsito)" = distância ÷ velocidade urbana média
 *    conservadora. NUNCA "ETA de chegada" / "chega às HH:MM" — não temos rota nem trânsito na Fase 1.
 *  - completionRate `null` → "—" (o técnico não tem OS atribuída na janela). JAMAIS "0%".
 *  - Sem coordenada (chamado OU técnico) → sem distância/tempo (rótulo honesto), nunca um número inventado.
 *
 * LGPD §12: aqui só circula {lat,lng} para CALCULAR distância — nada é formatado nem logado como coordenada
 * crua; os formatadores devolvem apenas "~X km" / "~Y min", nunca a posição.
 */

// Velocidade urbana média conservadora (km/h) para a ESTIMATIVA de tempo. Conservadora de propósito:
// melhor subestimar a rapidez (superestimar o tempo) do que prometer uma chegada otimista.
export const AVERAGE_URBAN_SPEED_KMH = 28;

export type Coordinate = { readonly lat: number; readonly lng: number };

// "Mais próximo" (distância asc) e "Maior índice de conclusão" (completionRate desc) são as duas
// ORDENAÇÕES; "Disponível" é um FILTRO independente (toggle), não uma ordenação.
export type AllocationSort = "nearest" | "completion";

export type AllocationCandidate = {
  readonly location: FieldLocationItem;
  readonly operatorUserId: string;
  // `null` quando o técnico ou o chamado não têm coordenada válida → "Distância indisponível".
  readonly distanceKm: number | null;
  // `null` quando o técnico não tem OS atribuída na janela → "—" (nunca 0%).
  readonly completionRate: number | null;
  // Disponível AO VIVO (status available + posição fresca) — reusa a fonte única do realce do mapa.
  readonly isAvailable: boolean;
  // Já tem despacho ATIVO (não-terminal) → a UI sinaliza "já em despacho" p/ evitar alocação dupla.
  readonly hasActiveDispatch: boolean;
};

// Status de despacho que ainda "ocupa" o técnico. Terminais (completed/cancelled/failed/reassigned)
// liberam — não sinalizamos "já em despacho" para eles.
const ACTIVE_DISPATCH_STATUSES: ReadonlySet<DispatchStatus> = new Set<DispatchStatus>([
  "draft",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
  "in_service",
]);

export function isActiveDispatchStatus(status: DispatchStatus | undefined | null): boolean {
  return status ? ACTIVE_DISPATCH_STATUSES.has(status) : false;
}

/**
 * Chave de negócio do técnico para ALOCAR e para casar com o índice de conclusão: `userId` (o usuário
 * que recebe o despacho) com fallback para `operatorId`. É o MESMO valor usado no payload de createDispatch
 * (`operatorUserId`) — mantém uma verdade só entre o índice, a linha e a ação.
 */
export function operatorUserIdOf(location: FieldLocationItem): string {
  return location.userId ?? location.operatorId;
}

export function estimateTravelMinutes(distanceKm: number): number {
  return (distanceKm / AVERAGE_URBAN_SPEED_KMH) * 60;
}

/** Distância haversine técnico→alvo em km; `null` se qualquer lado não tem coordenada válida. */
export function computeDistanceKm(location: FieldLocationItem, target: Coordinate | null): number | null {
  if (!target) return null;
  if (!isValidMapCoordinate(location.latitude, location.longitude)) return null;
  if (!isValidMapCoordinate(target.lat, target.lng)) return null;
  return haversineKm({ lat: location.latitude, lng: location.longitude }, target);
}

// --- Formatadores HONESTOS (rótulos que nunca prometem rota/ETA de chegada) ---

export function formatStraightLineKm(distanceKm: number | null): string {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return "Distância indisponível";
  const value = distanceKm < 10 ? distanceKm.toFixed(1) : String(Math.round(distanceKm));
  return `~${value} km (linha reta)`;
}

export function formatEstimatedMinutes(distanceKm: number | null): string {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return "Tempo indisponível";
  const minutes = Math.max(1, Math.round(estimateTravelMinutes(distanceKm)));
  return `~${minutes} min (estimado, sem trânsito)`;
}

export function formatCompletionRate(rate: number | null): string {
  // `null` = sem OS atribuída na janela → "—". `0` é um valor REAL (0% de conclusão) e é exibido.
  if (rate === null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

/**
 * Monta os candidatos de alocação a partir dos técnicos visíveis, da coordenada do CHAMADO (ou `null`
 * quando o chamado não tem GPS) e do índice por operador. Ordem preservada da entrada; a ordenação é do
 * `rankAllocationCandidates`. Puro (nowMs injetável).
 */
export function buildAllocationCandidates(
  locations: readonly FieldLocationItem[],
  callCoordinate: Coordinate | null,
  completionByOperator: ReadonlyMap<string, number | null>,
  nowMs: number = Date.now(),
): AllocationCandidate[] {
  return locations.map((location) => {
    const operatorUserId = operatorUserIdOf(location);
    return {
      location,
      operatorUserId,
      distanceKm: computeDistanceKm(location, callCoordinate),
      completionRate: completionByOperator.get(operatorUserId) ?? null,
      isAvailable: isRingAvailable(location, nowMs),
      hasActiveDispatch: isActiveDispatchStatus(location.currentDispatch?.status),
    };
  });
}

function byDisplayName(a: AllocationCandidate, b: AllocationCandidate): number {
  return a.location.displayName.localeCompare(b.location.displayName, "pt-BR");
}

/**
 * Ranqueia candidatos: filtro "Disponível" (opcional) → ordenação escolhida. `null` de distância/índice
 * AFUNDA (vai para o fim), nunca sobe como se fosse "melhor". Desempate estável por nome. Puro.
 */
export function rankAllocationCandidates(
  candidates: readonly AllocationCandidate[],
  sort: AllocationSort,
  availableOnly: boolean,
): AllocationCandidate[] {
  const filtered = availableOnly ? candidates.filter((candidate) => candidate.isAvailable) : [...candidates];

  if (sort === "nearest") {
    return filtered.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return byDisplayName(a, b);
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return byDisplayName(a, b);
    });
  }

  // sort === "completion"
  return filtered.sort((a, b) => {
    if (a.completionRate === null && b.completionRate === null) return byDisplayName(a, b);
    if (a.completionRate === null) return 1;
    if (b.completionRate === null) return -1;
    if (a.completionRate !== b.completionRate) return b.completionRate - a.completionRate;
    return byDisplayName(a, b);
  });
}
