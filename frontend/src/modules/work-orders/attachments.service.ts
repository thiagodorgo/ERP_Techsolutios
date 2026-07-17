import { isMockMode } from "../../config/env";
import { apiBlobRequest, apiFormDataRequest, apiRequest } from "../../services/api/client";
import type {
  WorkOrderAttachment,
  WorkOrderAttachmentApiContext,
  WorkOrderAttachmentList,
  WorkOrderAttachmentStatus,
  WorkOrderAttachmentUploadInput,
} from "./attachments.types";

// Ω3F-5b — camada de dados da aba Arquivos. Contrato (Ω3-d, back INALTERADO):
//   GET /work-orders/:id/attachments
//   POST /work-orders/:id/attachments (multipart: file + description? + client_action_id?)
//   GET .../:attachmentId/download (stream; 409 se status != stored)
//   DELETE .../:attachmentId (delete lógico → 204)
// Leitura DEFENSIVA; modo mock → no-op honesto (D-007).

const KNOWN_STATUSES: readonly WorkOrderAttachmentStatus[] = ["stored", "rejected", "scan_failed", "pending_review"];

function basePath(workOrderId: string): string {
  return `/work-orders/${encodeURIComponent(workOrderId)}/attachments`;
}

export async function listAttachments(
  context: WorkOrderAttachmentApiContext,
  workOrderId: string,
): Promise<WorkOrderAttachmentList> {
  if (isMockMode()) return { items: [] };

  const response = await apiRequest<unknown>(basePath(workOrderId), context);
  return adaptList(response);
}

export async function uploadAttachment(
  context: WorkOrderAttachmentApiContext,
  workOrderId: string,
  input: WorkOrderAttachmentUploadInput,
): Promise<WorkOrderAttachment> {
  const form = new FormData();
  form.append("file", input.file);
  const description = input.description?.trim();
  if (description) form.append("description", description);

  const response = await apiFormDataRequest<unknown>(basePath(workOrderId), {
    ...context,
    method: "POST",
    body: form,
  });
  return adaptOrThrow(readData(response));
}

// Baixa o arquivo (só quando status=stored) e dispara o download no browser. SSR-safe: fora do
// navegador (sem `document`) apenas resolve, sem efeito.
export async function downloadAttachment(
  context: WorkOrderAttachmentApiContext,
  workOrderId: string,
  attachmentId: string,
  fallbackFileName?: string,
): Promise<void> {
  const { blob, fileName } = await apiBlobRequest(`${basePath(workOrderId)}/${encodeURIComponent(attachmentId)}/download`, context);

  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName ?? fallbackFileName ?? "arquivo";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function deleteAttachment(
  context: WorkOrderAttachmentApiContext,
  workOrderId: string,
  attachmentId: string,
): Promise<void> {
  await apiRequest<unknown>(`${basePath(workOrderId)}/${encodeURIComponent(attachmentId)}`, {
    ...context,
    method: "DELETE",
  });
}

// Tamanho legível (KB/MB…) — a UI só exibe; nunca deriva regra do valor.
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || Number.isInteger(value) ? 0 : 1)} ${units[unitIndex]}`;
}

// ---------- adapters (leitura defensiva) ----------

function adaptList(response: unknown): WorkOrderAttachmentList {
  const record = asRecord(response);
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(response)
        ? response
        : [];
  const items = rawItems
    .map((item) => adaptAttachment(item))
    .filter((item): item is WorkOrderAttachment => item !== null);
  return { items };
}

function adaptAttachment(value: unknown): WorkOrderAttachment | null {
  const item = asRecord(value);
  const id = readString(item.id);
  const workOrderId = readString(item.workOrderId ?? item.work_order_id);
  if (!id || !workOrderId) return null;
  return {
    id,
    workOrderId,
    fileName: readString(item.fileName ?? item.file_name) ?? "arquivo",
    mimeType: readString(item.mimeType ?? item.mime_type) ?? "application/octet-stream",
    sizeBytes: readNumber(item.sizeBytes ?? item.size_bytes) ?? 0,
    status: adaptStatus(item.status),
    downloadPath: readString(item.downloadPath ?? item.download_path) ?? null,
    uploadedBy: readString(item.uploadedBy ?? item.uploaded_by) ?? null,
    uploadedByName: readString(item.uploadedByName ?? item.uploaded_by_name) ?? null,
    createdAt: readString(item.createdAt ?? item.created_at) ?? "",
  };
}

function adaptStatus(value: unknown): WorkOrderAttachmentStatus {
  const status = readString(value);
  return status && (KNOWN_STATUSES as readonly string[]).includes(status)
    ? (status as WorkOrderAttachmentStatus)
    : "pending_review";
}

function adaptOrThrow(value: unknown): WorkOrderAttachment {
  const attachment = adaptAttachment(value);
  if (!attachment) throw new Error("invalid_attachment_response");
  return attachment;
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

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}
