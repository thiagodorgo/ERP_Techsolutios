import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toMaintenanceOrderDto,
  toMaintenanceOrderItemDto,
  toMaintenanceOrderListDto,
  toOdometerSuggestionDto,
} from "./maintenance-order.dto.js";
import type { MaintenanceOrderService } from "./maintenance-order.service.js";

export type MaintenanceOrderServiceResolver = () => Promise<MaintenanceOrderService>;

export class MaintenanceOrderController {
  constructor(private readonly resolveService: MaintenanceOrderServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    const totals = await service.totalsForOrders(actor, result.items.map((order) => order.id));

    return {
      body: toMaintenanceOrderListDto(result, totals),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const order = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "maintenance_order.created",
      resourceType: "maintenance_order",
      resourceId: order.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: order.vehicleId,
        type: order.type,
        status: order.status,
        ...(order.nextDueAt ? { nextDueScheduled: true } : {}),
      },
    });

    return {
      status: 201,
      data: toMaintenanceOrderDto(order),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const detail = await service.getWithDetail(actor, readRouteParam(request.params.maintenanceOrderId));

    return {
      data: toMaintenanceOrderDto(detail.order, { totals: detail.totals, items: detail.items }),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const order = await service.update(actor, readRouteParam(request.params.maintenanceOrderId), body);
    const totals = await service.totalsForOrders(actor, [order.id]);

    const deactivating = body.is_active === false || body.isActive === false;
    const statusChanged = body.status !== undefined && body.status !== null && body.status !== "";

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "maintenance_order.deactivated" : "maintenance_order.updated",
      resourceType: "maintenance_order",
      resourceId: order.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: order.vehicleId,
        status: order.status,
        ...(statusChanged ? { statusChanged: true } : {}),
        ...(deactivating ? { isActive: order.isActive } : {}),
      },
    });

    return {
      data: toMaintenanceOrderDto(order, { totals: totals.get(order.id) }),
    };
  }

  // GET /maintenance-orders/odometer-suggestion?vehicleId= — sugestão derivada honesta (null sem histórico).
  async odometerSuggestion(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const vehicleId = (request.query.vehicle_id ?? request.query.vehicleId ?? "") as string;
    const suggestion = await service.odometerSuggestion(actor, vehicleId);

    return {
      body: toOdometerSuggestionDto(suggestion),
    };
  }

  // ---------------------------------------------------------------------------
  // Itens (sub-recurso) — CRUD nested sob a ordem. Auditoria em TODA escrita (§2.8: só metadados de controle).
  // ---------------------------------------------------------------------------

  async listItems(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const items = await service.listItems(actor, readRouteParam(request.params.maintenanceOrderId));

    return {
      body: { data: items.map(toMaintenanceOrderItemDto) },
    };
  }

  async addItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const maintenanceOrderId = readRouteParam(request.params.maintenanceOrderId);
    const item = await service.addItem(actor, maintenanceOrderId, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "maintenance_order_item.created",
      resourceType: "maintenance_order_item",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { maintenanceOrderId, itemType: item.itemType },
    });

    return {
      status: 201,
      data: toMaintenanceOrderItemDto(item),
    };
  }

  async updateItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const maintenanceOrderId = readRouteParam(request.params.maintenanceOrderId);
    const item = await service.updateItem(
      actor,
      maintenanceOrderId,
      readRouteParam(request.params.itemId),
      request.body ?? {},
    );

    await recordRequestAuditBestEffort(request, {
      action: "maintenance_order_item.updated",
      resourceType: "maintenance_order_item",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { maintenanceOrderId, itemType: item.itemType },
    });

    return {
      data: toMaintenanceOrderItemDto(item),
    };
  }

  async removeItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const maintenanceOrderId = readRouteParam(request.params.maintenanceOrderId);
    const item = await service.removeItem(actor, maintenanceOrderId, readRouteParam(request.params.itemId));

    await recordRequestAuditBestEffort(request, {
      action: "maintenance_order_item.deleted",
      resourceType: "maintenance_order_item",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { maintenanceOrderId, itemType: item.itemType },
    });

    return {
      data: toMaintenanceOrderItemDto(item),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
