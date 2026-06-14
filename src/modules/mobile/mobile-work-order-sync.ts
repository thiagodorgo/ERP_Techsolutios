import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import { toWorkOrderDto } from "../work-orders/work-order.dto.js";
import { createDefaultWorkOrderService, type WorkOrderService } from "../work-orders/work-order.service.js";
import { WorkOrderError, type WorkOrder } from "../work-orders/work-order.types.js";

type RawRecord = Record<string, unknown>;

type MobileWorkOrderActionOutcome = "accepted" | "rejected" | "conflict" | "already_applied";

type MobileWorkOrderAction = {
  readonly client_action_id: string;
  readonly type: string;
  readonly payload: RawRecord;
  readonly local_created_at?: string;
};

type MobileWorkOrderActionResult = {
  readonly client_action_id: string;
  readonly type?: string;
  readonly status: MobileWorkOrderActionOutcome;
  readonly work_order_id?: string;
  readonly server_state?: ReturnType<typeof toWorkOrderDto>;
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

type MobileWorkOrderSyncReceipt = {
  readonly fingerprint: string;
  readonly result: MobileWorkOrderActionResult;
};

export type MobileWorkOrderSyncResponse = {
  readonly contract: {
    readonly name: "mobile_work_order_actions_sync";
    readonly version: "2026-06-14.b098b";
    readonly status: "implemented";
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
  readonly accepted: readonly MobileWorkOrderActionResult[];
  readonly rejected: readonly MobileWorkOrderActionResult[];
  readonly conflicts: readonly MobileWorkOrderActionResult[];
  readonly already_applied: readonly MobileWorkOrderActionResult[];
};

const MAX_BATCH_SIZE = 50;
const syncReceipts = new Map<string, MobileWorkOrderSyncReceipt>();

export async function syncMobileWorkOrderActions(
  actor: AuthenticatedActor | undefined,
  body: unknown,
  resolveService: () => Promise<WorkOrderService> = createDefaultWorkOrderService,
): Promise<MobileWorkOrderSyncResponse> {
  assertSyncActor(actor);
  const request = parseSyncRequest(body);
  const service = await resolveService();
  const accepted: MobileWorkOrderActionResult[] = [];
  const rejected: MobileWorkOrderActionResult[] = [];
  const conflicts: MobileWorkOrderActionResult[] = [];
  const alreadyApplied: MobileWorkOrderActionResult[] = [];

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
      name: "mobile_work_order_actions_sync",
      version: "2026-06-14.b098b",
      status: "implemented",
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

export function resetMobileWorkOrderSyncRuntimeForTests(): void {
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

  if (!hasAnyPermission(actor, ["work_orders:status", "work_orders:assign"])) {
    throw routeError(
      403,
      "FORBIDDEN",
      "permission_required",
      "One of these permissions is required: work_orders:status, work_orders:assign.",
    );
  }
}

function parseSyncRequest(body: unknown): {
  readonly client_batch_id: string | null;
  readonly actions: readonly MobileWorkOrderAction[];
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

function parseAction(value: unknown): MobileWorkOrderAction {
  const record = asRecord(value, "action");
  const clientActionId = parseRequiredString(record.client_action_id, "client_action_id");
  const type = parseRequiredString(record.type, "type");
  const payload = asRecord(record.payload, "payload");
  const localCreatedAt = parseOptionalString(record.local_created_at);

  if (localCreatedAt && Number.isNaN(Date.parse(localCreatedAt))) {
    throw routeError(400, "BAD_REQUEST", "invalid_action", "local_created_at must be a valid ISO date.");
  }

  return {
    client_action_id: clientActionId,
    type,
    payload,
    ...(localCreatedAt ? { local_created_at: localCreatedAt } : {}),
  };
}

async function processAction(
  service: WorkOrderService,
  actor: AuthenticatedActor,
  action: MobileWorkOrderAction,
): Promise<MobileWorkOrderActionResult> {
  try {
    if (action.type === "work_order.assign") {
      requireActionPermission(actor, action, "work_orders:assign");
      const workOrder = await service.assign(actor, parseRequiredString(action.payload.work_order_id, "work_order_id"), {
        operatorId: action.payload.operator_id,
        userId: action.payload.user_id,
        message: action.payload.message,
      });

      return acceptedResult(action, workOrder);
    }

    if (action.type !== "work_order.status_change") {
      throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");
    }

    requireActionPermission(actor, action, "work_orders:status");
    const workOrder = await service.changeStatus(actor, parseRequiredString(action.payload.work_order_id, "work_order_id"), {
      status: action.payload.status,
      message: action.payload.message,
      cancellationReason: action.payload.cancellation_reason,
    });

    return acceptedResult(action, workOrder);
  } catch (error) {
    return actionErrorResult(action, error);
  }
}

function requireActionPermission(
  actor: AuthenticatedActor,
  action: MobileWorkOrderAction,
  permission: "work_orders:assign" | "work_orders:status",
): void {
  if (actor.permissions.includes(permission)) {
    return;
  }

  throw routeError(403, "FORBIDDEN", "permission_required", `One of these permissions is required: ${permission}.`);
}

function acceptedResult(
  action: MobileWorkOrderAction,
  workOrder: WorkOrder,
): MobileWorkOrderActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    work_order_id: workOrder.id,
    server_state: toWorkOrderDto(workOrder),
  };
}

function actionErrorResult(
  action: MobileWorkOrderAction,
  error: unknown,
): MobileWorkOrderActionResult {
  if (isConflictError(error)) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "conflict",
      work_order_id: readWorkOrderId(action),
      conflict: {
        conflict_type: error.reason,
        server_id: readWorkOrderId(action),
        local: sanitizeActionForConflict(action),
        next_action: "refresh_work_order_and_retry",
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
      work_order_id: readWorkOrderId(action),
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Invalid work order action.";

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "rejected",
    work_order_id: readWorkOrderId(action),
    error: {
      code: "BAD_REQUEST",
      reason: "invalid_action",
      message,
    },
  };
}

function buildIdempotencyConflict(
  action: MobileWorkOrderAction,
  existingResult: MobileWorkOrderActionResult,
): MobileWorkOrderActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    work_order_id: readWorkOrderId(action),
    conflict: {
      conflict_type: "idempotency_payload_mismatch",
      server_id: existingResult.work_order_id,
      local: sanitizeActionForConflict(action),
      remote: {
        status: existingResult.status,
        type: existingResult.type,
        work_order_id: existingResult.work_order_id,
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

function fingerprintAction(action: MobileWorkOrderAction): string {
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

function asRecord(value: unknown, field: string): RawRecord {
  if (isPlainRecord(value)) {
    return value;
  }

  throw routeError(400, "BAD_REQUEST", "invalid_envelope", `${field} must be an object.`);
}

function isPlainRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readWorkOrderId(action: MobileWorkOrderAction): string | undefined {
  return typeof action.payload.work_order_id === "string" ? action.payload.work_order_id : undefined;
}

function sanitizeActionForConflict(action: MobileWorkOrderAction): RawRecord {
  return {
    type: action.type,
    payload: normalizePayload(action.payload),
    ...(action.local_created_at ? { local_created_at: action.local_created_at } : {}),
  };
}

function hasAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly ("work_orders:status" | "work_orders:assign")[],
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
    error instanceof WorkOrderError ||
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
