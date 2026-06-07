import type {
  ChecklistApiContext,
  ChecklistAttachment,
  ChecklistAttachmentDownloadResult,
  ChecklistAttachmentUploadInput,
  ChecklistAttachmentUploadResult,
} from "./types";

const mockDownloads = new Map<string, Blob>();

export async function uploadMockChecklistAttachment(input: ChecklistAttachmentUploadInput): Promise<ChecklistAttachmentUploadResult> {
  if (!input.runId.trim()) throw new Error("Execucao obrigatoria para enviar evidencia.");
  if (!input.componentId.trim()) throw new Error("Componente obrigatorio para enviar evidencia.");
  if (!input.file) throw new Error("Arquivo obrigatorio para enviar evidencia.");

  await wait();

  const id = `mock_attachment_${Date.now()}`;
  const metadata = {
    ...input.metadata,
    storageDriver: "mock",
    checksumSha256: "mock-checksum",
  };
  const attachment: ChecklistAttachment = {
    id,
    tenantId: input.context.tenantId,
    runId: input.runId,
    componentId: input.componentId,
    fileUrl: `mock://checklist-attachments/${input.runId}/${encodeURIComponent(input.file.name)}`,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size,
    metadata,
    createdBy: "mock-user",
    createdAt: new Date().toISOString(),
    checksum: "mock-checksum",
    storageDriver: "mock",
  };

  mockDownloads.set(id, input.file);

  return {
    attachment,
  };
}

export async function downloadMockChecklistAttachment(
  _context: ChecklistApiContext,
  runId: string,
  attachmentId: string,
): Promise<ChecklistAttachmentDownloadResult> {
  if (!runId.trim()) throw new Error("Execucao obrigatoria para baixar evidencia.");
  if (!attachmentId.trim()) throw new Error("Anexo obrigatorio para baixar evidencia.");

  await wait();

  const blob = mockDownloads.get(attachmentId) ?? new Blob(["mock checklist evidence"], { type: "application/pdf" });

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    fileName: "evidencia-mock.pdf",
    mimeType: blob.type || "application/pdf",
  };
}

async function wait() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
}
