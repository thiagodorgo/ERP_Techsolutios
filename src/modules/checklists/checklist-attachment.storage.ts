import { createHash, randomUUID } from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import Busboy from "busboy";
import type { Request } from "express";

import { env } from "../../config/env.js";
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
  readonly storageDriver: "local";
  readonly storageKey: string;
};

export type ChecklistAttachmentDownload = {
  readonly filePath: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
};

const storageSchemePrefix = "local://checklist-attachments/";

export function isMultipartChecklistAttachmentRequest(request: Request): boolean {
  return request.is("multipart/form-data") === "multipart/form-data";
}

export function getChecklistAttachmentStorageConfig() {
  const maxSizeBytes = Math.floor(env.CHECKLIST_ATTACHMENT_MAX_SIZE_MB * 1024 * 1024);
  const allowedMimeTypes = env.CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return {
    driver: env.CHECKLIST_ATTACHMENT_STORAGE_DRIVER,
    basePath: path.resolve(process.cwd(), env.CHECKLIST_ATTACHMENT_STORAGE_PATH),
    maxSizeBytes,
    allowedMimeTypes,
  } as const;
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
        if (terminalError) {
          return;
        }

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
  const config = getChecklistAttachmentStorageConfig();

  if (config.driver !== "local") {
    throw new ChecklistError(500, "CHECKLIST_ATTACHMENT_STORAGE_UNAVAILABLE", "storage_driver_unsupported", "Checklist attachment storage driver is not supported.");
  }

  const checksum = createHash("sha256").update(input.upload.buffer).digest("hex");
  const fileName = sanitizeFileName(input.upload.originalName, input.upload.mimeType);
  const storedFileName = `${randomUUID()}-${fileName}`;
  const storageKey = path.posix.join(input.tenantId, input.runId, storedFileName);
  const filePath = resolveSafeStoragePath(config.basePath, storageKey);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.upload.buffer, { flag: "wx" });

  return {
    fileUrl: `${storageSchemePrefix}${storageKey}`,
    fileName,
    mimeType: input.upload.mimeType,
    sizeBytes: input.upload.sizeBytes,
    checksum,
    storageDriver: "local",
    storageKey,
  };
}

export async function deleteStoredChecklistAttachmentFile(storageKey: string): Promise<void> {
  const filePath = resolveSafeStoragePath(getChecklistAttachmentStorageConfig().basePath, storageKey);

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function resolveChecklistAttachmentDownload(
  attachment: ChecklistAttachment,
): Promise<ChecklistAttachmentDownload> {
  const metadata = attachment.metadata;

  if (metadata.storageDriver !== "local" || typeof metadata.storageKey !== "string") {
    throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
  }

  const filePath = resolveSafeStoragePath(getChecklistAttachmentStorageConfig().basePath, metadata.storageKey);
  const fileStat = await stat(filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
  }

  return {
    filePath,
    fileName: attachment.fileName ?? path.basename(metadata.storageKey),
    mimeType: attachment.mimeType ?? "application/octet-stream",
    sizeBytes: fileStat.size,
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

function sanitizeFileName(originalName: string, mimeType: string): string {
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

function resolveSafeStoragePath(basePath: string, storageKey: string): string {
  const parts = storageKey.split("/");

  if (
    path.isAbsolute(storageKey) ||
    parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))
  ) {
    throw new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "invalid_storage_key", "Attachment storage key is invalid.");
  }

  const resolvedBasePath = path.resolve(basePath);
  const resolvedPath = path.resolve(resolvedBasePath, ...parts);

  if (!resolvedPath.startsWith(`${resolvedBasePath}${path.sep}`)) {
    throw new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "invalid_storage_key", "Attachment storage key is invalid.");
  }

  return resolvedPath;
}
