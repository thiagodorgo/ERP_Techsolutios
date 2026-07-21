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
import { AttachmentError, type Attachment } from "./attachment.types.js";

// Ω4C PR-01 — anexo genérico. REUSA o checklist STORAGE PROVIDER (D-014, sem storage/presigned novo)
// para o binário e o EvidenceScanner (Noop/Fake) para o AV-scan. A chave de partição (slot `runId` do
// provider) é `${entityType}/${entityId}`. O multipart espelha work-order-attachment.storage.ts.

export type AttachmentUpload = {
  readonly entityType: string;
  readonly entityId: string;
  readonly clientActionId?: string;
  readonly description?: string;
  readonly file: {
    readonly buffer: Buffer;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

export type StoredAttachmentFile = {
  readonly fileUrl: string;
  readonly fileName: string;
  readonly extension: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly storageProvider: ChecklistStorageProviderName;
  readonly storageKey: string;
};

export type AttachmentDownload = {
  readonly body: Buffer | Readable;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
};

// Scanner injetável (R2 do crítico): default Noop (clean); FakeEvidenceScanner em teste.
let scanner: EvidenceScanner = new NoopEvidenceScanner();
export function configureAttachmentScannerForTests(next: EvidenceScanner): void {
  scanner = next;
}
export function resetAttachmentScannerForTests(): void {
  scanner = new NoopEvidenceScanner();
}
export function getAttachmentScanner(): EvidenceScanner {
  return scanner;
}

export function isMultipartAttachmentRequest(request: Request): boolean {
  return request.is("multipart/form-data") === "multipart/form-data";
}

export async function parseMultipartAttachmentRequest(request: Request): Promise<AttachmentUpload> {
  const config = readChecklistStorageConfig();

  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    const chunks: Buffer[] = [];
    let fileName = "";
    let mimeType = "";
    let sizeBytes = 0;
    let fileCount = 0;
    let terminalError: AttachmentError | undefined;

    const fail = (error: AttachmentError): void => {
      terminalError ??= error;
    };

    const busboy = Busboy({ headers: request.headers, limits: { fields: 8, fileSize: config.maxSizeBytes, files: 1 } });

    busboy.on("field", (name, value) => {
      fields.set(name, value);
    });

    busboy.on("file", (name, file, info) => {
      fileCount += 1;

      if (name !== "file" || fileCount > 1) {
        fail(new AttachmentError(400, "ATTACHMENT_INVALID", "invalid_file_field", "Upload must include exactly one file field named file."));
        file.resume();
        return;
      }

      fileName = info.filename;
      mimeType = info.mimeType.toLowerCase();

      if (!config.allowedMimeTypes.includes(mimeType)) {
        fail(new AttachmentError(415, "ATTACHMENT_UNSUPPORTED_MEDIA_TYPE", "unsupported_media_type", "Attachment MIME type is not allowed."));
        file.resume();
        return;
      }

      file.on("limit", () => {
        chunks.length = 0;
        fail(new AttachmentError(413, "ATTACHMENT_TOO_LARGE", "file_too_large", "Attachment exceeds the configured maximum size."));
      });
      file.on("data", (chunk: Buffer) => {
        if (terminalError) return;
        sizeBytes += chunk.length;
        chunks.push(chunk);
      });
      file.on("error", (error) => reject(error));
    });

    busboy.on("filesLimit", () => {
      fail(new AttachmentError(400, "ATTACHMENT_INVALID", "too_many_files", "Upload accepts one file only."));
    });
    busboy.on("error", (error) => reject(error));

    busboy.on("finish", () => {
      if (terminalError) {
        reject(terminalError);
        return;
      }
      if (fileCount !== 1 || chunks.length === 0) {
        reject(new AttachmentError(400, "ATTACHMENT_INVALID", "file_required", "Attachment file is required."));
        return;
      }

      const clientActionIdRaw = fields.get("client_action_id")?.trim() ?? fields.get("clientActionId")?.trim();
      if (clientActionIdRaw && !/^[A-Za-z0-9._:-]{1,120}$/.test(clientActionIdRaw)) {
        reject(new AttachmentError(400, "ATTACHMENT_INVALID", "invalid_client_action_id", "client_action_id must be a safe token (max 120 chars)."));
        return;
      }
      const description = fields.get("description")?.trim();
      const entityType = (fields.get("entity_type")?.trim() ?? fields.get("entityType")?.trim() ?? "").slice(0, 64);
      const entityId = fields.get("entity_id")?.trim() ?? fields.get("entityId")?.trim() ?? "";

      resolve({
        entityType,
        entityId,
        clientActionId: clientActionIdRaw || undefined,
        description: description ? description.slice(0, 2000) : undefined,
        file: { buffer: Buffer.concat(chunks), originalName: fileName, mimeType, sizeBytes },
      });
    });

    request.pipe(busboy);
  });
}

export async function saveAttachmentFile(input: {
  readonly tenantId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly upload: AttachmentUpload["file"];
}): Promise<StoredAttachmentFile> {
  const checksum = createHash("sha256").update(input.upload.buffer).digest("hex");
  const fileName = sanitizeFileName(input.upload.originalName, input.upload.mimeType);
  const stored = await getDefaultChecklistStorageProvider().save({
    tenantId: input.tenantId,
    // Chave de partição do storage (slot `runId` do provider) = `${entityType}/${entityId}`.
    runId: `${input.entityType}/${input.entityId}`,
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
    extension: extensionForFileName(stored.fileName, stored.mimeType),
    contentType: stored.mimeType,
    sizeBytes: stored.sizeBytes,
    checksum: stored.checksumSha256,
    storageProvider: stored.storageProvider,
    storageKey: stored.storageKey,
  };
}

export async function deleteStoredAttachmentFile(
  storageKey: string,
  storageProvider: ChecklistStorageProviderName = "local",
): Promise<void> {
  await createChecklistStorageProviderByName(storageProvider).deleteObject({ storageKey });
}

export async function resolveAttachmentDownload(attachment: Attachment): Promise<AttachmentDownload> {
  const storageProvider = normalizeStorageProvider(attachment.storageProvider);
  const storageKey = attachment.storageKey;
  if (!storageProvider || !storageKey) {
    throw new AttachmentError(404, "ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
  }
  const object = await createChecklistStorageProviderByName(storageProvider).getObject({ storageKey });
  return {
    body: object.body,
    fileName: attachment.fileName ?? path.basename(storageKey),
    mimeType: object.mimeType ?? attachment.contentType ?? "application/octet-stream",
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

function extensionForFileName(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
  if (ext) return ext;
  return extensionForMimeType(mimeType).replace(/^\./, "");
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
