import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toAbcRecalculateDto,
  toInventoryItemDto,
  toInventoryItemListDto,
  toStockMovementDto,
  toStockMovementListDto,
} from "./inventory.dto.js";
import type { InventoryService } from "./inventory.service.js";

export type InventoryServiceResolver = () => Promise<InventoryService>;

export class InventoryController {
  constructor(private readonly resolveService: InventoryServiceResolver) {}

  async listItems(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listItems(actor, request.query as Record<string, unknown>);

    return {
      body: toInventoryItemListDto(result),
    };
  }

  async createItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.createItem(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "inventory_item.created",
      resourceType: "inventory_item",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: {
        sku: item.sku,
        unit: item.unit,
      },
    });

    return {
      status: 201,
      data: toInventoryItemDto(item),
    };
  }

  async getItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.getItem(actor, readRouteParam(request.params.itemId));

    return {
      data: toInventoryItemDto(item),
    };
  }

  async updateItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.updateItem(actor, readRouteParam(request.params.itemId), body);

    const deactivating = body.is_active === false || body.isActive === false;

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "inventory_item.deactivated" : "inventory_item.updated",
      resourceType: "inventory_item",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: {
        sku: item.sku,
        ...(deactivating ? { isActive: item.isActive } : {}),
      },
    });

    return {
      data: toInventoryItemDto(item),
    };
  }

  async recalculateAbc(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.recalculateAbc(actor);

    await recordRequestAuditBestEffort(request, {
      action: "inventory_item.abc_recalculated",
      resourceType: "inventory_item",
      resourceId: actor.tenantId,
      outcome: "success",
      severity: "info",
      metadata: {
        a: result.summary.A,
        b: result.summary.B,
        c: result.summary.C,
      },
    });

    return {
      data: toAbcRecalculateDto(result.summary, result.recalculatedAt),
    };
  }

  async listMovements(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listMovements(actor, request.query as Record<string, unknown>);

    return {
      body: toStockMovementListDto(result),
    };
  }

  async createMovement(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const movement = await service.createMovement(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "stock_movement.created",
      resourceType: "stock_movement",
      resourceId: movement.id,
      outcome: "success",
      severity: "info",
      metadata: {
        itemId: movement.itemId,
        type: movement.type,
        quantidadeSinalizada: movement.quantidadeSinalizada,
        ...(movement.workOrderId ? { workOrderId: movement.workOrderId } : {}),
      },
    });

    return {
      status: 201,
      data: toStockMovementDto(movement),
    };
  }

  async getMovement(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const movement = await service.getMovement(actor, readRouteParam(request.params.movementId));

    return {
      data: toStockMovementDto(movement),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
