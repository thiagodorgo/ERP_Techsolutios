import type { FeatureCollection, Feature, Point } from "geojson";

import type { WorkOrderPriority } from "../../../work-orders/work-orders.types";
import type { FieldLocationItem, FieldLocationStatus, OperationsMapWorkOrderPin } from "../operations-map.types";

/**
 * Ω1 — helpers puros do Mapa Operacional (cores de status, níveis de "localização antiga",
 * iniciais, GeoJSON dos pins e interpolação da animação). Sem dependência de WebGL/maplibre,
 * então roda em tesles SSR/node normalmente.
 */

// Duas faixas de frescor pedidas no protótipo: >3min âmbar, >10min cinza (fora disso = ao vivo).
export const STALE_AMBER_MS = 3 * 60 * 1000;
export const STALE_GRAY_MS = 10 * 60 * 1000;

export type StaleLevel = "live" | "amber" | "gray";

// Cor semântica por status do operador (anel do pin quando ao vivo).
const STATUS_COLORS: Record<FieldLocationStatus, string> = {
  available: "#22c55e",
  on_route: "#38bdf8",
  on_site: "#14b8a6",
  in_service: "#6366f1",
  paused: "#f59e0b",
  offline: "#64748b",
  blocked: "#ef4444",
  unknown: "#94a3b8",
};

const STALE_AMBER_COLOR = "#f59e0b";
const STALE_GRAY_COLOR = "#64748b";

export function getStatusColor(status: FieldLocationStatus): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
}

export function getStaleLevel(capturedAt: string, nowMs: number = Date.now()): StaleLevel {
  const capturedMs = new Date(capturedAt).getTime();
  if (!Number.isFinite(capturedMs)) return "gray";
  const age = nowMs - capturedMs;
  if (age >= STALE_GRAY_MS) return "gray";
  if (age >= STALE_AMBER_MS) return "amber";
  return "live";
}

/**
 * Cor do anel do pin: status quando ao vivo; âmbar/cinza quando a última posição envelhece.
 * Isso torna "localização antiga" legível direto no mapa, sem abrir o painel.
 */
export function getRingColor(location: FieldLocationItem, nowMs: number = Date.now()): string {
  const level = getStaleLevel(location.capturedAt, nowMs);
  if (level === "gray") return STALE_GRAY_COLOR;
  if (level === "amber") return STALE_AMBER_COLOR;
  return getStatusColor(location.status);
}

/**
 * M-3 (J-MAPAS-6) — técnico DISPONÍVEL AO VIVO: status `available` E posição fresca (não envelhecida).
 * É exatamente a condição em que o anel do pin fica verde (getRingColor === verde de "available"),
 * então o realce de disponibilidade no mapa nunca mente sobre uma posição velha. Fonte ÚNICA do
 * realce usada pelos DOIS canvases (MapLibre via prop de feature `available`; Google via classe
 * `gmp-operator-pin--available`) — regra do espelho.
 */
export function isRingAvailable(location: FieldLocationItem, nowMs: number = Date.now()): boolean {
  return getRingColor(location, nowMs) === getStatusColor("available");
}

// Iniciais (1–2 letras) para o miolo do pin do técnico.
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// === J-MAPAS-10 (PLANO-MAPA-PIXEL) — grupos de status do protótipo + avatar determinístico ===
// D-MAPA-PIXEL (divergência 3): NO MAPA os status são lidos em 4 grupos (disp/rota/atend/off);
// o rótulo REAL ("Pausado"/"Bloqueado"/"No local"…) segue no popover/painel via
// getFieldLocationStatusLabel. `unknown` cai em "off" (não é rastreável ao vivo).

export type TechnicianLegendGroup = "disp" | "rota" | "atend" | "off";

const TECH_GROUP_BY_STATUS: Record<FieldLocationStatus, TechnicianLegendGroup> = {
  available: "disp",
  on_route: "rota",
  on_site: "atend",
  in_service: "atend",
  paused: "off",
  offline: "off",
  blocked: "off",
  unknown: "off",
};

// Cores do protótipo (verbatim): ok #22c55e · rota #3b82f6 · atend #a855f7 · off #64748b.
export const TECH_GROUP_HEX: Record<TechnicianLegendGroup, string> = {
  disp: "#22c55e",
  rota: "#3b82f6",
  atend: "#a855f7",
  off: "#64748b",
};

// "Localização antiga" (âmbar do protótipo) — 1 faixa única no limiar EXISTENTE de 15 min
// (D-MAPA-PIXEL, divergência 4: substitui as faixas 3/10 min no caminho MapLibre default).
export const TECH_STALE_HEX = "#f59e0b";

export function getFieldLocationGroup(status: FieldLocationStatus): TechnicianLegendGroup {
  return TECH_GROUP_BY_STATUS[status] ?? "off";
}

export function getFieldLocationGroupColor(status: FieldLocationStatus): string {
  return TECH_GROUP_HEX[getFieldLocationGroup(status)];
}

/** Borda do marcador do técnico: âmbar quando a posição é antiga; senão a cor do grupo de status. */
export function getTechnicianBorderColor(location: Pick<FieldLocationItem, "status" | "isStale">): string {
  return location.isStale ? TECH_STALE_HEX : getFieldLocationGroupColor(location.status);
}

// Paleta AVC do protótipo (verbatim) — fundo do avatar do técnico.
export const AVATAR_COLORS: readonly string[] = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#d97706",
  "#059669",
  "#4f46e5",
  "#b91c1c",
  "#0d9488",
  "#9333ea",
];

/**
 * Cor de avatar DETERMINÍSTICA por hash estável do id (djb2) — nunca pela posição no array,
 * porque a ordem das localizações muda entre refreshes (plano §9). Mesmo id = mesma cor, sempre.
 */
export function getAvatarColor(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

/**
 * SVG do LOSANGO de OS (protótipo: quadrado 22px rotate(45°), radius 5, borda 2.5 branca).
 * Substitui o teardrop; `selected` adiciona o anel azul rgba(59,130,246,0.65) offset 2.
 * Rasterizado pelo canvas MapLibre (icon-image) — âncora no CENTRO da coordenada.
 */
export function workOrderDiamondSvg(color: string, selected = false): string {
  const size = 44;
  const half = size / 2;
  const selectedRing = selected
    ? `<rect x="${half - 15}" y="${half - 15}" width="30" height="30" rx="7" ` +
      `transform="rotate(45 ${half} ${half})" fill="none" stroke="rgba(59,130,246,0.65)" stroke-width="3"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    selectedRing +
    `<rect x="${half - 11}" y="${half - 11}" width="22" height="22" rx="5" ` +
    `transform="rotate(45 ${half} ${half})" fill="${color}" stroke="#ffffff" stroke-width="2.5"/></svg>`
  );
}

export type FieldLocationFeatureProps = {
  readonly id: string;
  readonly initials: string;
  readonly ringColor: string;
  readonly staleLevel: StaleLevel;
  readonly selected: boolean;
  readonly displayName: string;
  // M-3 — realce de disponibilidade na CAMADA de técnicos (anel maior + contorno) sem tocar o provider.
  readonly available: boolean;
  // J-MAPAS-10 — avatar do protótipo: fundo = cor AVC estável por id; borda 3px = grupo de status
  // (âmbar quando antiga); `off` esmaece o marcador (opacity .75, como o .st-off do protótipo).
  readonly avatarColor: string;
  readonly borderColor: string;
  readonly group: TechnicianLegendGroup;
  readonly off: boolean;
};

export type FieldLocationFeatureCollection = FeatureCollection<Point, FieldLocationFeatureProps>;

function toFeature(
  location: FieldLocationItem,
  selectedId: string | undefined,
  nowMs: number,
): Feature<Point, FieldLocationFeatureProps> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [location.longitude, location.latitude] },
    properties: {
      id: location.id,
      initials: getInitials(location.displayName),
      ringColor: getRingColor(location, nowMs),
      staleLevel: getStaleLevel(location.capturedAt, nowMs),
      selected: location.id === selectedId,
      displayName: location.displayName,
      available: isRingAvailable(location, nowMs),
      avatarColor: getAvatarColor(location.id),
      borderColor: getTechnicianBorderColor(location),
      group: getFieldLocationGroup(location.status),
      off: getFieldLocationGroup(location.status) === "off",
    },
  };
}

/** GeoJSON dos operadores em campo. Coordenadas inválidas são descartadas (nunca quebram o mapa). */
export function buildFieldLocationsFeatureCollection(
  locations: readonly FieldLocationItem[],
  selectedId: string | undefined,
  nowMs: number = Date.now(),
): FieldLocationFeatureCollection {
  const features = locations
    .filter(
      (location) =>
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude) &&
        Math.abs(location.latitude) <= 90 &&
        Math.abs(location.longitude) <= 180,
    )
    .map((location) => toFeature(location, selectedId, nowMs));
  return { type: "FeatureCollection", features };
}

// --- Animação de pin (interpolação ease-out entre a posição anterior e a nova) ---

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export type LngLat = readonly [number, number];

/** Interpola cada coordenada entre `from` e `to` por `progress` (0..1) com ease-out. */
export function interpolateCoords(from: LngLat, to: LngLat, progress: number): [number, number] {
  const eased = easeOutCubic(progress);
  return [lerp(from[0], to[0], eased), lerp(from[1], to[1], eased)];
}

export const OPERATIONS_MAP_SOURCE_ID = "field-operators";
export const OPERATIONS_MAP_ANIMATION_MS = 550;

// === Ω1b — pins de CHAMADO (ordens de serviço) ===

export const WORK_ORDERS_MAP_SOURCE_ID = "work-order-pins";

/**
 * R2 (junta Ω1b) — predicado ÚNICO de coordenada válida, compartilhado entre o construtor de pins
 * de OS e a separação com/sem-localização no adapter. Rejeita NaN, fora de faixa E o sentinela 0/0
 * (endereço não geocodificado costuma virar 0,0). Assim uma OS com coord inválida-porém-presente
 * volta para o painel "Sem localização" em vez de sumir (evita a "OS fantasma").
 */
export function isValidMapCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

// Cor do pin por prioridade (MapLibre não lê CSS var). J-MAPAS-10 (D-MAPA-PIXEL, divergência 2):
// paleta do PROTÓTIPO do dono — urg #ef4444 · alta #f59e0b · média #38bdf8 · baixa #64748b.
// Guard executado (plano §11.1): nenhum consumidor de WORK_ORDER_PRIORITY_HEX/getWorkOrderPriorityColor
// fora de frontend/src/modules/operations/map/ — troca de hex é segura no módulo.
export const WORK_ORDER_PRIORITY_HEX: Record<WorkOrderPriority, string> = {
  low: "#64748b",
  medium: "#38bdf8",
  high: "#f59e0b",
  urgent: "#ef4444",
};

// Chave PT-BR da prioridade — usada no icon-image do teardrop e nos swatches da legenda.
export const WORK_ORDER_PRIORITY_KEY: Record<WorkOrderPriority, "baixa" | "media" | "alta" | "urgente"> = {
  low: "baixa",
  medium: "media",
  high: "alta",
  urgent: "urgente",
};

// R8 (junta Ω1b) — priority no banco é free-form (default "medium"); qualquer valor fora do enum
// cai para "medium"/"media" para o icon-image sempre resolver uma imagem registrada.
export function getWorkOrderPriorityColor(priority: string): string {
  return WORK_ORDER_PRIORITY_HEX[priority as WorkOrderPriority] ?? WORK_ORDER_PRIORITY_HEX.medium;
}

export function getWorkOrderPriorityKey(priority: string): "baixa" | "media" | "alta" | "urgente" {
  return WORK_ORDER_PRIORITY_KEY[priority as WorkOrderPriority] ?? "media";
}

// === J-MAPAS-10 — LEGENDA-FILTRO do mapa — FONTE ÚNICA de verdade (8 itens verbatim) ===
// D6 do plano: a legenda do rodapé deixa de ser informativa e vira FILTRO de camadas com
// contagem no tooltip. Definição estática aqui (key/cor/rótulo/sufixo do tooltip); contagem e
// estado on/off são runtime (useLegendFilter). Cores derivadas das paletas únicas acima —
// nunca hex soltos. Substitui a antiga MAP_LEGEND_ITEMS (informativa, D-MAPA-PIXEL div. 4).

export type LegendGroupKey = TechnicianLegendGroup | "antiga" | "urg" | "alta" | "mb";

export type MapLegendFilterItem = {
  readonly key: LegendGroupKey;
  // "dot" = disco de técnico; "square" = losango de OS (quadrado 8px rotate 45° na barra).
  readonly kind: "dot" | "square";
  readonly color: string;
  readonly label: string;
  // Sufixo do tooltip: data-tip = `${contagem} ${tipSuffix}` (verbatim do protótipo).
  readonly tipSuffix: string;
};

export const MAP_LEGEND_FILTER_ITEMS: readonly MapLegendFilterItem[] = [
  { key: "disp", kind: "dot", color: TECH_GROUP_HEX.disp, label: "Disponível", tipSuffix: "disponíveis" },
  { key: "rota", kind: "dot", color: TECH_GROUP_HEX.rota, label: "Em rota", tipSuffix: "em rota" },
  { key: "atend", kind: "dot", color: TECH_GROUP_HEX.atend, label: "Em atendimento", tipSuffix: "em atendimento" },
  { key: "antiga", kind: "dot", color: TECH_STALE_HEX, label: "Localização antiga", tipSuffix: "com localização antiga" },
  { key: "off", kind: "dot", color: TECH_GROUP_HEX.off, label: "Fora de serviço", tipSuffix: "fora de serviço" },
  { key: "urg", kind: "square", color: WORK_ORDER_PRIORITY_HEX.urgent, label: "OS urgente", tipSuffix: "OS urgentes" },
  { key: "alta", kind: "square", color: WORK_ORDER_PRIORITY_HEX.high, label: "OS alta", tipSuffix: "OS alta" },
  { key: "mb", kind: "square", color: WORK_ORDER_PRIORITY_HEX.medium, label: "OS média/baixa", tipSuffix: "OS média/baixa" },
];

/** Grupo de legenda da OS por prioridade: urgent→urg · high→alta · medium/low→mb (protótipo). */
export function getWorkOrderLegendGroup(priority: string): "urg" | "alta" | "mb" {
  if (priority === "urgent") return "urg";
  if (priority === "high") return "alta";
  return "mb";
}

// === J-MAPAS-4 — foco de câmera na "cidade com mais técnicos" (CLUSTERING, custo ZERO) ===
// Helpers PUROS e DETERMINÍSTICOS (sem Date.now/Math.random dentro): agrupam os técnicos em campo
// por PROXIMIDADE GEOGRÁFICA (single-linkage/union-find sobre haversine) e escolhem o maior grupo.
// O "nome da cidade" NÃO existe sem geocoding (SKU pago, não carregado no loader) — o núcleo da
// regra do dono ("focar onde há mais técnicos") é 100% geometria local, sem chamada externa.

export type GeoPoint = { readonly id: string; readonly lat: number; readonly lng: number };

export type Cluster = {
  readonly pointIds: readonly string[];
  readonly count: number;
  readonly centroid: { readonly lat: number; readonly lng: number };
  readonly points: readonly GeoPoint[];
};

// Limiar de aglomeração. 50 km ≈ raio de uma região metropolitana: funde o jitter intra-cidade do
// seed (<< 50 km) num único grupo, mas mantém cidades distintas separadas (Curitiba↔SP ≈ 339 km).
export const FOCUS_CITY_CLUSTER_THRESHOLD_KM = 50;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distância em km pela fórmula de haversine (não caixa em graus: 1° de longitude encolhe com a
 * latitude; em km o limiar fica honesto e interpretável). Pura e determinística.
 */
export function haversineKm(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Centroide (média aritmética das coordenadas). Grupo vazio → (0,0) inócuo (nunca chamado assim). */
export function centroidOf(points: readonly GeoPoint[]): { lat: number; lng: number } {
  if (points.length === 0) return { lat: 0, lng: 0 };
  let sumLat = 0;
  let sumLng = 0;
  for (const point of points) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  return { lat: sumLat / points.length, lng: sumLng / points.length };
}

/**
 * Agrupa pontos por proximidade (single-linkage via union-find): dois pontos a ≤ `thresholdKm`
 * caem no mesmo grupo, com ligação transitiva. Coordenadas inválidas (NaN/fora de faixa/0,0) são
 * descartadas ANTES (predicado único `isValidMapCoordinate`). Determinismo garantido: ordena por
 * `id` antes do union-find e agrupa na ordem de aparição → mesma entrada (embaralhada) = mesma saída.
 * O(n²) é irrelevante (dezenas de técnicos). SEM Date.now/Math.random.
 */
export function clusterByProximity(
  points: readonly GeoPoint[],
  thresholdKm: number = FOCUS_CITY_CLUSTER_THRESHOLD_KM,
): Cluster[] {
  const valid = points.filter((point) => isValidMapCoordinate(point.lat, point.lng));
  const sorted = [...valid].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const parent = sorted.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]!]!; // path compression
      root = parent[root]!;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB);
  };

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (haversineKm(sorted[i]!, sorted[j]!) <= thresholdKm) union(i, j);
    }
  }

  const groups = new Map<number, GeoPoint[]>();
  for (let i = 0; i < sorted.length; i += 1) {
    const root = find(i);
    const bucket = groups.get(root);
    if (bucket) bucket.push(sorted[i]!);
    else groups.set(root, [sorted[i]!]);
  }

  return [...groups.values()].map((clusterPoints) => ({
    pointIds: clusterPoints.map((point) => point.id),
    count: clusterPoints.length,
    centroid: centroidOf(clusterPoints),
    points: clusterPoints,
  }));
}

export type ClusterTieBreak = (
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
) => number;

/**
 * Desempate PROXY determinístico (custo ZERO): oeste-primeiro (menor longitude), depois norte-sul
 * (menor latitude). NÃO é "nome da cidade em ordem alfabética" literal — obter o nome exigiria a
 * Geocoding API (SKU pago, `libraries=geocoding` ausente no loader). Divergência registrada em
 * `docs/maps/kb-mapas.md` e em `agent-orchestration/controle/`. Retorna <0 se `a` deve vencer `b`.
 */
export const westFirstTieBreak: ClusterTieBreak = (a, b) => {
  if (a.lng !== b.lng) return a.lng - b.lng;
  return a.lat - b.lat;
};

/**
 * Cluster vencedor = maior `count`; empate no máximo → `tieBreak` (default proxy oeste-primeiro).
 * `tieBreak` é INJETÁVEL: a versão fiel (reverse-geocode SÓ dos centroides empatados, cacheado)
 * fica como seam atrás do gate de custo — não entra neste bloco. Sem clusters → `null` (fallback).
 */
export function pickFocusCluster(
  clusters: readonly Cluster[],
  tieBreak: ClusterTieBreak = westFirstTieBreak,
): Cluster | null {
  if (clusters.length === 0) return null;
  let best = clusters[0]!;
  for (let i = 1; i < clusters.length; i += 1) {
    const candidate = clusters[i]!;
    if (candidate.count > best.count) {
      best = candidate;
    } else if (candidate.count === best.count && tieBreak(candidate.centroid, best.centroid) < 0) {
      best = candidate;
    }
  }
  return best;
}

export type WorkOrderPinFeatureProps = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly priority: WorkOrderPriority;
  readonly priorityKey: "baixa" | "media" | "alta" | "urgente";
  readonly priorityColor: string;
  readonly urgent: boolean;
  readonly selected: boolean;
  readonly customerName: string | null;
  // M-5 (J-MAPAS-6) — gatilho do pulso `wo-pulse`: urgente (comportamento herdado) OU id recém-chegado
  // (alerta de OS nova, via `pulseIds`). Estende o pulso existente SEM criar camada nova.
  readonly pulse: boolean;
};

export type WorkOrderPinFeatureCollection = FeatureCollection<Point, WorkOrderPinFeatureProps>;

/**
 * GeoJSON dos pins de chamado. Coordenada inválida (predicado único) é descartada — nunca 0,0.
 * M-5 — `pulseIds` (opcional) = ids que devem PULSAR por serem recém-chegados; combinam com o pulso
 * herdado de urgente. Ausente/vazio → só urgentes pulsam (comportamento anterior preservado).
 */
export function buildWorkOrderPinsFeatureCollection(
  pins: readonly OperationsMapWorkOrderPin[],
  selectedId: string | undefined,
  pulseIds?: ReadonlySet<string>,
): WorkOrderPinFeatureCollection {
  const features = pins
    .filter((pin) => isValidMapCoordinate(pin.latitude, pin.longitude))
    .map<Feature<Point, WorkOrderPinFeatureProps>>((pin) => {
      const urgent = pin.priority === "urgent";
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [pin.longitude, pin.latitude] },
        properties: {
          id: pin.id,
          code: pin.code,
          title: pin.title,
          priority: pin.priority,
          priorityKey: getWorkOrderPriorityKey(pin.priority),
          priorityColor: getWorkOrderPriorityColor(pin.priority),
          urgent,
          selected: pin.id === selectedId,
          customerName: pin.customerName ?? null,
          pulse: urgent || (pulseIds?.has(pin.id) ?? false),
        },
      };
    });
  return { type: "FeatureCollection", features };
}
