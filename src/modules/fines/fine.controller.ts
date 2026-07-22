import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFineDto, toFineListDto } from "./fine.dto.js";
import type { FineService } from "./fine.service.js";

export type FineServiceResolver = () => Promise<FineService>;

export class FineController {
  constructor(private readonly resolveService: FineServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toFineListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const fine = await service.create(actor, body);

    await recordRequestAuditBestEffort(request, {
      action: "fine.created",
      resourceType: "fine",
      resourceId: fine.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: fine.vehicleId,
        status: fine.status,
      },
    });

    // Ω4C PR-07 — trilha específica da atribuição de condutor responsável (metadata NÃO-PII: só id + parcelas).
    if (fine.responsibleOperatorProfileId !== undefined) {
      await this.auditResponsible(request, "fine.responsible_assigned", fine.id, {
        operatorProfileId: fine.responsibleOperatorProfileId,
        installmentTotal: readInstallmentTotal(body),
      });
    }

    return {
      status: 201,
      data: toFineDto(fine),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const fine = await service.get(actor, readRouteParam(request.params.fineId));

    return {
      data: toFineDto(fine),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const fine = await service.update(actor, readRouteParam(request.params.fineId), body);

    const deactivating = body.is_active === false || body.isActive === false;
    const statusChanged = body.status !== undefined && body.status !== null && body.status !== "";

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "fine.deactivated" : "fine.updated",
      resourceType: "fine",
      resourceId: fine.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: fine.vehicleId,
        status: fine.status,
        ...(statusChanged ? { statusChanged: true } : {}),
        ...(deactivating ? { isActive: fine.isActive } : {}),
      },
    });

    // Ω4C PR-07 — trilha da transição do condutor responsável (assigned/cleared) quando o corpo a toca.
    const responsibleRaw = body.responsible_operator_profile_id ?? body.responsibleOperatorProfileId;
    if (responsibleRaw !== undefined) {
      const cleared = responsibleRaw === null || responsibleRaw === "";
      await this.auditResponsible(
        request,
        cleared ? "fine.responsible_cleared" : "fine.responsible_assigned",
        fine.id,
        cleared
          ? { operatorProfileId: null }
          : { operatorProfileId: fine.responsibleOperatorProfileId ?? null, installmentTotal: readInstallmentTotal(body) },
      );
    }

    return {
      data: toFineDto(fine),
    };
  }

  // §2.8 — allowlist da trilha da disposição: só {operatorProfileId, installmentTotal}. NUNCA tenant_id/CNH/valor.
  private async auditResponsible(
    request: Request,
    action: string,
    fineId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "fine",
      resourceId: fineId,
      outcome: "success",
      severity: "info",
      metadata,
    });
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
