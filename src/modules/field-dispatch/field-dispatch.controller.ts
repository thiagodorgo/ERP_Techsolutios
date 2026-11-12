import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toFieldDispatchDetailDto,
  toFieldDispatchDto,
  toFieldDispatchEventDto,
  toFieldDispatchListDto,
} from "./field-dispatch.dto.js";
import type { FieldDispatchService } from "./field-dispatch.service.js";

export type FieldDispatchServiceResolver = () => Promise<FieldDispatchService>;

export class FieldDispatchController {
  constructor(private readonly resolveService: FieldDispatchServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toFieldDispatchListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const { dispatch, replayed } = await service.createOrReplay(actor, request.body ?? {});

    // B-O6R-09 (P3) — a repetição pela mesma chave devolve o despacho já criado com 200 e SEM nova auditoria de criação
    // (a original foi gravada no primeiro pedido).
    if (replayed) {
      return {
        status: 200,
        data: toFieldDispatchDto(dispatch),
      };
    }

    await recordRequestAuditBestEffort(request, {
      action: "field_dispatch.created",
      resourceType: "field_dispatch",
      resourceId: dispatch.id,
      outcome: "success",
      severity: "info",
      metadata: {
        workOrderId: dispatch.workOrderId,
        operatorUserId: dispatch.operatorUserId,
        status: dispatch.status,
      },
    });

    return {
      status: 201,
      data: toFieldDispatchDto(dispatch),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const dispatch = await service.get(actor, readRouteParam(request.params.dispatchId));
    const timeline = await service.timeline(actor, dispatch.id);

    return {
      data: toFieldDispatchDetailDto(dispatch, timeline),
    };
  }

  async changeStatus(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const { dispatch, changed } = await service.changeStatusOrNoop(actor, readRouteParam(request.params.dispatchId), request.body ?? {});

    // PRE537-01 — o mesmo status sem texto não mudou nada (no-op do serviço): sem auditoria de mudança de status.
    if (!changed) return { data: toFieldDispatchDto(dispatch) };

    await recordRequestAuditBestEffort(request, {
      action: dispatch.status === "cancelled" ? "field_dispatch.cancelled" : "field_dispatch.status_changed",
      resourceType: "field_dispatch",
      resourceId: dispatch.id,
      outcome: "success",
      severity: "info",
      metadata: {
        workOrderId: dispatch.workOrderId,
        operatorUserId: dispatch.operatorUserId,
        status: dispatch.status,
      },
    });

    return {
      data: toFieldDispatchDto(dispatch),
    };
  }

  async reassign(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const dispatch = await service.reassign(actor, readRouteParam(request.params.dispatchId), request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "field_dispatch.reassigned",
      resourceType: "field_dispatch",
      resourceId: dispatch.id,
      outcome: "success",
      severity: "info",
      metadata: {
        workOrderId: dispatch.workOrderId,
        operatorUserId: dispatch.operatorUserId,
        status: dispatch.status,
      },
    });

    return {
      data: toFieldDispatchDto(dispatch),
    };
  }

  // Ω3-b (R5) — timeline do despacho como rota dedicada (o service.timeline já existia sem rota).
  // Espelha WorkOrderController.timeline; o DTO não vaza tenant_id (field-dispatch.dto.ts).
  async timeline(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const events = await service.timeline(actor, readRouteParam(request.params.dispatchId));

    return {
      data: events.map(toFieldDispatchEventDto),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
