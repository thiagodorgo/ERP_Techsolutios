import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ChecklistError } from "../checklist.types.js";
import type {
  ChecklistStorageObject,
  ChecklistStorageProvider,
  GetChecklistStorageObjectInput,
  SaveChecklistStorageObjectInput,
  StoredChecklistStorageObject,
} from "./checklist-storage.types.js";

const localStorageSchemePrefix = "local://checklist-attachments/";

export class LocalChecklistStorageProvider implements ChecklistStorageProvider {
  readonly name = "local" as const;

  constructor(private readonly basePath: string) {}

  async save(input: SaveChecklistStorageObjectInput): Promise<StoredChecklistStorageObject> {
    const storedFileName = `${randomUUID()}-${input.safeFileName}`;
    const storageKey = path.posix.join(input.tenantId, input.runId, storedFileName);
    const filePath = this.resolveSafeStoragePath(storageKey);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.buffer, { flag: "wx" });

    return {
      fileUrl: `${localStorageSchemePrefix}${storageKey}`,
      fileName: input.safeFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      storageProvider: this.name,
      storageKey,
    };
  }

  async getObject(input: GetChecklistStorageObjectInput): Promise<ChecklistStorageObject> {
    const filePath = this.resolveSafeStoragePath(input.storageKey);
    const fileStat = await stat(filePath).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
    }

    return {
      body: createReadStream(filePath),
      sizeBytes: fileStat.size,
    };
  }

  async deleteObject(input: GetChecklistStorageObjectInput): Promise<void> {
    const filePath = this.resolveSafeStoragePath(input.storageKey);

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private resolveSafeStoragePath(storageKey: string): string {
    const parts = storageKey.split("/");

    if (
      path.isAbsolute(storageKey) ||
      parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))
    ) {
      throw new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "invalid_storage_key", "Attachment storage key is invalid.");
    }

    const resolvedBasePath = path.resolve(this.basePath);
    const resolvedPath = path.resolve(resolvedBasePath, ...parts);

    if (!resolvedPath.startsWith(`${resolvedBasePath}${path.sep}`)) {
      throw new ChecklistError(400, "CHECKLIST_ATTACHMENT_INVALID", "invalid_storage_key", "Attachment storage key is invalid.");
    }

    return resolvedPath;
  }
}
