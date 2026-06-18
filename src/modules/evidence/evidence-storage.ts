import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const EVIDENCE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export type EvidenceStorageInput = {
  readonly tenantId: string;
  readonly evidenceId: string;
  readonly clientEvidenceId: string;
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly checksumSha256: string;
};

export type EvidenceStorageReceipt = {
  readonly fileId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly storedAt: Date;
};

export interface EvidenceStorageProvider {
  store(input: EvidenceStorageInput): Promise<EvidenceStorageReceipt>;
  clear?(): Promise<void>;
}

export type EvidenceScanInput = {
  readonly tenantId: string;
  readonly evidenceId: string;
  readonly clientEvidenceId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly buffer: Buffer;
};

export type EvidenceScanResult =
  | { readonly status: "clean" }
  | { readonly status: "infected"; readonly reason?: string }
  | { readonly status: "failed"; readonly reason?: string };

export interface EvidenceScanner {
  scan(input: EvidenceScanInput): Promise<EvidenceScanResult>;
}

export class NoopEvidenceScanner implements EvidenceScanner {
  async scan(): Promise<EvidenceScanResult> {
    return { status: "clean" };
  }
}

export class FakeEvidenceScanner implements EvidenceScanner {
  constructor(private readonly result: EvidenceScanResult) {}

  async scan(): Promise<EvidenceScanResult> {
    return this.result;
  }
}

export class LocalProtectedEvidenceStorageProvider implements EvidenceStorageProvider {
  constructor(private readonly root = path.join(os.tmpdir(), "erp-mobile-evidence-protected")) {}

  async store(input: EvidenceStorageInput): Promise<EvidenceStorageReceipt> {
    const sizeBytes = input.buffer.length;
    const computed = createHash("sha256").update(input.buffer).digest("hex");
    if (computed !== input.checksumSha256) {
      throw new Error("checksum_mismatch");
    }

    const tenantSegment = safeStorageSegment(input.tenantId);
    const extension = input.mimeType === "image/png" ? ".png" : ".jpg";
    const dir = path.join(this.root, tenantSegment);
    const finalName = `${randomUUID()}${extension}`;
    const tempName = `${randomUUID()}.tmp`;
    const finalPath = path.join(dir, finalName);
    const tempPath = path.join(dir, tempName);

    await mkdir(dir, { recursive: true });
    await writeFile(tempPath, input.buffer, { flag: "wx" });
    await rename(tempPath, finalPath);

    return {
      fileId: `evfile_${randomUUID().replace(/-/g, "")}`,
      mimeType: input.mimeType,
      sizeBytes,
      checksumSha256: input.checksumSha256,
      storedAt: new Date(),
    };
  }

  async clear(): Promise<void> {
    await rm(this.root, { force: true, recursive: true });
  }
}

export type EvidenceAuditAction =
  | "evidence.upload.accepted"
  | "evidence.upload.rejected"
  | "evidence.upload.scan_failed"
  | "evidence.upload.stored";

export type EvidenceAuditEvent = {
  readonly action: EvidenceAuditAction;
  readonly tenantId: string;
  readonly actorId: string;
  readonly evidenceId: string;
  readonly outcome: "success" | "failure" | "denied";
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

const sensitiveAuditKeys = new Set([
  "authorization",
  "bearer",
  "accesstoken",
  "refreshtoken",
  "token",
  "base64",
  "file_data",
  "local_path",
  "path",
  "bucket",
  "storage_key",
  "storagekey",
  "absolutepath",
]);

const auditEvents: EvidenceAuditEvent[] = [];

export function recordEvidenceAuditEvent(input: Omit<EvidenceAuditEvent, "metadata" | "createdAt"> & {
  readonly metadata?: Readonly<Record<string, unknown>>;
}): void {
  auditEvents.push({
    ...input,
    metadata: sanitizeEvidenceAuditMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
  });
}

export function getEvidenceAuditEventsForTests(): readonly EvidenceAuditEvent[] {
  return auditEvents.map((event) => ({
    ...event,
    metadata: { ...event.metadata },
  }));
}

export function resetEvidenceAuditEventsForTests(): void {
  auditEvents.length = 0;
}

export function sanitizeEvidenceAuditMetadata(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (sensitiveAuditKeys.has(normalized)) continue;
    sanitized[key] = sanitizeEvidenceAuditValue(entry);
  }
  return sanitized;
}

function sanitizeEvidenceAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeEvidenceAuditValue);
  }
  if (value && typeof value === "object") {
    return sanitizeEvidenceAuditMetadata(value as Readonly<Record<string, unknown>>);
  }
  return value;
}

function safeStorageSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}
