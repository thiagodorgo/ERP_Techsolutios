import type { PrismaClient } from "@prisma/client";

import { env } from "../../config/env.js";
import { createLogger } from "../../infra/logging/logger.js";
import {
  buildCommissionSnapshot,
  centsToDecimalString,
  computeCommissionCents,
  decimalTextToCents,
  engineWorkOrderEventKey,
  resolveEffectiveEngineRule,
} from "./commission-engine.js";
import { RlsPrismaCommissionRepository } from "./commission-prisma.repository.js";
import type { CommissionRepository } from "./commission.repository.js";
import type {
  CommissionCalculationStatus,
  CommissionReconcileCounts,
  CommissionUnit,
  EnginePolicyInfo,
  EngineWorkOrderCandidate,
} from "./commission.types.js";
import { evaluateWorkOrderCommissionEligibility } from "./work-order-cancellation.gate.js";

export const COMMISSION_RECONCILE_SCAN_INTERVAL_MS = 60_000;

const logger = createLogger();

export async function runCommissionReconcileScan(): Promise<CommissionReconcileCounts> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return { created: 0, released: 0, recalculated: 0, skipped: 0 };
  }
  const { prisma } = await import("../../database/prisma.js");
  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
    select: { id: true },
  });

  let created = 0;
  let released = 0;
  let recalculated = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    try {
      const counts = await reconcileTenantCommissions(prisma, tenant.id);
      created += counts.created;
      released += counts.released;
      recalculated += counts.recalculated;
      skipped += counts.skipped;
    } catch (error) {
      logger.warn(
        { tenantId: tenant.id, err: errorReason(error) },
        "commissions.reconcile: tenant sweep failed; skipping",
      );
    }
  }

  return { created, released, recalculated, skipped };
}

export async function reconcileTenantCommissions(
  prismaClient: PrismaClient,
  tenantId: string,
): Promise<CommissionReconcileCounts> {
  return reconcileTenantCommissionsWithRepository(new RlsPrismaCommissionRepository(prismaClient), tenantId);
}

export async function reconcileTenantCommissionsWithRepository(
  repository: CommissionRepository,
  tenantId: string,
): Promise<CommissionReconcileCounts> {
  // O escopo da volta (políticas do motor + candidatas) é lido no contexto da organização (M8, no repositório).
  // Sem política do motor, nada nasce (plano §3.2, R5). Duas políticas reservadas = ambígua: nenhuma OS é calculada
  // e o evento fica `pending_review`, motivo `ambiguous_rule` (Emenda 1 §E1.3, R22).
  const scope = await repository.readReconcileScope(tenantId);
  const initial: {
    readonly policy: EnginePolicyInfo | null;
    readonly ambiguousPolicy: boolean;
    readonly candidates: readonly EngineWorkOrderCandidate[];
  } = {
    policy: scope.policies[0] ?? null,
    ambiguousPolicy: scope.policies.length > 1,
    candidates: scope.candidates,
  };

  if (!initial.policy) {
    return { created: 0, released: 0, recalculated: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const candidate of initial.candidates) {
    try {
      const outcome = await repository.runCommissionUnit(tenantId, (unit) =>
        reconcileSingleWorkOrderInUnit(unit, {
          tenantId,
          policy: initial.policy!,
          ambiguousPolicy: initial.ambiguousPolicy,
          workOrderId: candidate.id,
        }),
      );
      if (outcome === "created") {
        created += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      skipped += 1;
      logger.warn(
        { tenantId, workOrderId: candidate.id, err: errorReason(error) },
        "commissions.reconcile: work order reconciliation failed; skipping",
      );
    }
  }

  return { created, released: 0, recalculated: 0, skipped };
}

async function reconcileSingleWorkOrderInUnit(
  unit: CommissionUnit,
  input: {
    readonly tenantId: string;
    readonly policy: EnginePolicyInfo;
    readonly ambiguousPolicy: boolean;
    readonly workOrderId: string;
  },
): Promise<"created" | "skipped"> {
  // 1. Trava exclusiva da linha da OS primeiro (Emenda 1 §E1.3)
  const wo = await unit.lockAndReadWorkOrderForCommission(input.tenantId, input.workOrderId);
  if (!wo) {
    return "skipped";
  }

  // 2. Conferência sob a trava: já existe evento vivo do motor para esta OS? (Emenda 1 §E1.3, camada 1)
  // B-COMISSAO:chave-do-evento — M4: esta conferência e a chave canônica da linha `const eventKey` (duas linhas)
  const alreadyHasEvent = await unit.hasLiveEngineBasisEvent(input.tenantId, wo.id);
  if (alreadyHasEvent) {
    return "skipped";
  }

  const eventKey = engineWorkOrderEventKey(wo.id, 1);
  const sourceEventName =
    wo.status === "cancelled" ? "engine.work_order.cancelled_keep" : "engine.work_order.completed";
  const occurredAt = wo.completedAt ?? new Date();

  const eventId = await unit.insertEngineBasisEventIfAbsent({
    tenantId: input.tenantId,
    policyId: input.policy.id,
    workOrderId: wo.id,
    sourceEventName,
    idempotencyKey: eventKey,
    occurredAt,
    status: "eligible",
    payload: {
      workOrderCode: wo.code,
      serviceCatalogId: wo.serviceCatalogId,
    },
  });

  if (!eventId) {
    return "skipped";
  }

  if (input.ambiguousPolicy) {
    await unit.updateEngineBasisEventOutcome(input.tenantId, eventId, "pending_review", {
      workOrderCode: wo.code,
      serviceCatalogId: wo.serviceCatalogId,
      reason: "ambiguous_rule",
    });
    return "skipped";
  }

  // 3. Gate de cancelamento
  const verdict = evaluateWorkOrderCommissionEligibility({
    status: wo.status,
    financialDecision: wo.financialDecision as "keep" | "keep_unpaid" | "zero" | null,
  });
  if (verdict !== "eligible") {
    const blockedStatus = verdict === "ineligible" ? "ineligible" : "pending_review";
    await unit.updateEngineBasisEventOutcome(input.tenantId, eventId, blockedStatus, {
      workOrderCode: wo.code,
      serviceCatalogId: wo.serviceCatalogId,
      reason: verdict,
    });
    return "skipped";
  }

  // 4. OS sem guincheiro -> pending_review
  if (!wo.assignedUserId) {
    await unit.updateEngineBasisEventOutcome(input.tenantId, eventId, "pending_review", {
      workOrderCode: wo.code,
      serviceCatalogId: wo.serviceCatalogId,
      reason: "no_payee",
    });
    return "skipped";
  }

  // 5. Itens financeiros ativos da OS: a base vem sempre do banco, lida sob a trava da OS, nunca do `payload` (R4)
  const items = await unit.listActiveWorkOrderFinancialItems(input.tenantId, wo.id);
  const hasNonBrl = items.some((item) => item.currency.trim().toUpperCase() !== "BRL");
  if (hasNonBrl) {
    await unit.updateEngineBasisEventOutcome(input.tenantId, eventId, "pending_review", {
      workOrderCode: wo.code,
      serviceCatalogId: wo.serviceCatalogId,
      reason: "non_brl_currency",
    });
    return "skipped";
  }

  let baseCents = 0n;
  for (const item of items) {
    baseCents += decimalTextToCents(item.totalAmountText);
  }

  // 6. Escolha da regra vigente na conclusão da OS
  const rules = await unit.listEngineRulesForPolicy(input.tenantId, input.policy.id);
  const resolved = resolveEffectiveEngineRule(rules, {
    payeeUserId: wo.assignedUserId,
    serviceCatalogId: wo.serviceCatalogId,
    completedAt: occurredAt,
  });

  if (resolved.status === "ambiguous_rule") {
    logger.warn(
      { tenantId: input.tenantId, workOrderId: wo.id, payeeUserId: wo.assignedUserId },
      "commissions.reconcile: ambiguous commission rule found; holding in pending_review",
    );
    await unit.updateEngineBasisEventOutcome(input.tenantId, eventId, "pending_review", {
      workOrderCode: wo.code,
      serviceCatalogId: wo.serviceCatalogId,
      reason: "ambiguous_rule",
    });
    return "skipped";
  }

  let amountCents = 0n;
  let outcome: "calculated" | "no_rule" = "no_rule";

  if (resolved.status === "matched") {
    outcome = "calculated";
    amountCents = computeCommissionCents({
      baseCents,
      rateType: resolved.rule.rateType,
      rateValueText: resolved.rule.rateValueText,
    });
  } else {
    // B-COMISSAO:zero-com-motivo
    outcome = "no_rule";
    amountCents = 0n;
  }

  const initialStatus = resolveInitialCalculationStatus(wo.status);
  const snapshot = buildCommissionSnapshot({
    outcome,
    workOrderId: wo.id,
    workOrderCode: wo.code,
    serviceCatalogId: wo.serviceCatalogId,
    baseCents,
    itemCount: items.length,
    rule: resolved.rule,
    amountCents,
    computedAt: new Date(),
  });

  // B-COMISSAO:chave-do-calculo
  const alreadyHasCalc = await unit.hasLivePrimaryCalculationForEvent(input.tenantId, eventId);
  if (alreadyHasCalc) {
    return "skipped";
  }

  const calcId = await unit.insertEnginePrimaryCalculationIfAbsent({
    tenantId: input.tenantId,
    basisEventId: eventId,
    policyId: input.policy.id,
    payeeUserId: wo.assignedUserId,
    amountDecimalText: centsToDecimalString(amountCents),
    status: initialStatus,
    calculationSnapshot: snapshot,
    idempotencyKey: `engine:calc:${eventId}`,
  });

  if (!calcId) {
    return "skipped";
  }

  return "created";
}

function resolveInitialCalculationStatus(workOrderStatus: string): CommissionCalculationStatus {
  // Plano §3.6: OS cancelada com "manter cobrança" nasce já approved; no modo on_completion nasce approved;
  // no modo padrão on_validation nasce calculated.
  if (workOrderStatus === "cancelled") {
    return "approved";
  }
  return env.COMMISSION_RELEASE_MODE === "on_completion" ? "approved" : "calculated";
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
