import { createHash } from "node:crypto";
import path from "node:path";
import type { Readable } from "node:stream";

import Busboy from "busboy";
import type { Request } from "express";

import {
  createChecklistStorageProviderByName,
  getDefaultChecklistStorageProvider,
  readChecklistStorageConfig,
} from "../checklists/storage/checklist-storage.factory.js";
import type { ChecklistStorageProviderName } from "../checklists/storage/checklist-storage.types.js";
import { NoopEvidenceScanner, type EvidenceScanner } from "../evidence/evidence-storage.js";
import { WorkOrderAttachmentError, type WorkOrderAttachment } from "./work-order-attachment.types.js";

// Ω3-d — anexo de OS. REUSA o checklist STORAGE PROVIDER (D-014, sem storage/presigned novo) para o
// binário e o EvidenceScanner (Noop/Fake) para o AV-scan. Só o `workOrderId` é a chave de partição
// (slot `runId` do provider). O multipart espelha damage-attachment.storage.ts.

export type WorkOrderAttachmentUpload = {
  readonly clientActionId?: string;
  readonly description?: string;
  readonly file: {
    readonly buffer: Buffer;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

export type StoredWorkOrderAttachmentFile = {
  readonly fileUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly storageProvider: ChecklistStorageProviderName;
  readonly storageKey: string;
};

export type WorkOrderAttachmentDownload = {
  readonly body: Buffer | Readable;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
};

// Scanner injetável (R2 do crítico): default Noop (clean); FakeEvidenceScanner em teste.
let scanner: EvidenceScanner = new NoopEvidenceScanner();
export function configureWorkOrderAttachmentScannerForTests(next: EvidenceScanner): void {
  scanner = next;
}
export function resetWorkOrderAttachmentScannerForTests(): void {
  scanner = new NoopEvidenceScanner();
}
export function getWorkOrderAttachmentScanner(): EvidenceScanner {
  return scanner;
}

export function isMultipartWorkOrderAttachmentRequest(request: Request): boolean {
  return request.is("multipart/form-data") === "multipart/form-data";
}

export async function parseMultipartWorkOrderAttachmentRequest(request: Request): Promise<WorkOrderAttachmentUpload> {
  const config = readChecklistStorageConfig();

  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    const chunks: Buffer[] = [];
    let fileName = "";
    let mimeType = "";
    let sizeBytes = 0;
    let fileCount = 0;
    let terminalError: WorkOrderAttachmentError | undefined;

    const fail = (error: WorkOrderAttachmentError): void => {
      terminalError ??= error;
    };

    const busboy = Busboy({ headers: request.headers, limits: { fields: 8, fileSize: config.maxSizeBytes, files: 1 } });

    busboy.on("field", (name, value) => {
      fields.set(name, value);
    });

    busboy.on("file", (name, file, info) => {
      fileCount += 1;

      if (name !== "file" || fileCount > 1) {
        fail(new WorkOrderAttachmentError(400, "WORK_ORDER_ATTACHMENT_INVALID", "invalid_file_field", "Upload must include exactly one file field named file."));
        file.resume();
        return;
      }

      fileName = info.filename;
      mimeType = info.mimeType.toLowerCase();

      if (!config.allowedMimeTypes.includes(mimeType)) {
        fail(new WorkOrderAttachmentError(415, "WORK_ORDER_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE", "unsupported_media_type", "Attachment MIME type is not allowed."));
        file.resume();
        return;
      }

      file.on("limit", () => {
        chunks.length = 0;
        fail(new WorkOrderAttachmentError(413, "WORK_ORDER_ATTACHMENT_TOO_LARGE", "file_too_large", "Attachment exceeds the configured maximum size."));
      });
      file.on("data", (chunk: Buffer) => {
        if (terminalError) return;
        sizeBytes += chunk.length;
        chunks.push(chunk);
      });
      file.on("error", (error) => reject(error));
    });

    busboy.on("filesLimit", () => {
      fail(new WorkOrderAttachmentError(400, "WORK_ORDER_ATTACHMENT_INVALID", "too_many_files", "Upload accepts one file only."));
    });
    busboy.on("error", (error) => reject(error));

    busboy.on("finish", () => {
      if (terminalError) {
        reject(terminalError);
        return;
      }
      if (fileCount !== 1 || chunks.length === 0) {
        reject(new WorkOrderAttachmentError(400, "WORK_ORDER_ATTACHMENT_INVALID", "file_required", "Attachment file is required."));
        return;
      }

      const clientActionIdRaw = fields.get("client_action_id")?.trim() ?? fields.get("clientActionId")?.trim();
      if (clientActionIdRaw && !/^[A-Za-z0-9._:-]{1,120}$/.test(clientActionIdRaw)) {
        reject(new WorkOrderAttachmentError(400, "WORK_ORDER_ATTACHMENT_INVALID", "invalid_client_action_id", "client_action_id must be a safe token (max 120 chars)."));
        return;
      }
      const description = fields.get("description")?.trim();

      resolve({
        clientActionId: clientActionIdRaw || undefined,
        description: description ? description.slice(0, 2000) : undefined,
        file: { buffer: Buffer.concat(chunks), originalName: fileName, mimeType, sizeBytes },
      });
    });

    request.pipe(busboy);
  });
}

export async function saveWorkOrderAttachmentFile(input: {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly upload: WorkOrderAttachmentUpload["file"];
}): Promise<StoredWorkOrderAttachmentFile> {
  const checksum = createHash("sha256").update(input.upload.buffer).digest("hex");
  const fileName = sanitizeFileName(input.upload.originalName, input.upload.mimeType);
  const stored = await getDefaultChecklistStorageProvider().save({
    tenantId: input.tenantId,
    // `workOrderId` é a chave de partição do storage (slot `runId` do provider).
    runId: input.workOrderId,
    buffer: input.upload.buffer,
    originalName: input.upload.originalName,
    safeFileName: fileName,
    mimeType: input.upload.mimeType,
    sizeBytes: input.upload.sizeBytes,
    checksumSha256: checksum,
  });

  return {
    fileUrl: stored.fileUrl,
    fileName: stored.fileName,
    mimeType: stored.mimeType,
    sizeBytes: stored.sizeBytes,
    checksum: stored.checksumSha256,
    storageProvider: stored.storageProvider,
    storageKey: stored.storageKey,
  };
}

export async function deleteStoredWorkOrderAttachmentFile(
  storageKey: string,
  storageProvider: ChecklistStorageProviderName = "local",
): Promise<void> {
  await createChecklistStorageProviderByName(storageProvider).deleteObject({ storageKey });
}

export async function resolveWorkOrderAttachmentDownload(attachment: WorkOrderAttachment): Promise<WorkOrderAttachmentDownload> {
  const storageProvider = normalizeStorageProvider(attachment.storageProvider);
  const storageKey = attachment.storageKey;
  if (!storageProvider || !storageKey) {
    throw new WorkOrderAttachmentError(404, "WORK_ORDER_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
  }
  const object = await createChecklistStorageProviderByName(storageProvider).getObject({ storageKey });
  return {
    body: object.body,
    fileName: attachment.fileName ?? path.basename(storageKey),
    mimeType: object.mimeType ?? attachment.mimeType ?? "application/octet-stream",
    sizeBytes: object.sizeBytes ?? attachment.sizeBytes ?? undefined,
  };
}

export function sanitizeFileName(originalName: string, mimeType: string): string {
  const baseName = path.basename(originalName || `attachment${extensionForMimeType(mimeType)}`);
  const withoutControlChars = stripControlChars(baseName);
  const sanitized = withoutControlChars.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 120);
  if (!sanitized) return `attachment${extensionForMimeType(mimeType)}`;
  return sanitized.includes(".") ? sanitized : `${sanitized}${extensionForMimeType(mimeType)}`;
}

function stripControlChars(value: string): string {
  return [...value].filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code > 0x1f && code !== 0x7f;
  }).join("");
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    default:
      return ".bin";
  }
}

function normalizeStorageProvider(value: string | undefined): ChecklistStorageProviderName | null {
  if (value === "local" || value === "s3") return value;
  return null;
}
