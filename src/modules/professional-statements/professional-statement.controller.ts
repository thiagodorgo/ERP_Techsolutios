import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toProfessionalStatementGroupDto,
  toProfessionalStatementLedgerDto,
} from "./professional-statement.dto.js";
import type { ProfessionalStatementEntry } from "./professional-statement.types.js";
import type { ProfessionalStatementService } from "./professional-statement.service.js";

export type ProfessionalStatementServiceResolver = () => Promise<ProfessionalStatementService>;

export class ProfessionalStatementController {
  constructor(private readonly resolveService: ProfessionalStatementServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.getStatement(actor, request.query as Record<string, unknown>);
    return {
      body: toProfessionalStatementLedgerDto({
        operatorProfileId: result.operatorProfileId,
        professionalName: result.professionalName,
        summary: result.summary,
        items: result.items,
        limit: result.limit,
        offset: result.offset,
        total: result.total,
      }),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const group = await service.getGroup(actor, readRouteParam(request.params.groupId));
    return { data: toProfessionalStatementGroupDto(group) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const group = await service.createAdjustment(actor, request.body ?? {});
    await this.audit(request, "professional_statement.created", group);
    return { status: 201, data: toProfessionalStatementGroupDto(group) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const group = await service.updateGroupDescription(actor, readRouteParam(request.params.groupId), (request.body ?? {}) as Record<string, unknown>);
    await this.audit(request, "professional_statement.updated", group);
    return { data: toProfessionalStatementGroupDto(group) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    // DELETE = "retirar do extrato" (soft-delete do grupo). 200 com o grupo já retirado.
    const group = await service.removeGroup(actor, readRouteParam(request.params.groupId));
    await this.audit(request, "professional_statement.removed", group);
    return { data: toProfessionalStatementGroupDto(group) };
  }

  // EXT-07 — allowlist da auditoria: {operatorProfileId, entryType, direction, installmentTotal, amount(total)}.
  // NUNCA tenant_id/source_id cru/client_action_id/CNH/nome do profissional (§2.8/LGPD).
  private async audit(request: Request, action: string, group: readonly ProfessionalStatementEntry[]): Promise<void> {
    const head = group[0]!;
    const total = group.reduce((sum, entry) => Math.round((sum + entry.amount) * 100) / 100, 0);
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "professional_statement",
      resourceId: head.groupId,
      outcome: "success",
      severity: "info",
      metadata: {
        operatorProfileId: head.operatorProfileId,
        entryType: head.entryType,
        direction: head.direction,
        installmentTotal: head.installmentTotal,
        amount: total,
      },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
