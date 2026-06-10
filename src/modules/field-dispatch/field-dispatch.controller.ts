import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toFieldDispatchDetailDto,
  toFieldDispatchDto,
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
    const dispatch = await service.create(actor, request.body ?? {});

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
    const dispatch = await service.changeStatus(actor, readRouteParam(request.params.dispatchId), request.body ?? {});

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

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
