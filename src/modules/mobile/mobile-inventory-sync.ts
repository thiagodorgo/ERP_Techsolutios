import { createLogger } from "../../infra/logging/logger.js";
import { publicErrorMessage } from "../../infra/logging/public-error.js";

import { env } from "../../config/env.js";
import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import type { InventoryService } from "../inventory/inventory.service.js";
import type { StockMovement } from "../inventory/inventory.types.js";
import { parseRequiredUuid } from "../inventory/inventory.validators.js";
import type { WorkOrderService } from "../work-orders/work-order.service.js";
import {
  actorMutatesAssignedOnly,
  ASSIGNMENT_CHANGED_CONFLICT_TYPE,
  ASSIGNMENT_CHANGED_NEXT_ACTION,
  isPreviouslyAssignedRefusal,
} from "../work-orders/work-order.types.js";

type RawRecord = Record<string, unknown>;

type MobileInventoryActionOutcome = "accepted" | "rejected" | "conflict" | "already_applied";

type MobileInventoryAction = {
  readonly client_action_id: string;
  readonly type: string;
  readonly payload: RawRecord;
  readonly local_created_at: string;
};

type MobileInventoryActionResult = {
  readonly client_action_id: string;
  readonly type?: string;
  readonly status: MobileInventoryActionOutcome;
  readonly item_id?: string;
  readonly warehouse_id?: string;
  readonly work_order_id?: string;
  readonly work_order_local_id?: string;
  readonly material_local_id?: string;
  readonly result_ref?: string;
  readonly server_state?: {
    readonly movement_id: string;
    readonly item_id: string;
    readonly sku: string;
    readonly quantity: number;
    readonly work_order_id: string;
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

export type MobileInventorySyncResponse = {
  readonly contract: {
    readonly name: "mobile_inventory_actions_sync";
    readonly version: "2026-11.b-material-reenvio";
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
  readonly accepted: readonly MobileInventoryActionResult[];
  readonly rejected: readonly MobileInventoryActionResult[];
  readonly conflicts: readonly MobileInventoryActionResult[];
  readonly already_applied: readonly MobileInventoryActionResult[];
};

const MAX_BATCH_SIZE = 50;
const logger = createLogger();

// B-O6R-04b (D4) — a porta do lote do app tem uma chave só. O lote só aceita o material da OS (`work_order_material.add`
// e `.remove`), que exige esta mesma chave por ação; quem só cuida do almoxarifado recebe 403 `permission_required`.
export const MOBILE_INVENTORY_SYNC_PERMISSION = "work_orders:update" as const;

export type MobileInventorySyncDeps = {
  readonly inventory: InventoryService;
  readonly workOrders: WorkOrderService;
  readonly workOrdersModuleEnabled: () => Promise<boolean>;
};

export async function syncMobileInventoryActions(
  actor: AuthenticatedActor | undefined,
  body: unknown,
  deps: MobileInventorySyncDeps,
): Promise<MobileInventorySyncResponse> {
  assertSyncActor(actor);
  const request = parseSyncRequest(body);
  const accepted: MobileInventoryActionResult[] = [];
  const rejected: MobileInventoryActionResult[] = [];
  const conflicts: MobileInventoryActionResult[] = [];
  const alreadyApplied: MobileInventoryActionResult[] = [];

  for (const action of request.actions) {
    const result = await processAction(deps, actor, action);

    if (result.status === "accepted") {
      accepted.push(result);
      continue;
    }

    if (result.status === "already_applied") {
      alreadyApplied.push(result);
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
      name: "mobile_inventory_actions_sync",
      version: "2026-11.b-material-reenvio",
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

function assertSyncActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  assertBaseActor(actor);

  if (!hasAnyPermission(actor, [MOBILE_INVENTORY_SYNC_PERMISSION])) {
    throw routeError(
      403,
      "FORBIDDEN",
      "permission_required",
      `One of these permissions is required: ${MOBILE_INVENTORY_SYNC_PERMISSION}.`,
    );
  }
}

function assertBaseActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  if (!actor?.tenantId) {
    throw routeError(403, "FORBIDDEN", "tenant_required", "Tenant context is required.");
  }

  if (!actor.userId || actor.userId === "anonymous") {
    throw routeError(403, "FORBIDDEN", "user_required", "User context is required.");
  }

  if (actor.roles.length === 0) {
    throw routeError(403, "FORBIDDEN", "role_required", "Role is required.");
  }
}

function parseSyncRequest(body: unknown): {
  readonly client_batch_id: string | null;
  readonly actions: readonly MobileInventoryAction[];
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

function parseAction(value: unknown): MobileInventoryAction {
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
  deps: MobileInventorySyncDeps,
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
): Promise<MobileInventoryActionResult> {
  try {
    if (action.type === "work_order_material.add") {
      requireActionPermission(actor, MOBILE_INVENTORY_SYNC_PERMISSION);
      return withMaterialEcho(action, await addWorkOrderMaterial(deps, actor, action));
    }

    if (action.type === "work_order_material.remove") {
      requireActionPermission(actor, MOBILE_INVENTORY_SYNC_PERMISSION);
      return withMaterialEcho(action, await removeWorkOrderMaterial(deps, actor, action));
    }

    // B-O6R-04b (D2): todo tipo que não é o material da OS é recusado por ação, sem processar a carga.
    throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");
  } catch (error) {
    if (isRouteLikeError(error) && error.statusCode === 503) throw error;
    if (isMaterialActionType(action.type) && !isMaterialRefusal(error)) {
      throw unexpectedMaterialFailure(action, error);
    }
    return withMaterialEcho(action, actionErrorResult(action, error));
  }
}

function isMaterialActionType(type: string): boolean {
  return type === "work_order_material.add" || type === "work_order_material.remove";
}

/** Recusa de domínio (4xx com motivo): vira `rejected`/`conflict` por ação. Todo o resto é falha do servidor. */
function isMaterialRefusal(error: unknown): boolean {
  return isRouteLikeError(error) && error.statusCode < 500;
}

/**
 * C2 item 4 ("outro → propaga") e C1-02 da J-551. No material, a falha que não é recusa de domínio (banco, rede,
 * bug) derruba o LOTE com 500 `unexpected_error` e mensagem fixa (`docs/mobile-sync-contracts.md`), nunca o texto
 * do erro. O app trata o 500 como falha transitória e tenta de novo; o reenvio cai no índice de origem, então o
 * commit ambíguo (a baixa gravada antes da falha) volta `already_applied`, e o que não gravou volta `accepted`.
 * O log leva o tipo da ação, o nome e o código do erro, nunca a mensagem.
 */
function unexpectedMaterialFailure(action: MobileInventoryAction, error: unknown) {
  logger.warn(
    {
      event: "mobile_inventory_sync.material_failure",
      type: action.type,
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: readErrorCode(error),
    },
    "material sync action failed; the batch answers 500",
  );
  return routeError(500, "INTERNAL_SERVER_ERROR", "unexpected_error", "Unexpected error.");
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function withMaterialEcho(
  action: MobileInventoryAction,
  result: MobileInventoryActionResult,
): MobileInventoryActionResult {
  if (action.type !== "work_order_material.add" && action.type !== "work_order_material.remove") return result;
  return {
    ...result,
    ...(typeof action.payload.work_order_local_id === "string"
      ? { work_order_local_id: action.payload.work_order_local_id }
      : {}),
    ...(typeof action.payload.material_local_id === "string"
      ? { material_local_id: action.payload.material_local_id }
      : {}),
  };
}

async function addWorkOrderMaterial(
  { inventory, workOrders, workOrdersModuleEnabled }: MobileInventorySyncDeps,
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
): Promise<MobileInventoryActionResult> {
  const sourceId = parseClientActionId(action.client_action_id);
  const sku = parseRequiredString(action.payload.sku, "sku");
  const quantity = parsePositiveInteger(action.payload.quantity, "quantity");
  const workOrderId = parseMaterialWorkOrderId(action.payload.work_order_id);

  if (!(await workOrdersModuleEnabled())) {
    throw routeError(403, "FORBIDDEN", "module_not_enabled", "The work_orders module is not enabled.");
  }

  await (actorMutatesAssignedOnly(actor)
    ? workOrders.getForMutation(actor, workOrderId)
    : workOrders.get(actor, workOrderId));

  const item = await inventory.findItemBySku(actor, sku);
  if (!item) {
    throw routeError(404, "INVENTORY_ITEM_NOT_FOUND", "inventory_item_not_found", "Inventory item not found.");
  }

  const existing = await inventory.findExitBySource(actor, "work_order_material", sourceId);
  if (existing) {
    return materialReplayResult(actor, action, existing, item.id, quantity, workOrderId);
  }

  const custody = await inventory.actorStockCustody(actor);
  if (!custody) {
    throw routeError(
      422,
      "INVENTORY_INVALID",
      "operator_profile_required",
      "An active operator profile is required to post material for this field actor.",
    );
  }

  const movement = await inventory.createExitForSource(actor, {
    sourceType: "work_order_material",
    sourceId,
    itemId: item.id,
    quantity,
    workOrderId,
    custody,
  });
  const replay = materialReplayResult(actor, action, movement, item.id, quantity, workOrderId);
  if (replay.status === "conflict") return replay;

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    item_id: item.id,
    work_order_id: workOrderId,
    result_ref: movement.id,
    server_state: materialServerState(movement, item.sku, quantity, workOrderId),
  };
}

async function removeWorkOrderMaterial(
  { inventory, workOrders, workOrdersModuleEnabled }: MobileInventorySyncDeps,
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
): Promise<MobileInventoryActionResult> {
  parseClientActionId(action.client_action_id);
  const sourceId = parseSourceClientActionId(action.payload.source_client_action_id);
  const payloadWorkOrderId = parseMaterialWorkOrderId(action.payload.work_order_id);

  if (!(await workOrdersModuleEnabled())) {
    throw routeError(403, "FORBIDDEN", "module_not_enabled", "The work_orders module is not enabled.");
  }

  const exit = await inventory.findExitBySource(actor, "work_order_material", sourceId);
  if (!exit) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "already_applied",
      work_order_id: payloadWorkOrderId,
    };
  }

  const exitWorkOrderId = parseMaterialWorkOrderId(exit.workOrderId);
  try {
    await (actorMutatesAssignedOnly(actor)
      ? workOrders.getForMutation(actor, exitWorkOrderId)
      : workOrders.get(actor, exitWorkOrderId));
  } catch (error) {
    // N4 e C1-01 da J-551: o conflito do ex-técnico aponta a OS DA BAIXA, nunca a OS que o payload cita.
    if (isPreviouslyAssignedRefusal(error) && isRouteLikeError(error)) {
      return assignmentChangedConflict(action, exitWorkOrderId, error);
    }
    throw error;
  }

  if (payloadWorkOrderId !== exitWorkOrderId) {
    throw routeError(422, "INVENTORY_INVALID", "work_order_mismatch", "work_order_id differs from the material exit.");
  }

  if (exit.createdBy !== actor.userId) {
    return materialConflict(action, "action_owned_by_other_actor", exit);
  }

  const reversal = await inventory.removeExitForSource(actor, "work_order_material", sourceId);
  if (!reversal) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "already_applied",
      work_order_id: exitWorkOrderId,
    };
  }

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    item_id: exit.itemId,
    work_order_id: exitWorkOrderId,
    result_ref: reversal.id,
  };
}

function materialReplayResult(
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
  movement: StockMovement,
  itemId: string,
  quantity: number,
  workOrderId: string,
): MobileInventoryActionResult {
  if (movement.createdBy !== actor.userId) {
    return materialConflict(action, "action_owned_by_other_actor", movement);
  }

  const samePayload = movement.itemId === itemId
    && Math.abs(movement.quantidadeSinalizada) === quantity
    && movement.workOrderId === workOrderId;
  if (!samePayload) return materialConflict(action, "idempotency_payload_mismatch", movement);

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "already_applied",
    item_id: movement.itemId,
    work_order_id: movement.workOrderId,
    result_ref: movement.id,
  };
}

function actionErrorResult(
  action: MobileInventoryAction,
  error: unknown,
): MobileInventoryActionResult {
  if (isPreviouslyAssignedRefusal(error) && isRouteLikeError(error)) {
    return assignmentChangedConflict(action, readWorkOrderId(action), error);
  }

  if (isRouteLikeError(error) && error.statusCode === 409) {
    return materialConflict(action, error.reason);
  }

  if (isRouteLikeError(error)) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "rejected",
      item_id: readItemId(action),
      warehouse_id: readWarehouseId(action),
      error: {
        code: error.code,
        reason: error.reason,
        message: error.message,
      },
    };
  }

  const message = publicErrorMessage(error, "Unexpected error.");

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "rejected",
    item_id: readItemId(action),
    warehouse_id: readWarehouseId(action),
    error: {
      code: "BAD_REQUEST",
      reason: "invalid_action",
      message,
    },
  };
}

/** O ex-técnico da OS: conflito à espera do supervisor, com `server_id`/`work_order_id` da OS que o escopo julgou. */
function assignmentChangedConflict(
  action: MobileInventoryAction,
  workOrderId: string | undefined,
  error: { readonly code: string; readonly reason: string; readonly message: string },
): MobileInventoryActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    work_order_id: workOrderId,
    conflict: {
      conflict_type: ASSIGNMENT_CHANGED_CONFLICT_TYPE,
      server_id: workOrderId,
      local: sanitizeActionForConflict(action),
      next_action: ASSIGNMENT_CHANGED_NEXT_ACTION,
    },
    error: {
      code: error.code,
      reason: error.reason,
      message: error.message,
    },
  };
}

function materialConflict(
  action: MobileInventoryAction,
  conflictType: string,
  movement?: StockMovement,
): MobileInventoryActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    item_id: movement?.itemId,
    work_order_id: movement?.workOrderId ?? readWorkOrderId(action),
    conflict: {
      conflict_type: conflictType,
      server_id: movement?.id,
      local: sanitizeActionForConflict(action),
      ...(movement ? {
        remote: {
          movement_id: movement.id,
          item_id: movement.itemId,
          quantity: Math.abs(movement.quantidadeSinalizada),
          work_order_id: movement.workOrderId,
        },
      } : {}),
      next_action: conflictType === "assignment_changed_pending_review"
        ? ASSIGNMENT_CHANGED_NEXT_ACTION
        : "review_material_and_retry",
    },
    error: {
      code: "MOBILE_SYNC_CONFLICT",
      reason: conflictType,
      message: conflictType === "action_owned_by_other_actor"
        ? "client_action_id belongs to another actor."
        : "The material action conflicts with server state.",
    },
  };
}

function materialServerState(
  movement: StockMovement,
  sku: string,
  quantity: number,
  workOrderId: string,
): Extract<NonNullable<MobileInventoryActionResult["server_state"]>, { movement_id: string }> {
  return {
    movement_id: movement.id,
    item_id: movement.itemId,
    sku,
    quantity,
    work_order_id: workOrderId,
  };
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

function parsePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw routeError(400, "BAD_REQUEST", "invalid_quantity", `${field} must be a positive integer.`);
  }

  return value;
}

function parseMaterialWorkOrderId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw routeError(400, "BAD_REQUEST", "work_order_id_required", "work_order_id is required.");
  }

  return parseRequiredUuid(value, "work_order_id");
}

function parseClientActionId(value: unknown): string {
  try {
    return parseRequiredUuid(value, "client_action_id");
  } catch {
    throw routeError(400, "BAD_REQUEST", "invalid_client_action_id", "client_action_id must be a valid UUID.");
  }
}

function parseSourceClientActionId(value: unknown): string {
  try {
    return parseRequiredUuid(value, "source_client_action_id");
  } catch {
    throw routeError(
      400,
      "BAD_REQUEST",
      "invalid_client_action_id",
      "source_client_action_id must be a valid UUID.",
    );
  }
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

function readItemId(action: MobileInventoryAction): string | undefined {
  return typeof action.payload.item_id === "string" ? action.payload.item_id : undefined;
}

function readWarehouseId(action: MobileInventoryAction): string | undefined {
  return typeof action.payload.warehouse_id === "string" ? action.payload.warehouse_id : undefined;
}

function readWorkOrderId(action: MobileInventoryAction): string | undefined {
  return typeof action.payload.work_order_id === "string" ? action.payload.work_order_id : undefined;
}

function sanitizeActionForConflict(action: MobileInventoryAction): RawRecord {
  return {
    type: action.type,
    payload: normalizePayload(action.payload),
    local_created_at: action.local_created_at,
  };
}

function hasAnyPermission(
  actor: AuthenticatedActor,
  permissions: readonly ("inventory.read" | "inventory.manage" | "work_orders:update")[],
): boolean {
  return permissions.some((permission) => actor.permissions.includes(permission));
}

function requireActionPermission(
  actor: AuthenticatedActor,
  permission: "inventory.manage" | "work_orders:update",
): void {
  if (actor.permissions.includes(permission)) return;
  throw routeError(403, "FORBIDDEN", "permission_required", `One of these permissions is required: ${permission}.`);
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
