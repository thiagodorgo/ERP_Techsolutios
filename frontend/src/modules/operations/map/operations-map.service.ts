import { isMockMode, readFrontendEnv } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import {
  adaptFieldLocationsResponse,
  attachDispatchesToFieldLocations,
  attachWorkOrdersToFieldLocations,
  deriveInsuredVehicleIds,
  deriveMaintenanceVehicleIds,
} from "./operations-map.adapter";
import { adaptDispatchesResponse } from "../dispatches/dispatches.adapter";
import { adaptWorkOrdersResponse } from "../../work-orders/work-orders.adapter";
import { listMaintenanceOrdersFromApi } from "../../fleet/maintenance/maintenance-orders.service";
import { listInsurancePoliciesFromApi } from "../../fleet/insurance/insurance.service";
import type {
  FieldLocationHistoryParams,
  FieldLocationItem,
  OperationsMapApiContext,
  OperationsMapData,
  OperationsMapRealtimeEvent,
} from "./operations-map.types";
import type { WorkOrderListItem } from "../../work-orders/work-orders.types";
import type { DispatchListItem } from "../dispatches/dispatches.types";

type OperationsMapEventHandlers = {
  readonly onEvent: (event: OperationsMapRealtimeEvent) => void;
  readonly onOpen?: () => void;
  readonly onError?: (error: unknown) => void;
};

// Janela única por refresh das fontes de Frota (R6.4); client-side sobre ela.
const FLEET_BADGE_FETCH_LIMIT = 200;

// D-007 (decisão registrada): NUNCA fabricar pin. Modo mock → dataset VAZIO
// (source "mock"); erro real de API → dataset VAZIO + razão (source "fallback").
// Lista vazia vinda da API é estado vazio LEGÍTIMO (source "api"), não fallback.
export async function getLatestFieldLocations(context: OperationsMapApiContext): Promise<OperationsMapData> {
  if (isMockMode()) return { locations: [], source: "mock" };

  try {
    const response = await apiRequest<unknown>("/field-locations/latest", context);
    const locations = adaptFieldLocationsResponse(response);

    if (locations.length === 0) {
      return { locations, source: "api" };
    }

    return enrichOperationsMapData(context, {
      locations,
      source: "api",
    });
  } catch {
    return {
      locations: [],
      source: "fallback",
      fallbackReason: "Não foi possível consultar a API de localização.",
    };
  }
}

export async function getFieldLocationHistory(
  context: OperationsMapApiContext,
  params: FieldLocationHistoryParams,
): Promise<FieldLocationItem[]> {
  // D-007: sem histórico fabricado em modo mock.
  if (isMockMode()) return [];

  const query = new URLSearchParams({
    operatorUserId: params.operatorUserId,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  });
  const response = await apiRequest<unknown>(`/field-locations/history?${query.toString()}`, context);

  return adaptFieldLocationsResponse(response);
}

export function subscribeOperationsMapEvents(
  context: OperationsMapApiContext,
  handlers: OperationsMapEventHandlers,
): () => void {
  if (isMockMode()) return () => undefined;

  const controller = new AbortController();

  void consumeOperationsMapEventStream(context, controller.signal, handlers)
    .then(() => {
      if (!controller.signal.aborted) {
        handlers.onError?.(new Error("Operations map event stream ended."));
      }
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        handlers.onError?.(error);
      }
    });

  return () => controller.abort();
}

async function enrichOperationsMapData(
  context: OperationsMapApiContext,
  data: OperationsMapData,
): Promise<OperationsMapData> {
  let enrichedData = data;

  if (hasWorkOrdersRead(context)) {
    const workOrders = await listReadableWorkOrdersForMap(context);
    if (workOrders.length > 0) {
      enrichedData = {
        ...enrichedData,
        locations: attachWorkOrdersToFieldLocations(enrichedData.locations, workOrders),
      };
    }
  }

  enrichedData = await enrichOperationsMapWithDispatches(context, enrichedData);

  return enrichOperationsMapWithFleetBadges(context, enrichedData);
}

// D-007: enriquecimento é real ou vazio — erro em fonte auxiliar nunca fabrica linhas.
async function listReadableWorkOrdersForMap(context: OperationsMapApiContext): Promise<WorkOrderListItem[]> {
  try {
    const response = await apiRequest<unknown>("/work-orders", context);
    return adaptWorkOrdersResponse(response, "api").items;
  } catch {
    return [];
  }
}

function hasWorkOrdersRead(context: OperationsMapApiContext): boolean {
  return context.permissions?.includes("work_orders:read") ?? false;
}

async function enrichOperationsMapWithDispatches(
  context: OperationsMapApiContext,
  data: OperationsMapData,
): Promise<OperationsMapData> {
  if (!hasDispatchRead(context)) return data;

  const dispatches = await listReadableDispatchesForMap(context);
  if (dispatches.length === 0) return data;

  return {
    ...data,
    locations: attachDispatchesToFieldLocations(data.locations, dispatches),
  };
}

async function listReadableDispatchesForMap(context: OperationsMapApiContext): Promise<DispatchListItem[]> {
  try {
    const response = await apiRequest<unknown>("/operations/dispatches", context);
    return adaptDispatchesResponse(response, "api").items;
  } catch {
    return [];
  }
}

function hasDispatchRead(context: OperationsMapApiContext): boolean {
  return context.permissions?.includes("field_dispatch:read") ?? false;
}

// R6.4 — badges "Em manutenção" (F2) e "Sem seguro" (F4) no pin da viatura.
// Uma busca por refresh, gated pela permissão do papel; sem permissão → sem fetch e
// sem badge. Só aplica conjuntos vindos da API real (source === "api") — fallback de
// erro nunca vira "todo mundo sem seguro".
async function enrichOperationsMapWithFleetBadges(
  context: OperationsMapApiContext,
  data: OperationsMapData,
): Promise<OperationsMapData> {
  const hasVehicleLinked = data.locations.some((location) => Boolean(location.currentWorkOrder?.vehicleId));
  if (!hasVehicleLinked) return data;

  let enrichedData = data;

  if (hasMaintenanceRead(context)) {
    const maintenance = await listMaintenanceOrdersFromApi(context, {
      status: "em_execucao",
      isActive: "active",
      limit: FLEET_BADGE_FETCH_LIMIT,
    });
    if (maintenance.source === "api") {
      enrichedData = { ...enrichedData, maintenanceVehicleIds: deriveMaintenanceVehicleIds(maintenance.items) };
    }
  }

  if (hasInsuranceRead(context)) {
    const insurance = await listInsurancePoliciesFromApi(context, {
      status: "vigente",
      isActive: "active",
      limit: FLEET_BADGE_FETCH_LIMIT,
    });
    if (insurance.source === "api") {
      enrichedData = { ...enrichedData, insuredVehicleIds: deriveInsuredVehicleIds(insurance.items) };
    }
  }

  return enrichedData;
}

function hasMaintenanceRead(context: OperationsMapApiContext): boolean {
  return context.permissions?.includes("maintenance_orders:read") ?? false;
}

function hasInsuranceRead(context: OperationsMapApiContext): boolean {
  return context.permissions?.includes("insurance_policies:read") ?? false;
}

async function consumeOperationsMapEventStream(
  context: OperationsMapApiContext,
  signal: AbortSignal,
  handlers: OperationsMapEventHandlers,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/operations/field-events/stream`, {
    method: "GET",
    headers: buildRealtimeHeaders(context),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Operations map event stream failed: ${response.status}`);
  }

  handlers.onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split(/\r?\n\r?\n/);
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const parsed = parseSseMessage(message);
      if (parsed.eventName !== "field_ops_event" || !parsed.data) continue;

      handlers.onEvent(JSON.parse(parsed.data) as OperationsMapRealtimeEvent);
    }
  }
}

function parseSseMessage(message: string): { eventName: string; data: string } {
  let eventName = "message";
  const data: string[] = [];

  for (const line of message.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  return { eventName, data: data.join("\n") };
}

function buildRealtimeHeaders(context: OperationsMapApiContext): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };

  if (context.token) {
    headers.Authorization = `Bearer ${context.token}`;
  }

  return headers;
}

function apiBaseUrl(): string {
  return readFrontendEnv("VITE_API_BASE_URL", "/api/v1");
}
