import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toCustodyEventListDto,
  toImpoundProcessDto,
  toImpoundProcessListDto,
  toVerifyDto,
} from "./impound.dto.js";
import type { ImpoundService } from "./impound.service.js";

export type ImpoundServiceResolver = () => Promise<ImpoundService>;

export class ImpoundController {
  constructor(private readonly resolveService: ImpoundServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toImpoundProcessListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const process = await service.create(actor, request.body ?? {});
    // Auditoria best-effort SEM PII/valores (nada de placa/origem/BO em metadata — §2.8): só id/status.
    await recordRequestAuditBestEffort(request, {
      action: "impound.created",
      resourceType: "impound_process",
      resourceId: process.id,
      outcome: "success",
      severity: "info",
      metadata: { status: process.status },
    });
    return { status: 201, data: toImpoundProcessDto(process) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const process = await service.get(actor, readRouteParam(request.params.processId));
    return { data: toImpoundProcessDto(process) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const process = await service.update(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "impound.updated",
      resourceType: "impound_process",
      resourceId: process.id,
      outcome: "success",
      severity: "info",
      metadata: { status: process.status },
    });
    return { data: toImpoundProcessDto(process) };
  }

  async listEvents(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const events = await service.listEvents(actor, readRouteParam(request.params.processId));
    return { body: toCustodyEventListDto(events) };
  }

  async verify(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.verify(actor, readRouteParam(request.params.processId));
    return { body: toVerifyDto(result) };
  }

  async transition(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const process = await service.transition(actor, readRouteParam(request.params.processId), body);
    // Metadata: só o estado de destino (from é derivável; sem reason/PII no log de auditoria).
    await recordRequestAuditBestEffort(request, {
      action: "impound.transitioned",
      resourceType: "impound_process",
      resourceId: process.id,
      outcome: "success",
      severity: "info",
      metadata: { status: process.status },
    });
    return { data: toImpoundProcessDto(process) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
