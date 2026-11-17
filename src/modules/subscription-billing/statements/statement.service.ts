// B-ASS-04 · F2/F3 — regras de estado do demonstrativo (plano §4.4, regras 1–12), "em dia" e créditos (G7).
// Relógio INJETADO (`now`); datas de negócio no fuso de São Paulo (`business-time.ts`). Toda escrita roda dentro de
// `repository.transaction` e relê o estado DEPOIS do lock (corrida fechamento × baixa).

import { deriveBusinessDate } from "../../../config/business-time.js";
import { DEFAULT_DUE_DAYS, GRACE_DAYS } from "./billing.constants.js";
import {
  computeStatement,
  daysInPeriod,
  snapshotOf,
  type StatementComputationInput,
} from "./statement.engine.js";
import { enqueueChargeCancelInTx, enqueueChargeCreateInTx } from "../charges/charge-request.service.js";
import { CHARGE_RULES } from "../charges/charge-rules.js";
import type { OutboxSkipReason } from "../outbox/outbox.types.js";
import type { PaymentMethod } from "../providers/payment/payment-provider.port.js";
import { INVOICE_BACKFILL_CUTOFF } from "../invoices/invoice-intent-rules.js";
import { eagerPlan, refechamentoPlan, reopenLiveCheck } from "./statement-charge-lines.js";
import type { StatementResolveOptions, StatementVersionPin } from "./statement.inputs.js";
import type { StatementRepository, StatementTx } from "./statement.repository.js";
import { describeLiveInvoiceInTx, writeInvoiceCancelIntentInTx, writeInvoiceIssueIntentInTx, type InvoiceIntents } from "./statement-settlement.service.js";
import {
  StatementError,
  type CreditReason,
  type PaymentSource,
  type StatementAuditEvent,
  type StatementHistoryEntry,
  type StatementPayment,
  type SubscriptionCredit,
  type SubscriptionStatement,
} from "./statement.types.js";

/** O que o fechamento precisa saber sobre a organização no período (montado pelo repositório de assinaturas). */
export type StatementInputs =
  | { readonly kind: "skip"; readonly reason: "no_subscription" | "plan_without_price" | "addon_without_price" | "platform_organization" }
  | {
      readonly kind: "ready";
      readonly subscriptionId: string;
      readonly planVersionId: string;
      readonly addonPlanVersionId: string | null;
      readonly computation: Omit<StatementComputationInput, "adjustmentsCents" | "creditsAppliedCents">;
      readonly daysMeasured: number;
      readonly gaps: readonly string[];
      readonly dueDays: number | null;
    };

/** As versões gravadas no snapshot de um demonstrativo reaberto: a de cada trecho do plano base e a do add-on. */
export function pinOf(statement: SubscriptionStatement): StatementVersionPin {
  const planVersionIds = new Set<string>(statement.snapshot.latest?.segments.map((segment) => segment.planVersionId) ?? []);
  if (statement.planVersionId) planVersionIds.add(statement.planVersionId);
  const addonPlanVersionIds = new Set<string>();
  const tracking = statement.snapshot.latest?.tracking;
  if (tracking?.perVehicle) addonPlanVersionIds.add(tracking.perVehicle.addonPlanVersionId);
  for (const segment of tracking?.flatSegments ?? []) addonPlanVersionIds.add(segment.addonPlanVersionId);
  if (statement.addonPlanVersionId) addonPlanVersionIds.add(statement.addonPlanVersionId);
  return { planVersionIds: [...planVersionIds], addonPlanVersionIds: [...addonPlanVersionIds] };
}

export type StatementInputsProvider = {
  /** `pin`: refechar um reaberto usa as MESMAS versões do snapshot — plano base e add-on (G5, §3.4). */
  resolve(tenantId: string, period: string, options: StatementResolveOptions): Promise<StatementInputs>;
};

export type StatementAuditSink = { record(event: StatementAuditEvent): Promise<void> };

/** B-ASS-08c1c (P5, plano §4.1): o provedor de PAGAMENTO ligado na hora do fechamento e o método do perfil — ou `null` (Q1 (a):
 * sem provedor ligado, o fechamento não deixa linha esperando). Avaliado ANTES da transação (v2 §10 D3); nunca faz rede. */
export type ClosingChargeResolver = {
  resolve(tenantId: string): Promise<{ readonly provider: string; readonly method: PaymentMethod } | null>;
};

/** B-ASS-08c2 (plano de abertura §4.1 item 2): para onde vai a intenção de nota AGORA (o provedor da emissão e os ligados).
 * Resolvido ANTES da transação, como o `closingCharge` (v2 §10 D3: a leitura do cofre e da configuração é de plataforma e não
 * entra no `tx` de RLS); nunca faz rede. */
export type InvoiceIntentsResolver = { resolve(): Promise<InvoiceIntents> };

/** B-ASS-08c1c (plano §4.0 item 5): o 4º parâmetro do serviço, um OBJETO de opções. O 08c2 acrescenta `invoiceIntents`: sem ele
 * (os testes que constroem o serviço sem canal), nenhuma intenção de nota é gravada pelo serviço. */
/** B-ASS-08c2 (Emenda 1 §2.2): o que o estorno manual fez com a nota viva (o `data.invoice` da rota). */
export type ManualReversalInvoice = "cancel_requested" | "cancel_in_progress" | "kept_partial_reversal" | "none";

export type StatementChannel = { readonly closingCharge?: ClosingChargeResolver; readonly invoiceIntents?: InvoiceIntentsResolver };

export type CloseOutcome =
  | { readonly kind: "closed"; readonly statement: SubscriptionStatement; readonly alreadyClosed: false }
  | { readonly kind: "already_closed"; readonly statement: SubscriptionStatement; readonly alreadyClosed: true }
  | { readonly kind: "skipped"; readonly reason: string; readonly alreadyClosed: false };

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function firstDayOfNextMonth(period: string): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

function requireReason(value: string | undefined | null, field: string): string {
  const text = (value ?? "").trim();
  if (!text) throw new StatementError(400, `${field}_required`, `${field} is required.`);
  return text.slice(0, 500);
}

function balanceOf(statement: SubscriptionStatement): number {
  return Math.max(0, statement.totalCents - statement.paidCents);
}

const REFECHA_MESSAGES = {
  charge_in_flight: "A charge request is in flight; try again.",
  outbox_needs_review: "The statement has an outbox line awaiting review.",
  charge_already_exists: "The statement already has a live charge.",
} as const;

export class StatementService {
  constructor(
    private readonly repository: StatementRepository,
    private readonly inputs: StatementInputsProvider,
    private readonly audit: StatementAuditSink,
    private readonly channel: StatementChannel = {},
  ) {}

  /**
   * Fecha o mês `period` da organização. `source = "job"` nunca fecha uma linha `reopened` (G4): só o fechamento
   * manual (`POST …/close` com `tenantId`) refecha.
   */
  async close(input: {
    readonly tenantId: string;
    readonly period: string;
    readonly now: Date;
    readonly actorId: string | null;
    readonly source: "job" | "manual";
  }): Promise<CloseOutcome> {
    if (!PERIOD_PATTERN.test(input.period)) {
      throw new StatementError(400, "invalid_period", "period must be YYYY-MM.");
    }
    const today = deriveBusinessDate(input.now);
    if (today < firstDayOfNextMonth(input.period)) {
      throw new StatementError(422, "period_not_ended", "The period has not ended yet (America/Sao_Paulo).");
    }

    // B-ASS-08c1c (P5): o predicado "provedor ligado" e o método do perfil, ANTES da transação (nunca rede dentro dela).
    const closing = (await this.channel.closingCharge?.resolve(input.tenantId)) ?? null;
    const result = await this.repository.transaction(input.tenantId, async (tx) => {
      const { statement: current } = await tx.insertIfAbsentAndLock({ tenantId: input.tenantId, period: input.period });
      if (current.status === "closed" || current.status === "paid" || current.status === "cancelled") {
        return { kind: "already_closed", statement: current, alreadyClosed: true } as const;
      }
      if (current.status === "reopened" && input.source === "job") {
        return { kind: "skipped", reason: "reopened_awaits_manual_close", alreadyClosed: false } as const;
      }

      const resolved = await this.inputs.resolve(input.tenantId, input.period, {
        pin: current.status === "reopened" ? pinOf(current) : null,
      });
      if (resolved.kind === "skip") {
        return { kind: "skipped", reason: resolved.reason, alreadyClosed: false } as const;
      }

      const daysInMonth = daysInPeriod(input.period);
      const computationInput: StatementComputationInput = {
        ...resolved.computation,
        daysInMonth,
        adjustmentsCents: current.adjustmentsCents,
        creditsAppliedCents: current.creditsAppliedCents,
      };
      const computation = computeStatement(computationInput);
      if (computation.totalCents < 0) {
        throw new StatementError(422, "adjustment_exceeds_total", "Adjustments and credits cannot make the total negative.");
      }
      const zeroTotal = computation.totalCents === 0;
      const noUsage = resolved.daysMeasured === 0;
      const historyEntry: StatementHistoryEntry = {
        at: input.now.toISOString(),
        event: "closed",
        by: input.actorId,
        totalCents: computation.totalCents,
      };
      // B-ASS-08c1c (P6, plano §4.2): o refechamento tira do conjunto vivo a `charge_create` do fechamento desfeito, sob a
      // trava e ANTES de gravar; a linha em voo, em conferência ou com cobrança não terminal recusa, e nada é gravado.
      if (current.status === "reopened") {
        const charging = tx.charging();
        const refecha = refechamentoPlan(await charging.listChargeLines(current.id), await charging.listCharges(current.id));
        if (refecha.kind === "refuse") throw new StatementError(refecha.httpStatus, refecha.reason, REFECHA_MESSAGES[refecha.reason]);
        for (const line of refecha.skipPending) await this.#skipLine(charging, line.id, "statement_reopened", [line.status], input.now); // [REFECHA-01]
        for (const line of refecha.skipSentTerminal) await this.#skipLine(charging, line.id, "statement_reopened", [line.status], input.now); // [REFECHA-02]
      }
      const saved = await tx.saveStatement({
        ...current,
        status: zeroTotal ? "paid" : "closed",
        subscriptionId: resolved.subscriptionId,
        planVersionId: resolved.planVersionId,
        addonPlanVersionId: resolved.addonPlanVersionId,
        computation,
        daysInMonth,
        daysMeasured: resolved.daysMeasured,
        totalCents: computation.totalCents,
        dueDate: addDays(today, resolved.dueDays ?? DEFAULT_DUE_DAYS),
        closedAt: input.now,
        closedBy: input.actorId,
        paidAt: zeroTotal ? input.now : current.paidAt,
        snapshot: {
          latest: snapshotOf(computationInput),
          history: [...current.snapshot.history, historyEntry],
          ...(zeroTotal ? { zeroTotal: true as const } : {}),
          ...(noUsage ? { warning: "no_usage_measured" as const } : {}),
          ...(resolved.gaps.length > 0 ? { gaps: [...resolved.gaps] } : {}),
        },
      });
      // B-ASS-08c1c (P5): com o provedor ligado, a cobrança nasce DENTRO desta transação, sobre o `tx` do fechamento (a trava
      // já é dele), com o total recém-gravado. Recusa do D1 ou falha ao gravar → a exceção sobe e o fechamento inteiro desfaz.
      if (closing && saved.status === "closed") await enqueueChargeCreateInTx(tx.charging(), { tenantId: input.tenantId, statementId: saved.id, provider: closing.provider, operator: { method: closing.method }, now: input.now }); // [CLOSE-ENQ]
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.closed",
        entityId: saved.id,
        metadata: { period: input.period, status: saved.status, totalCents: saved.totalCents },
      });
      return { kind: "closed", statement: saved, alreadyClosed: false } as const;
    });

    return result;
  }

  /**
   * A trilha entra NA MESMA transação do movimento (§3.6): se a gravação da trilha falhar, o movimento é desfeito.
   * Dinheiro que anda sem rastro é o defeito que isto fecha. O dublê em memória, sem `recordAudit`, grava no sink.
   */
  private async trail(tx: StatementTx, event: StatementAuditEvent): Promise<void> {
    if (tx.recordAudit) await tx.recordAudit(event);
    else await this.audit.record(event);
  }

  /** B-ASS-08c1c: a `charge_create` vira SKIPPED só se ainda está no status lido (o `from` é o da própria linha). 0 linhas = o
   * claim ou o despacho a pegaram entre a leitura e a escrita: falha fechado, e o movimento desfaz. */
  async #skipLine(charging: ReturnType<StatementTx["charging"]>, lineId: string, reason: OutboxSkipReason, from: Parameters<ReturnType<StatementTx["charging"]>["skipChargeCreate"]>[2], now: Date): Promise<void> {
    const skipped = await charging.skipChargeCreate(lineId, reason, from, now);
    if (!skipped) throw new StatementError(409, "charge_in_flight", "A charge request is in flight; try again.");
  }

  /**
   * B-ASS-08c1c (P7, plano §4.3, D2 (i)) — a marcação imediata, no `tx` do movimento e depois do `saveStatement`: a
   * `charge_create` PENDING vira SKIPPED com o motivo; a SENT com a cobrança CANCELÁVEL ganha o `charge_cancel` pelo núcleo
   * (o marcador CANCEL-CORE), com a trilha no MESMO `tx`. PROCESSING e NEEDS_REVIEW ficam (§9 D-2).
   */
  async #eagerOnMove(tx: StatementTx, statement: SubscriptionStatement, reason: "statement_paid" | "statement_cancelled" | "statement_reopened", now: Date, actorId: string | null = null): Promise<void> {
    const charging = tx.charging();
    const plan = eagerPlan(await charging.listChargeLines(statement.id), await charging.listCharges(statement.id));
    for (const line of plan.skippable) await this.#skipLine(charging, line.id, reason, [line.status], now);
    for (const line of plan.cancelTargets) {
      const enqueued = await enqueueChargeCancelInTx(charging, { tenantId: statement.tenantId, statementId: statement.id, target: { id: line.id, provider: line.provider, externalId: line.externalId! }, now });
      if (enqueued.kind === "already") continue;
      await charging.recordAudit({ actorId, action: "billing_outbox.charge_cancel_requested", entityId: enqueued.row.id, metadata: { statementId: statement.id, kind: enqueued.row.kind, code: reason } });
    }
  }

  /** B-ASS-08c1c (plano §4.3 e §10 item 2): o que a baixa manual faz depois do `saveStatement`, na MESMA transação. A ordem é
   * trava → pagamento → `saveStatement` → marcação imediata (aqui) → a intenção de nota e o índice (B-ASS-08c2, P12) → trilha.
   * Baixa PARCIAL não mexe na cobrança aberta (Q4 (a)) nem grava nota. A linha da nota nasce com `occurred_at = input.now`, o
   * MESMO instante do `paid_at` que o `saveStatement` gravou (A9b do v2): é ele que marca a época da intenção. */
  async #afterManualSettle(tx: StatementTx, before: SubscriptionStatement, statement: SubscriptionStatement, input: { readonly now: Date; readonly actorId: string | null }, intents: InvoiceIntents | undefined): Promise<void> {
    if (statement.status === "paid") await this.#eagerOnMove(tx, statement, "statement_paid", input.now); // [EAGER-01]
    if (intents && before.status !== "paid" && statement.status === "paid") await writeInvoiceIssueIntentInTx(tx, intents, { statement, now: input.now, mode: "auto" }); // [NOTA-01]
  }

  /** Reabrir (regra 5): só sem pagamento, sem cobrança viva e sem nota viva; vira `reopened`. */
  async reopen(input: { readonly tenantId: string; readonly statementId: string; readonly reason: string; readonly actorId: string; readonly now: Date }) {
    const reason = requireReason(input.reason, "reason");
    const saved = await this.repository.transaction(input.tenantId, async (tx) => {
      const current = await this.lockOrNotFound(tx, input.statementId);
      if (current.status !== "closed" && current.status !== "paid") {
        throw new StatementError(422, "statement_not_closed", "Only a closed statement can be reopened.");
      }
      if (current.paidCents > 0) {
        throw new StatementError(422, "statement_has_payments", "A statement with payments cannot be reopened.");
      }
      if (CHARGE_RULES[current.chargeStatus].occupiesSlot) {
        throw new StatementError(422, "statement_charge_pending", "The statement has a live charge.");
      }
      if (current.invoiceStatus === "pending" || current.invoiceStatus === "authorized" || current.invoiceStatus === "cancel_pending") {
        throw new StatementError(422, "invoice_outstanding", "The statement has a live invoice.");
      }
      // D2 (iv), R-OBX-5 e B-ASS-08c1b (P8): linha da fila aguardando revisão → não reabrir; quem decide é a revisão
      // (`/resolve`). A leitura é do MESMO `tx`, depois da trava (A7/A8): uma conexão só.
      if (await tx.hasOutboxNeedsReview(input.statementId)) throw new StatementError(422, "outbox_needs_review", "The statement has an outbox line awaiting review."); // [GUARD-01]
      // B-ASS-08c1c (A3, plano §4.6): a fila e a cobrança pela TABELA, no MESMO `tx` e depois da trava (uma conexão).
      const live = reopenLiveCheck(await tx.charging().listChargeLines(current.id), await tx.charging().listCharges(current.id));
      if (live.inFlight) throw new StatementError(409, "charge_in_flight", "A charge request is in flight; try again."); // [REOPEN-INFLIGHT]
      if (live.liveCharge) throw new StatementError(422, "statement_charge_pending", "The statement has a live charge."); // [REOPEN-LIVE]
      const reopened = await tx.saveStatement({
        ...current,
        status: "reopened",
        reopenedAt: input.now,
        reopenedBy: input.actorId,
        reopenReason: reason,
        snapshot: {
          ...current.snapshot,
          history: [...current.snapshot.history, { at: input.now.toISOString(), event: "reopened", by: input.actorId, totalCents: current.totalCents, note: reason }],
        },
      });
      await this.#eagerOnMove(tx, reopened, "statement_reopened", input.now, input.actorId); // [EAGER-03]
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.reopened",
        entityId: reopened.id,
        metadata: { period: reopened.period, status: reopened.status },
      });
      return reopened;
    });
    return saved;
  }

  /** Baixa manual (R-ST-6): só `closed`; valor > saldo → 422 (crédito é só para dinheiro do provedor — R-C). */
  async recordManualPayment(input: {
    readonly tenantId: string;
    readonly statementId: string;
    readonly amountCents: number;
    readonly method: string | null;
    readonly note: string | null;
    readonly actorId: string;
    readonly now: Date;
  }): Promise<{ statement: SubscriptionStatement; payment: StatementPayment }> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new StatementError(400, "invalid_amount", "amount must be a positive amount of cents.");
    }
    // B-ASS-08c2 (P12): para onde vai a intenção de nota, ANTES da transação (nunca rede nem cofre dentro dela).
    const intents = await this.channel.invoiceIntents?.resolve();
    const result = await this.repository.transaction(input.tenantId, async (tx) => {
      const current = await this.lockOrNotFound(tx, input.statementId);
      if (current.status !== "closed") {
        throw new StatementError(422, "statement_not_closed", "Payments are recorded only on closed statements.");
      }
      if (input.amountCents > balanceOf(current)) {
        throw new StatementError(422, "amount_exceeds_balance", "The amount exceeds the statement balance.");
      }
      const payment = await tx.insertPayment({
        tenantId: input.tenantId,
        statementId: current.id,
        source: "manual",
        externalChargeId: null,
        amountCents: input.amountCents,
        appliedCents: input.amountCents,
        paidAt: input.now,
        method: input.method,
        note: input.note,
        recordedBy: input.actorId,
      });
      const paidCents = current.paidCents + input.amountCents;
      const statement = await tx.saveStatement({
        ...current,
        paidCents,
        status: paidCents >= current.totalCents ? "paid" : "closed",
        paidAt: paidCents >= current.totalCents ? input.now : current.paidAt,
      });
      await this.#afterManualSettle(tx, current, statement, input, intents);
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.payment_recorded",
        entityId: statement.id,
        metadata: { paymentId: payment.id, source: "manual", amountCents: input.amountCents, status: statement.status },
      });
      return { statement, payment };
    });
    return result;
  }

  /** Estorno manual (regra 11): só `source = manual`; motivo obrigatório; `paid` volta a `closed`. B-ASS-08c2 (Emenda 1 §2.2,
   * o §4.7 novo): a nota viva é decidida só pelo que SOBROU pago depois do estorno, sem guard de status do demonstrativo. Devolveu
   * tudo → a intenção de cancelar a nota no MESMO `tx` (com a confirmação do cuidado 1; sem ela, 422 e o estorno desfaz);
   * devolveu só uma parte → nenhuma intenção, a nota fica (o backlog a mostra como `live_on_unpaid`). */
  async reverseManualPayment(input: {
    readonly tenantId: string;
    readonly paymentId: string;
    readonly reason: string;
    readonly actorId: string;
    readonly now: Date;
    readonly confirmInvoiceCancel?: boolean;
  }): Promise<{ statement: SubscriptionStatement; payment: StatementPayment; invoice: ManualReversalInvoice }> {
    const reason = requireReason(input.reason, "reason");
    // B-ASS-08c2 (§4.7): para onde vai a intenção de nota, ANTES da transação (nunca rede nem cofre dentro dela).
    const intents = await this.channel.invoiceIntents?.resolve();
    const result = await this.repository.transaction(input.tenantId, async (tx) => {
      const payment = await tx.lockPayment(input.paymentId);
      if (!payment) throw new StatementError(404, "payment_not_found", "Payment not found.");
      if (payment.source !== "manual") {
        throw new StatementError(422, "use_refund", "Provider payments are reversed only by refund.");
      }
      if (payment.reversedCents >= payment.amountCents) {
        throw new StatementError(422, "payment_already_reversed", "The payment was already reversed.");
      }
      const statement = await this.lockOrNotFound(tx, payment.statementId);
      const reversed = payment.appliedCents - Math.min(payment.reversedCents, payment.appliedCents);
      const savedPayment = await tx.savePayment({
        ...payment,
        reversedCents: payment.amountCents,
        reversedAt: input.now,
        reversedBy: input.actorId,
        reversalReason: reason,
        reversalKind: "manual",
      });
      const paidCents = Math.max(0, statement.paidCents - reversed);
      const savedStatement = await tx.saveStatement({
        ...statement,
        paidCents,
        status: statement.status === "paid" && paidCents < statement.totalCents ? "closed" : statement.status,
        paidAt: paidCents >= statement.totalCents ? statement.paidAt : null,
      });
      // Sem `intents` (o serviço sem canal), nada é lido nem gravado.
      let invoice: ManualReversalInvoice = "none";
      if (intents) {
        const devolveuTudo = savedStatement.paidCents === 0; // [NOTA-PARCIAL]
        if (devolveuTudo) {
          const outcome = await writeInvoiceCancelIntentInTx(tx, intents, { statementId: savedStatement.id, tenantId: input.tenantId, now: input.now, confirm: input.confirmInvoiceCancel === true }); // [NOTA-ESTORNO]
          if (outcome.kind === "confirmation_required") throw new StatementError(422, "invoice_cancel_confirmation_required", "The live invoice will be cancelled; confirm to proceed."); // [NOTA-CONFIRMA]
          invoice = outcome.kind === "enqueued" ? "cancel_requested" : outcome.kind === "in_progress" ? "cancel_in_progress" : "none";
        } else {
          invoice = await describeLiveInvoiceInTx(tx, savedStatement.id);
        }
      }
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.payment_reversed",
        entityId: savedStatement.id,
        metadata: { paymentId: savedPayment.id, status: savedStatement.status, invoice },
      });
      return { statement: savedStatement, payment: savedPayment, invoice };
    });
    return result;
  }

  /** Cancelar (R-ST-12): `closed` sem pagamento e sem nota viva. */
  async cancel(input: { readonly tenantId: string; readonly statementId: string; readonly reason: string; readonly actorId: string; readonly now: Date }) {
    const reason = requireReason(input.reason, "reason");
    const saved = await this.repository.transaction(input.tenantId, async (tx) => {
      const current = await this.lockOrNotFound(tx, input.statementId);
      if (current.status !== "closed") {
        throw new StatementError(422, "statement_not_closed", "Only a closed statement can be cancelled.");
      }
      if (current.paidCents > 0) {
        throw new StatementError(422, "statement_has_payments", "A statement with payments cannot be cancelled.");
      }
      if (current.invoiceStatus === "pending" || current.invoiceStatus === "authorized" || current.invoiceStatus === "cancel_pending") {
        throw new StatementError(422, "invoice_outstanding", "The statement has a live invoice.");
      }
      const cancelled = await tx.saveStatement({
        ...current,
        status: "cancelled",
        cancelledAt: input.now,
        cancelledBy: input.actorId,
        cancelReason: reason,
        snapshot: {
          ...current.snapshot,
          history: [...current.snapshot.history, { at: input.now.toISOString(), event: "cancelled", by: input.actorId, totalCents: current.totalCents, note: reason }],
        },
      });
      await this.#eagerOnMove(tx, cancelled, "statement_cancelled", input.now, input.actorId); // [EAGER-02]
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.cancelled",
        entityId: cancelled.id,
        metadata: { period: cancelled.period, status: cancelled.status },
      });
      return cancelled;
    });
    return saved;
  }

  /**
   * Ajuste manual (regra 6, S9): só `open`/`reopened`, com nota; o total resultante tem de ser >= 0. O ajuste vale
   * no próximo fechamento (o demonstrativo aberto ainda não tem total fechado).
   */
  async adjust(input: { readonly tenantId: string; readonly statementId: string; readonly deltaCents: number; readonly note: string; readonly actorId: string; readonly now: Date }) {
    const note = requireReason(input.note, "note");
    if (!Number.isSafeInteger(input.deltaCents) || input.deltaCents === 0) {
      throw new StatementError(400, "invalid_amount", "delta must be a non-zero amount of cents.");
    }
    const saved = await this.repository.transaction(input.tenantId, async (tx) => {
      const current = await this.lockOrNotFound(tx, input.statementId);
      if (current.status !== "open" && current.status !== "reopened") {
        throw new StatementError(422, "statement_not_adjustable", "Only open or reopened statements can be adjusted.");
      }
      const adjustmentsCents = current.adjustmentsCents + input.deltaCents;
      const projectedTotal = current.computation
        ? current.computation.totalCents - current.computation.adjustmentsCents + adjustmentsCents
        : adjustmentsCents - current.creditsAppliedCents;
      if (projectedTotal < 0) {
        throw new StatementError(422, "adjustment_exceeds_total", "The adjustment would make the total negative.");
      }
      const adjusted = await tx.saveStatement({
        ...current,
        adjustmentsCents,
        adjustmentNote: note,
        snapshot: {
          ...current.snapshot,
          history: [...current.snapshot.history, { at: input.now.toISOString(), event: "adjusted", by: input.actorId, totalCents: projectedTotal, note }],
        },
      });
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.adjusted",
        entityId: adjusted.id,
        metadata: { deltaCents: input.deltaCents, adjustmentsCents: adjusted.adjustmentsCents },
      });
      return adjusted;
    });
    return saved;
  }

  /**
   * Pagamento vindo do PROVEDOR (G7, R-C): nunca descarta dinheiro. `applied = min(amount, saldo)` em demonstrativo
   * `closed`; o resto vira crédito `overpayment`. Em `paid` ou `cancelled`, o valor inteiro vira crédito
   * (`paid_after_manual_settlement` / `paid_after_cancel`). Chamado pelo reconcile do canal (B-ASS-08).
   */
  async recordProviderPayment(input: {
    readonly tenantId: string;
    readonly statementId: string;
    readonly source: Exclude<PaymentSource, "manual">;
    readonly externalChargeId: string;
    readonly amountCents: number;
    readonly method: string | null;
    readonly now: Date;
    /** Conserto da J-530 (D): chamado DENTRO da transação, depois das trilhas, com o demonstrativo antes e depois — é onde a
     * baixa do provedor grava a intenção de nota no mesmo `tx`. */
    readonly afterWrite?: (tx: StatementTx, change: { readonly before: SubscriptionStatement; readonly after: SubscriptionStatement }) => Promise<void>;
  }): Promise<{ statement: SubscriptionStatement; payment: StatementPayment; credit: SubscriptionCredit | null }> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new StatementError(400, "invalid_amount", "amount must be a positive amount of cents.");
    }
    const result = await this.repository.transaction(input.tenantId, async (tx) => {
      // [INTX-09]
      const current = await this.lockOrNotFound(tx, input.statementId);
      let applied = 0;
      let creditReason: CreditReason | null = null;
      if (current.status === "closed") {
        applied = Math.min(input.amountCents, balanceOf(current));
        if (applied < input.amountCents) creditReason = "overpayment";
      } else if (current.status === "paid") {
        creditReason = "paid_after_manual_settlement";
      } else if (current.status === "cancelled") {
        creditReason = "paid_after_cancel";
      } else {
        throw new StatementError(422, "statement_not_closed", "Provider payments arrive only after closing.");
      }
      const payment = await tx.insertPayment({
        tenantId: input.tenantId,
        statementId: current.id,
        source: input.source,
        externalChargeId: input.externalChargeId,
        amountCents: input.amountCents,
        appliedCents: applied,
        paidAt: input.now,
        method: input.method,
        note: null,
        recordedBy: null,
      });
      const paidCents = current.paidCents + applied;
      const statement = applied > 0
        ? await tx.saveStatement({
            ...current,
            paidCents,
            chargeStatus: "confirmed",
            status: paidCents >= current.totalCents ? "paid" : "closed",
            paidAt: paidCents >= current.totalCents ? input.now : current.paidAt,
          })
        : current;
      const credit = creditReason
        ? await tx.insertCredit({
            tenantId: input.tenantId,
            originStatementId: current.id,
            originPaymentId: payment.id,
            amountCents: input.amountCents - applied,
            reason: creditReason,
            createdBy: null,
          })
        : null;
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: null,
        action: "subscription_statement.payment_recorded",
        entityId: statement.id,
        metadata: { paymentId: payment.id, source: input.source, amountCents: input.amountCents, appliedCents: payment.appliedCents },
      });
      if (credit) {
        await this.trail(tx, {
          tenantId: input.tenantId,
          actorId: null,
          action: "subscription_statement.credit_created",
          entityId: credit.id,
          metadata: { statementId: statement.id, amountCents: credit.amountCents, reason: credit.reason },
        });
      }
      if (input.afterWrite) await input.afterWrite(tx, { before: current, after: statement });
      return { statement, payment, credit };
    });
    return result;
  }

  /** Aplicar crédito a um demonstrativo aberto (G7): entra como `credits_applied` no próximo fechamento. */
  async applyCredit(input: { readonly tenantId: string; readonly creditId: string; readonly statementId: string; readonly actorId: string; readonly now: Date }) {
    const result = await this.repository.transaction(input.tenantId, async (tx) => {
      const credit = await tx.lockCredit(input.creditId);
      if (!credit) throw new StatementError(404, "credit_not_found", "Credit not found.");
      if (credit.status !== "open") throw new StatementError(422, "credit_not_open", "Only open credits can be applied.");
      const statement = await this.lockOrNotFound(tx, input.statementId);
      if (statement.status !== "open" && statement.status !== "reopened") {
        throw new StatementError(422, "statement_not_adjustable", "Credits apply only to open or reopened statements.");
      }
      const savedStatement = await tx.saveStatement({
        ...statement,
        creditsAppliedCents: statement.creditsAppliedCents + credit.amountCents,
        snapshot: {
          ...statement.snapshot,
          history: [...statement.snapshot.history, { at: input.now.toISOString(), event: "credit_applied", by: input.actorId, totalCents: statement.totalCents }],
        },
      });
      const savedCredit = await tx.saveCredit({ ...credit, status: "applied", appliedToStatementId: statement.id, resolvedBy: input.actorId });
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.credit_applied",
        entityId: savedStatement.id,
        metadata: { creditId: savedCredit.id, amountCents: savedCredit.amountCents },
      });
      return { statement: savedStatement, credit: savedCredit };
    });
    return result;
  }

  /** Baixa do crédito como perda (G7): exige motivo. */
  async writeOffCredit(input: { readonly tenantId: string; readonly creditId: string; readonly note: string; readonly actorId: string }) {
    const note = requireReason(input.note, "note");
    const saved = await this.repository.transaction(input.tenantId, async (tx) => {
      const credit = await tx.lockCredit(input.creditId);
      if (!credit) throw new StatementError(404, "credit_not_found", "Credit not found.");
      if (credit.status !== "open") throw new StatementError(422, "credit_not_open", "Only open credits can be written off.");
      const writtenOff = await tx.saveCredit({ ...credit, status: "written_off", resolvedBy: input.actorId, resolutionNote: note });
      // Baixa de crédito é movimento de dinheiro: entra na trilha (só id, origem e centavos — a nota não entra).
      await this.trail(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "subscription_statement.credit_written_off",
        entityId: writtenOff.originStatementId,
        metadata: { creditId: writtenOff.id, amountCents: writtenOff.amountCents },
      });
      return writtenOff;
    });
    return saved;
  }

  /**
   * B-ASS-08c2 (plano §4.5) — a varredura de recuperação da nota numa organização: os demonstrativos pagos desde o corte do dono
   * que ficaram sem intenção de nota da época (a baixa manual de antes do 08c2, por exemplo). A consulta ENCONTRA; cada um é
   * travado PRIMEIRO, numa transação própria, e a regra decide sob a trava (a releitura vê a baixa que commitou no meio). O
   * INSERT na fila vem depois da trava; a linha nasce com `occurred_at = now`, e a época fica com a sua intenção.
   */
  async recoverInvoiceIntents(tenantId: string, now: Date): Promise<{ readonly inserted: number }> {
    const intents = await this.channel.invoiceIntents?.resolve();
    if (!intents) return { inserted: 0 };
    const cutoff = INVOICE_BACKFILL_CUTOFF; // [SWEEP-CUT]
    let inserted = 0;
    for (const statementId of await this.repository.listInvoiceIntentCandidates(tenantId, cutoff)) {
      const outcome = await this.repository.transaction(tenantId, async (tx) => {
        const statement = await this.lockOrNotFound(tx, statementId); // [SWEEP-LOCK]
        return writeInvoiceIssueIntentInTx(tx, intents, { statement, now, mode: "auto", cutoff });
      });
      if (outcome.kind === "created") inserted += 1;
    }
    return { inserted };
  }

  /**
   * B-ASS-08c2 (P16, plano §4.9) — o operador pede a nota de um demonstrativo pago: a reemissão depois da rejeição, ou a que a
   * automática não criou. A intenção é resolvida ANTES da transação; o demonstrativo é travado PRIMEIRO (o id de outra organização
   * dá 404 pela RLS, e nada é gravado), e a MESMA função da baixa decide sob a trava, no modo `operator` (a linha em conferência
   * barra; a época, não). O índice nasce por ela, depois da trava e com a organização da linha travada.
   */
  async requestInvoiceIssue(input: { readonly tenantId: string; readonly statementId: string; readonly actorId: string; readonly now: Date }): Promise<{ readonly statementId: string; readonly seq: number; readonly providerDisabled: boolean }> {
    const intents = await this.channel.invoiceIntents?.resolve();
    if (!intents) throw new Error("invoice_intent_tx_unsupported");
    const outcome = await this.repository.transaction(input.tenantId, async (tx) => {
      const statement = await this.lockOrNotFound(tx, input.statementId); // [INVOICE-LOCK]
      return writeInvoiceIssueIntentInTx(tx, intents, { statement, now: input.now, mode: "operator" });
    });
    if (outcome.kind === "created") return { statementId: input.statementId, seq: outcome.seq, providerDisabled: outcome.providerDisabled };
    switch (outcome.reason) {
      case "not_paid":
      case "zero_total":
        throw new StatementError(422, "statement_not_paid", "Only a paid statement can have its invoice requested.");
      case "live_invoice":
        throw new StatementError(422, "invoice_already_live", "The statement already has a live invoice.");
      case "in_flight":
      case "in_review":
        throw new StatementError(422, "invoice_issue_pending", "An invoice request is in flight or awaiting review.");
      case "epoch_has_intent":
      case "before_cutoff":
        // O modo `operator` não pergunta a época nem o corte: chegar aqui é defeito, e falha fechado.
        throw new Error(`invoice_request_unexpected_${outcome.reason}`);
    }
  }

  private async lockOrNotFound(tx: StatementTx, statementId: string): Promise<SubscriptionStatement> {
    const statement = await tx.lockById(statementId);
    if (!statement) throw new StatementError(404, "statement_not_found", "Statement not found.");
    return statement;
  }
}

/**
 * "Em dia" (regra 3, G9, D3): falso se existe demonstrativo `closed` com saldo e `due_date + grace < hoje`, ou com
 * `charge_status = charged_back`. `open`/`reopened`/`paid`/`cancelled` não contam por vencimento; `chargeback_disputed`
 * não derruba. Sem demonstrativo = em dia.
 */
export function upToDateStatus(
  statements: readonly SubscriptionStatement[],
  now: Date,
): { readonly upToDate: boolean; readonly overdueSince: string | null } {
  const today = deriveBusinessDate(now);
  let overdueSince: string | null = null;
  let upToDate = true;
  for (const statement of statements) {
    if (statement.chargeStatus === "charged_back") {
      upToDate = false;
      overdueSince = overdueSince ?? statement.dueDate;
      continue;
    }
    if (statement.status !== "closed" || statement.dueDate === null) continue;
    if (statement.paidCents >= statement.totalCents) continue;
    if (addDays(statement.dueDate, GRACE_DAYS) < today) {
      upToDate = false;
      if (overdueSince === null || statement.dueDate < overdueSince) overdueSince = statement.dueDate;
    }
  }
  return { upToDate, overdueSince };
}
