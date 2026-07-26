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
import {
  toInspectionPhotoDto,
  toInspectionViewDto,
  toIntakeInspectionDto,
} from "./impound.intake.dto.js";
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

  // ── PR-06: vistoria de recepção (I3) ──────────────────────────────────────────────────────────────────────
  async getInspection(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.getInspection(actor, readRouteParam(request.params.processId));
    return { body: toInspectionViewDto(view) };
  }

  async saveInspection(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const inspection = await service.saveInspection(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "impound.inspection.saved",
      resourceType: "impound_intake_inspection",
      resourceId: inspection.id,
      outcome: "success",
      severity: "info",
      metadata: { signatureStatus: inspection.signatureStatus },
    });
    return { data: toIntakeInspectionDto(inspection) };
  }

  async addInspectionPhoto(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const photo = await service.addInspectionPhoto(actor, readRouteParam(request.params.processId), request.body ?? {});
    // §2.8: só id/set no metadata de auditoria (nunca fileUrl/storage_key/PII).
    await recordRequestAuditBestEffort(request, {
      action: "impound.inspection.photo_added",
      resourceType: "impound_intake_inspection_photo",
      resourceId: photo.id,
      outcome: "success",
      severity: "info",
      metadata: { set: photo.set },
    });
    return { status: 201, data: toInspectionPhotoDto(photo) };
  }

  async completeInspection(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const inspection = await service.completeInspection(actor, readRouteParam(request.params.processId));
    await recordRequestAuditBestEffort(request, {
      action: "impound.inspection.completed",
      resourceType: "impound_intake_inspection",
      resourceId: inspection.id,
      outcome: "success",
      severity: "info",
    });
    return { data: toIntakeInspectionDto(inspection) };
  }

  // ── PR-06: ocupação atômica (I1) ──────────────────────────────────────────────────────────────────────────
  async assignSpot(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const process = await service.assignSpot(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "impound.spot_assigned",
      resourceType: "impound_process",
      resourceId: process.id,
      outcome: "success",
      severity: "info",
      metadata: { status: process.status },
    });
    return { data: toImpoundProcessDto(process) };
  }

  async vacateSpot(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = { ...(request.body ?? {}), ...(request.query ?? {}) } as Record<string, unknown>;
    const process = await service.vacateSpot(actor, readRouteParam(request.params.processId), body);
    await recordRequestAuditBestEffort(request, {
      action: "impound.spot_vacated",
      resourceType: "impound_process",
      resourceId: process.id,
      outcome: "success",
      severity: "info",
      metadata: { status: process.status },
    });
    return { data: toImpoundProcessDto(process) };
  }

  async moveSpot(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const process = await service.moveSpot(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "impound.spot_moved",
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
