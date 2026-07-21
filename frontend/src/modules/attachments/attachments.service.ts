import { isMockMode } from "../../config/env";
import { ApiError, apiBlobRequest, apiFormDataRequest, apiRequest } from "../../services/api/client";
import { adaptAttachments } from "./attachments.adapter";
import type {
  AttachmentDownloadResult,
  AttachmentEntityType,
  AttachmentView,
  AttachmentsApiContext,
  AttachmentsData,
} from "./attachments.types";
import { emptyAttachments } from "./attachments.types";

// PR-01 Ω4C — service frontend dos anexos genéricos (base /api/v1/attachments). Permissão HERDADA da
// entidade-alvo (D-Ω4C-ANEXOS-RBAC): read=`<ent>:read`, write=`<ent>:create`, delete=`<ent>:update`.
// D-007: modo mock → lista VAZIA (nada fabricado); 403 → vazio + `forbidden:true` (a UI mostra "acesso
// não permitido", não é erro de sistema); qualquer outro erro (5xx/rede) → vazio + `source:"fallback"`
// (a UI avisa e o refresh tenta de novo). §2.8: o adapter só projeta a allow-list — nada de storageKey.

// GET /attachments?entityType&entityId → { items: AttachmentDto[] } (defensivo a envelope `{data}`).
export async function listAttachments(
  context: AttachmentsApiContext,
  entityType: AttachmentEntityType,
  entityId: string,
): Promise<AttachmentsData> {
  if (isMockMode()) return emptyAttachments("mock"); // D-007: sem anexo fabricado em mock
  if (!entityId) return emptyAttachments("api"); // registro ainda sem id → sem consulta (estado vazio honesto)

  try {
    const query = `?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`;
    const raw = await apiRequest<unknown>(`/attachments${query}`, context);
    return { items: adaptAttachments(extractItems(raw)), source: "api", forbidden: false };
  } catch (err) {
    // 403 = gate RBAC herdado (`<ent>:read`) → estado "acesso não permitido" (não é falha de sistema).
    if (err instanceof ApiError && err.status === 403) {
      return { ...emptyAttachments("fallback"), forbidden: true };
    }
    return emptyAttachments("fallback"); // erro real → vazio honesto; NUNCA fabrica anexo
  }
}

// POST /attachments (multipart: file, entity_type, entity_id, opc client_action_id) → { data: AttachmentDto }.
export async function uploadAttachment(
  context: AttachmentsApiContext,
  entityType: AttachmentEntityType,
  entityId: string,
  file: File,
  clientActionId?: string,
  description?: string,
): Promise<AttachmentView | null> {
  const body = new FormData();
  body.set("file", file);
  body.set("entity_type", entityType);
  body.set("entity_id", entityId);
  if (clientActionId?.trim()) body.set("client_action_id", clientActionId.trim()); // idempotência (RN-ANEXO-06)
  if (description?.trim()) body.set("description", description.trim());

  const response = await apiFormDataRequest<unknown>("/attachments", { ...context, method: "POST", body });
  const [view] = adaptAttachments([readData(response)]);
  return view ?? null;
}

// GET /attachments/:id/download (só status=stored; senão 409) — stream autenticado → object URL.
export async function downloadAttachment(
  context: AttachmentsApiContext,
  attachmentId: string,
  fileName?: string,
): Promise<AttachmentDownloadResult> {
  const result = await apiBlobRequest(`/attachments/${attachmentId}/download`, context);
  const contentType = result.contentType ?? result.blob.type ?? "application/octet-stream";
  return {
    blob: result.blob,
    objectUrl: URL.createObjectURL(result.blob),
    fileName: sanitizeDownloadFileName(result.fileName ?? fileName ?? "arquivo"),
    contentType,
  };
}

// DELETE /attachments/:id (soft) — auth `<ent>:update`.
export async function deleteAttachment(context: AttachmentsApiContext, attachmentId: string): Promise<void> {
  await apiRequest<unknown>(`/attachments/${attachmentId}`, { ...context, method: "DELETE" });
}

export function revokeAttachmentUrl(url: string | null | undefined): void {
  if (url && url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

// Extrai a lista de itens de qualquer forma de envelope: {items} | {data:{items}} | {data:[]} | [].
function extractItems(response: unknown): unknown {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    const record = response as { items?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    const inner = record.data as { items?: unknown } | undefined;
    if (inner && Array.isArray(inner.items)) return inner.items;
  }
  return [];
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
