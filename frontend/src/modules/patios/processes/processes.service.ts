import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import {
  adaptChecklistRunsResponse,
  adaptEventsResponse,
  adaptInspectionResponse,
  adaptProcessDetailResponse,
  adaptProcessesResponse,
  adaptVerifyResponse,
} from "./processes.adapter";
import type {
  ChecklistRunSummaryItem,
  CustodyEventItem,
  InspectionView,
  ProcessCreatePayload,
  ProcessDetail,
  ProcessesApiContext,
  ProcessesData,
  ProcessesFilters,
  VerifyResult,
} from "./processes.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listProcessesFromApi(context: ProcessesApiContext, params: Partial<ProcessesFilters> = {}): Promise<ProcessesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/impound-processes${buildQuery(params)}`, context);
    return adaptProcessesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os processos de custódia.",
    };
  }
}

// Processos de um pátio — usado no JOIN client-side do mapa (placa/status por currentProcessId). Mock → vazio.
export async function listProcessesByYard(context: ProcessesApiContext, yardId: string): Promise<ProcessesData["items"]> {
  if (isMockMode() || !yardId) return [];
  try {
    const response = await apiRequest<unknown>(`/impound-processes?yard_id=${encodeURIComponent(yardId)}&limit=200`, context);
    return adaptProcessesResponse(response, "api").items;
  } catch {
    return [];
  }
}

export async function getProcess(context: ProcessesApiContext, processId: string): Promise<ProcessDetail | null> {
  const response = await apiRequest<unknown>(`/impound-processes/${processId}`, context);
  return adaptProcessDetailResponse(response);
}

export async function createProcess(context: ProcessesApiContext, payload: ProcessCreatePayload): Promise<ProcessDetail | null> {
  const response = await apiRequest<unknown>("/impound-processes", { ...context, method: "POST", body: toCreateBody(payload) });
  return adaptProcessDetailResponse(response);
}

// Timeline de eventos (I2). Mock → vazio (D-007).
export async function listEvents(context: ProcessesApiContext, processId: string): Promise<CustodyEventItem[]> {
  if (isMockMode()) return [];
  const response = await apiRequest<unknown>(`/impound-processes/${processId}/events`, context);
  return adaptEventsResponse(response);
}

// Verificação da cadeia (I2). Mock → null (sem selo fabricado).
export async function verifyChain(context: ProcessesApiContext, processId: string): Promise<VerifyResult | null> {
  if (isMockMode()) return null;
  const response = await apiRequest<unknown>(`/impound-processes/${processId}/verify`, context);
  return adaptVerifyResponse(response);
}

// Vistoria de recepção (leitura). Mock → null; 404 IMPOUND_INSPECTION_NOT_FOUND → null (EmptyState honesto).
export async function getInspection(context: ProcessesApiContext, processId: string): Promise<InspectionView> {
  if (isMockMode()) return null;
  try {
    const response = await apiRequest<unknown>(`/impound-processes/${processId}/inspection`, context);
    return adaptInspectionResponse(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Ω-VID PR-08 — Checklist do Guincho vinculado ao processo (aba do dossiê). GET /impound-processes/:id/checklist-runs
// sob guarda DUPLA no backend (impound:read + checklist_runs:read); o endpoint devolve o resumo ESTREITO {items}.
// Mock → []; erros (403 denied / outros) sobem para o hook decidir o estado. Consome o AUTO-link criado no PR-05.
export async function listProcessChecklistRuns(context: ProcessesApiContext, processId: string): Promise<ChecklistRunSummaryItem[]> {
  if (isMockMode()) return [];
  const response = await apiRequest<unknown>(`/impound-processes/${processId}/checklist-runs`, context);
  return adaptChecklistRunsResponse(response);
}

// Movimentação de vaga (I1 atômico no backend). allocate/vacate/move → impound:allocate; a UI delega ao 409/422.
export async function allocateSpot(context: ProcessesApiContext, processId: string, spotId: string): Promise<ProcessDetail | null> {
  const response = await apiRequest<unknown>(`/impound-processes/${processId}/spot`, { ...context, method: "POST", body: { spot_id: spotId } });
  return adaptProcessDetailResponse(response);
}

export async function vacateSpot(context: ProcessesApiContext, processId: string, spotId: string): Promise<ProcessDetail | null> {
  const response = await apiRequest<unknown>(`/impound-processes/${processId}/spot`, { ...context, method: "DELETE", body: { spot_id: spotId } });
  return adaptProcessDetailResponse(response);
}

// move cobre intra-pátio (SPOT_MOVED) e cross-pátio (YARD_TRANSFER) — o backend classifica pelo destino.
export async function moveSpot(context: ProcessesApiContext, processId: string, fromSpotId: string, toSpotId: string): Promise<ProcessDetail | null> {
  const response = await apiRequest<unknown>(`/impound-processes/${processId}/spot/move`, {
    ...context,
    method: "POST",
    body: { from_spot_id: fromSpotId, to_spot_id: toSpotId },
  });
  return adaptProcessDetailResponse(response);
}

// Corpo em snake_case (contrato REST do backend — impound.service.ts create). Só campos preenchidos.
function toCreateBody(payload: ProcessCreatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    profile_id: payload.profileId,
    origin_authority: payload.originAuthority.trim(),
  };
  if (payload.yardId) body.yard_id = payload.yardId;
  if (payload.vehicleUnidentified) {
    body.vehicle_unidentified = true;
    if (payload.unidentifiedReason?.trim()) body.unidentified_reason = payload.unidentifiedReason.trim();
  } else {
    if (payload.vehiclePlate?.trim()) body.vehicle_plate = payload.vehiclePlate.trim();
    if (payload.vehicleChassis?.trim()) body.vehicle_chassis = payload.vehicleChassis.trim();
    if (payload.vehicleRenavam?.trim()) body.vehicle_renavam = payload.vehicleRenavam.trim();
  }
  if (payload.vehicleBrand?.trim()) body.vehicle_brand = payload.vehicleBrand.trim();
  if (payload.vehicleModel?.trim()) body.vehicle_model = payload.vehicleModel.trim();
  if (payload.vehicleColor?.trim()) body.vehicle_color = payload.vehicleColor.trim();
  if (typeof payload.vehicleYear === "number" && Number.isFinite(payload.vehicleYear)) body.vehicle_year = payload.vehicleYear;
  if (payload.originAgentName?.trim()) body.origin_agent_name = payload.originAgentName.trim();
  if (payload.authorityCaseNumber?.trim()) body.authority_case_number = payload.authorityCaseNumber.trim();
  if (payload.incidentReportNumber?.trim()) body.incident_report_number = payload.incidentReportNumber.trim();
  if (payload.legalBasis?.trim()) body.legal_basis = payload.legalBasis.trim();
  return body;
}

function buildQuery(params: Partial<ProcessesFilters>): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.yardId?.trim()) query.set("yard_id", params.yardId.trim());
  const plate = params.plate?.trim();
  if (plate) query.set("plate", plate);
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
