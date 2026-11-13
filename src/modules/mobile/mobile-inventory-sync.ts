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
type InventoryActionType = "inventory.reserve" | "inventory.consume" | "inventory.shortage_report";

type MobileInventoryAction = {
  readonly client_action_id: string;
  readonly type: string;
  readonly payload: RawRecord;
  readonly local_created_at: string;
};

type InventoryItemState = {
  readonly item_id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly warehouse_id: string;
  readonly available_quantity: number;
  readonly reserved_quantity: number;
  readonly status: "available" | "low_stock" | "out_of_stock";
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
  readonly server_state?: InventoryItemState | {
    readonly shortage_report_id: string;
    readonly item_id: string;
    readonly warehouse_id?: string;
    readonly reported_quantity: number;
    readonly reason: string;
    readonly status: "reported";
  } | {
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

type MobileInventorySyncReceipt = {
  readonly fingerprint: string;
  readonly result: MobileInventoryActionResult;
};

export type MobileInventoryAvailabilityResponse = {
  readonly contract: {
    readonly name: "mobile_inventory_availability";
    readonly version: "2026-06-15.b098d";
    readonly status: "partial";
  };
  readonly tenant_id: string;
  readonly server_time: string;
  readonly filters: {
    readonly item_id: string | null;
    readonly sku: string | null;
    readonly warehouse_id: string | null;
    readonly work_order_id: string | null;
  };
  readonly items: readonly InventoryItemState[];
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
const syncReceipts = new Map<string, MobileInventorySyncReceipt>();
const inventoryByTenant = new Map<string, Map<string, InventoryItemState>>();
const supportedActionTypes: readonly InventoryActionType[] = [
  "inventory.reserve",
  "inventory.consume",
  "inventory.shortage_report",
];

export type MobileInventorySyncDeps = {
  readonly inventory: InventoryService;
  readonly workOrders: WorkOrderService;
  readonly workOrdersModuleEnabled: () => Promise<boolean>;
};

export function getMobileInventoryAvailability(
  actor: AuthenticatedActor | undefined,
  query: unknown,
): MobileInventoryAvailabilityResponse {
  assertAvailabilityActor(actor);
  const filters = parseAvailabilityFilters(query);
  const inventory = listTenantInventory(actor.tenantId)
    .filter((item) => !filters.item_id || item.item_id === filters.item_id)
    .filter((item) => !filters.sku || item.sku === filters.sku)
    .filter((item) => !filters.warehouse_id || item.warehouse_id === filters.warehouse_id);

  return {
    contract: {
      name: "mobile_inventory_availability",
      version: "2026-06-15.b098d",
      status: "partial",
    },
    tenant_id: actor.tenantId,
    server_time: new Date().toISOString(),
    filters,
    items: inventory,
  };
}

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
    const legacyAction = isSupportedActionType(action.type);
    const fingerprint = legacyAction ? fingerprintAction(action) : undefined;
    const receiptKey = legacyAction ? buildReceiptKey(actor, action.client_action_id) : undefined;
    const existingReceipt = receiptKey ? syncReceipts.get(receiptKey) : undefined;

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

    const result = await processAction(deps, actor, action);

    if (result.status === "accepted") {
      if (receiptKey && fingerprint) {
        syncReceipts.set(receiptKey, { fingerprint, result });
      }
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

export function resetMobileInventoryRuntimeForTests(): void {
  syncReceipts.clear();
  inventoryByTenant.clear();
}

function assertAvailabilityActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  assertBaseActor(actor);

  if (!hasAnyPermission(actor, ["inventory.read", "inventory.manage"])) {
    throw routeError(403, "FORBIDDEN", "permission_required", "One of these permissions is required: inventory.read, inventory.manage.");
  }
}

function assertSyncActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  assertBaseActor(actor);

  if (!hasAnyPermission(actor, ["inventory.manage", "work_orders:update"])) {
    throw routeError(
      403,
      "FORBIDDEN",
      "permission_required",
      "One of these permissions is required: inventory.manage, work_orders:update.",
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

function parseAvailabilityFilters(query: unknown): MobileInventoryAvailabilityResponse["filters"] {
  const record = asRecord(query ?? {}, "query");

  return {
    item_id: parseOptionalQueryString(record.item_id),
    sku: parseOptionalQueryString(record.sku),
    warehouse_id: parseOptionalQueryString(record.warehouse_id),
    work_order_id: parseOptionalQueryString(record.work_order_id),
  };
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
      requireActionPermission(actor, "work_orders:update");
      return withMaterialEcho(action, await addWorkOrderMaterial(deps, actor, action));
    }

    if (action.type === "work_order_material.remove") {
      requireActionPermission(actor, "work_orders:update");
      return withMaterialEcho(action, await removeWorkOrderMaterial(deps, actor, action));
    }

    if (!isSupportedActionType(action.type)) {
      throw routeError(400, "BAD_REQUEST", "unsupported_action_type", "type is not supported.");
    }

    requireActionPermission(actor, "inventory.manage");

    if (action.type === "inventory.reserve") {
      return reserveInventory(actor, action);
    }

    if (action.type === "inventory.consume") {
      return consumeInventory(actor, action);
    }

    return reportShortage(actor, action);
  } catch (error) {
    if (isRouteLikeError(error) && error.statusCode === 503) throw error;
    return withMaterialEcho(action, actionErrorResult(action, error));
  }
}

function withMaterialEcho(
  action: MobileInventoryAction,
  result: MobileInventoryActionResult,
): MobileInventoryActionResult {
  if (!action.type.startsWith("work_order_material.")) return result;
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
  await (actorMutatesAssignedOnly(actor)
    ? workOrders.getForMutation(actor, exitWorkOrderId)
    : workOrders.get(actor, exitWorkOrderId));

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

function reserveInventory(
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
): MobileInventoryActionResult {
  const quantity = parsePositiveNumber(action.payload.quantity, "quantity");
  const item = getRequiredItem(actor.tenantId, action);

  if (item.available_quantity < quantity) {
    return quantityConflict(action, item, "insufficient_available_quantity");
  }

  const updated = updateItem(actor.tenantId, item.item_id, {
    available_quantity: item.available_quantity - quantity,
    reserved_quantity: item.reserved_quantity + quantity,
  });

  return acceptedItemResult(action, updated);
}

function consumeInventory(
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
): MobileInventoryActionResult {
  const quantity = parsePositiveNumber(action.payload.quantity, "quantity");
  const item = getRequiredItem(actor.tenantId, action);

  if (item.available_quantity + item.reserved_quantity < quantity) {
    return quantityConflict(action, item, "insufficient_total_quantity");
  }

  const reservedConsumed = Math.min(item.reserved_quantity, quantity);
  const availableConsumed = quantity - reservedConsumed;
  const updated = updateItem(actor.tenantId, item.item_id, {
    available_quantity: item.available_quantity - availableConsumed,
    reserved_quantity: item.reserved_quantity - reservedConsumed,
  });

  return acceptedItemResult(action, updated);
}

function reportShortage(
  actor: AuthenticatedActor,
  action: MobileInventoryAction,
): MobileInventoryActionResult {
  const quantity = parsePositiveNumber(action.payload.quantity, "quantity");
  const reason = parseRequiredString(action.payload.reason, "reason");
  const item = getRequiredItem(actor.tenantId, action);

  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    item_id: item.item_id,
    warehouse_id: item.warehouse_id,
    server_state: {
      shortage_report_id: `shortage:${actor.tenantId}:${action.client_action_id}`,
      item_id: item.item_id,
      warehouse_id: item.warehouse_id,
      reported_quantity: quantity,
      reason,
      status: "reported",
    },
  };
}

function acceptedItemResult(
  action: MobileInventoryAction,
  item: InventoryItemState,
): MobileInventoryActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "accepted",
    item_id: item.item_id,
    warehouse_id: item.warehouse_id,
    server_state: item,
  };
}

function actionErrorResult(
  action: MobileInventoryAction,
  error: unknown,
): MobileInventoryActionResult {
  if (isPreviouslyAssignedRefusal(error) && isRouteLikeError(error)) {
    return {
      client_action_id: action.client_action_id,
      type: action.type,
      status: "conflict",
      work_order_id: readWorkOrderId(action),
      conflict: {
        conflict_type: ASSIGNMENT_CHANGED_CONFLICT_TYPE,
        server_id: readWorkOrderId(action),
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

  const message = error instanceof Error ? error.message : "Invalid inventory action.";

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

function buildIdempotencyConflict(
  action: MobileInventoryAction,
  existingResult: MobileInventoryActionResult,
): MobileInventoryActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    item_id: readItemId(action),
    warehouse_id: readWarehouseId(action),
    conflict: {
      conflict_type: "idempotency_payload_mismatch",
      server_id: existingResult.item_id,
      local: sanitizeActionForConflict(action),
      remote: {
        status: existingResult.status,
        type: existingResult.type,
        item_id: existingResult.item_id,
        warehouse_id: existingResult.warehouse_id,
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

function quantityConflict(
  action: MobileInventoryAction,
  item: InventoryItemState,
  conflictType: "insufficient_available_quantity" | "insufficient_total_quantity",
): MobileInventoryActionResult {
  return {
    client_action_id: action.client_action_id,
    type: action.type,
    status: "conflict",
    item_id: item.item_id,
    warehouse_id: item.warehouse_id,
    conflict: {
      conflict_type: conflictType,
      server_id: item.item_id,
      local: sanitizeActionForConflict(action),
      remote: item,
      next_action: "refresh_inventory_availability_and_retry",
    },
    error: {
      code: "MOBILE_SYNC_CONFLICT",
      reason: conflictType,
      message: "Requested quantity is not available.",
    },
  };
}

function getRequiredItem(tenantId: string, action: MobileInventoryAction): InventoryItemState {
  const itemId = parseRequiredString(action.payload.item_id, "item_id");
  const item = getTenantInventory(tenantId).get(itemId);

  if (!item) {
    throw routeError(404, "INVENTORY_ITEM_NOT_FOUND", "inventory_item_not_found", "Inventory item not found.");
  }

  const warehouseId = parseOptionalString(action.payload.warehouse_id);

  if (warehouseId && item.warehouse_id !== warehouseId) {
    throw routeError(404, "INVENTORY_ITEM_NOT_FOUND", "inventory_item_not_found", "Inventory item not found.");
  }

  return item;
}

function listTenantInventory(tenantId: string): InventoryItemState[] {
  return [...getTenantInventory(tenantId).values()]
    .sort((left, right) => left.sku.localeCompare(right.sku));
}

function getTenantInventory(tenantId: string): Map<string, InventoryItemState> {
  let inventory = inventoryByTenant.get(tenantId);

  if (!inventory) {
    inventory = new Map(seedInventory().map((item) => [item.item_id, item]));
    inventoryByTenant.set(tenantId, inventory);
  }

  return inventory;
}

function updateItem(
  tenantId: string,
  itemId: string,
  patch: Pick<InventoryItemState, "available_quantity" | "reserved_quantity">,
): InventoryItemState {
  const inventory = getTenantInventory(tenantId);
  const existing = inventory.get(itemId);

  if (!existing) {
    throw routeError(404, "INVENTORY_ITEM_NOT_FOUND", "inventory_item_not_found", "Inventory item not found.");
  }

  const updated: InventoryItemState = {
    ...existing,
    ...patch,
    status: resolveInventoryStatus(patch.available_quantity),
  };

  inventory.set(itemId, updated);

  return updated;
}

function seedInventory(): InventoryItemState[] {
  return [
    {
      item_id: "inv-item-tow-cable",
      sku: "CABO-REBOQUE-5T",
      name: "Cabo de reboque 5T",
      unit: "un",
      warehouse_id: "mobile-warehouse-main",
      available_quantity: 6,
      reserved_quantity: 0,
      status: "available",
    },
    {
      item_id: "inv-item-safety-cone",
      sku: "CONE-SINALIZACAO",
      name: "Cone de sinalizacao",
      unit: "un",
      warehouse_id: "mobile-warehouse-main",
      available_quantity: 12,
      reserved_quantity: 2,
      status: "available",
    },
    {
      item_id: "inv-item-fuse-kit",
      sku: "KIT-FUSIVEL",
      name: "Kit de fusiveis",
      unit: "kit",
      warehouse_id: "mobile-warehouse-secondary",
      available_quantity: 2,
      reserved_quantity: 1,
      status: "low_stock",
    },
  ];
}

function resolveInventoryStatus(availableQuantity: number): InventoryItemState["status"] {
  if (availableQuantity <= 0) return "out_of_stock";
  if (availableQuantity <= 2) return "low_stock";

  return "available";
}

function fingerprintAction(action: MobileInventoryAction): string {
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

function parseOptionalQueryString(value: unknown): string | null {
  if (Array.isArray(value)) {
    return parseOptionalQueryString(value[0]);
  }

  return parseOptionalString(value);
}

function parsePositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw routeError(400, "BAD_REQUEST", "invalid_quantity", `${field} must be a positive number.`);
  }

  return value;
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

function isSupportedActionType(type: string): type is InventoryActionType {
  return supportedActionTypes.includes(type as InventoryActionType);
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
