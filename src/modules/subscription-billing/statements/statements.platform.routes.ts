// B-ASS-04 · F7 — rotas de PLATAFORMA do demonstrativo (/api/v1/platform/billing/*), sob `requirePlatformPermission`.
// Dinheiro entra e sai como string decimal ("199.90"); o domínio carrega centavos inteiros.
//
// Emenda ao contrato (§3.5), declarada no relatório: as tabelas do demonstrativo têm FORCE RLS, então ler ou escrever
// um demonstrativo exige o GUC da organização. Por isso toda rota recebe o `tenantId` explícito (query nas leituras,
// corpo nas escritas) — sem uma tabela global de referência (a `billing_statement_refs` é do B-ASS-08), não há como
// resolver a organização só pelo id.

import { Router, type Request } from "express";

import { handleAsyncRoute, readRouteParam } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { centsToMoney, moneyToCents } from "../plans/plan-money.js";
import {
  BillingProfileError,
  parseBillingProfileInput,
  toBillingProfileDto,
} from "../billing-profile/billing-profile.js";
import { createDefaultStatementRuntime } from "./statement.factory.js";
import { StatementError, type StatementPayment, type SubscriptionCredit, type SubscriptionStatement } from "./statement.types.js";

const UUID_OR_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

function actorId(request: Request): string {
  return request.actor?.userId ?? "platform";
}

function requireTenantId(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!UUID_OR_ID.test(text)) throw new StatementError(400, "tenant_id_required", "tenantId is required.");
  return text;
}

function body(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
}

function signedMoneyToCents(value: unknown, field: string): number {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  const negative = raw.startsWith("-");
  const cents = moneyToCents(negative ? raw.slice(1) : raw, field);
  return negative ? -cents : cents;
}

function money(cents: number): string {
  return cents < 0 ? `-${centsToMoney(-cents)}` : centsToMoney(cents);
}

export function toStatementDto(statement: SubscriptionStatement) {
  const c = statement.computation;
  return {
    id: statement.id,
    tenantId: statement.tenantId,
    period: statement.period,
    status: statement.status,
    chargeStatus: statement.chargeStatus,
    invoiceStatus: statement.invoiceStatus,
    planVersionId: statement.planVersionId,
    addonPlanVersionId: statement.addonPlanVersionId,
    segments: (c?.segments ?? []).map((segment) => ({ ...segment, baseAmount: money(segment.baseCents), monthlyPrice: money(segment.monthlyPriceCents) })),
    usersIncluded: c?.usersIncluded ?? null,
    usersPeak: c?.usersPeak ?? null,
    usersExtra: c?.usersExtra ?? null,
    storageIncludedGb: c ? (c.storageIncludedMilliGb / 1000).toFixed(3) : null,
    storagePeakGb: c ? (c.storagePeakMilliGb / 1000).toFixed(3) : null,
    storageExtraGb: c ? (c.storageExtraMilliGb / 1000).toFixed(3) : null,
    trackedVehicles: c?.trackedVehicles ?? null,
    daysInMonth: statement.daysInMonth,
    daysMeasured: statement.daysMeasured,
    baseAmount: c ? money(c.baseCents) : null,
    usersExtraAmount: c ? money(c.usersExtraCents) : null,
    storageExtraAmount: c ? money(c.storageExtraCents) : null,
    trackingAmount: c ? money(c.trackingCents) : null,
    adjustmentsAmount: money(statement.adjustmentsCents),
    creditsAppliedAmount: money(statement.creditsAppliedCents),
    totalAmount: money(statement.totalCents),
    paidAmount: money(statement.paidCents),
    balance: money(Math.max(0, statement.totalCents - statement.paidCents)),
    adjustmentNote: statement.adjustmentNote,
    dueDate: statement.dueDate,
    closedAt: statement.closedAt?.toISOString() ?? null,
    reopenedAt: statement.reopenedAt?.toISOString() ?? null,
    reopenReason: statement.reopenReason,
    paidAt: statement.paidAt?.toISOString() ?? null,
    cancelledAt: statement.cancelledAt?.toISOString() ?? null,
    cancelReason: statement.cancelReason,
    warning: statement.snapshot.warning ?? null,
    zeroTotal: statement.snapshot.zeroTotal === true,
    gaps: statement.snapshot.gaps ?? [],
    history: statement.snapshot.history,
  };
}

function toPaymentDto(payment: StatementPayment) {
  return {
    id: payment.id,
    statementId: payment.statementId,
    source: payment.source,
    amount: money(payment.amountCents),
    appliedAmount: money(payment.appliedCents),
    reversedAmount: money(payment.reversedCents),
    reversalKind: payment.reversalKind,
    paidAt: payment.paidAt.toISOString(),
    method: payment.method,
    note: payment.note,
  };
}

function toCreditDto(credit: SubscriptionCredit) {
  return {
    id: credit.id,
    originStatementId: credit.originStatementId,
    amount: money(credit.amountCents),
    reason: credit.reason,
    status: credit.status,
    appliedToStatementId: credit.appliedToStatementId,
    resolutionNote: credit.resolutionNote,
    createdAt: credit.createdAt.toISOString(),
  };
}

export function createStatementsPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/statements",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const tenantId = requireTenantId(request.query.tenantId);
      const { repository } = await createDefaultStatementRuntime();
      const rows = await repository.listStatements(tenantId);
      response.status(200).json({ data: rows.map(toStatementDto) });
    }),
  );

  router.post(
    "/statements/close",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const tenantId = requireTenantId(input.tenantId);
      const period = typeof input.period === "string" ? input.period.trim() : "";
      if (!PERIOD.test(period)) throw new StatementError(400, "invalid_period", "period must be YYYY-MM.");
      const { service } = await createDefaultStatementRuntime();
      const outcome = await service.close({ tenantId, period, now: new Date(), actorId: actorId(request), source: "manual" });
      response.status(200).json({
        data: {
          closed: outcome.kind === "closed" ? [toStatementDto(outcome.statement)] : [],
          alreadyClosed: outcome.kind === "already_closed" ? [toStatementDto(outcome.statement)] : [],
          skipped: outcome.kind === "skipped" ? [{ tenantId, reason: outcome.reason }] : [],
        },
      });
    }),
  );

  router.get(
    "/statements/:statementId",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const tenantId = requireTenantId(request.query.tenantId);
      const statementId = readRouteParam(request.params.statementId);
      const { repository } = await createDefaultStatementRuntime();
      const statement = await repository.findStatement(tenantId, statementId);
      if (!statement) throw new StatementError(404, "statement_not_found", "Statement not found.");
      const [payments, credits] = await Promise.all([repository.listPayments(tenantId, statementId), repository.listCredits(tenantId)]);
      response.status(200).json({
        data: {
          ...toStatementDto(statement),
          payments: payments.map(toPaymentDto),
          credits: credits.filter((credit) => credit.originStatementId === statementId || credit.appliedToStatementId === statementId).map(toCreditDto),
        },
      });
    }),
  );

  router.patch(
    "/statements/:statementId/adjustment",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const { service } = await createDefaultStatementRuntime();
      const saved = await service.adjust({
        tenantId: requireTenantId(input.tenantId),
        statementId: readRouteParam(request.params.statementId),
        deltaCents: signedMoneyToCents(input.adjustmentsAmount, "adjustmentsAmount"),
        note: typeof input.adjustmentNote === "string" ? input.adjustmentNote : "",
        actorId: actorId(request),
        now: new Date(),
      });
      response.status(200).json({ data: toStatementDto(saved) });
    }),
  );

  router.post(
    "/statements/:statementId/reopen",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const reason = typeof input.reason === "string" ? input.reason.trim() : "";
      if (reason.length < 10) throw new StatementError(400, "reason_too_short", "reason must have at least 10 characters.");
      const { service } = await createDefaultStatementRuntime();
      const saved = await service.reopen({
        tenantId: requireTenantId(input.tenantId),
        statementId: readRouteParam(request.params.statementId),
        reason,
        actorId: actorId(request),
        now: new Date(),
      });
      response.status(200).json({ data: toStatementDto(saved) });
    }),
  );

  router.post(
    "/statements/:statementId/payments",
    requirePlatformPermission("platform:billing:settle"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const { service } = await createDefaultStatementRuntime();
      const result = await service.recordManualPayment({
        tenantId: requireTenantId(input.tenantId),
        statementId: readRouteParam(request.params.statementId),
        amountCents: moneyToCents(input.amount, "amount"),
        method: typeof input.method === "string" ? input.method.slice(0, 40) : null,
        note: typeof input.note === "string" ? input.note.slice(0, 500) : null,
        actorId: actorId(request),
        now: new Date(),
      });
      response.status(201).json({ data: { statement: toStatementDto(result.statement), payment: toPaymentDto(result.payment) } });
    }),
  );

  router.post(
    "/statements/:statementId/payments/:paymentId/reverse",
    requirePlatformPermission("platform:billing:settle"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const { service } = await createDefaultStatementRuntime();
      const result = await service.reverseManualPayment({
        tenantId: requireTenantId(input.tenantId),
        paymentId: readRouteParam(request.params.paymentId),
        reason: typeof input.reason === "string" ? input.reason : "",
        actorId: actorId(request),
        now: new Date(),
      });
      response.status(200).json({ data: { statement: toStatementDto(result.statement), payment: toPaymentDto(result.payment) } });
    }),
  );

  router.post(
    "/statements/:statementId/cancel",
    requirePlatformPermission("platform:billing:settle"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const { service } = await createDefaultStatementRuntime();
      const saved = await service.cancel({
        tenantId: requireTenantId(input.tenantId),
        statementId: readRouteParam(request.params.statementId),
        reason: typeof input.reason === "string" ? input.reason : "",
        actorId: actorId(request),
        now: new Date(),
      });
      response.status(200).json({ data: toStatementDto(saved) });
    }),
  );

  router.get(
    "/credits",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const tenantId = requireTenantId(request.query.tenantId);
      const status = typeof request.query.status === "string" ? request.query.status : undefined;
      const { repository } = await createDefaultStatementRuntime();
      const credits = await repository.listCredits(tenantId);
      response.status(200).json({ data: credits.filter((credit) => !status || credit.status === status).map(toCreditDto) });
    }),
  );

  router.post(
    "/credits/:creditId/apply",
    requirePlatformPermission("platform:billing:settle"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const statementId = typeof input.statementId === "string" ? input.statementId : "";
      const { service } = await createDefaultStatementRuntime();
      const result = await service.applyCredit({
        tenantId: requireTenantId(input.tenantId),
        creditId: readRouteParam(request.params.creditId),
        statementId,
        actorId: actorId(request),
        now: new Date(),
      });
      response.status(200).json({ data: { statement: toStatementDto(result.statement), credit: toCreditDto(result.credit) } });
    }),
  );

  router.post(
    "/credits/:creditId/write-off",
    requirePlatformPermission("platform:billing:settle"),
    handleAsyncRoute(async (request, response) => {
      const input = body(request);
      const { service } = await createDefaultStatementRuntime();
      const credit = await service.writeOffCredit({
        tenantId: requireTenantId(input.tenantId),
        creditId: readRouteParam(request.params.creditId),
        note: typeof input.reason === "string" ? input.reason : "",
        actorId: actorId(request),
      });
      response.status(200).json({ data: toCreditDto(credit) });
    }),
  );

  // F8 — perfil de cobrança (G12). PUT incompleto é rascunho aceito; `complete`/`missing[]` dizem o que falta.
  router.get(
    "/tenants/:tenantId/billing-profile",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const tenantId = requireTenantId(readRouteParam(request.params.tenantId));
      const { billingProfiles, tenants } = await createDefaultStatementRuntime();
      if (!(await tenants.getTenantById(tenantId))) throw new BillingProfileError(404, "tenant_not_found", "Organization not found.");
      response.status(200).json({ data: toBillingProfileDto(tenantId, await billingProfiles.find(tenantId)) });
    }),
  );

  router.put(
    "/tenants/:tenantId/billing-profile",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const tenantId = requireTenantId(readRouteParam(request.params.tenantId));
      const input = parseBillingProfileInput(body(request));
      const { billingProfiles, tenants, audit } = await createDefaultStatementRuntime();
      const tenant = await tenants.getTenantById(tenantId);
      if (!tenant) throw new BillingProfileError(404, "tenant_not_found", "Organization not found.");
      if (tenant.slug === "platform") {
        throw new BillingProfileError(422, "platform_organization", "The platform organization has no billing profile.");
      }
      const saved = await billingProfiles.upsert(tenantId, input, new Date());
      const dto = toBillingProfileDto(tenantId, saved);
      // Documento, e-mail e endereço são dado pessoal: a trilha leva só o estado de completude.
      await audit.record({
        tenantId,
        actorId: actorId(request),
        action: "subscription_billing_profile.updated",
        entityId: saved.id,
        metadata: { complete: dto.complete, missingCount: dto.missing.length, paymentMethod: dto.paymentMethod },
      });
      response.status(200).json({ data: dto });
    }),
  );

  return router;
}
