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
import { DamageError, type DamageAttachment, type DamageMarker } from "./damage.types.js";

/**
 * F5 (Danos) — photo storage.
 *
 * Per D-014, damage photos REUSE the checklist STORAGE PROVIDER
 * (`getDefaultChecklistStorageProvider` + `readChecklistStorageConfig`): the same
 * backend (local/s3), the same size/mime allowlist, the same SHA-256 checksum,
 * NO new storage and NO presigned URLs. Only the DB partitioning differs — the
 * `damageId` is passed as the storage partition key (the provider's `runId`
 * argument). This mirrors `checklist-attachment.storage.ts` but drops
 * `componentId` (a damage has no checklist run) and reads an optional marker
 * (`x`/`y`/`description`) instead of a free-form metadata blob.
 */

export type DamageAttachmentUpload = {
  readonly marker?: DamageMarker;
  readonly file: {
    readonly buffer: Buffer;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

export type StoredDamageAttachmentFile = {
  readonly fileUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly storageProvider: ChecklistStorageProviderName;
  readonly storageKey: string;
};

export type DamageAttachmentDownload = {
  readonly body: Buffer | Readable;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
};

export function isMultipartDamageAttachmentRequest(request: Request): boolean {
  return request.is("multipart/form-data") === "multipart/form-data";
}

export function readDamageAttachmentStorageConfig() {
  return readChecklistStorageConfig();
}

export async function parseMultipartDamageAttachmentRequest(request: Request): Promise<DamageAttachmentUpload> {
  const config = readDamageAttachmentStorageConfig();

  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    const chunks: Buffer[] = [];
    let fileName = "";
    let mimeType = "";
    let sizeBytes = 0;
    let fileCount = 0;
    let terminalError: DamageError | undefined;

    const fail = (error: DamageError): void => {
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
        fail(new DamageError(400, "DAMAGE_ATTACHMENT_INVALID", "invalid_file_field", "Upload must include exactly one file field named file."));
        file.resume();
        return;
      }

      fileName = info.filename;
      mimeType = info.mimeType.toLowerCase();

      if (!config.allowedMimeTypes.includes(mimeType)) {
        fail(new DamageError(415, "DAMAGE_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE", "unsupported_media_type", "Attachment MIME type is not allowed."));
        file.resume();
        return;
      }

      file.on("limit", () => {
        chunks.length = 0;
        fail(new DamageError(413, "DAMAGE_ATTACHMENT_TOO_LARGE", "file_too_large", "Attachment exceeds the configured maximum size."));
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
      fail(new DamageError(400, "DAMAGE_ATTACHMENT_INVALID", "too_many_files", "Upload accepts one file only."));
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
        reject(new DamageError(400, "DAMAGE_ATTACHMENT_INVALID", "file_required", "Attachment file is required."));
        return;
      }

      let marker: DamageMarker | undefined;

      try {
        marker = parseMarkerFields(fields);
      } catch (error) {
        reject(error);
        return;
      }

      resolve({
        marker,
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

export async function saveDamageAttachmentFile(input: {
  readonly tenantId: string;
  readonly damageId: string;
  readonly upload: DamageAttachmentUpload["file"];
}): Promise<StoredDamageAttachmentFile> {
  const checksum = createHash("sha256").update(input.upload.buffer).digest("hex");
  const fileName = sanitizeFileName(input.upload.originalName, input.upload.mimeType);
  const stored = await getDefaultChecklistStorageProvider().save({
    tenantId: input.tenantId,
    // `damageId` is the storage partition key (the provider's `runId` slot).
    runId: input.damageId,
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

export async function deleteStoredDamageAttachmentFile(
  storageKey: string,
  storageProvider: ChecklistStorageProviderName = "local",
): Promise<void> {
  await createChecklistStorageProviderByName(storageProvider).deleteObject({ storageKey });
}

export async function resolveDamageAttachmentDownload(
  attachment: DamageAttachment,
): Promise<DamageAttachmentDownload> {
  const storageProvider = normalizeStorageProvider(attachment.storageProvider);
  const storageKey = attachment.storageKey;

  if (!storageProvider || !storageKey) {
    throw new DamageError(404, "DAMAGE_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
  }

  const object = await createChecklistStorageProviderByName(storageProvider).getObject({ storageKey });

  return {
    body: object.body,
    fileName: attachment.fileName ?? path.basename(storageKey),
    mimeType: object.mimeType ?? attachment.mimeType ?? "application/octet-stream",
    sizeBytes: object.sizeBytes ?? attachment.sizeBytes ?? undefined,
  };
}

/**
 * Optional marker from the multipart form fields `x`/`y`/`description`. When
 * neither `x` nor `y` is present, no marker is attached. When only one of the
 * two is present (or a value is non-numeric), it is a 400 (`invalid_marker`).
 */
function parseMarkerFields(fields: Map<string, string>): DamageMarker | undefined {
  const rawX = fields.get("x")?.trim();
  const rawY = fields.get("y")?.trim();
  const description = fields.get("description")?.trim();

  if (!rawX && !rawY) {
    return undefined;
  }

  const x = Number(rawX);
  const y = Number(rawY);

  if (!rawX || !rawY || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new DamageError(400, "DAMAGE_ATTACHMENT_INVALID", "invalid_marker", "Marker requires numeric x and y coordinates.");
  }

  return {
    x,
    y,
    ...(description ? { description: description.slice(0, 2000) } : {}),
  };
}

export function sanitizeFileName(originalName: string, mimeType: string): string {
  const baseName = path.basename(originalName || `attachment${extensionForMimeType(mimeType)}`);
  const withoutControlChars = stripControlChars(baseName);
  const sanitized = withoutControlChars.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 120);

  if (!sanitized) {
    return `attachment${extensionForMimeType(mimeType)}`;
  }

  return sanitized.includes(".") ? sanitized : `${sanitized}${extensionForMimeType(mimeType)}`;
}

function stripControlChars(value: string): string {
  return [...value]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join("");
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
