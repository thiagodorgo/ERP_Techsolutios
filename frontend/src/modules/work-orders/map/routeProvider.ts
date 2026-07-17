import { haversineKm } from "../../operations/map/map/mapMarkers";

// Ω3F-8b (J-MAPAS-5) — SEAM de provedor de rota/km da aba Mapa da OS. Decisão de junta (custo US$ 0):
// a rota e o km saem por polyline RETA + distância HAVERSINE (reusa `haversineKm` de mapMarkers — NÃO
// recriar) sobre a base MapLibre+OpenFreeMap. O número é rotulado com HONESTIDADE: a rota rodoviária real
// é tipicamente 1,2–1,4× maior. Sem provedor de rotas, sem chave, sem billing, sem place_id.
//
// Um `GoogleRoutesProvider` (PAGO) ou `OsrmRouteProvider` (self-host) futuro pluga atrás de env-gate,
// SÓ após PD-ROUTES + junta-5 unânime (SKU pago / credencial externa nova). O `mode`/`label` carregam a
// honestidade até a UI — o avaliador-mapas VETA se o rótulo reto sumir.

export type RoutePoint = {
  readonly latitude: number;
  readonly longitude: number;
};

export type RouteMode = "straight-line" | "road";

export type RouteResult = {
  /** Distância estimada em km (soma dos trechos). */
  readonly km: number;
  /** `straight-line` = haversine (US$ 0). `road` só existiria com provedor rodoviário (gated). */
  readonly mode: RouteMode;
  /** Rótulo HONESTO exibido junto ao número. */
  readonly label: string;
  /** Vértices do trajeto, na ordem partida → origem → destino (só os pontos presentes). */
  readonly geometry: readonly RoutePoint[];
};

export interface RouteProvider {
  computeRoute(
    start: RoutePoint | null,
    origin: RoutePoint | null,
    destination: RoutePoint | null,
  ): RouteResult;
}

// Rótulo honesto obrigatório (item de veto do avaliador-mapas se faltar).
export const STRAIGHT_LINE_LABEL = "distância aproximada em linha reta";

function toLatLng(point: RoutePoint): { lat: number; lng: number } {
  return { lat: point.latitude, lng: point.longitude };
}

/**
 * Provedor padrão: distância em LINHA RETA (haversine), custo US$ 0, sem chave. Soma os trechos entre os
 * pontos presentes na ordem partida → origem → destino. `mode` é sempre `straight-line` e o `label` diz a
 * verdade — a rota rodoviária real é maior.
 */
export class HaversineRouteProvider implements RouteProvider {
  computeRoute(
    start: RoutePoint | null,
    origin: RoutePoint | null,
    destination: RoutePoint | null,
  ): RouteResult {
    const waypoints = [start, origin, destination].filter((point): point is RoutePoint => point !== null);
    let km = 0;
    for (let index = 1; index < waypoints.length; index += 1) {
      km += haversineKm(toLatLng(waypoints[index - 1]!), toLatLng(waypoints[index]!));
    }
    return { km, mode: "straight-line", label: STRAIGHT_LINE_LABEL, geometry: waypoints };
  }
}

/**
 * Fábrica com env-gate para troca futura SEM retrabalho (espelha `geocoder.factory.ts` — Noop por
 * default). Hoje retorna SEMPRE o provedor de linha reta (US$ 0, sem chave): um provedor rodoviário/pago
 * só entra aqui depois de PD-ROUTES + junta-5. Mantida como função para o ponto de injeção existir já.
 */
export function createRouteProvider(): RouteProvider {
  return new HaversineRouteProvider();
}
