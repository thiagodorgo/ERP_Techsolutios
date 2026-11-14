// B-ASS-09 · F6 — R1, a visão de custo × assinatura (`GET /api/v1/platform/billing/overview`), sob
// `requirePlatformPermission("platform:billing:read")` (P8: ninguém de organização alcança).
//
// As falhas de integridade viram 500, sem número parcial, e SÓ com o motivo no corpo (`statement_integrity_violation`,
// `membership_integrity_violation`, `overview_integrity_violation`). A organização e o mês vão para o LOG do servidor, nunca
// para o corpo (§2.8; visto `rev-ass09-e21-cl`, A-E21-2). Sem esta tradução, o `sendRouteError` da casa responderia 400
// `invalid_request` com a mensagem do erro.

import { Router, type Request } from "express";

import { handleAsyncRoute } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { MembershipOverlapError } from "../economic-groups/membership.rules.js";
import { SubscriptionBillingError } from "../plans/plan-types.js";
import { OverviewEngineError } from "./overview.engine.js";
import { createDefaultOverviewRuntime, type OverviewLogger } from "./overview.factory.js";
import { StatementIntegrityError } from "./overview.service.js";

export function createOverviewPlatformRouter(): Router {
  const router = Router();

  router.get("/overview", requirePlatformPermission("platform:billing:read"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const period = queryText(request, "period") ?? "";
    try {
      const data = await runtime.overview.getOverview({ period, groupBy: queryText(request, "groupBy") });
      response.status(200).json({ data });
    } catch (error) {
      throw translateOverviewError(error, runtime.logger, period);
    }
  }));

  return router;
}

function queryText(request: Request, key: string): string | undefined {
  const value = (request.query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/** As três falhas de integridade da visão → 500 com o motivo; organização e mês só no log. O resto segue como está. */
function translateOverviewError(error: unknown, logger: OverviewLogger, period: string): unknown {
  if (error instanceof StatementIntegrityError) return statementIntegrity(error, logger);
  if (error instanceof MembershipOverlapError) return membershipIntegrity(error, logger, period);
  if (error instanceof OverviewEngineError) return engineIntegrity(error, logger, period);
  return error;
}

function statementIntegrity(error: StatementIntegrityError, logger: OverviewLogger): SubscriptionBillingError {
  logger.error({ reason: error.reason, period: error.period, tenantId: error.tenantId }, "statement_integrity_violation");
  return integrityViolation(
    "statement_integrity_violation",
    "Um demonstrativo gravado do período não fecha com o retrato do fechamento: a visão não sai com número parcial.",
  );
}

function membershipIntegrity(error: MembershipOverlapError, logger: OverviewLogger, period: string): SubscriptionBillingError {
  logger.error({ reason: "membership_integrity_violation", period, tenantId: error.tenantId }, "membership_integrity_violation");
  return integrityViolation(
    "membership_integrity_violation",
    "Uma organização está em mais de um grupo no mesmo dia: a visão não sai com número parcial.",
  );
}

function engineIntegrity(error: OverviewEngineError, logger: OverviewLogger, period: string): SubscriptionBillingError {
  logger.error({ reason: error.reason, period }, "overview_integrity_violation");
  return integrityViolation("overview_integrity_violation", "A entrada da visão está incoerente: a visão não sai com número parcial.");
}

function integrityViolation(reason: string, message: string): SubscriptionBillingError {
  return new SubscriptionBillingError(500, "INTERNAL_SERVER_ERROR", reason, message);
}
