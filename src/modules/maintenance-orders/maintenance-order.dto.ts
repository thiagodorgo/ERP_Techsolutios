import type { ListMaintenanceOrdersResult, MaintenanceOrder } from "./maintenance-order.types.js";
import type { MaintenanceOrderItem, MaintenanceOrderTotals } from "./maintenance-order-item.types.js";
import { computeLineTotal } from "./maintenance-order-item.validators.js";

const EMPTY_TOTALS: MaintenanceOrderTotals = { totalServices: 0, totalProducts: 0, total: 0, itemCount: 0 };

export type MaintenanceOrderDetail = {
  readonly totals?: MaintenanceOrderTotals;
  readonly items?: readonly MaintenanceOrderItem[];
};

// §2.8 — DTO da linha: NUNCA tenant_id/maintenance_order_id-cross/client_action_id. lineTotal é DERIVADO.
export function toMaintenanceOrderItemDto(item: MaintenanceOrderItem) {
  return {
    id: item.id,
    itemType: item.itemType,
    description: item.description,
    unitValue: item.unitValue,
    quantity: item.quantity,
    lineTotal: computeLineTotal(item.unitValue, item.quantity),
    notes: item.notes ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toMaintenanceOrderDto(order: MaintenanceOrder, detail: MaintenanceOrderDetail = {}) {
  return {
    id: order.id,
    vehicleId: order.vehicleId,
    type: order.type,
    status: order.status,
    scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    cost: order.cost ?? null,
    supplier: order.supplier ?? null,
    odometer: order.odometer ?? null,
    nextDueAt: order.nextDueAt ? order.nextDueAt.toISOString() : null,
    description: order.description,
    isActive: order.isActive,
    // Total do cabeçalho = Σ itens, DERIVADO server-side (o `cost` legado permanece; total é adicional/honesto).
    totals: detail.totals ?? EMPTY_TOTALS,
    ...(detail.items ? { items: detail.items.map(toMaintenanceOrderItemDto) } : {}),
    createdBy: order.createdBy ?? null,
    updatedBy: order.updatedBy ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toMaintenanceOrderListDto(
  result: ListMaintenanceOrdersResult,
  totalsByOrderId: ReadonlyMap<string, MaintenanceOrderTotals> = new Map(),
) {
  return {
    items: result.items.map((order) => {
      const totals = totalsByOrderId.get(order.id) ?? EMPTY_TOTALS;
      return {
        id: order.id,
        vehicleId: order.vehicleId,
        type: order.type,
        status: order.status,
        scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
        completedAt: order.completedAt ? order.completedAt.toISOString() : null,
        cost: order.cost ?? null,
        supplier: order.supplier ?? null,
        odometer: order.odometer ?? null,
        nextDueAt: order.nextDueAt ? order.nextDueAt.toISOString() : null,
        description: order.description,
        isActive: order.isActive,
        itemCount: totals.itemCount,
        itemsTotal: totals.total,
        createdAt: order.createdAt.toISOString(),
      };
    }),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

// GET /maintenance-orders/odometer-suggestion — { suggestedOdometer, source, recordedAt } | null (sem histórico).
// recordedAt fica null: os resolvers reusados (max fuel/maintenance) devolvem só o valor — carimbo de data exigiria
// tocar fuel-logs/telemetria (D-007 → deferido). O guard monotônico (422) permanece; a sugestão só pré-preenche.
export type OdometerSuggestion = {
  readonly suggestedOdometer: number;
  readonly source: "fuel_log" | "maintenance_order";
};

export function toOdometerSuggestionDto(suggestion: OdometerSuggestion | null) {
  if (!suggestion) {
    return { data: null };
  }
  return {
    data: {
      suggestedOdometer: suggestion.suggestedOdometer,
      source: suggestion.source,
      recordedAt: null,
    },
  };
}
