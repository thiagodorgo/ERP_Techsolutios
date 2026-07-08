import { isMockMode } from "../../../config/env";
import { apiBlobRequest, apiFormDataRequest, apiRequest } from "../../../services/api/client";
import { adaptDamageAttachment, adaptDamageResponse, adaptDamagesResponse } from "./damages.adapter";
import type {
  Damage,
  DamageApiContext,
  DamageAttachment,
  DamageAttachmentDownloadResult,
  DamageAttachmentUploadOptions,
  DamageCreatePayload,
  DamageData,
  DamageFilters,
  DamageUpdatePayload,
} from "./damages.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listDamagesFromApi(context: DamageApiContext, params: Partial<DamageFilters> = {}): Promise<DamageData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/damages${buildQuery(params)}`, context);
    return adaptDamagesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os danos da frota.",
    };
  }
}

// GET /damages/:id — inclui os anexos (fotos) do dano.
export async function getDamage(context: DamageApiContext, id: string): Promise<Damage | null> {
  const response = await apiRequest<unknown>(`/damages/${id}`, context);
  return adaptDamageResponse(response);
}

export async function createDamage(context: DamageApiContext, payload: DamageCreatePayload): Promise<Damage | null> {
  const response = await apiRequest<unknown>("/damages", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptDamageResponse(response);
}

// Único PATCH do módulo: edição de campos, transição de situação e desativação lógica.
export async function updateDamage(context: DamageApiContext, id: string, patch: DamageUpdatePayload): Promise<Damage | null> {
  const response = await apiRequest<unknown>(`/damages/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptDamageResponse(response);
}

// ── Anexos (fotos) — multipart, stream autenticado, exclusão ─────────────────
export async function listDamageAttachments(context: DamageApiContext, damageId: string): Promise<DamageAttachment[]> {
  const response = await apiRequest<unknown>(`/damages/${damageId}/attachments`, context);
  const payload = (response as { data?: unknown }) ?? {};
  const record = (payload.data as { items?: unknown } | undefined) ?? (payload as { items?: unknown });
  const items = Array.isArray(record?.items) ? record.items : Array.isArray(payload.data) ? payload.data : [];
  return items
    .map((item) => adaptDamageAttachment(item, damageId))
    .filter((item): item is DamageAttachment => Boolean(item));
}

export async function uploadDamageAttachment(
  context: DamageApiContext,
  damageId: string,
  file: File,
  options: DamageAttachmentUploadOptions = {},
): Promise<DamageAttachment | null> {
  const body = new FormData();
  body.set("file", file);
  if (options.x !== undefined && Number.isFinite(options.x)) body.set("x", String(options.x));
  if (options.y !== undefined && Number.isFinite(options.y)) body.set("y", String(options.y));
  if (options.description?.trim()) body.set("description", options.description.trim());

  const response = await apiFormDataRequest<unknown>(`/damages/${damageId}/attachments`, {
    ...context,
    method: "POST",
    body,
  });
  const payload = readData(response);
  return adaptDamageAttachment(payload, damageId);
}

// Stream autenticado → object URL (revogado no unmount pela tela).
export async function downloadDamageAttachment(
  context: DamageApiContext,
  damageId: string,
  attachmentId: string,
): Promise<DamageAttachmentDownloadResult> {
  const result = await apiBlobRequest(`/damages/${damageId}/attachments/${attachmentId}/download`, context);
  const mimeType = result.contentType ?? result.blob.type ?? "application/octet-stream";
  return {
    blob: result.blob,
    objectUrl: URL.createObjectURL(result.blob),
    fileName: sanitizeDownloadFileName(result.fileName ?? "foto-dano"),
    mimeType,
  };
}

export async function deleteDamageAttachment(context: DamageApiContext, damageId: string, attachmentId: string): Promise<void> {
  await apiRequest<unknown>(`/damages/${damageId}/attachments/${attachmentId}`, {
    ...context,
    method: "DELETE",
  });
}

export function revokeDamageAttachmentUrl(url: string | null | undefined): void {
  if (url && url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

function readData(response: unknown): unknown {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data?: unknown }).data;
  }
  return response;
}

function sanitizeDownloadFileName(fileName: string): string {
  return fileName.replace(/["\\/:*?<>|\r\n]/g, "_");
}

function buildQuery(params: Partial<DamageFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.vehicleId?.trim()) query.set("vehicle_id", params.vehicleId.trim());
  if (params.workOrderId?.trim()) query.set("work_order_id", params.workOrderId.trim());
  if (params.status) query.set("status", params.status);
  if (params.gravidade) query.set("gravidade", params.gravidade);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}
