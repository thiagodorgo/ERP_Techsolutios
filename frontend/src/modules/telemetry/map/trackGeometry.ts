import type { TrackView } from "../telemetry.types";

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — geometria PURA do trajeto de Rastreamento (dado JSON, testável SEM
// instanciar WebGL — molde de operations-map-libre.test.ts). Converte os pontos crus §2.8 (TrackView) em
// GeoJSON: LineString ORDENADO por capturedAt ASC (o backend já ordena; aqui é defensivo/determinístico) +
// markers de início/fim + bbox p/ fitBounds. §2.8/LGPD: opera sobre lat/lng SÓ para desenhar; NUNCA loga
// coordenada; nunca fabrica ponto/linha (D-007). Cor por VELOCIDADE fica DIFERIDA — TrackView não traz speed.

export type TrackLngLat = readonly [number, number];

export const TRACK_LINE_SOURCE_ID = "telemetry-track-line";
export const TRACK_MARKERS_SOURCE_ID = "telemetry-track-markers";

// Cores dos elementos do trajeto (consistentes com o basemap navy): verde=início, laranja=fim, ciano=linha.
export const TRACK_START_COLOR = "#22c55e";
export const TRACK_END_COLOR = "#f97316";
export const TRACK_LINE_COLOR = "#38bdf8";

export type TrackLineFeatureCollection = {
  readonly type: "FeatureCollection";
  readonly features: readonly {
    readonly type: "Feature";
    readonly properties: Record<string, never>;
    readonly geometry: { readonly type: "LineString"; readonly coordinates: readonly TrackLngLat[] };
  }[];
};

export type TrackMarkerRole = "start" | "end";

export type TrackMarkerFeatureCollection = {
  readonly type: "FeatureCollection";
  readonly features: readonly {
    readonly type: "Feature";
    readonly properties: { readonly role: TrackMarkerRole };
    readonly geometry: { readonly type: "Point"; readonly coordinates: TrackLngLat };
  }[];
};

export type TrackBounds = { readonly min: TrackLngLat; readonly max: TrackLngLat };

export type TrackSummary = { readonly count: number; readonly averageAccuracyM: number | null };

function isValidCoordinate(point: TrackView): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function capturedAtMillis(value: string): number {
  const parsed = Date.parse(value);
  // Data inválida vai para o FIM (mantém a ordem relativa via sort estável) — nunca inventa posição temporal.
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

// Descarta coordenadas inválidas e ordena por capturedAt ASC (determinístico; empate por índice de entrada).
export function orderTrackPoints(points: readonly TrackView[]): TrackView[] {
  return points
    .filter(isValidCoordinate)
    .map((point, index) => ({ point, index }))
    .sort((left, right) => {
      const byTime = capturedAtMillis(left.point.capturedAt) - capturedAtMillis(right.point.capturedAt);
      return byTime !== 0 ? byTime : left.index - right.index;
    })
    .map((entry) => entry.point);
}

// LineString do trajeto — precisa de >=2 pontos (um único ponto NÃO é linha). 0/1 ponto → FeatureCollection
// VAZIA honesta: nunca desenha um traço fabricado (D-007).
export function buildTrackLineFeatureCollection(points: readonly TrackView[]): TrackLineFeatureCollection {
  const ordered = orderTrackPoints(points);
  if (ordered.length < 2) return { type: "FeatureCollection", features: [] };
  const coordinates: TrackLngLat[] = ordered.map((point) => [point.lng, point.lat] as const);
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }],
  };
}

function marker(role: TrackMarkerRole, point: TrackView) {
  return {
    type: "Feature" as const,
    properties: { role },
    geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] as const },
  };
}

// Markers início/fim: 0 pontos → nenhum; 1 → só início; >=2 → início + fim.
export function buildTrackMarkerFeatureCollection(points: readonly TrackView[]): TrackMarkerFeatureCollection {
  const ordered = orderTrackPoints(points);
  if (ordered.length === 0) return { type: "FeatureCollection", features: [] };
  const features = [marker("start", ordered[0]!)];
  if (ordered.length >= 2) features.push(marker("end", ordered[ordered.length - 1]!));
  return { type: "FeatureCollection", features };
}

// bbox de TODOS os pontos válidos (para fitBounds). 0 pontos → null (a câmera cai no centro default).
export function computeTrackBounds(points: readonly TrackView[]): TrackBounds | null {
  const ordered = orderTrackPoints(points);
  if (ordered.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const point of ordered) {
    minLng = Math.min(minLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLng = Math.max(maxLng, point.lng);
    maxLat = Math.max(maxLat, point.lat);
  }
  return { min: [minLng, minLat], max: [maxLng, maxLat] };
}

// Sumário HONESTO para a caption (sem coordenada no texto): nº de pontos mapeáveis + precisão média (m) dos
// pontos que têm accuracyM. Nenhum ponto com precisão → null ("—").
export function summarizeTrack(points: readonly TrackView[]): TrackSummary {
  const ordered = orderTrackPoints(points);
  const accuracies = ordered
    .map((point) => point.accuracyM)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageAccuracyM =
    accuracies.length > 0 ? Math.round(accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length) : null;
  return { count: ordered.length, averageAccuracyM };
}
