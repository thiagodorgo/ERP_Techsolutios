import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import type { WorkOrdersApiContext } from "../work-orders.types";

// Ω3F-8b (J-MAPAS-5) — camada de dados da aba Mapa da OS. Contrato:
//   GET  /work-orders/:id/map-start-points  → { origin, destination, technician, bases } (read minimizado)
//   POST /work-orders/:id/geocode            → geocode da ORIGEM (Ω1b-2, já existente)
//   POST /work-orders/:id/geocode-destination→ geocode do DESTINO (Ω3F-8b)
// Leitura DEFENSIVA (campos podem evoluir). Modo mock → vazio honesto (sem coordenadas fabricadas).

export type MapPoint = {
  readonly latitude: number;
  readonly longitude: number;
  readonly address: string | null;
};

export type MapBase = {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
};

export type MapTechnicianPoint = {
  readonly latitude: number;
  readonly longitude: number;
  /** Carimbo de idade (ISO) da última posição do técnico atribuído — dirige o estado "desatualizada". */
  readonly capturedAt: string;
};

export type WorkOrderMapStartPoints = {
  readonly origin: MapPoint | null;
  readonly destination: MapPoint | null;
  readonly technician: MapTechnicianPoint | null;
  readonly bases: readonly MapBase[];
};

export type GeocodeAttemptResult = {
  readonly geocoded: boolean;
  readonly reason?: string;
};

const EMPTY: WorkOrderMapStartPoints = { origin: null, destination: null, technician: null, bases: [] };

function basePath(workOrderId: string): string {
  return `/work-orders/${encodeURIComponent(workOrderId)}`;
}

export async function fetchMapStartPoints(
  context: WorkOrdersApiContext,
  workOrderId: string,
): Promise<WorkOrderMapStartPoints> {
  if (isMockMode()) return EMPTY;

  const response = await apiRequest<unknown>(`${basePath(workOrderId)}/map-start-points`, context);
  return adaptMapStartPoints(readData(response));
}

export async function geocodeWorkOrderOrigin(
  context: WorkOrdersApiContext,
  workOrderId: string,
  force = false,
): Promise<GeocodeAttemptResult> {
  const response = await apiRequest<unknown>(`${basePath(workOrderId)}/geocode`, {
    ...context,
    method: "POST",
    body: { force },
  });
  return adaptGeocodeAttempt(readData(response));
}

export async function geocodeWorkOrderDestination(
  context: WorkOrdersApiContext,
  workOrderId: string,
  force = false,
): Promise<GeocodeAttemptResult> {
  const response = await apiRequest<unknown>(`${basePath(workOrderId)}/geocode-destination`, {
    ...context,
    method: "POST",
    body: { force },
  });
  return adaptGeocodeAttempt(readData(response));
}

// ---------- adapters (leitura defensiva) ----------

function adaptMapStartPoints(value: unknown): WorkOrderMapStartPoints {
  const record = asRecord(value);
  return {
    origin: adaptPoint(record.origin),
    destination: adaptPoint(record.destination),
    technician: adaptTechnician(record.technician),
    bases: adaptBases(record.bases),
  };
}

function adaptPoint(value: unknown): MapPoint | null {
  const record = asRecord(value);
  const latitude = readNumber(record.latitude);
  const longitude = readNumber(record.longitude);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude, address: readString(record.address) ?? null };
}

function adaptTechnician(value: unknown): MapTechnicianPoint | null {
  const record = asRecord(value);
  const latitude = readNumber(record.latitude);
  const longitude = readNumber(record.longitude);
  const capturedAt = readString(record.capturedAt ?? record.captured_at);
  if (latitude === null || longitude === null || !capturedAt) return null;
  return { latitude, longitude, capturedAt };
}

function adaptBases(value: unknown): MapBase[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): MapBase | null => {
      const record = asRecord(raw);
      const id = readString(record.id);
      const name = readString(record.name);
      const latitude = readNumber(record.latitude);
      const longitude = readNumber(record.longitude);
      if (!id || !name || latitude === null || longitude === null) return null;
      return { id, name, latitude, longitude };
    })
    .filter((base): base is MapBase => base !== null);
}

function adaptGeocodeAttempt(value: unknown): GeocodeAttemptResult {
  const record = asRecord(value);
  return {
    geocoded: record.geocoded === true,
    reason: readString(record.reason),
  };
}

function readData(response: unknown): unknown {
  const record = asRecord(response);
  return "data" in record ? record.data : response;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
