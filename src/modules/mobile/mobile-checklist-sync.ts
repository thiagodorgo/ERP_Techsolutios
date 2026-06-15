import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import {
  toChecklistRunAnswerDto,
  toChecklistRunDto,
} from "../checklists/checklist.dto.js";
import {
  ChecklistError,
  type ChecklistRunAnswer,
} from "../checklists/checklist.types.js";
import {
  createDefaultChecklistService,
  type ChecklistService,
} from "../checklists/checklist.service.js";

type RawRecord = Record<string, unknown>;

type MobileChecklistActionOutcome = "accepted" | "rejected" | "conflict" | "already_applied";
type ChecklistActionType = "checklist.item_answer" | "checklist.item_note" | "checklist.complete";

type MobileChecklistAction = {
  readonly client_action_id: string;
  readonly type: string;
  readonly payload: RawRecord;
  readonly local_created_at: string;
};

type MobileChecklistActionResult = {
  readonly client_action_id: string;
  readonly type?: string;
  readonly status: MobileChecklistActionOutcome;
  readonly checklist_run_id?: string;
  readonly server_state?: {
    readonly run: ReturnType<typeof toChecklistRunDto>;
    readonly answers: readonly ReturnType<typeof toChecklistRunAnswerDto>[];
  };
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

type MobileChecklistSyncReceipt = {
  readonly fingerprint: string;
  readonly result: MobileChecklistActionResult;
};

export type MobileChecklistSyncResponse = {
  readonly contract: {
    readonly name: "mobile_checklist_actions_sync";
    readonly version: "2026-06-14.b098c";
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
  readonly accepted: readonly MobileChecklistActionResult[];
  readonly rejected: readonly MobileChecklistActionResult[];
  readonly conflicts: readonly MobileChecklistActionResult[];
  readonly already_applied: readonly MobileChecklistActionResult[];
};

const MAX_BATCH_SIZE = 50;
const syncReceipts = new Map<string, MobileChecklistSyncReceipt>();
const supportedActionTypes: readonly ChecklistActionType[] = [
  "checklist.item_answer",
  "checklist.item_note",
  "checklist.complete",
];

export async function syncMobileChecklistActions(
  actor: AuthenticatedActor | undefined,
  body: unknown,
  resolveService: () => Promise<ChecklistService> = createDefaultChecklistService,
): Promise<MobileChecklistSyncResponse> {
  assertSyncActor(actor);
  const request = parseSyncRequest(body);
  const service = await resolveService();
  const accepted: MobileChecklistActionResult[] = [];
  const rejected: MobileChecklistActionResult[] = [];
  const conflicts: MobileChecklistActionResult[] = [];
  const alreadyApplied: MobileChecklistActionResult[] = [];

  for (const action of request.actions) {
    const fingerprint = fingerprintAction(action);
    const receiptKey = buildReceiptKey(actor, action.client_action_id);
    const existingReceipt = syncReceipts.get(receiptKey);

    if (existingReceipt) {
      if (existingReceipt.fingerprint === fingerprint) {
        alreadyApplied.push({
          ...existingReceipt.result,
          status: "already_applied",
        });
        continue;
      }

      conflicts.push(buildIdempotencyConflict(action, existingReceipt.result));
      continue;
    }

    const result = await processAction(service, actor, action);

    if (result.status === "accepted") {
      syncReceipts.set(receiptKey, {
        fingerprint,
        result,
      });
      accepted.push(result);
      continue;
    }

    if (result.status === "conflict") {
      conflicts.push(result);
      continue;
    }

    rejected.push(result);
  }

  return {
    contract: {
      name: "mobile_checklist_actions_sync",
      version: "2026-06-14.b098c",
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

export function resetMobileChecklistSyncRuntimeForTests(): void {
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

  if (!hasAnyPermission(actor, ["checklist_runs:update", "checklist_runs:complete"])) {
    throw routeError(
      403,
      "FORBIDDEN",
      "permission_required",
      "One of these permissions is required: checklist_runs:update, checklist_runs:complete.",
    );
  }
}

function parseSyncRequest(body: unknown): {
  readonly client_batch_id: string | null;
  readonly actions: readonly MobileChecklistAction[];
} {
  const record = asRecord(body, "body");
  const clientBatchId = parseOptionalString(record.client_batch_id);

  if (!Array.isArray(record.actions)) {
    throw routeError(400, "BAD_REQUEST", "invalid_envelope", "actions must be an array.");
  }

  if (record.actions.length > MAX_BATCH_SIZE) {
    throw routeError(400, "BAD_REQUEST", "batch_too_large", `actions must contain at most ${MAX_BATCH_SIZE} items.`);
  }

  return {
    client_batch_id: clientBatchId,
    actions: record.actions.map(parseAction),
  };
}

function parseAction(value: unknown): MobileChecklistAction {
  const record = asRecord(value, "action");
  const clientActionId = parseRequiredString(record.client_action_id, "client_action_id");
  const type = parseRequiredString(record.type, "type");
  const payload = asRecord(record.payload, "payload");
  const localCreatedAt = parseRequiredString(record.local_created_at, "local_created_at");

  if (Number.isNaN(Date.parse(localCreatedAt))) {
    throw routeError(400, "BAD_REQUEST", "invalid_action", "local_created_at must be a valid ISO date.");
  }

  return {
    client_action_id: clientActionId,
    type,
    payload,
    local_created_at: localCreatedAt,
  };
}

async function processAction(
  service: ChecklistService,
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
): Promise<MobileChecklistActionResult> {
  try {
    if (!isSupportedActionType(action.type)) {
      throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");
    }

    if (action.type === "checklist.complete") {
      requireActionPermission(actor, action, "checklist_runs:complete");
      const details = await service.completeRun(
        actor,
        parseRequiredString(action.payload.run_id, "run_id"),
        {
          hasDivergence: parseOptionalBoolean(action.payload.has_divergence) ?? false,
          observation: parseOptionalString(action.payload.observation) ?? undefined,
        },
      );

      return acceptedResult(action, details);
    }

    requireActionPermission(actor, action, "checklist_runs:update");

    const details = await service.getRun(actor, parseRequiredString(action.payload.run_id, "run_id"));
    const existingAnswer = details.answers.find(
      (answer) => answer.componentId === parseRequiredString(action.payload.component_id, "component_id"),
    );
    const answer = action.type === "checklist.item_answer"
      ? buildAnswerPayload(action)
      : buildNotePayload(action, existingAnswer);
    const updated = await service.updateRun(actor, details.run.id, {
      answers: [answer],
    });

    return acceptedResult(action, updated);
  } catch (error) {
    return actionErrorResult(action, error);
  }
}

function buildAnswerPayload(action: MobileChecklistAction) {
  return {
    componentId: parseRequiredString(action.payload.component_id, "component_id"),
    value: action.payload.value ?? null,
    metadata: parseOptionalRecord(action.payload.metadata),
  };
}

function buildNotePayload(
  action: MobileChecklistAction,
  existingAnswer: ChecklistRunAnswer | undefined,
) {
  return {
    componentId: parseRequiredString(action.payload.component_id, "component_id"),
    value: existingAnswer?.value ?? action.payload.value ?? null,
    metadata: {
      ...(existingAnswer?.metadata ?? {}),
      ...parseOptionalRecord(action.payload.metadata),
      note: parseRequiredString(action.payload.note, "note"),
    },
  };
}

function requireActionPermission(
  actor: AuthenticatedActor,
  action: MobileChecklistAction,
  permission: "checklist_runs:update" | "checklist_runs:complete",
): void {
  if (actor.permissions.includes(permission)) {
    return;
  }

  throw routeError(403, "FORBIDDEN", "permission_required", `One of these permissions is required: ${permission}.`);
}

function acceptedResult(
  action: MobileChecklistAction,
  details: Awaited<ReturnType<ChecklistService["updateRun"]>>,
): MobileChecklistActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    checklist_run_id: details.run.id,
    server_state: {
      run: toChecklistRunDto(details.run),
      answers: details.answers.map(toChecklistRunAnswerDto),
    },
  };
}

function actionErrorResult(
  action: MobileChecklistAction,
  error: unknown,
): MobileChecklistActionResult {
  if (isConflictError(error)) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "conflict",
      checklist_run_id: readRunId(action),
      conflict: {
        conflict_type: error.reason,
        server_id: readRunId(action),
        local: sanitizeActionForConflict(action),
        next_action: "refresh_checklist_run_and_retry",
      },
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    };
  }

  if (isRouteLikeError(error)) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "rejected",
      checklist_run_id: readRunId(action),
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Invalid checklist action.";

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "rejected",
    checklist_run_id: readRunId(action),
    error: {
      code: "BAD_REQUEST",
      reason: "invalid_action",
      message,
    },
  };
}

function buildIdempotencyConflict(
  action: MobileChecklistAction,
  existingResult: MobileChecklistActionResult,
): MobileChecklistActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    checklist_run_id: readRunId(action),
    conflict: {
      conflict_type: "idempotency_payload_mismatch",
      server_id: existingResult.checklist_run_id,
      local: sanitizeActionForConflict(action),
      remote: {
        status: existingResult.status,
        type: existingResult.type,
        checklist_run_id: existingResult.checklist_run_id,
      },
      next_action: "drop_duplicate_or_create_new_client_action_id",
    },
    error: {
      code: "MOBILE_SYNC_CONFLICT",
      reason: "idempotency_payload_mismatch",
      message: "client_action_id was already applied with a different payload.",
    },
  };
}

function fingerprintAction(action: MobileChecklistAction): string {
  return JSON.stringify({
    type: action.type,
    payload: normalizePayload(action.payload),
  });
}

function normalizePayload(record: RawRecord): RawRecord {
  return sortRecord(
    Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "tenant_id" && key !== "tenantId"),
    ),
  );
}

function sortRecord(record: RawRecord): RawRecord {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [
        key,
        isPlainRecord(value) ? sortRecord(value) : value,
      ]),
  );
}

function buildReceiptKey(actor: AuthenticatedActor, clientActionId: string): string {
  return `${actor.tenantId}:${actor.userId}:${clientActionId}`;
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

function parseOptionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseOptionalRecord(value: unknown): RawRecord {
  return value === undefined ? {} : asRecord(value, "metadata");
}

function asRecord(value: unknown, field: string): RawRecord {
  if (isPlainRecord(value)) {
    return value;
  }

  throw routeError(400, "BAD_REQUEST", "invalid_envelope", `${field} must be an object.`);
}

function isPlainRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedActionType(type: string): type is ChecklistActionType {
  return supportedActionTypes.includes(type as ChecklistActionType);
}

function readRunId(action: MobileChecklistAction): string | undefined {
  return typeof action.payload.run_id === "string" ? action.payload.run_id : undefined;
}

function sanitizeActionForConflict(action: MobileChecklistAction): RawRecord {
  return {
    type: action.type,
    payload: normalizePayload(action.payload),
    local_created_at: action.local_created_at,
  };
}

function hasAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly ("checklist_runs:update" | "checklist_runs:complete")[],
): boolean {
  return permissions.some((permission) => actor.permissions.includes(permission));
}

function isConflictError(error: unknown): error is {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
} {
  return isRouteLikeError(error) && error.statusCode === 409;
}

function isRouteLikeError(error: unknown): error is {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
} {
  return (
    error instanceof ChecklistError ||
    (
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
    )
  );
}

function routeError(
  statusCode: number,
  code: string,
  reason: string,
  message: string,
) {
  return {
    statusCode,
    code,
    reason,
    message,
  };
}
