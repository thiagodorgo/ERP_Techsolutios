import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  isMultipartDamageAttachmentRequest,
  parseMultipartDamageAttachmentRequest,
} from "./damage-attachment.storage.js";
import {
  toDamageAttachmentDto,
  toDamageAttachmentListDto,
  toDamageDetailDto,
  toDamageDto,
  toDamageListDto,
} from "./damage.dto.js";
import { DamageError } from "./damage.types.js";
import type { DamageService } from "./damage.service.js";

export type DamageServiceResolver = () => Promise<DamageService>;

export class DamageController {
  constructor(private readonly resolveService: DamageServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toDamageListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const damage = await service.create(actor, body);

    await recordRequestAuditBestEffort(request, {
      action: "damage.created",
      resourceType: "damage",
      resourceId: damage.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: damage.vehicleId,
        status: damage.status,
        gravidade: damage.gravidade,
      },
    });

    // Ω4C PR-09 — trilha da atribuição de responsável (metadata NÃO-PII: só id + parcelas; NUNCA valor/CNH).
    if (damage.responsibleOperatorProfileId !== undefined) {
      await this.auditResponsible(request, "damage.responsible_assigned", damage.id, {
        operatorProfileId: damage.responsibleOperatorProfileId,
        installmentTotal: readInstallmentTotal(body),
      });
    }

    return {
      status: 201,
      data: toDamageDto(damage),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const detail = await service.getWithAttachments(actor, readRouteParam(request.params.damageId));

    return {
      data: toDamageDetailDto(detail),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const damage = await service.update(actor, readRouteParam(request.params.damageId), body);

    const deactivating = body.is_active === false || body.isActive === false;
    const statusChanged = body.status !== undefined && body.status !== null && body.status !== "";

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "damage.deactivated" : "damage.updated",
      resourceType: "damage",
      resourceId: damage.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: damage.vehicleId,
        status: damage.status,
        ...(statusChanged ? { statusChanged: true } : {}),
        ...(deactivating ? { isActive: damage.isActive } : {}),
      },
    });

    // Ω4C PR-09 — trilha da transição do responsável (assigned/cleared) quando o corpo a toca.
    const responsibleRaw = body.responsible_operator_profile_id ?? body.responsibleOperatorProfileId;
    if (responsibleRaw !== undefined) {
      const cleared = responsibleRaw === null || responsibleRaw === "";
      await this.auditResponsible(
        request,
        cleared ? "damage.responsible_cleared" : "damage.responsible_assigned",
        damage.id,
        cleared
          ? { operatorProfileId: null }
          : { operatorProfileId: damage.responsibleOperatorProfileId ?? null, installmentTotal: readInstallmentTotal(body) },
      );
    }

    return {
      data: toDamageDto(damage),
    };
  }

  // §2.8 — allowlist da trilha do responsável: só {operatorProfileId, installmentTotal}. NUNCA tenant_id/CNH/valor.
  private async auditResponsible(
    request: Request,
    action: string,
    damageId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "damage",
      resourceId: damageId,
      outcome: "success",
      severity: "info",
      metadata,
    });
  }

  async listAttachments(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const attachments = await service.listAttachments(actor, readRouteParam(request.params.damageId));

    return {
      body: toDamageAttachmentListDto(attachments),
    };
  }

  async createAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);

    if (!isMultipartDamageAttachmentRequest(request)) {
      throw new DamageError(
        400,
        "DAMAGE_ATTACHMENT_INVALID",
        "multipart_required",
        "Attachment upload must be a multipart/form-data request with a file field.",
      );
    }

    const damageId = readRouteParam(request.params.damageId);
    const upload = await parseMultipartDamageAttachmentRequest(request);
    const attachment = await service.createUploadedAttachment(actor, damageId, upload);

    await recordRequestAuditBestEffort(request, {
      action: "damage.attachment_uploaded",
      resourceType: "damage",
      resourceId: damageId,
      outcome: "success",
      severity: "info",
      metadata: {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      },
    });

    return {
      status: 201,
      body: {
        data: toDamageAttachmentDto(attachment),
      },
    };
  }

  async downloadAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const file = await service.getAttachmentDownload(
      actor,
      readRouteParam(request.params.damageId),
      readRouteParam(request.params.attachmentId),
    );

    return {
      file,
    };
  }

  async deleteAttachment(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const damageId = readRouteParam(request.params.damageId);
    const attachmentId = readRouteParam(request.params.attachmentId);
    const removed = await service.deleteAttachment(actor, damageId, attachmentId);

    await recordRequestAuditBestEffort(request, {
      action: "damage.attachment_deleted",
      resourceType: "damage",
      resourceId: damageId,
      outcome: "success",
      severity: "info",
      metadata: {
        attachmentId: removed.id,
      },
    });

    return {
      status: 204,
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

function readInstallmentTotal(body: Record<string, unknown>): number | undefined {
  const raw = body.responsible_installment_total ?? body.responsibleInstallmentTotal;
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}
