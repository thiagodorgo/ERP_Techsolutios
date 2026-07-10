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

export type FieldLocationFeatureProps = {
  readonly id: string;
  readonly initials: string;
  readonly ringColor: string;
  readonly staleLevel: StaleLevel;
  readonly selected: boolean;
  readonly displayName: string;
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

// Cor do pin por prioridade (MapLibre não lê CSS var; tokens.css espelha os mesmos hex para o DOM).
export const WORK_ORDER_PRIORITY_HEX: Record<WorkOrderPriority, string> = {
  low: "#94a3b8",
  medium: "#64748b",
  high: "#d97706",
  urgent: "#dc2626",
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
};

export type WorkOrderPinFeatureCollection = FeatureCollection<Point, WorkOrderPinFeatureProps>;

/** GeoJSON dos pins de chamado. Coordenada inválida (predicado único) é descartada — nunca 0,0. */
export function buildWorkOrderPinsFeatureCollection(
  pins: readonly OperationsMapWorkOrderPin[],
  selectedId: string | undefined,
): WorkOrderPinFeatureCollection {
  const features = pins
    .filter((pin) => isValidMapCoordinate(pin.latitude, pin.longitude))
    .map<Feature<Point, WorkOrderPinFeatureProps>>((pin) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [pin.longitude, pin.latitude] },
      properties: {
        id: pin.id,
        code: pin.code,
        title: pin.title,
        priority: pin.priority,
        priorityKey: getWorkOrderPriorityKey(pin.priority),
        priorityColor: getWorkOrderPriorityColor(pin.priority),
        urgent: pin.priority === "urgent",
        selected: pin.id === selectedId,
        customerName: pin.customerName ?? null,
      },
    }));
  return { type: "FeatureCollection", features };
}
