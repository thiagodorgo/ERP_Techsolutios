import { createHash } from "node:crypto";
import path from "node:path";
import type { Readable } from "node:stream";

import Busboy from "busboy";
import type { Request } from "express";

import {
  createChecklistStorageProviderByName,
  getDefaultChecklistStorageProvider,
  readChecklistStorageConfig,
} from "./storage/checklist-storage.factory.js";
import type { ChecklistStorageProviderName } from "./storage/checklist-storage.types.js";
import { ChecklistError, type ChecklistAttachment, type JsonRecord } from "./checklist.types.js";

export type ChecklistAttachmentUpload = {
  readonly componentId: string;
  readonly metadata: JsonRecord;
  readonly file: {
    readonly buffer: Buffer;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

export type StoredChecklistAttachmentFile = {
  readonly fileUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly storageDriver: ChecklistStorageProviderName;
  readonly storageKey: string;
};

export type ChecklistAttachmentDownload = {
  readonly body: Buffer | Readable;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
};

export function isMultipartChecklistAttachmentRequest(request: Request): boolean {
  return request.is("multipart/form-data") === "multipart/form-data";
}

export function getChecklistAttachmentStorageConfig() {
  return readChecklistStorageConfig();
}

export async function parseMultipartChecklistAttachmentRequest(
  request: Request,
): Promise<ChecklistAttachmentUpload> {
  const config = getChecklistAttachmentStorageConfig();

  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    const chunks: Buffer[] = [];
    let fileName = "";
    let mimeType = "";
    let sizeBytes = 0;
    let fileCount = 0;
    let terminalError: ChecklistError | undefined;

    const fail = (error: ChecklistError): void => {
      terminalError ??= error;
    };

    const busboy = Busboy({
      headers: request.headers,
      limits: {
        fields: 8,
        fileSize: config.maxSizeBytes,
        files: 1,
      },
    });

    busboy.on("field", (name, value) => {
      fields.set(name, value);
    });

    busboy.on("file", (name, file, info) => {
      fileCount += 1;

      if (name !== "file" || fileCount > 1) {
        fail(new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "invalid_file_field", "Upload must include exactly one file field named file."));
        file.resume();
        return;
      }

      fileName = info.filename;
      mimeType = info.mimeType.toLowerCase();

      if (!config.allowedMimeTypes.includes(mimeType)) {
        fail(new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "mime_type_not_allowed", "Attachment MIME type is not allowed."));
        file.resume();
        return;
      }

      file.on("limit", () => {
        chunks.length = 0;
        fail(new ChecklistError(400, "CHECKLIST_ATTACHMENT_TOO_LARGE", "file_too_large", "Attachment exceeds the configured maximum size."));
      });

      file.on("data", (chunk: Buffer) => {
        if (terminalError) return;

        sizeBytes += chunk.length;
        chunks.push(chunk);
      });
      file.on("error", (error) => {
        reject(error);
      });
    });

    busboy.on("filesLimit", () => {
      fail(new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "too_many_files", "Upload accepts one file only."));
    });

    busboy.on("error", (error) => {
      reject(error);
    });

    busboy.on("finish", () => {
      if (terminalError) {
        reject(terminalError);
        return;
      }

      if (fileCount !== 1 || chunks.length === 0) {
        reject(new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "file_required", "Attachment file is required."));
        return;
      }

      const componentId = fields.get("componentId")?.trim();

      if (!componentId) {
        reject(new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "component_required", "componentId is required."));
        return;
      }

      let metadata: JsonRecord;

      try {
        metadata = parseMetadataField(fields.get("metadata"));
      } catch (error) {
        reject(error);
        return;
      }

      resolve({
        componentId,
        metadata,
        file: {
          buffer: Buffer.concat(chunks),
          originalName: fileName,
          mimeType,
          sizeBytes,
        },
      });
    });

    request.pipe(busboy);
  });
}

export async function saveChecklistAttachmentFile(input: {
  readonly tenantId: string;
  readonly runId: string;
  readonly upload: ChecklistAttachmentUpload["file"];
}): Promise<StoredChecklistAttachmentFile> {
  const checksum = createHash("sha256").update(input.upload.buffer).digest("hex");
  const fileName = sanitizeFileName(input.upload.originalName, input.upload.mimeType);
  const stored = await getDefaultChecklistStorageProvider().save({
    tenantId: input.tenantId,
    runId: input.runId,
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
    storageDriver: stored.storageProvider,
    storageKey: stored.storageKey,
  };
}

export async function deleteStoredChecklistAttachmentFile(storageKey: string, storageDriver: ChecklistStorageProviderName = "local"): Promise<void> {
  await createChecklistStorageProviderByName(storageDriver).deleteObject({ storageKey });
}

export async function resolveChecklistAttachmentDownload(
  attachment: ChecklistAttachment,
): Promise<ChecklistAttachmentDownload> {
  const metadata = attachment.metadata;
  const storageDriver = readStorageProvider(metadata);
  const storageKey = typeof metadata.storageKey === "string" ? metadata.storageKey : undefined;

  if (!storageDriver || !storageKey) {
    throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
  }

  const object = await createChecklistStorageProviderByName(storageDriver).getObject({ storageKey });

  return {
    body: object.body,
    fileName: attachment.fileName ?? path.basename(storageKey),
    mimeType: object.mimeType ?? attachment.mimeType ?? "application/octet-stream",
    sizeBytes: object.sizeBytes ?? attachment.sizeBytes ?? undefined,
  };
}

function parseMetadataField(value: string | undefined): JsonRecord {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("metadata must be an object.");
    }

    return parsed as JsonRecord;
  } catch {
    throw new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "invalid_metadata", "metadata must be a valid JSON object.");
  }
}

export function sanitizeFileName(originalName: string, mimeType: string): string {
  const baseName = path.basename(originalName || `attachment${extensionForMimeType(mimeType)}`);
  const withoutControlChars = baseName.replace(/[\u0000-\u001f\u007f]/g, "");
  const sanitized = withoutControlChars.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 120);

  if (!sanitized) {
    return `attachment${extensionForMimeType(mimeType)}`;
  }

  return sanitized.includes(".") ? sanitized : `${sanitized}${extensionForMimeType(mimeType)}`;
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

function readStorageProvider(metadata: JsonRecord): ChecklistStorageProviderName | null {
  const value = metadata.storageProvider ?? metadata.storageDriver;
  if (value === "local" || value === "s3") return value;
  return null;
}
