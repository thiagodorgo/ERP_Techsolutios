import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toWorkOrderDto, toWorkOrderEventDto, toWorkOrderListDto } from "./work-order.dto.js";
import { createDefaultApprovalService } from "./approval.service.js";
import type { WorkOrderService } from "./work-order.service.js";

export type WorkOrderServiceResolver = () => Promise<WorkOrderService>;

export class WorkOrderController {
  constructor(private readonly resolveService: WorkOrderServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toWorkOrderListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrder = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "work_order.created",
      resourceType: "work_order",
      resourceId: workOrder.id,
      outcome: "success",
      severity: "info",
      metadata: {
        code: workOrder.code,
        priority: workOrder.priority,
        status: workOrder.status,
      },
    });

    return {
      status: 201,
      data: toWorkOrderDto(workOrder),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const { workOrder, links } = await service.getWithLinks(actor, readRouteParam(request.params.workOrderId));

    return {
      data: toWorkOrderDto(workOrder, links),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrder = await service.update(actor, readRouteParam(request.params.workOrderId), request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "work_order.updated",
      resourceType: "work_order",
      resourceId: workOrder.id,
      outcome: "success",
      severity: "info",
      metadata: {
        code: workOrder.code,
      },
    });

    return {
      data: toWorkOrderDto(workOrder),
    };
  }

  async changeStatus(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrder = await service.changeStatus(actor, readRouteParam(request.params.workOrderId), request.body ?? {});

    if (workOrder.status === "completed") {
      const approvals = await createDefaultApprovalService();
      await approvals.request({
        tenantId: actor.tenantId,
        entityType: "work_order",
        entityId: workOrder.id,
        workOrderId: workOrder.id,
        requestedByUserId: actor.userId,
        pendingReason: "Ordem de servico concluida e pronta para validacao operacional.",
      });
    }

    await recordRequestAuditBestEffort(request, {
      action: statusAuditAction(workOrder.status),
      resourceType: "work_order",
      resourceId: workOrder.id,
      outcome: "success",
      severity: "info",
      metadata: {
        code: workOrder.code,
        status: workOrder.status,
      },
    });

    return {
      data: toWorkOrderDto(workOrder),
    };
  }

  async assign(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    // D1 — the body may carry optional vehicleId/teamId (or vehicle_id/team_id); the
    // service validates them tenant-scoped and sets the OS FKs when present.
    const workOrder = await service.assign(actor, readRouteParam(request.params.workOrderId), request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "work_order.assigned",
      resourceType: "work_order",
      resourceId: workOrder.id,
      outcome: "success",
      severity: "info",
      metadata: {
        code: workOrder.code,
        assignedOperatorId: workOrder.assignedOperatorId,
        assignedUserId: workOrder.assignedUserId,
        vehicleId: workOrder.vehicleId,
        teamId: workOrder.teamId,
      },
    });

    return {
      data: toWorkOrderDto(workOrder),
    };
  }

  async timeline(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const events = await service.timeline(actor, readRouteParam(request.params.workOrderId));

    return {
      data: events.map(toWorkOrderEventDto),
    };
  }

  // Ω3-b — registra comentário livre na timeline da OS. Auditoria com ALLOWLIST: só
  // workOrderId/eventType/messageLength — NUNCA o corpo do comentário (§2.8, pode conter PII).
  async addComment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const event = await service.addComment(actor, readRouteParam(request.params.workOrderId), (request.body ?? {}) as Record<string, unknown>);

    await recordRequestAuditBestEffort(request, {
      action: "work_order.commented",
      resourceType: "work_order",
      resourceId: event.workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { workOrderId: event.workOrderId, eventType: event.eventType, messageLength: event.message.length },
    });

    return {
      status: 201,
      data: toWorkOrderEventDto(event),
    };
  }

  // Ω1b-2 — geocodifica o endereço da OS sob demanda (botão "Localizar no mapa").
  async geocode(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as { force?: unknown };
    const force = body.force === true || request.query.force === "true";
    const result = await service.geocodeById(actor, readRouteParam(request.params.workOrderId), force);

    if (!result.geocoded || !result.workOrder) {
      return { data: { geocoded: false, reason: result.reason ?? "Endereço não localizado pelo provedor." } };
    }

    await recordRequestAuditBestEffort(request, {
      action: "work_order.geocoded",
      resourceType: "work_order",
      resourceId: result.workOrder.id,
      outcome: "success",
      severity: "info",
      // Allowlist: nunca logamos a coordenada (dado sensível de localização) — só código e fonte.
      metadata: { code: result.workOrder.code, source: result.workOrder.serviceGeocodeSource ?? null },
    });

    return { data: { geocoded: true, workOrder: toWorkOrderDto(result.workOrder) } };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

function statusAuditAction(status: string): string {
  if (status === "cancelled") return "work_order.cancelled";
  if (status === "completed") return "work_order.completed";
  return "work_order.status_changed";
}
