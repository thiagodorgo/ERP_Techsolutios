import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import {
  toCommissionBasisEventDto,
  toCommissionCalculationDto,
  toCommissionMyRateDto,
  toCommissionPayeeRateDto,
  toCommissionPolicyDto,
  toCommissionSettlementDto,
  toCommissionStatementDto,
  toCommissionSummaryDto,
  toListDto,
} from "./commission.dto.js";
import type { CommissionService } from "./commission.service.js";

export type CommissionServiceResolver = () => Promise<CommissionService>;

export class CommissionController {
  constructor(private readonly resolveService: CommissionServiceResolver) {}

  async listPolicies(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listPolicies(actor, request.query as Record<string, unknown>);

    return {
      body: toListDto(result, toCommissionPolicyDto),
    };
  }

  async createPolicy(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const policy = await service.createPolicy(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "commission.policy_created",
      resourceType: "commission_policy",
      resourceId: policy.id,
      outcome: "success",
      severity: "info",
      metadata: {
        status: policy.status,
        vertical: policy.vertical,
      },
    });

    return {
      status: 201,
      data: toCommissionPolicyDto(policy),
    };
  }

  async listBasisEvents(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listBasisEvents(actor, request.query as Record<string, unknown>);

    return {
      body: toListDto(result, toCommissionBasisEventDto),
    };
  }

  async createBasisEvent(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const event = await service.createBasisEvent(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "commission.basis_event_received",
      resourceType: "commission_basis_event",
      resourceId: event.id,
      outcome: "success",
      severity: "info",
      metadata: {
        sourceType: event.sourceType,
        sourceEventName: event.sourceEventName,
        status: event.status,
      },
    });

    return {
      status: 201,
      data: toCommissionBasisEventDto(event),
    };
  }

  async listCalculations(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listCalculations(actor, request.query as Record<string, unknown>);

    return {
      body: toListDto(result, toCommissionCalculationDto),
    };
  }

  async listMyCalculations(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listMyCalculations(actor, request.query as Record<string, unknown>);

    return {
      body: toListDto(result, toCommissionCalculationDto),
    };
  }

  async listStatements(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.listStatements(actor, request.query as Record<string, unknown>);

    return {
      body: toListDto(result, toCommissionStatementDto),
    };
  }

  async summarizeStatements(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.summarizeStatements(actor, request.query as Record<string, unknown>);

    return {
      data: toCommissionSummaryDto(result),
    };
  }

  async summarizeMyStatements(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.summarizeMyStatements(actor, request.query as Record<string, unknown>);

    return {
      data: toCommissionSummaryDto(result),
    };
  }

  // Ω4C PR-10 (REM-02) — liquidação em lote → crédito no extrato + marcador. Auditoria allowlist
  // (D-Ω4C-REM-SETTLE-RAIL §2.8): { count, amount (agregado), operatorProfileId quando único } — NUNCA
  // tenant_id/CNH/payee cru.
  async settleCalculations(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.settleCalculations(actor, request.body ?? {});

    const settledLines = result.lines.filter((line) => line.outcome === "settled");
    const operatorProfileIds = [
      ...new Set(settledLines.map((line) => line.operatorProfileId).filter((id): id is string => Boolean(id))),
    ];

    await recordRequestAuditBestEffort(request, {
      action: "commission.settled",
      resourceType: "commission_calculation",
      resourceId: settledLines[0]?.calculationId,
      outcome: "success",
      severity: "info",
      metadata: {
        count: result.settledCount,
        amount: result.settledTotal,
        ...(operatorProfileIds.length === 1 ? { operatorProfileId: operatorProfileIds[0] } : {}),
      },
    });

    return {
      data: toCommissionSettlementDto(result),
    };
  }

  async upsertPayeeRate(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.upsertPayeeRate(actor, request.params.userId, request.body ?? {});

    if (result.changed) {
      const action = result.currentRule.selfChange ? "commission.rate_self_changed" : "commission.rate_changed";
      await recordRequestAuditBestEffort(request, {
        action,
        resourceType: "commission_policy_rule",
        resourceId: result.currentRule.ruleId,
        outcome: "success",
        severity: "info",
        metadata: {
          payeeUserId: result.currentRule.payeeUserId,
          rateType: result.currentRule.rateType,
          previousRateValue: result.previousRule?.rateValue ?? null,
          rateValue: result.currentRule.rateValue,
          ruleId: result.currentRule.ruleId,
          ...(result.currentRule.selfChange ? {} : { previousRuleId: result.previousRule?.ruleId ?? null }),
        },
      });
    }

    return {
      status: 200,
      data: toCommissionPayeeRateDto(result.currentRule),
    };
  }

  async listRates(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const items = await service.listCurrentRates(actor);
    return {
      body: {
        items: items.map(toCommissionPayeeRateDto),
      },
    };
  }

  async listPayeeRateHistory(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const items = await service.listPayeeRateHistory(actor, request.params.userId);
    return {
      body: {
        items: items.map(toCommissionPayeeRateDto),
      },
    };
  }

  async getMyRate(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const rate = await service.getMyRate(actor);
    return {
      data: toCommissionMyRateDto(rate),
    };
  }

  async reconcileCommissions(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const counts = await service.reconcileCommissions(actor);

    await recordRequestAuditBestEffort(request, {
      action: "commission.reconcile_requested",
      resourceType: "commission_calculation",
      outcome: "success",
      severity: "info",
      metadata: {
        created: counts.created,
        released: counts.released,
        recalculated: counts.recalculated,
        skipped: counts.skipped,
      },
    });

    return {
      status: 200,
      data: counts,
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
