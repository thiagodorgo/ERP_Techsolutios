import { apiBlobRequest, apiFormDataRequest } from "../../services/api/client";
import type {
  ChecklistApiContext,
  ChecklistAttachment,
  ChecklistAttachmentDownloadResult,
  ChecklistAttachmentMetadata,
  ChecklistAttachmentUploadInput,
  ChecklistAttachmentUploadResult,
} from "./types";

type ApiResponse<T> = {
  data: T;
};

type ChecklistAttachmentDto = {
  id: string;
  tenantId?: string;
  runId: string;
  componentId: string;
  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  metadata?: ChecklistAttachmentMetadata | null;
  createdBy?: string | null;
  createdAt: string;
};

export async function uploadChecklistAttachmentToApi(input: ChecklistAttachmentUploadInput): Promise<ChecklistAttachmentUploadResult> {
  assertUploadInput(input);

  const body = new FormData();
  body.set("file", input.file);
  body.set("componentId", input.componentId);

  if (input.metadata && Object.keys(input.metadata).length > 0) {
    body.set("metadata", JSON.stringify(input.metadata));
  }

  const response = await apiFormDataRequest<ApiResponse<ChecklistAttachmentDto>>(
    `/mobile/checklist-runs/${encodeURIComponent(input.runId)}/attachments`,
    {
      ...toRequestOptions(input.context),
      method: "POST",
      body,
    },
  );

  return {
    attachment: adaptChecklistAttachment(response.data),
  };
}

export async function downloadChecklistAttachmentFromApi(
  context: ChecklistApiContext,
  runId: string,
  attachmentId: string,
): Promise<ChecklistAttachmentDownloadResult> {
  if (!runId.trim()) throw new Error("Execucao obrigatoria para baixar evidencia.");
  if (!attachmentId.trim()) throw new Error("Anexo obrigatorio para baixar evidencia.");

  const result = await apiBlobRequest(
    `/mobile/checklist-runs/${encodeURIComponent(runId)}/attachments/${encodeURIComponent(attachmentId)}/download`,
    toRequestOptions(context),
  );
  const mimeType = result.contentType ?? result.blob.type ?? "application/octet-stream";

  return {
    blob: result.blob,
    objectUrl: URL.createObjectURL(result.blob),
    fileName: sanitizeDownloadFileName(result.fileName ?? "evidencia"),
    mimeType,
  };
}

export function adaptChecklistAttachment(dto: ChecklistAttachmentDto): ChecklistAttachment {
  const metadata = dto.metadata ?? {};

  return {
    id: dto.id,
    tenantId: dto.tenantId,
    runId: dto.runId,
    componentId: dto.componentId,
    fileUrl: assertSafeFileUrl(dto.fileUrl),
    fileName: dto.fileName ?? undefined,
    mimeType: dto.mimeType ?? undefined,
    sizeBytes: dto.sizeBytes ?? undefined,
    metadata,
    createdBy: dto.createdBy ?? undefined,
    createdAt: dto.createdAt,
    checksum: typeof metadata.checksumSha256 === "string" ? metadata.checksumSha256 : undefined,
    storageDriver: typeof metadata.storageDriver === "string" ? metadata.storageDriver : undefined,
    storageKey: typeof metadata.storageKey === "string" ? metadata.storageKey : undefined,
  };
}

function assertUploadInput(input: ChecklistAttachmentUploadInput): void {
  if (!input.runId.trim()) throw new Error("Execucao obrigatoria para enviar evidencia.");
  if (!input.componentId.trim()) throw new Error("Componente obrigatorio para enviar evidencia.");
  if (!input.file) throw new Error("Arquivo obrigatorio para enviar evidencia.");
}

function assertSafeFileUrl(fileUrl: string): string {
  if (/^[A-Za-z]:[\\/]/.test(fileUrl) || fileUrl.startsWith("\\\\")) {
    throw new Error("URL de evidencia invalida.");
  }

  return fileUrl;
}

function sanitizeDownloadFileName(fileName: string): string {
  return fileName.replace(/["\\/:*?<>|\r\n]/g, "_");
}

function toRequestOptions(context: ChecklistApiContext) {
  return {
    token: context.token,
    tenantId: context.tenantId,
    branchId: context.branchId,
    role: context.role,
    permissions: context.permissions,
  };
}
