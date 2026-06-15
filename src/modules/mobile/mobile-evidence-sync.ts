import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";

type RawRecord = Record<string, unknown>;

type EvidenceActionType =
  | "evidence.work_order_photo"
  | "evidence.work_order_signature"
  | "evidence.work_order_observation"
  | "evidence.field_photo"
  | "evidence.field_signature"
  | "evidence.field_observation";

type EvidenceScope = "work_order" | "field";
type EvidenceKind = "photo" | "signature" | "observation";
type EvidenceActionOutcome = "accepted" | "rejected" | "conflict" | "already_applied";

type MobileEvidenceAction = {
  readonly client_evidence_id: string;
  readonly type: string;
  readonly local_created_at: string;
  readonly payload: RawRecord;
};

type EvidenceServerState = {
  readonly evidence_id: string;
  readonly scope: EvidenceScope;
  readonly kind: EvidenceKind;
  readonly work_order_id?: string;
  readonly status: "metadata_registered";
  readonly metadata: RawRecord;
};

type MobileEvidenceActionResult = {
  readonly client_evidence_id: string;
  readonly type?: string;
  readonly status: EvidenceActionOutcome;
  readonly evidence_id?: string;
  readonly work_order_id?: string;
  readonly server_state?: EvidenceServerState;
  readonly error?: {
    readonly code: string;
    readonly reason: string;
    readonly message: string;
  };
  readonly conflict?: {
    readonly conflict_type: string;
    readonly server_id?: string;
    readonly local: RawRecord;
    readonly remote?: RawRecord;
    readonly next_action: string;
  };
};

type MobileEvidenceSyncReceipt = {
  readonly fingerprint: string;
  readonly result: MobileEvidenceActionResult;
};

export type MobileEvidenceSyncResponse = {
  readonly contract: {
    readonly name: "mobile_evidence_actions_sync";
    readonly version: "2026-06-15.b098e";
    readonly status: "partial";
  };
  readonly client_batch_id: string | null;
  readonly tenant_id: string;
  readonly server_time: string;
  readonly summary: {
    readonly received: number;
    readonly accepted: number;
    readonly rejected: number;
    readonly conflicts: number;
    readonly already_applied: number;
  };
  readonly accepted: readonly MobileEvidenceActionResult[];
  readonly rejected: readonly MobileEvidenceActionResult[];
  readonly conflicts: readonly MobileEvidenceActionResult[];
  readonly already_applied: readonly MobileEvidenceActionResult[];
};

const MAX_BATCH_SIZE = 50;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);
const UNSAFE_PAYLOAD_KEYS = new Set(["base64", "file_data", "local_path", "path"]);
const syncReceipts = new Map<string, MobileEvidenceSyncReceipt>();
const supportedActionTypes: readonly EvidenceActionType[] = [
  "evidence.work_order_photo",
  "evidence.work_order_signature",
  "evidence.work_order_observation",
  "evidence.field_photo",
  "evidence.field_signature",
  "evidence.field_observation",
];

export async function syncMobileEvidenceActions(
  actor: AuthenticatedActor | undefined,
  body: unknown,
): Promise<MobileEvidenceSyncResponse> {
  assertSyncActor(actor);
  const request = parseSyncRequest(body);
  const accepted: MobileEvidenceActionResult[] = [];
  const rejected: MobileEvidenceActionResult[] = [];
  const conflicts: MobileEvidenceActionResult[] = [];
  const alreadyApplied: MobileEvidenceActionResult[] = [];

  for (const action of request.actions) {
    const fingerprint = fingerprintAction(action);
    const receiptKey = `${actor.tenantId}:${actor.userId}:${action.client_evidence_id}`;
    const existingReceipt = syncReceipts.get(receiptKey);

    if (existingReceipt) {
      if (existingReceipt.fingerprint === fingerprint) {
        alreadyApplied.push({
          ...existingReceipt.result,
          status: "already_applied",
        });
      } else {
        conflicts.push(buildIdempotencyConflict(action, existingReceipt.result));
      }
      continue;
    }

    const result = processAction(actor, action);

    if (result.status === "accepted") {
      syncReceipts.set(receiptKey, { fingerprint, result });
      accepted.push(result);
    } else if (result.status === "conflict") {
      conflicts.push(result);
    } else {
      rejected.push(result);
    }
  }

  return {
    contract: {
      name: "mobile_evidence_actions_sync",
      version: "2026-06-15.b098e",
      status: "partial",
    },
    client_batch_id: request.client_batch_id,
    tenant_id: actor.tenantId,
    server_time: new Date().toISOString(),
    summary: {
      received: request.actions.length,
      accepted: accepted.length,
      rejected: rejected.length,
      conflicts: conflicts.length,
      already_applied: alreadyApplied.length,
    },
    accepted,
    rejected,
    conflicts,
    already_applied: alreadyApplied,
  };
}

export function resetMobileEvidenceSyncRuntimeForTests(): void {
  syncReceipts.clear();
}

function assertSyncActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  if (!actor?.tenantId) {
    throw routeError(403, "FORBIDDEN", "tenant_required", "Tenant context is required.");
  }

  if (!actor.userId || actor.userId === "anonymous") {
    throw routeError(403, "FORBIDDEN", "user_required", "User context is required.");
  }

  if (actor.roles.length === 0) {
    throw routeError(403, "FORBIDDEN", "role_required", "Role is required.");
  }

  if (!hasAnyPermission(actor, ["work_orders:update", "field_location:send"])) {
    throw routeError(
      403,
      "FORBIDDEN",
      "permission_required",
      "One of these permissions is required: work_orders:update, field_location:send.",
    );
  }
}

function parseSyncRequest(body: unknown): {
  readonly client_batch_id: string | null;
  readonly actions: readonly MobileEvidenceAction[];
} {
  const record = asRecord(body, "body");

  if (!Array.isArray(record.actions)) {
    throw routeError(400, "BAD_REQUEST", "invalid_envelope", "actions must be an array.");
  }

  if (record.actions.length > MAX_BATCH_SIZE) {
    throw routeError(400, "BAD_REQUEST", "batch_too_large", `actions must contain at most ${MAX_BATCH_SIZE} items.`);
  }

  return {
    client_batch_id: parseOptionalString(record.client_batch_id),
    actions: record.actions.map(parseAction),
  };
}

function parseAction(value: unknown): MobileEvidenceAction {
  const record = asRecord(value, "action");
  const clientEvidenceId = parseRequiredString(record.client_evidence_id, "client_evidence_id");
  const type = parseRequiredString(record.type, "type");
  const localCreatedAt = parseRequiredString(record.local_created_at, "local_created_at");

  if (Number.isNaN(Date.parse(localCreatedAt))) {
    throw routeError(400, "BAD_REQUEST", "invalid_action", "local_created_at must be a valid ISO date.");
  }

  return {
    client_evidence_id: clientEvidenceId,
    type,
    local_created_at: localCreatedAt,
    payload: asRecord(record.payload, "payload"),
  };
}

function processAction(
  actor: AuthenticatedActor,
  action: MobileEvidenceAction,
): MobileEvidenceActionResult {
  try {
    if (!isSupportedActionType(action.type)) {
      throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");
    }

    const descriptor = describeAction(action.type);
    assertActionPermission(actor, descriptor.scope);
    assertSafePayload(action.payload);
    const metadata = validateAndNormalizeMetadata(action, descriptor.scope, descriptor.kind);
    const evidenceId = `evidence:${actor.tenantId}:${action.client_evidence_id}`;

    return {
      client_evidence_id: action.client_evidence_id,
      type: action.type,
      status: "accepted",
      evidence_id: evidenceId,
      ...(typeof metadata.work_order_id === "string" ? { work_order_id: metadata.work_order_id } : {}),
      server_state: {
        evidence_id: evidenceId,
        scope: descriptor.scope,
        kind: descriptor.kind,
        ...(typeof metadata.work_order_id === "string" ? { work_order_id: metadata.work_order_id } : {}),
        status: "metadata_registered",
        metadata,
      },
    };
  } catch (error) {
    return actionErrorResult(action, error);
  }
}

function assertActionPermission(actor: AuthenticatedActor, scope: EvidenceScope): void {
  const permission = scope === "work_order" ? "work_orders:update" : "field_location:send";

  if (!actor.permissions.includes(permission)) {
    throw routeError(403, "FORBIDDEN", "permission_required", `One of these permissions is required: ${permission}.`);
  }
}

function validateAndNormalizeMetadata(
  action: MobileEvidenceAction,
  scope: EvidenceScope,
  kind: EvidenceKind,
): RawRecord {
  const payload = normalizePayload(action.payload);

  if (scope === "work_order") {
    payload.work_order_id = parseRequiredString(payload.work_order_id, "work_order_id");
  }

  if (kind === "observation") {
    const note = parseOptionalString(payload.note) ?? parseOptionalString(payload.caption);

    if (!note) {
      throw routeError(400, "BAD_REQUEST", "required_field", "note or caption is required.");
    }

    payload.note = note;
  } else {
    payload.file_name = parseSafeFileName(payload.file_name);
    payload.content_type = parseAllowedContentType(payload.content_type);
    payload.size_bytes = parseFileSize(payload.size_bytes);
    payload.sha256 = parseRequiredString(payload.sha256, "sha256");
  }

  if (kind === "signature") {
    payload.signer_name = parseRequiredString(payload.signer_name, "signer_name");
  }

  if (payload.gps !== undefined) {
    payload.gps = parseGps(payload.gps);
  }

  payload.kind = kind;
  return payload;
}

function describeAction(type: EvidenceActionType): { readonly scope: EvidenceScope; readonly kind: EvidenceKind } {
  return {
    scope: type.includes(".work_order_") ? "work_order" : "field",
    kind: type.endsWith("_photo") ? "photo" : type.endsWith("_signature") ? "signature" : "observation",
  };
}

function assertSafePayload(payload: RawRecord): void {
  const unsafeKey = findUnsafePayloadKey(payload);

  if (unsafeKey) {
    throw routeError(
      400,
      "BAD_REQUEST",
      "unsafe_payload",
      `${unsafeKey} is not accepted; this partial contract registers metadata only.`,
    );
  }
}

function findUnsafePayloadKey(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.map(findUnsafePayloadKey).find((key) => key !== undefined);
  }

  if (!isPlainRecord(value)) return undefined;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (UNSAFE_PAYLOAD_KEYS.has(key)) return key;

    const nestedUnsafeKey = findUnsafePayloadKey(nestedValue);
    if (nestedUnsafeKey) return nestedUnsafeKey;
  }

  return undefined;
}

function actionErrorResult(action: MobileEvidenceAction, error: unknown): MobileEvidenceActionResult {
  const normalized = isRouteLikeError(error)
    ? error
    : routeError(
      400,
      "BAD_REQUEST",
      "invalid_action",
      error instanceof Error ? error.message : "Invalid evidence action.",
    );

  return {
    client_evidence_id: action.client_evidence_id,
    type: action.type,
    status: "rejected",
    ...(readWorkOrderId(action) ? { work_order_id: readWorkOrderId(action) } : {}),
    error: {
      code: normalized.code,
      reason: normalized.reason,
      message: normalized.message,
    },
  };
}

function buildIdempotencyConflict(
  action: MobileEvidenceAction,
  existingResult: MobileEvidenceActionResult,
): MobileEvidenceActionResult {
  return {
    client_evidence_id: action.client_evidence_id,
    type: action.type,
    status: "conflict",
    evidence_id: existingResult.evidence_id,
    ...(readWorkOrderId(action) ? { work_order_id: readWorkOrderId(action) } : {}),
    conflict: {
      conflict_type: "idempotency_payload_mismatch",
      server_id: existingResult.evidence_id,
      local: sanitizeActionForConflict(action),
      remote: {
        status: existingResult.status,
        type: existingResult.type,
        evidence_id: existingResult.evidence_id,
      },
      next_action: "drop_duplicate_or_create_new_client_evidence_id",
    },
    error: {
      code: "MOBILE_SYNC_CONFLICT",
      reason: "idempotency_payload_mismatch",
      message: "client_evidence_id was already applied with a different payload.",
    },
  };
}

function fingerprintAction(action: MobileEvidenceAction): string {
  return JSON.stringify({
    type: action.type,
    payload: normalizePayload(action.payload),
  });
}

function sanitizeActionForConflict(action: MobileEvidenceAction): RawRecord {
  return {
    type: action.type,
    payload: normalizePayload(action.payload),
    local_created_at: action.local_created_at,
  };
}

function normalizePayload(record: RawRecord): RawRecord {
  return sortRecord(record);
}

function sortRecord(record: RawRecord): RawRecord {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key !== "tenant_id" && key !== "tenantId")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, normalizeValue(value)]),
  );
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (isPlainRecord(value)) return sortRecord(value);
  return value;
}

function parseSafeFileName(value: unknown): string {
  const fileName = parseRequiredString(value, "file_name");

  if (fileName.includes("/") || fileName.includes("\\")) {
    throw routeError(400, "BAD_REQUEST", "invalid_file_name", "file_name must not contain a path.");
  }

  return fileName;
}

function parseAllowedContentType(value: unknown): string {
  const contentType = parseRequiredString(value, "content_type").toLowerCase();

  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw routeError(400, "BAD_REQUEST", "unsupported_content_type", "content_type must be image/jpeg or image/png.");
  }

  return contentType;
}

function parseFileSize(value: unknown): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
    throw routeError(400, "BAD_REQUEST", "invalid_size_bytes", "size_bytes must be a positive integer.");
  }

  if (value > MAX_UPLOAD_BYTES) {
    throw routeError(400, "BAD_REQUEST", "file_too_large", "size_bytes must not exceed 10 MB.");
  }

  return value;
}

function parseGps(value: unknown): RawRecord {
  const gps = asRecord(value, "gps");
  const lat = parseFiniteNumber(gps.lat, "gps.lat");
  const lng = parseFiniteNumber(gps.lng, "gps.lng");

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw routeError(400, "BAD_REQUEST", "invalid_gps", "gps coordinates are outside valid ranges.");
  }

  const accuracy = gps.accuracy_m === undefined ? undefined : parseNonNegativeNumber(gps.accuracy_m, "gps.accuracy_m");

  return {
    lat,
    lng,
    ...(accuracy === undefined ? {} : { accuracy_m: accuracy }),
  };
}

function parseFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw routeError(400, "BAD_REQUEST", "invalid_gps", `${field} must be a finite number.`);
  }

  return value;
}

function parseNonNegativeNumber(value: unknown, field: string): number {
  const number = parseFiniteNumber(value, field);

  if (number < 0) {
    throw routeError(400, "BAD_REQUEST", "invalid_gps", `${field} must be non-negative.`);
  }

  return number;
}

function parseRequiredString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw routeError(400, "BAD_REQUEST", "required_field", `${field} is required.`);
  }

  return normalized;
}

function parseOptionalString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function asRecord(value: unknown, field: string): RawRecord {
  if (isPlainRecord(value)) return value;
  throw routeError(400, "BAD_REQUEST", "invalid_envelope", `${field} must be an object.`);
}

function isPlainRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedActionType(type: string): type is EvidenceActionType {
  return supportedActionTypes.includes(type as EvidenceActionType);
}

function readWorkOrderId(action: MobileEvidenceAction): string | undefined {
  return typeof action.payload.work_order_id === "string" ? action.payload.work_order_id : undefined;
}

function hasAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly ("work_orders:update" | "field_location:send")[],
): boolean {
  return permissions.some((permission) => actor.permissions.includes(permission));
}

function isRouteLikeError(error: unknown): error is {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error &&
    "reason" in error &&
    "message" in error &&
    typeof error.statusCode === "number" &&
    typeof error.code === "string" &&
    typeof error.reason === "string" &&
    typeof error.message === "string"
  );
}

function routeError(statusCode: number, code: string, reason: string, message: string) {
  return { statusCode, code, reason, message };
}
