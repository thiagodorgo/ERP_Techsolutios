import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import Busboy from "busboy";
import type { Request } from "express";

import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import {
  EVIDENCE_ALLOWED_MIME_TYPES,
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  LocalProtectedEvidenceStorageProvider,
  NoopEvidenceScanner,
  getEvidenceAuditEventsForTests,
  recordEvidenceAuditEvent,
  resetEvidenceAuditEventsForTests,
  type EvidenceAuditEvent,
  type EvidenceScanner,
  type EvidenceStorageProvider,
} from "../evidence/evidence-storage.js";
import { findMobileEvidenceSyncReceiptForUpload } from "./mobile-evidence-sync.js";

const CONTRACT_NAME = "mobile_evidence_file_upload";
const CONTRACT_VERSION = "2026-06-18.b108";

type ParsedUpload = {
  readonly fields: Map<string, string>;
  readonly file: {
    readonly buffer: Buffer;
    readonly mimeType: string;
    readonly sizeBytes: number;
  };
};

export type MobileEvidenceUploadResponse = {
  readonly contract: {
    readonly name: typeof CONTRACT_NAME;
    readonly version: typeof CONTRACT_VERSION;
    readonly status: "partial";
  };
  readonly evidence_id: string;
  readonly file_id: string;
  readonly status: "stored";
  readonly size_bytes: number;
  readonly mime_type: string;
  readonly content_type: string;
  readonly checksum_sha256: string;
  readonly sha256: string;
  readonly uploaded_at: string;
};

let evidenceUploadStorageRoot = path.join(os.tmpdir(), "erp-mobile-evidence-uploads");
let evidenceStorageProvider: EvidenceStorageProvider = new LocalProtectedEvidenceStorageProvider(evidenceUploadStorageRoot);
let evidenceScanner: EvidenceScanner = new NoopEvidenceScanner();

export function configureMobileEvidenceUploadStorageForTests(root: string): void {
  evidenceUploadStorageRoot = root;
  evidenceStorageProvider = new LocalProtectedEvidenceStorageProvider(root);
}

export function configureMobileEvidenceUploadScannerForTests(scanner: EvidenceScanner): void {
  evidenceScanner = scanner;
}

export function getMobileEvidenceUploadAuditEventsForTests(): readonly EvidenceAuditEvent[] {
  return getEvidenceAuditEventsForTests();
}

export async function resetMobileEvidenceUploadRuntimeForTests(): Promise<void> {
  await evidenceStorageProvider.clear?.();
  resetEvidenceAuditEventsForTests();
  evidenceScanner = new NoopEvidenceScanner();
}

export async function uploadMobileEvidenceFile(
  actor: AuthenticatedActor | undefined,
  request: Request,
): Promise<MobileEvidenceUploadResponse> {
  assertUploadActor(actor);
  if (request.is("multipart/form-data") !== "multipart/form-data") {
    throw routeError(400, "BAD_REQUEST", "invalid_content_type", "Request must be multipart/form-data.");
  }

  const parsed = await parseMultipartEvidenceUploadRequest(request);
  const evidenceId = requiredField(parsed.fields, "evidence_id");
  const clientEvidenceId = requiredField(parsed.fields, "client_evidence_id");
  const declaredSha256 = requiredField(parsed.fields, "sha256").toLowerCase();
  const declaredSizeBytes = parsePositiveInteger(requiredField(parsed.fields, "size_bytes"), "size_bytes");
  const contentType = normalizeContentType(parsed.file.mimeType, parsed.fields.get("content_type"));

  if (!isSafeClientEvidenceId(clientEvidenceId)) {
    throw routeError(400, "BAD_REQUEST", "invalid_client_evidence_id", "client_evidence_id is invalid.");
  }

  if (evidenceId !== `evidence:${actor.tenantId}:${clientEvidenceId}`) {
    throw routeError(403, "FORBIDDEN", "evidence_tenant_mismatch", "Evidence does not belong to the authenticated tenant.");
  }

  const receipt = findMobileEvidenceSyncReceiptForUpload(actor, clientEvidenceId);
  if (!receipt) {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_metadata_required", "Evidence metadata must be synced before file upload.");
  }

  if (receipt.evidenceId !== evidenceId) {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "evidence_metadata_required", "Evidence metadata does not match this upload.");
  }

  const uploadWorkOrderId = parsed.fields.get("work_order_id")?.trim();
  if (uploadWorkOrderId && receipt.workOrderId && uploadWorkOrderId !== receipt.workOrderId) {
    throw routeError(409, "MOBILE_EVIDENCE_CONFLICT", "work_order_mismatch", "work_order_id does not match synced evidence metadata.");
  }

  if (!/^[a-f0-9]{64}$/.test(declaredSha256)) {
    throw routeError(400, "BAD_REQUEST", "invalid_sha256", "sha256 must be a lowercase hex SHA-256 digest.");
  }

  if (!EVIDENCE_ALLOWED_MIME_TYPES.has(contentType)) {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "unsupported_content_type", parsed.file.sizeBytes, contentType);
    throw routeError(400, "BAD_REQUEST", "unsupported_content_type", "content_type must be image/jpeg or image/png.");
  }

  if (declaredSizeBytes !== parsed.file.sizeBytes) {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "size_mismatch", parsed.file.sizeBytes, contentType);
    throw routeError(400, "BAD_REQUEST", "size_mismatch", "size_bytes does not match uploaded file size.");
  }

  const computedSha256 = createHash("sha256").update(parsed.file.buffer).digest("hex");
  if (computedSha256 !== declaredSha256) {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "sha256_mismatch", parsed.file.sizeBytes, contentType);
    throw routeError(400, "BAD_REQUEST", "sha256_mismatch", "sha256 does not match uploaded file.");
  }

  const scanResult = await evidenceScanner.scan({
    tenantId: actor.tenantId,
    evidenceId,
    clientEvidenceId,
    mimeType: contentType,
    sizeBytes: parsed.file.sizeBytes,
    checksumSha256: computedSha256,
    buffer: parsed.file.buffer,
  });
  if (scanResult.status === "infected") {
    recordRejectedEvidenceAudit(actor, evidenceId, clientEvidenceId, "scanner_infected", parsed.file.sizeBytes, contentType);
    throw routeError(422, "UNPROCESSABLE_ENTITY", "evidence_rejected", "Evidence file was rejected by safety scan.");
  }
  if (scanResult.status === "failed") {
    recordEvidenceAuditEvent({
      action: "evidence.upload.scan_failed",
      tenantId: actor.tenantId,
      actorId: actor.userId,
      evidenceId,
      outcome: "failure",
      metadata: {
        client_evidence_id: clientEvidenceId,
        mime_type: contentType,
        size_bytes: parsed.file.sizeBytes,
        reason: "scanner_unavailable",
      },
    });
    throw routeError(503, "SERVICE_UNAVAILABLE", "evidence_scan_failed", "Evidence safety scan is temporarily unavailable.");
  }

  recordEvidenceAuditEvent({
    action: "evidence.upload.accepted",
    tenantId: actor.tenantId,
    actorId: actor.userId,
    evidenceId,
    outcome: "success",
    metadata: {
      client_evidence_id: clientEvidenceId,
      mime_type: contentType,
      size_bytes: parsed.file.sizeBytes,
      checksum_sha256: computedSha256,
    },
  });

  const stored = await evidenceStorageProvider.store({
    tenantId: actor.tenantId,
    evidenceId,
    clientEvidenceId,
    buffer: parsed.file.buffer,
    mimeType: contentType,
    checksumSha256: computedSha256,
  });

  recordEvidenceAuditEvent({
    action: "evidence.upload.stored",
    tenantId: actor.tenantId,
    actorId: actor.userId,
    evidenceId,
    outcome: "success",
    metadata: {
      client_evidence_id: clientEvidenceId,
      mime_type: stored.mimeType,
      size_bytes: stored.sizeBytes,
      checksum_sha256: stored.checksumSha256,
    },
  });

  return {
    contract: {
      name: CONTRACT_NAME,
      version: CONTRACT_VERSION,
      status: "partial",
    },
    evidence_id: evidenceId,
    file_id: stored.fileId,
    status: "stored",
    size_bytes: stored.sizeBytes,
    mime_type: stored.mimeType,
    content_type: stored.mimeType,
    checksum_sha256: stored.checksumSha256,
    sha256: stored.checksumSha256,
    uploaded_at: stored.storedAt.toISOString(),
  };
}

function parseMultipartEvidenceUploadRequest(request: Request): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const fields = new Map<string, string>();
    const chunks: Buffer[] = [];
    let fileCount = 0;
    let mimeType = "";
    let sizeBytes = 0;
    let terminalError: RouteLikeError | undefined;

    const fail = (error: RouteLikeError): void => {
      terminalError ??= error;
    };

    const busboy = Busboy({
      headers: request.headers,
      limits: {
        fields: 12,
        files: 1,
        fileSize: EVIDENCE_MAX_FILE_SIZE_BYTES,
      },
    });

    busboy.on("field", (name, value) => {
      fields.set(name, value);
    });

    busboy.on("file", (name, file, info) => {
      fileCount += 1;
      if (name !== "file" || fileCount > 1) {
        fail(routeError(400, "BAD_REQUEST", "invalid_file_field", "Upload must include exactly one file field named file."));
        file.resume();
        return;
      }

      mimeType = info.mimeType.toLowerCase();

      file.on("limit", () => {
        chunks.length = 0;
        fail(routeError(413, "PAYLOAD_TOO_LARGE", "file_too_large", "File must not exceed 10 MB."));
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
      fail(routeError(400, "BAD_REQUEST", "too_many_files", "Upload accepts one file only."));
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
        reject(routeError(400, "BAD_REQUEST", "file_required", "file is required."));
        return;
      }

      resolve({
        fields,
        file: {
          buffer: Buffer.concat(chunks),
          mimeType,
          sizeBytes,
        },
      });
    });

    request.pipe(busboy);
  });
}

function assertUploadActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  if (!actor?.tenantId) {
    throw routeError(403, "FORBIDDEN", "tenant_required", "Tenant context is required.");
  }
  if (!actor.userId || actor.userId === "anonymous") {
    throw routeError(403, "FORBIDDEN", "user_required", "User context is required.");
  }
  if (actor.roles.length === 0) {
    throw routeError(403, "FORBIDDEN", "role_required", "Role is required.");
  }
  if (!actor.permissions.includes("work_orders:update") && !actor.permissions.includes("field_location:send")) {
    throw routeError(403, "FORBIDDEN", "permission_required", "One of these permissions is required: work_orders:update, field_location:send.");
  }
}

function requiredField(fields: Map<string, string>, name: string): string {
  const value = fields.get(name)?.trim();
  if (!value) {
    throw routeError(400, "BAD_REQUEST", "required_field", `${name} is required.`);
  }
  return value;
}

function parsePositiveInteger(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw routeError(400, "BAD_REQUEST", "invalid_number", `${field} must be a positive integer.`);
  }
  if (parsed > EVIDENCE_MAX_FILE_SIZE_BYTES) {
    throw routeError(413, "PAYLOAD_TOO_LARGE", "file_too_large", `${field} must not exceed 10 MB.`);
  }
  return parsed;
}

function normalizeContentType(fileMimeType: string, declaredContentType: string | undefined): string {
  const fileType = fileMimeType.toLowerCase();
  const declaredType = declaredContentType?.trim().toLowerCase() ?? "";
  if (EVIDENCE_ALLOWED_MIME_TYPES.has(fileType)) return fileType;
  if (fileType === "application/octet-stream" && EVIDENCE_ALLOWED_MIME_TYPES.has(declaredType)) return declaredType;
  return fileType || declaredType;
}

function isSafeClientEvidenceId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,120}$/.test(value) && !value.includes("..");
}

type RouteLikeError = {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
};

function routeError(statusCode: number, code: string, reason: string, message: string): RouteLikeError {
  return { statusCode, code, reason, message };
}

function recordRejectedEvidenceAudit(
  actor: AuthenticatedActor,
  evidenceId: string,
  clientEvidenceId: string,
  reason: string,
  sizeBytes: number,
  mimeType: string,
): void {
  recordEvidenceAuditEvent({
    action: "evidence.upload.rejected",
    tenantId: actor.tenantId,
    actorId: actor.userId,
    evidenceId,
    outcome: "failure",
    metadata: {
      client_evidence_id: clientEvidenceId,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      reason,
    },
  });
}
