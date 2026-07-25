import { isMockMode } from "../../config/env";
import { ApiError, apiRequest } from "../../services/api/client";
import { adaptAccess, adaptDevices, adaptKm, adaptRefusals, adaptTrack } from "./telemetry.adapter";
import type {
  TelemetryAccessView,
  TelemetryApiContext,
  TelemetryData,
  TelemetryDeviceView,
  TelemetryKmView,
  TelemetryPeriod,
  TelemetryRefusalView,
  TrackView,
} from "./telemetry.types";
import { emptyTelemetry } from "./telemetry.types";

// Ω4C PR-14 — services frontend das 4 telas de Telemetria (gate telemetry:read no backend, PR-12). Consomem
// SÓ o endpoint respectivo; NENHUM toca /telemetry/track (coordenada crua = mapa/PR-15). D-007: modo mock →
// lista VAZIA honesta; 403 → "acesso não permitido"; 422 (janela) → estado honesto; erro real → fallback.
// O front NUNCA inventa linha nem coordenada.

type TelemetryQuery = {
  readonly professionalId?: string;
  readonly period?: TelemetryPeriod;
};

// Monta a querystring de leitura (professionalId + De/Até). Período vazio → sem from/to → backend aplica as
// últimas 24h (TELEMETRY_DEFAULT_WINDOW_HOURS). Nunca serializa campo sensível.
export function buildTelemetryQuery(query: TelemetryQuery): string {
  const params = new URLSearchParams();
  const professionalId = query.professionalId?.trim();
  if (professionalId) params.set("professionalId", professionalId);
  const from = query.period?.from?.trim();
  const to = query.period?.to?.trim();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params.size ? `?${params.toString()}` : "";
}

// 403 → forbidden (acesso não permitido); 422 → invalid_window (janela grande/inválida — professionalId já é
// garantido pelo chamador, então o único 422 alcançável aqui é de janela); demais → fallback.
function mapTelemetryError<T>(error: unknown): TelemetryData<T> {
  if (error instanceof ApiError) {
    if (error.status === 403) return emptyTelemetry<T>("forbidden");
    if (error.status === 422) return emptyTelemetry<T>("invalid_window");
  }
  return emptyTelemetry<T>("fallback");
}

// Quilometragem (GET /telemetry/km) — EXIGE professionalId no backend; o chamador só invoca com um selecionado.
export async function getTelemetryKm(context: TelemetryApiContext, query: TelemetryQuery): Promise<TelemetryData<TelemetryKmView>> {
  if (isMockMode()) return emptyTelemetry("mock");
  try {
    const payload = await apiRequest<{ data: unknown }>(`/telemetry/km${buildTelemetryQuery(query)}`, context);
    return { items: adaptKm(payload.data), source: "api" };
  } catch (error) {
    return mapTelemetryError(error);
  }
}

// Acessos do app (GET /telemetry/access) — EXIGE professionalId.
export async function getTelemetryAccess(context: TelemetryApiContext, query: TelemetryQuery): Promise<TelemetryData<TelemetryAccessView>> {
  if (isMockMode()) return emptyTelemetry("mock");
  try {
    const payload = await apiRequest<{ data: unknown }>(`/telemetry/access${buildTelemetryQuery(query)}`, context);
    return { items: adaptAccess(payload.data), source: "api" };
  } catch (error) {
    return mapTelemetryError(error);
  }
}

// Recusas (GET /telemetry/refusals) — EXIGE professionalId.
export async function getTelemetryRefusals(context: TelemetryApiContext, query: TelemetryQuery): Promise<TelemetryData<TelemetryRefusalView>> {
  if (isMockMode()) return emptyTelemetry("mock");
  try {
    const payload = await apiRequest<{ data: unknown }>(`/telemetry/refusals${buildTelemetryQuery(query)}`, context);
    return { items: adaptRefusals(payload.data), source: "api" };
  } catch (error) {
    return mapTelemetryError(error);
  }
}

// Dispositivos (GET /telemetry/devices) — NÃO exige professionalId (lista do tenant inteiro).
export async function getTelemetryDevices(context: TelemetryApiContext, query: TelemetryQuery = {}): Promise<TelemetryData<TelemetryDeviceView>> {
  if (isMockMode()) return emptyTelemetry("mock");
  try {
    const payload = await apiRequest<{ data: unknown }>(`/telemetry/devices${buildTelemetryQuery(query)}`, context);
    return { items: adaptDevices(payload.data), source: "api" };
  } catch (error) {
    return mapTelemetryError(error);
  }
}

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — Rastreamento (GET /telemetry/track) — ÚNICO endpoint com coordenada
// crua (gated forte telemetry:read + consent-gate na origem). EXIGE professionalId (o chamador só invoca com
// um selecionado; sem seleção o hook para no needs_professional e NÃO chama). Backend ordena por captured_at
// ASC e projeta o allowlist §2.8; o adapter reforça a projeção. 403 → forbidden; 422 (from>to / janela >
// teto) → invalid_window honesto. NUNCA loga coordenada.
export async function getTelemetryTrack(context: TelemetryApiContext, query: TelemetryQuery): Promise<TelemetryData<TrackView>> {
  if (isMockMode()) return emptyTelemetry("mock");
  try {
    const payload = await apiRequest<{ data: unknown }>(`/telemetry/track${buildTelemetryQuery(query)}`, context);
    return { items: adaptTrack(payload.data), source: "api" };
  } catch (error) {
    return mapTelemetryError(error);
  }
}
