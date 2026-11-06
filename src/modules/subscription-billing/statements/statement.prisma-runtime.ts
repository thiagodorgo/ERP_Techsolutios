// B-ASS-04 · F5 — o runtime Prisma do demonstrativo. Toda leitura e escrita de organização roda sob `withTenantRls`
// (GUC `app.current_tenant_id`): as 4 tabelas da M3 têm ENABLE + FORCE ROW LEVEL SECURITY.
//
// Dinheiro: CENTAVOS INTEIROS no domínio, `Decimal(12,2)` no banco. A conversão é por TEXTO, sem float, nos dois
// sentidos (`centsToDecimal`/`decimalToCents`); espaço em milésimos de GB ↔ `Decimal(12,3)` pelo mesmo caminho.
// O cálculo do demonstrativo é RECONSTRUÍDO do `snapshot.latest` (invariante §3.3: recalcular do snapshot reproduz o
// total), e as colunas guardam os mesmos números para consulta e relatório.
//
// Concorrência (plano §4.4): `insertIfAbsentAndLock` é `INSERT … ON CONFLICT DO NOTHING` + `SELECT … FOR UPDATE`;
// `lockById`/`lockPayment`/`lockCredit` são `SELECT … FOR UPDATE`. Id que não é UUID responde "não existe" sem ir ao
// banco (o cast falharia com 22P02 e viraria 500).

import type { Prisma, PrismaClient } from "@prisma/client";

import { deriveBusinessDate } from "../../../config/business-time.js";
import { withTenantRls } from "../../../database/rls.js";
import {
  BILLING_PAYMENT_METHODS,
  missingFields,
  type BillingPaymentMethod,
  type BillingProfileRepository,
  type TenantBillingProfile,
} from "../billing-profile/billing-profile.js";
import { PrismaPlansRepository } from "../plans/plans-prisma.repository.js";
import { PrismaSubscriptionsRepository } from "../plans/subscriptions-prisma.repository.js";
import { PrismaTenantLookup } from "../plans/tenant-lookup.prisma.js";
import { computeStatement, type StatementSnapshot } from "./statement.engine.js";
import type { StatementRuntime } from "./statement.factory.js";
import { RepositoryStatementInputsProvider, type BindingsSource, type UsageSource } from "./statement.inputs-provider.js";
import type { UsageDayRow, VehicleBindingWindow } from "./statement.inputs.js";
import { emptyStatement, type StatementRepository, type StatementTx } from "./statement.repository.js";
import { StatementService, type StatementAuditSink } from "./statement.service.js";
import type {
  ChargeStatus,
  CreditReason,
  CreditStatus,
  InvoiceStatus,
  PaymentSource,
  StatementAuditEvent,
  StatementPayment,
  StatementSnapshotEnvelope,
  StatementStatus,
  SubscriptionCredit,
  SubscriptionStatement,
} from "./statement.types.js";

type Tx = Prisma.TransactionClient;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Coluna `UUID` de autoria: ator sem id UUID (cabeçalho legado de dev) fica `null`; o `by` segue no `history`. */
function actorColumn(value: string | null): string | null {
  return value !== null && isUuid(value) ? value : null;
}

// ------------------------------------------------------------------------------------------ conversões exatas

/** Centavos inteiros (com sinal) → texto decimal de 2 casas. */
export function centsToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError("cents must be a safe integer");
  const abs = Math.abs(cents);
  const text = `${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${text}` : text;
}

/** Texto decimal (o que o Prisma devolve por `toString()`) → inteiro em 10^-scale, sem float. */
function decimalToScaled(value: { toString(): string } | string, scale: number): number {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new RangeError(`not a decimal: ${text}`);
  const fraction = match[3] ?? "";
  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) throw new RangeError(`more than ${scale} places: ${text}`);
  const scaled = Number(match[2]) * 10 ** scale + Number(fraction.slice(0, scale).padEnd(scale, "0"));
  if (!Number.isSafeInteger(scaled)) throw new RangeError(`out of range: ${text}`);
  return match[1] === "-" ? -scaled : scaled;
}

export function decimalToCents(value: { toString(): string } | string): number {
  return decimalToScaled(value, 2);
}

function milliToDecimal(milli: number): string {
  if (!Number.isSafeInteger(milli) || milli < 0) throw new RangeError("milli must be a non-negative safe integer");
  return `${Math.trunc(milli / 1000)}.${String(milli % 1000).padStart(3, "0")}`;
}

function dateColumn(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------------------------------- demonstrativo

type StatementRecord = Awaited<ReturnType<Tx["subscriptionStatement"]["findUniqueOrThrow"]>>;

function statementColumns(statement: SubscriptionStatement) {
  const c = statement.computation;
  const latest = statement.snapshot.latest;
  return {
    status: statement.status,
    charge_status: statement.chargeStatus,
    invoice_status: statement.invoiceStatus,
    subscription_id: statement.subscriptionId,
    plan_version_id: statement.planVersionId,
    addon_plan_version_id: statement.addonPlanVersionId,
    segments: (c?.segments ?? []) as unknown as Prisma.InputJsonValue,
    users_included: c?.usersIncluded ?? 0,
    users_peak: c?.usersPeak ?? 0,
    users_extra: c?.usersExtra ?? 0,
    storage_included_gb: milliToDecimal(c?.storageIncludedMilliGb ?? 0),
    storage_peak_gb: milliToDecimal(c?.storagePeakMilliGb ?? 0),
    storage_extra_gb: milliToDecimal(c?.storageExtraMilliGb ?? 0),
    tracked_vehicles: c?.trackedVehicles ?? 0,
    days_in_month: statement.daysInMonth,
    days_measured: statement.daysMeasured,
    extra_user_price: centsToDecimal(latest?.terms.extraUserPriceCents ?? 0),
    extra_gb_price: centsToDecimal(latest?.terms.extraGbPriceCents ?? 0),
    per_vehicle_price: latest?.perVehiclePriceCents == null ? null : centsToDecimal(latest.perVehiclePriceCents),
    base_amount: centsToDecimal(c?.baseCents ?? 0),
    users_extra_amount: centsToDecimal(c?.usersExtraCents ?? 0),
    storage_extra_amount: centsToDecimal(c?.storageExtraCents ?? 0),
    tracking_amount: centsToDecimal(c?.trackingCents ?? 0),
    adjustments_amount: centsToDecimal(statement.adjustmentsCents),
    credits_applied_amount: centsToDecimal(statement.creditsAppliedCents),
    total_amount: centsToDecimal(statement.totalCents),
    paid_amount: centsToDecimal(statement.paidCents),
    adjustment_note: statement.adjustmentNote,
    due_date: statement.dueDate === null ? null : dateColumn(statement.dueDate),
    closed_at: statement.closedAt,
    closed_by: actorColumn(statement.closedBy),
    reopened_at: statement.reopenedAt,
    reopened_by: actorColumn(statement.reopenedBy),
    reopen_reason: statement.reopenReason,
    paid_at: statement.paidAt,
    cancelled_at: statement.cancelledAt,
    cancelled_by: actorColumn(statement.cancelledBy),
    cancel_reason: statement.cancelReason,
    snapshot: statement.snapshot as unknown as Prisma.InputJsonValue,
  };
}

function mapStatement(record: StatementRecord): SubscriptionStatement {
  const snapshot = record.snapshot as unknown as StatementSnapshotEnvelope;
  const latest = snapshot.latest as StatementSnapshot | null;
  return {
    id: record.id,
    tenantId: record.tenant_id,
    period: record.period,
    status: record.status as StatementStatus,
    chargeStatus: record.charge_status as ChargeStatus,
    invoiceStatus: record.invoice_status as InvoiceStatus,
    subscriptionId: record.subscription_id,
    planVersionId: record.plan_version_id,
    addonPlanVersionId: record.addon_plan_version_id,
    computation: latest ? computeStatement(latest) : null,
    daysInMonth: record.days_in_month,
    daysMeasured: record.days_measured,
    totalCents: decimalToCents(record.total_amount),
    paidCents: decimalToCents(record.paid_amount),
    adjustmentsCents: decimalToCents(record.adjustments_amount),
    creditsAppliedCents: decimalToCents(record.credits_applied_amount),
    adjustmentNote: record.adjustment_note,
    dueDate: record.due_date === null ? null : dateValue(record.due_date),
    closedAt: record.closed_at,
    closedBy: record.closed_by,
    reopenedAt: record.reopened_at,
    reopenedBy: record.reopened_by,
    reopenReason: record.reopen_reason,
    paidAt: record.paid_at,
    cancelledAt: record.cancelled_at,
    cancelledBy: record.cancelled_by,
    cancelReason: record.cancel_reason,
    snapshot,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

type PaymentRecord = Awaited<ReturnType<Tx["subscriptionStatementPayment"]["findUniqueOrThrow"]>>;

function mapPayment(record: PaymentRecord): StatementPayment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    statementId: record.statement_id,
    source: record.source as PaymentSource,
    externalChargeId: record.external_charge_id,
    amountCents: decimalToCents(record.amount),
    appliedCents: decimalToCents(record.applied_amount),
    paidAt: record.paid_at,
    method: record.method,
    note: record.note,
    recordedBy: record.recorded_by,
    reversedCents: decimalToCents(record.reversed_amount),
    reversedAt: record.reversed_at,
    reversedBy: record.reversed_by,
    reversalReason: record.reversal_reason,
    reversalKind: record.reversal_kind as StatementPayment["reversalKind"],
  };
}

type CreditRecord = Awaited<ReturnType<Tx["subscriptionCredit"]["findUniqueOrThrow"]>>;

function mapCredit(record: CreditRecord): SubscriptionCredit {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    originStatementId: record.origin_statement_id,
    originPaymentId: record.origin_payment_id,
    amountCents: decimalToCents(record.amount),
    reason: record.reason as CreditReason,
    status: record.status as CreditStatus,
    appliedToStatementId: record.applied_to_statement_id,
    createdBy: record.created_by,
    resolvedBy: record.resolved_by,
    resolutionNote: record.resolution_note,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function prismaTx(tx: Tx, tenantId: string): StatementTx {
  return {
    async insertIfAbsentAndLock(input) {
      const draft = emptyStatement(input, new Date());
      const inserted = await tx.subscriptionStatement.createMany({
        data: [{ id: draft.id, tenant_id: tenantId, period: input.period, ...statementColumns(draft) }],
        skipDuplicates: true,
      });
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM subscription_statements WHERE tenant_id = ${tenantId}::uuid AND period = ${input.period} FOR UPDATE`;
      const id = rows[0]?.id;
      if (!id) throw new Error("statement row missing after insert");
      return { statement: mapStatement(await tx.subscriptionStatement.findUniqueOrThrow({ where: { id } })), created: inserted.count === 1 };
    },
    async lockById(statementId) {
      if (!isUuid(statementId)) return undefined;
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM subscription_statements WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
      if (!rows[0]) return undefined;
      return mapStatement(await tx.subscriptionStatement.findUniqueOrThrow({ where: { id: statementId } }));
    },
    async saveStatement(statement) {
      const record = await tx.subscriptionStatement.update({
        where: { tenant_id_id: { tenant_id: tenantId, id: statement.id } },
        data: statementColumns(statement),
      });
      return mapStatement(record);
    },
    async insertPayment(input) {
      const record = await tx.subscriptionStatementPayment.create({
        data: {
          tenant_id: tenantId,
          statement_id: input.statementId,
          source: input.source,
          external_charge_id: input.externalChargeId,
          amount: centsToDecimal(input.amountCents),
          applied_amount: centsToDecimal(input.appliedCents),
          paid_at: input.paidAt,
          method: input.method,
          note: input.note,
          recorded_by: actorColumn(input.recordedBy),
        },
      });
      return mapPayment(record);
    },
    async lockPayment(paymentId) {
      if (!isUuid(paymentId)) return undefined;
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM subscription_statement_payments WHERE id = ${paymentId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
      if (!rows[0]) return undefined;
      return mapPayment(await tx.subscriptionStatementPayment.findUniqueOrThrow({ where: { id: paymentId } }));
    },
    async savePayment(payment) {
      const updated = await tx.subscriptionStatementPayment.updateMany({
        where: { id: payment.id, tenant_id: tenantId },
        data: {
          applied_amount: centsToDecimal(payment.appliedCents),
          reversed_amount: centsToDecimal(payment.reversedCents),
          reversed_at: payment.reversedAt,
          reversed_by: actorColumn(payment.reversedBy),
          reversal_reason: payment.reversalReason,
          reversal_kind: payment.reversalKind,
        },
      });
      if (updated.count !== 1) throw new Error("payment not found in this organization");
      return mapPayment(await tx.subscriptionStatementPayment.findUniqueOrThrow({ where: { id: payment.id } }));
    },
    async insertCredit(input) {
      const record = await tx.subscriptionCredit.create({
        data: {
          tenant_id: tenantId,
          origin_statement_id: input.originStatementId,
          origin_payment_id: input.originPaymentId,
          amount: centsToDecimal(input.amountCents),
          reason: input.reason,
          created_by: actorColumn(input.createdBy),
        },
      });
      return mapCredit(record);
    },
    async lockCredit(creditId) {
      if (!isUuid(creditId)) return undefined;
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM subscription_credits WHERE id = ${creditId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
      if (!rows[0]) return undefined;
      return mapCredit(await tx.subscriptionCredit.findUniqueOrThrow({ where: { id: creditId } }));
    },
    async saveCredit(credit) {
      const updated = await tx.subscriptionCredit.updateMany({
        where: { id: credit.id, tenant_id: tenantId },
        data: {
          status: credit.status,
          applied_to_statement_id: credit.appliedToStatementId,
          resolved_by: actorColumn(credit.resolvedBy),
          resolution_note: credit.resolutionNote,
        },
      });
      if (updated.count !== 1) throw new Error("credit not found in this organization");
      return mapCredit(await tx.subscriptionCredit.findUniqueOrThrow({ where: { id: credit.id } }));
    },
  };
}

export class PrismaStatementRepository implements StatementRepository {
  constructor(private readonly client: PrismaClient) {}

  transaction<T>(tenantId: string, work: (tx: StatementTx) => Promise<T>): Promise<T> {
    return withTenantRls(this.client, tenantId, (tx) => work(prismaTx(tx, tenantId)));
  }

  listStatements(tenantId: string): Promise<readonly SubscriptionStatement[]> {
    return withTenantRls(this.client, tenantId, async (tx) =>
      (await tx.subscriptionStatement.findMany({ where: { tenant_id: tenantId }, orderBy: { period: "asc" } })).map(mapStatement),
    );
  }

  findStatement(tenantId: string, statementId: string): Promise<SubscriptionStatement | undefined> {
    if (!isUuid(statementId)) return Promise.resolve(undefined);
    return withTenantRls(this.client, tenantId, async (tx) => {
      const record = await tx.subscriptionStatement.findFirst({ where: { tenant_id: tenantId, id: statementId } });
      return record ? mapStatement(record) : undefined;
    });
  }

  listPayments(tenantId: string, statementId: string): Promise<readonly StatementPayment[]> {
    if (!isUuid(statementId)) return Promise.resolve([]);
    return withTenantRls(this.client, tenantId, async (tx) =>
      (
        await tx.subscriptionStatementPayment.findMany({
          where: { tenant_id: tenantId, statement_id: statementId },
          orderBy: { paid_at: "asc" },
        })
      ).map(mapPayment),
    );
  }

  listCredits(tenantId: string): Promise<readonly SubscriptionCredit[]> {
    return withTenantRls(this.client, tenantId, async (tx) =>
      (await tx.subscriptionCredit.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: "asc" } })).map(mapCredit),
    );
  }
}

// --------------------------------------------------------------------------------------- perfil de cobrança

type ProfileRecord = Awaited<ReturnType<Tx["tenantBillingProfile"]["findUniqueOrThrow"]>>;

function mapProfile(record: ProfileRecord): TenantBillingProfile {
  const method = (BILLING_PAYMENT_METHODS as readonly string[]).includes(record.payment_method)
    ? (record.payment_method as BillingPaymentMethod)
    : "undefined";
  return {
    id: record.id,
    tenantId: record.tenant_id,
    legalName: record.legal_name,
    document: record.document,
    email: record.email,
    address: {
      postalCode: record.postal_code,
      street: record.street,
      number: record.number,
      district: record.district,
      city: record.city,
      cityIbge: record.city_ibge,
      state: record.state,
    },
    paymentMethod: method,
    asaasCustomerId: record.asaas_customer_id,
    mpCustomerId: record.mp_customer_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class PrismaBillingProfileRepository implements BillingProfileRepository {
  constructor(private readonly client: PrismaClient) {}

  find(tenantId: string): Promise<TenantBillingProfile | null> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const record = await tx.tenantBillingProfile.findFirst({ where: { tenant_id: tenantId, deleted_at: null } });
      return record ? mapProfile(record) : null;
    });
  }

  upsert(tenantId: string, input: Parameters<BillingProfileRepository["upsert"]>[1]): Promise<TenantBillingProfile> {
    const data = {
      legal_name: input.legalName,
      document: input.document,
      email: input.email,
      postal_code: input.address.postalCode,
      street: input.address.street,
      number: input.address.number,
      district: input.address.district,
      city: input.address.city,
      city_ibge: input.address.cityIbge,
      state: input.address.state,
      payment_method: input.paymentMethod,
      complete: missingFields(input).length === 0,
      deleted_at: null,
    };
    return withTenantRls(this.client, tenantId, async (tx) =>
      mapProfile(
        await tx.tenantBillingProfile.upsert({
          where: { tenant_id: tenantId },
          create: { tenant_id: tenantId, ...data },
          update: data,
        }),
      ),
    );
  }
}

// ------------------------------------------------------------------------------------ medições e vínculos

/** Medições diárias do B-ASS-03 (`tenant_usage_daily`), sob o GUC da organização. */
export class PrismaUsageSource implements UsageSource {
  constructor(private readonly client: PrismaClient) {}

  listUsageDays(tenantId: string, fromDate: string, toDate: string): Promise<readonly UsageDayRow[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = await tx.tenantUsageDaily.findMany({
        where: { tenant_id: tenantId, date: { gte: dateColumn(fromDate), lte: dateColumn(toDate) } },
        orderBy: { date: "asc" },
      });
      return rows.map((row) => ({
        date: dateValue(row.date),
        activeUsers: row.active_users,
        dbBytesEstimated: row.db_bytes_estimated,
        filesBytes: row.files_bytes,
      }));
    });
  }
}

/** Vínculos veículo × rastreador (`vehicle_tracking_bindings`), em datas locais SP — a mesma janela do medidor. */
export class PrismaBindingsSource implements BindingsSource {
  constructor(private readonly client: PrismaClient) {}

  listVehicleBindings(tenantId: string, fromDate: string, toDate: string): Promise<readonly VehicleBindingWindow[]> {
    // São Paulo sem horário de verão desde 2019: o dia local é [00:00−03:00, +24 h).
    const start = new Date(`${fromDate}T00:00:00-03:00`);
    const end = new Date(new Date(`${toDate}T00:00:00-03:00`).getTime() + 86_400_000 - 1);
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = await tx.vehicleTrackingBinding.findMany({
        where: { tenant_id: tenantId, valid_from: { lte: end }, OR: [{ valid_to: null }, { valid_to: { gte: start } }] },
        select: { vehicle_id: true, valid_from: true, valid_to: true },
      });
      return rows.map((row) => ({
        vehicleId: row.vehicle_id,
        validFrom: deriveBusinessDate(row.valid_from),
        validTo: row.valid_to ? deriveBusinessDate(row.valid_to) : null,
      }));
    });
  }
}

// ------------------------------------------------------------------------------------------------ auditoria

/** Trilha na `audit_logs` da organização, sob o GUC dela. Metadata já vem pela allowlist do serviço (§3.6). */
export class PrismaStatementAuditSink implements StatementAuditSink {
  constructor(private readonly client: PrismaClient) {}

  async record(event: StatementAuditEvent): Promise<void> {
    const [{ EnterpriseAuditLogService }, { AuditLogRepository }] = await Promise.all([
      import("../../core-saas/audit/audit-log.service.js"),
      import("../../core-saas/repositories/audit-log.repository.js"),
    ]);
    await withTenantRls(this.client, event.tenantId, async (tx) => {
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        tenantId: event.tenantId,
        actorId: actorColumn(event.actorId),
        actorType: event.actorId === null ? "system" : "user",
        action: event.action,
        resourceType: event.action.startsWith("subscription_billing_profile") ? "tenant_billing_profile" : "subscription_statement",
        resourceId: event.entityId,
        metadata: event.metadata,
      });
    });
  }
}

export async function createPrismaStatementRuntime(): Promise<StatementRuntime> {
  const { prisma } = await import("../../../database/prisma.js");
  const repository = new PrismaStatementRepository(prisma);
  const plans = new PrismaPlansRepository(prisma);
  const tenants = new PrismaTenantLookup(prisma);
  const usage = new PrismaUsageSource(prisma);
  const bindings = new PrismaBindingsSource(prisma);
  const audit = new PrismaStatementAuditSink(prisma);
  const inputs = new RepositoryStatementInputsProvider(new PrismaSubscriptionsRepository(prisma), plans, tenants, usage, bindings);
  return {
    service: new StatementService(repository, inputs, audit),
    repository,
    billingProfiles: new PrismaBillingProfileRepository(prisma),
    tenants,
    audit,
    inputs,
    plans,
    usage,
    bindings,
  };
}
