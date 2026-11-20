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
import { isTransactionStartTimeout } from "../../../infra/logging/public-error.js";
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
import { prismaChargeIntentTx } from "../charges/charge-intent.prisma.js";
import { sqlStatusList } from "../charges/charge-rules.js";
import { listByStatementInTx as listChargesByStatementInTx } from "../charges/charges.prisma.js";
import type { SubscriptionStatementCharge } from "../charges/charges.types.js";
import { invoiceLineSqlList, seqOfIdempotencyKey } from "../invoices/invoice-intent-rules.js";
import { LIVE_SQL } from "../invoices/invoices.prisma.js";
import { enqueueInTx, listByStatementInTx as listOutboxByStatementInTx, postgresErrorCode } from "../outbox/outbox.prisma.js";
import { computeStatement, type StatementSnapshot } from "./statement.engine.js";
import type { StatementRuntime } from "./statement.factory.js";
import { RepositoryStatementInputsProvider, type BindingsSource, type UsageSource } from "./statement.inputs-provider.js";
import type { UsageDayRow, VehicleBindingWindow } from "./statement.inputs.js";
import { emptyStatement, INVOICE_SWEEP_LIMIT, type InvoiceBacklogFacts, type LiveInvoiceRef, type StatementRepository, type StatementTx } from "./statement.repository.js";
import { closingMethodOf } from "./statement-charge-lines.js";
import { StatementService, type StatementAuditSink, type StatementChannel } from "./statement.service.js";
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
import { StatementError } from "./statement.types.js";

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
  const self: StatementTx = {
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
          // B2-1: o estorno parcial de um crédito aplicado reduz o valor que continua aplicado (o resto vira outra linha).
          amount: centsToDecimal(credit.amountCents),
          status: credit.status,
          applied_to_statement_id: credit.appliedToStatementId,
          resolved_by: actorColumn(credit.resolvedBy),
          resolution_note: credit.resolutionNote,
        },
      });
      if (updated.count !== 1) throw new Error("credit not found in this organization");
      return mapCredit(await tx.subscriptionCredit.findUniqueOrThrow({ where: { id: credit.id } }));
    },
    async recordAudit(event) {
      if (event.tenantId !== tenantId) throw new Error("audit event for another organization");
      await writeAuditInTx(tx, event);
    },
    // Conserto da J-530 (D/B): a intenção de nota no MESMO `tx` da baixa/reversão (o precedente E8 do pedido de cobrança).
    // Só é chamada DEPOIS da trava do demonstrativo (lockOrNotFound/lockById): o INSERT na fila nunca vem antes dela (§2.1).
    async enqueueOutbox(row, now) {
      if (row.tenantId !== tenantId) throw new Error("outbox row for another organization");
      await enqueueInTx(tx, row, now);
    },
    // A nota VIVA lida da tabela da nota (não do espelho `invoice_status`), com o demonstrativo já travado. No máximo uma
    // por demonstrativo (UNIQUE parcial da M5).
    async findLiveInvoice(statementId) {
      if (!isUuid(statementId)) return undefined;
      const rows = (await tx.$queryRawUnsafe(
        `SELECT provider, seq, status FROM subscription_statement_invoices WHERE statement_id = $1::uuid AND status IN ('pending', 'authorized', 'cancel_pending') ORDER BY seq DESC LIMIT 1`,
        statementId,
      )) as Array<{ provider: string; seq: number; status: LiveInvoiceRef["status"] }>;
      const row = rows[0];
      return row ? { provider: row.provider, seq: Number(row.seq), status: row.status } : undefined;
    },
    // B-ASS-08c2 (plano §4.1 item 5): os fatos da intenção de nota no MESMO `tx`, depois da trava — as linhas `invoice_issue` (a
    // leitura da fila de sempre, filtrada pelo tipo), o maior `seq` da tabela da nota e a nota viva (a MESMA consulta acima).
    async invoiceIntentFacts(statementId) {
      if (!isUuid(statementId)) return { lines: [], maxInvoiceSeq: 0, live: undefined };
      const lines = (await listOutboxByStatementInTx(tx, statementId)).filter((row) => row.kind === "invoice_issue");
      const max = (await tx.$queryRawUnsafe(`SELECT COALESCE(max(seq), 0)::int AS max FROM subscription_statement_invoices WHERE statement_id = $1::uuid`, statementId)) as Array<{ max: number }>;
      return { lines, maxInvoiceSeq: Number(max[0]?.max ?? 0), live: await self.findLiveInvoice!(statementId) };
    },
    // B-ASS-08c1b (P8, A7/A8): a leitura da fila do `reopen`, no MESMO `tx` e depois da trava do demonstrativo (1 conexão).
    async hasOutboxNeedsReview(statementId) {
      if (!isUuid(statementId)) return false;
      const rows = (await tx.$queryRawUnsafe(
        `SELECT 1 FROM billing_outbox WHERE statement_id = $1::uuid AND status = $2 LIMIT 1`,
        statementId,
        "NEEDS_REVIEW",
      )) as unknown[];
      return rows.length > 0;
    },
    // B-ASS-08c1c (plano §4.0 item 1): a cobrança sobre o MESMO `tx` (o `lockStatement` reentra o `FOR UPDATE` que este `tx` já
    // tem, sem esperar). Só é chamada DEPOIS da trava do demonstrativo.
    charging: () => prismaChargeIntentTx(tx, tenantId),
    // B-ASS-08c1c (R2-03, plano §4.7): a tabela de cobranças acompanha o provedor no `tx` do efeito no demonstrativo.
    async syncCharge(statementId, match, status) {
      if (!isUuid(statementId)) return;
      const byExternal = "externalChargeId" in match;
      await tx.$executeRawUnsafe(
        `UPDATE subscription_statement_charges SET status = $3, cancelled_at = CASE WHEN $3 = 'cancelled' THEN COALESCE(cancelled_at, now()) ELSE cancelled_at END
          WHERE tenant_id = $1::uuid AND statement_id = $2::uuid AND (CASE WHEN $4::boolean THEN external_charge_id = $5 ELSE status = $5 END)`,
        tenantId,
        statementId,
        status,
        byExternal,
        byExternal ? match.externalChargeId : match.status,
      );
    },
  };
  return self;
}

/** B-ASS-08c2 (plano §4.14, `P-BILLING-P2028-COMO-400`): a falha de banco do movimento que quer dizer "o demonstrativo está
 * ocupado" — a trava não obtida (55P03, o mesmo helper do pedido de cobrança) ou a transação interativa expirada (P2028). O P2028
 * de INÍCIO de transação (pool esgotado) não é: ele continua o `infra_down` da casa. */
function isStatementBusy(error: unknown): boolean {
  if (postgresErrorCode(error) === "55P03") return true;
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return record.code === "P2028" && !isTransactionStartTimeout(record);
}

/** A linha de `audit_logs` dentro do `tx` corrente: se falhar, a transação do movimento cai junto (fail-closed). */
async function writeAuditInTx(tx: Tx, event: StatementAuditEvent): Promise<void> {
  const [{ EnterpriseAuditLogService }, { AuditLogRepository }] = await Promise.all([
    import("../../core-saas/audit/audit-log.service.js"),
    import("../../core-saas/repositories/audit-log.repository.js"),
  ]);
  await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
    tenantId: event.tenantId,
    actorId: actorColumn(event.actorId),
    actorType: event.actorId === null ? "system" : "user",
    action: event.action,
    resourceType: event.action.startsWith("subscription_billing_profile") ? "tenant_billing_profile" : "subscription_statement",
    resourceId: event.entityId,
    metadata: event.metadata,
  });
}

export class PrismaStatementRepository implements StatementRepository {
  constructor(private readonly client: PrismaClient) {}

  /** B-ASS-08c2 (plano §4.14): a transação já desfez quando o erro chega; só o MAPEAMENTO muda — "ocupado" vira 409
   * `statement_busy` (repetível, o precedente do pedido de cobrança); um erro de regra atravessa igual. */
  async transaction<T>(tenantId: string, work: (tx: StatementTx) => Promise<T>): Promise<T> {
    try {
      return await withTenantRls(this.client, tenantId, (tx) => work(prismaTx(tx, tenantId)));
    } catch (error) {
      if (isStatementBusy(error)) throw new StatementError(409, "statement_busy", "The statement is busy; try again."); // [STMT-BUSY]
      throw error;
    }
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

  /** B-ASS-08c1c (P11b, plano §4.9): a cobrança `pending` que o cliente pode pagar — a da `charge_create` SENT do fechamento
   * VIGENTE (nasceu depois da última reabertura e com o total atual), sem `charge_cancel` vivo. Uma leitura, sem trava. */
  findPayableCharge(tenantId: string, statementId: string): Promise<SubscriptionStatementCharge | undefined> {
    if (!isUuid(statementId)) return Promise.resolve(undefined);
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT c.id FROM subscription_statements s
           JOIN subscription_statement_charges c ON c.statement_id = s.id AND c.tenant_id = s.tenant_id AND c.status IN (${sqlStatusList("payable")})
           JOIN billing_outbox o ON o.statement_id = s.id AND o.tenant_id = s.tenant_id AND o.kind = 'charge_create' AND o.status = 'SENT'
                                AND c.provider = o.provider AND c.external_charge_id = o.external_id
          WHERE s.id = $1::uuid AND s.tenant_id = $2::uuid
            AND (s.reopened_at IS NULL OR o.occurred_at > s.reopened_at) AND (o.payload->>'amountCents')::bigint = round(s.total_amount * 100)::bigint -- [VIEW-VIGENTE]
            AND NOT EXISTS (SELECT 1 FROM billing_outbox k WHERE k.statement_id = s.id AND k.kind = 'charge_cancel' AND k.status IN ('PENDING', 'PROCESSING', 'NEEDS_REVIEW') AND k.payload->>'chargeId' = c.external_charge_id) -- [VIEW-LIVE]
          ORDER BY c.created_at DESC
          LIMIT 1`,
        statementId,
        tenantId,
      )) as Array<{ id: string }>;
      const id = rows[0]?.id;
      if (!id) return undefined;
      return (await listChargesByStatementInTx(tx, statementId)).find((charge) => charge.id === id);
    });
  }

  /** B-ASS-08c2 (plano §4.5): os candidatos da varredura da nota, numa leitura sob a RLS da organização. A vida da nota vem do
   * `LIVE_SQL` e a da linha da tabela `INVOICE_ISSUE_LINE_RULES` (a lista gerada): nenhum literal novo decide. */
  listInvoiceIntentCandidates(tenantId: string, cutoff: Date): Promise<readonly string[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT s.id FROM subscription_statements s
          WHERE s.tenant_id = $1::uuid AND s.status = 'paid' AND s.total_amount > 0 AND s.paid_at >= $2
            AND NOT EXISTS (SELECT 1 FROM subscription_statement_invoices i WHERE i.statement_id = s.id AND i.tenant_id = s.tenant_id AND i.${LIVE_SQL})
            AND NOT EXISTS (SELECT 1 FROM billing_outbox o WHERE o.statement_id = s.id AND o.tenant_id = s.tenant_id AND o.kind = 'invoice_issue'
                              AND (o.status IN (${invoiceLineSqlList("inFlight")})
                                   OR o.occurred_at >= s.paid_at))
          ORDER BY s.paid_at, s.id
          LIMIT ${INVOICE_SWEEP_LIMIT}`,
        tenantId,
        cutoff,
      )) as Array<{ id: string }>;
      return rows.map((row) => row.id);
    });
  }

  /** B-ASS-08c2 (plano §4.9): o backlog da nota, UMA leitura sob `withTenantRls` (sem trava): os `paid`, mais os não pagos com
   * nota viva (pela MESMA `LIVE_SQL`), com a última `invoice_issue` e a última nota de cada um. Quem categoriza é a regra pura. */
  listInvoiceBacklog(tenantId: string): Promise<readonly InvoiceBacklogFacts[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT s.id, s.period, s.status, s.invoice_status, round(s.total_amount * 100)::int AS total_cents, s.paid_at,
                (lv.one IS NOT NULL) AS live,
                ll.status AS line_status, ll.skip_reason AS line_skip_reason, ll.occurred_at AS line_occurred_at, ll.idempotency_key AS line_key, ll.last_error AS line_last_error,
                ln.seq AS invoice_seq, ln.status AS invoice_last_status
           FROM subscription_statements s
           LEFT JOIN LATERAL (SELECT 1 AS one FROM subscription_statement_invoices i WHERE i.statement_id = s.id AND i.tenant_id = s.tenant_id AND i.${LIVE_SQL} LIMIT 1) lv ON true
           LEFT JOIN LATERAL (SELECT o.status, o.skip_reason, o.occurred_at, o.idempotency_key, o.last_error FROM billing_outbox o
                               WHERE o.statement_id = s.id AND o.tenant_id = s.tenant_id AND o.kind = 'invoice_issue'
                               ORDER BY o.occurred_at DESC, o.created_at DESC LIMIT 1) ll ON true
           LEFT JOIN LATERAL (SELECT n.seq, n.status FROM subscription_statement_invoices n
                               WHERE n.statement_id = s.id AND n.tenant_id = s.tenant_id ORDER BY n.seq DESC LIMIT 1) ln ON true
          WHERE s.tenant_id = $1::uuid AND (s.status = 'paid' OR lv.one IS NOT NULL)
          ORDER BY s.period, s.id`,
        tenantId,
      )) as Array<{
        id: string; period: string; status: string; invoice_status: string; total_cents: number; paid_at: Date | null; live: boolean;
        line_status: string | null; line_skip_reason: string | null; line_occurred_at: Date | null; line_key: string | null; line_last_error: string | null;
        invoice_seq: number | null; invoice_last_status: string | null;
      }>;
      return rows.map((row) => ({
        statement: { id: row.id, period: row.period, status: row.status as InvoiceBacklogFacts["statement"]["status"], invoiceStatus: row.invoice_status as InvoiceBacklogFacts["statement"]["invoiceStatus"], totalCents: Number(row.total_cents), paidAt: row.paid_at },
        live: row.live === true,
        lastLine: row.line_status !== null && row.line_key !== null && row.line_occurred_at !== null
          ? { status: row.line_status as NonNullable<InvoiceBacklogFacts["lastLine"]>["status"], skipReason: row.line_skip_reason as NonNullable<InvoiceBacklogFacts["lastLine"]>["skipReason"], occurredAt: row.line_occurred_at, seq: seqOfIdempotencyKey(row.line_key), lastError: row.line_last_error }
          : undefined,
        lastInvoice: row.invoice_seq !== null && row.invoice_last_status !== null ? { seq: Number(row.invoice_seq), status: row.invoice_last_status as NonNullable<InvoiceBacklogFacts["lastInvoice"]>["status"] } : undefined,
      }));
    });
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
    await withTenantRls(this.client, event.tenantId, (tx) => writeAuditInTx(tx, event));
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
  const billingProfiles = new PrismaBillingProfileRepository(prisma);
  // B-ASS-08c1c (P5, plano §4.1): o fechamento enfileira só com o provedor de pagamento LIGADO agora (o MESMO predicado da rota
  // `/charge`: env + cofre + `enabled`), com o método do perfil. Import dinâmico: `vault/` e `outbox/` sem ciclo com `statements/`.
  const channel: StatementChannel = {
    closingCharge: {
      async resolve(tenantId) {
        const [{ createDefaultVaultRuntime }, { paymentProviderOn }] = await Promise.all([import("../vault/vault.factory.js"), import("../outbox/channel-state.js")]);
        const on = await paymentProviderOn(await createDefaultVaultRuntime());
        if (!on) return null;
        return { provider: on.provider, method: closingMethodOf((await billingProfiles.find(tenantId))?.paymentMethod) };
      },
    },
    // B-ASS-08c2 (plano §4.1 item 2): a intenção de nota da baixa manual, do estorno, da varredura e do `/invoice`, pelo MESMO
    // predicado das portas (`invoiceIntentsNow`). Import dinâmico, como o `closingCharge`: `vault/` e `outbox/` sem ciclo.
    invoiceIntents: { resolve: async () => (await import("../outbox/channel-state.js")).invoiceIntentsNow(await (await import("../vault/vault.factory.js")).createDefaultVaultRuntime()) }, // [NOTA-INTENTS]
  };
  return {
    service: new StatementService(repository, inputs, audit, channel),
    repository,
    billingProfiles,
    tenants,
    audit,
    inputs,
    plans,
    usage,
    bindings,
  };
}
