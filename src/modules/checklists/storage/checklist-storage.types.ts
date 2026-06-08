import type { Readable } from "node:stream";

export type ChecklistStorageProviderName = "local" | "s3";

export type ChecklistStorageObjectBody = Buffer | Readable;

export type SaveChecklistStorageObjectInput = {
  tenantId: string;
  runId: string;
  buffer: Buffer;
  originalName: string;
  safeFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type StoredChecklistStorageObject = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  storageProvider: ChecklistStorageProviderName;
  storageKey: string;
};

export type GetChecklistStorageObjectInput = {
  storageKey: string;
};

export type ChecklistStorageObject = {
  body: ChecklistStorageObjectBody;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type ChecklistStorageProvider = {
  readonly name: ChecklistStorageProviderName;
  save(input: SaveChecklistStorageObjectInput): Promise<StoredChecklistStorageObject>;
  getObject(input: GetChecklistStorageObjectInput): Promise<ChecklistStorageObject>;
  deleteObject(input: GetChecklistStorageObjectInput): Promise<void>;
};
