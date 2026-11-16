// B-ASS-04 — porta de persistência do demonstrativo + dublê em memória (F2/F3). O Prisma (F5) implementa a mesma
// porta: `transaction` abre `withTenantRls` e o `lockByPeriod`/`lockById` faz `SELECT … FOR UPDATE` (plano §4.4,
// "corrida fechamento × baixa").

import { randomUUID } from "node:crypto";

import type { ChargeIntentAuditEvent, ChargeIntentTx } from "../charges/charge-intent.repository.js";
import { CHARGE_RULES } from "../charges/charge-rules.js";
import type { InMemoryStatementChargeRepository } from "../charges/charges.repository.js";
import type { SubscriptionStatementCharge } from "../charges/charges.types.js";
import { INVOICE_ISSUE_LINE_RULES } from "../invoices/invoice-intent-rules.js";
import type { StatementInvoiceRepository } from "../invoices/invoices.repository.js";
import { LIVE_INVOICE_STATUSES } from "../invoices/invoices.types.js";
import type { InMemoryOutboxRepository, OutboxRepository } from "../outbox/outbox.repository.js";
import { idempotencyKeyOf, type BillingOutboxRow, type NewOutboxRow } from "../outbox/outbox.types.js";
import type { InMemoryStatementRefRepository } from "../webhooks/statement-refs.repository.js";
import type {
  ChargeStatus,
  StatementAuditEvent,
  StatementPayment,
  SubscriptionCredit,
  SubscriptionStatement,
} from "./statement.types.js";

export type NewStatement = Pick<SubscriptionStatement, "tenantId" | "period">;
export type NewPayment = Omit<StatementPayment, "id" | "reversedCents" | "reversedAt" | "reversedBy" | "reversalReason" | "reversalKind">;
export type NewCredit = Omit<SubscriptionCredit, "id" | "status" | "appliedToStatementId" | "resolvedBy" | "resolutionNote" | "createdAt" | "updatedAt">;

/** A nota VIVA do demonstrativo, lida DENTRO da transação, depois da trava do demonstrativo (conserto da J-530, B). */
export type LiveInvoiceRef = { readonly provider: string; readonly seq: number; readonly status: "pending" | "authorized" | "cancel_pending" };

/** B-ASS-08c2 (plano §4.1 item 5): os fatos da intenção de nota, lidos no MESMO `tx` e depois da trava do demonstrativo — as
 * linhas `invoice_issue` da fila, o maior `seq` da tabela da nota (0 sem nota) e a nota viva. */
export type InvoiceIntentFacts = {
  readonly lines: readonly Pick<BillingOutboxRow, "kind" | "status" | "idempotencyKey" | "occurredAt" | "skipReason">[];
  readonly maxInvoiceSeq: number;
  readonly live: LiveInvoiceRef | undefined;
};

/** Operações dentro de UMA transação da organização. */
export type StatementTx = {
  /** `INSERT … ON CONFLICT (tenant_id, period) DO NOTHING` + `SELECT … FOR UPDATE`. */
  insertIfAbsentAndLock(input: NewStatement): Promise<{ statement: SubscriptionStatement; created: boolean }>;
  /** `SELECT … FOR UPDATE` por id; `undefined` se não existe (ou é de outra organização). */
  lockById(statementId: string): Promise<SubscriptionStatement | undefined>;
  saveStatement(statement: SubscriptionStatement): Promise<SubscriptionStatement>;
  insertPayment(input: NewPayment): Promise<StatementPayment>;
  lockPayment(paymentId: string): Promise<StatementPayment | undefined>;
  savePayment(payment: StatementPayment): Promise<StatementPayment>;
  insertCredit(input: NewCredit): Promise<SubscriptionCredit>;
  lockCredit(creditId: string): Promise<SubscriptionCredit | undefined>;
  saveCredit(credit: SubscriptionCredit): Promise<SubscriptionCredit>;
  /** Grava a trilha NA MESMA transação (Prisma). Ausente no dublê: o serviço grava no sink, dentro da fila serializada. */
  recordAudit?(event: StatementAuditEvent): Promise<void>;
  /** Conserto da J-530 (D/B): grava uma linha da outbox NO MESMO `tx` (o precedente E8). Ausente = este `tx` não sustenta a
   * intenção de nota; com `invoiceIntents` configurado, a baixa/reversão falha fechado. */
  enqueueOutbox?(row: NewOutboxRow, now: Date): Promise<void>;
  /** A nota VIVA (`pending`/`authorized`/`cancel_pending`) do demonstrativo, lida da tabela da nota (não do espelho). */
  findLiveInvoice?(statementId: string): Promise<LiveInvoiceRef | undefined>;
  /** B-ASS-08c2 (§4.1 item 5): os fatos da intenção de nota (as linhas, o maior `seq` e a nota viva), no MESMO `tx`. Ausente = este
   * `tx` não sustenta a intenção de nota nova; as funções do settlement falham fechado (`invoice_intent_tx_unsupported`). */
  invoiceIntentFacts?(statementId: string): Promise<InvoiceIntentFacts>;
  /** B-ASS-08c1b (P8, A7/A8) — OBRIGATÓRIO: há linha da fila em `NEEDS_REVIEW` para o demonstrativo? Lida NO MESMO `tx`,
   * depois da trava do demonstrativo (o `reopen` a chama no o marcador GUARD-01). O dublê sem as lojas do canal devolve `false`:
   * não há fila. */
  hasOutboxNeedsReview(statementId: string): Promise<boolean>;
  /** B-ASS-08c1c (plano §4.0 item 1) — OBRIGATÓRIO: as operações da cobrança sobre o MESMO `tx`, depois da trava do
   * demonstrativo (o fechamento enfileira, o refechamento e a marcação imediata leem e escrevem a fila e a tabela de
   * cobranças por aqui). Prisma: `prismaChargeIntentTx(tx, tenantId)`. Dublê: as quatro lojas, ou um "sem canal". */
  charging(): ChargeIntentTx;
  /** B-ASS-08c1c (R2-03, plano §4.7) — OBRIGATÓRIO: a tabela de cobranças acompanha o provedor NA MESMA transação do efeito
   * no demonstrativo. `match` é o id da cobrança no provedor, ou (só a disputa, §9 D-6) as cobranças do demonstrativo num
   * estado. Zero linhas é normal (o registro ainda não gravou). O dublê sem a loja de cobranças não faz nada. */
  syncCharge(statementId: string, match: ChargeSyncMatch, status: ChargeStatus): Promise<void>;
};

/** B-ASS-08c1c (R2-03): qual cobrança da tabela o `syncCharge` acompanha. */
export type ChargeSyncMatch = { readonly externalChargeId: string } | { readonly status: ChargeStatus };

/** As lojas do canal no modo memória, para o dublê sustentar a intenção de nota (conserto da J-530) e a leitura da fila do
 * `reopen` (B-ASS-08c1b, P8). */
export type InMemoryChannelStores = {
  readonly outbox: Pick<OutboxRepository, "enqueue" | "listByStatement"> & Partial<Pick<InMemoryOutboxRepository, "skipPendingChargeCreate" | "skipChargeCreate">>;
  readonly invoices: Pick<StatementInvoiceRepository, "findLive"> & Partial<Pick<StatementInvoiceRepository, "listByStatement">>;
  /** B-ASS-08c1c (plano §4.0 item 2): a tabela de cobranças e o índice. Com as QUATRO lojas o `tx` sustenta a cobrança
   * (`charging()`); com menos, um "sem canal" (lista vazia; toda escrita lança `charge_channel_tx_unsupported`). */
  readonly charges?: InMemoryStatementChargeRepository;
  readonly refs?: InMemoryStatementRefRepository;
};

export type StatementRepository = {
  transaction<T>(tenantId: string, work: (tx: StatementTx) => Promise<T>): Promise<T>;
  listStatements(tenantId: string): Promise<readonly SubscriptionStatement[]>;
  findStatement(tenantId: string, statementId: string): Promise<SubscriptionStatement | undefined>;
  listPayments(tenantId: string, statementId: string): Promise<readonly StatementPayment[]>;
  listCredits(tenantId: string): Promise<readonly SubscriptionCredit[]>;
  /** B-ASS-08c1c (P11b, plano §4.9): a cobrança `pending` da tabela que o cliente pode pagar — a do fechamento VIGENTE (a
   * `charge_create` SENT dela nasceu depois da última reabertura, com o total atual) e sem `charge_cancel` vivo. */
  findPayableCharge(tenantId: string, statementId: string): Promise<SubscriptionStatementCharge | undefined>;
  /** B-ASS-08c2 (plano §4.5): os demonstrativos `paid` com total > 0, pagos desde o `cutoff`, sem nota viva, sem `invoice_issue`
   * em voo e sem `invoice_issue` da época (`occurred_at >= paid_at`), em ordem de `paid_at`, no máximo 200. A consulta ENCONTRA;
   * quem DECIDE é a regra, sob a trava de cada um. */
  listInvoiceIntentCandidates(tenantId: string, cutoff: Date): Promise<readonly string[]>;
};

/** B-ASS-08c2 (plano §4.5): o teto de candidatos por organização e rodada da varredura (o resto sai na rodada seguinte). */
export const INVOICE_SWEEP_LIMIT = 200;

export function emptyStatement(input: NewStatement, now: Date): SubscriptionStatement {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    period: input.period,
    status: "open",
    chargeStatus: "none",
    invoiceStatus: "none",
    subscriptionId: null,
    planVersionId: null,
    addonPlanVersionId: null,
    computation: null,
    daysInMonth: 0,
    daysMeasured: 0,
    totalCents: 0,
    paidCents: 0,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
    adjustmentNote: null,
    dueDate: null,
    closedAt: null,
    closedBy: null,
    reopenedAt: null,
    reopenedBy: null,
    reopenReason: null,
    paidAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    snapshot: { latest: null, history: [] },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Dublê em memória. Serializa as transações por organização (uma fila por `tenantId`), o que reproduz o efeito do
 * `FOR UPDATE` do Prisma: a segunda escrita espera a primeira e relê o estado depois do lock.
 */
export class InMemoryStatementRepository implements StatementRepository {
  private statements = new Map<string, SubscriptionStatement>();
  private payments = new Map<string, StatementPayment>();
  private credits = new Map<string, SubscriptionCredit>();
  private queues = new Map<string, Promise<unknown>>();
  private channel: InMemoryChannelStores | undefined;
  /** B-ASS-08c1c: a trilha das ações de cobrança do dublê (o Prisma grava em `audit_logs` no `tx`). */
  readonly channelAudits: Array<ChargeIntentAuditEvent & { readonly tenantId: string }> = [];

  constructor(private readonly clock: () => Date = () => new Date()) {}

  /** Conserto da J-530: liga o dublê às lojas do canal do modo memória. A partir daí o `tx` tem `enqueueOutbox` e
   * `findLiveInvoice`; as linhas ficam num buffer e só entram na outbox se o trabalho terminar sem erro (o efeito do
   * rollback do Prisma). */
  attachChannelStores(stores: InMemoryChannelStores): void {
    this.channel = stores;
  }

  async transaction<T>(tenantId: string, work: (tx: StatementTx) => Promise<T>): Promise<T> {
    const previous = this.queues.get(tenantId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    this.queues.set(tenantId, previous.then(() => gate));
    await previous.catch(() => undefined);
    try {
      const pending: Array<{ readonly row: NewOutboxRow; readonly now: Date }> = [];
      const result = await work(this.tx(tenantId, pending));
      for (const item of pending) await this.channel!.outbox.enqueue(item.row, item.now);
      return result;
    } finally {
      release();
    }
  }

  private tx(tenantId: string, pending: Array<{ readonly row: NewOutboxRow; readonly now: Date }>): StatementTx {
    const self = this;
    const channel = this.channel;
    const own = <T extends { tenantId: string }>(row: T | undefined): T | undefined =>
      row && row.tenantId === tenantId ? row : undefined;
    const findLiveInvoice = async (statementId: string): Promise<LiveInvoiceRef | undefined> => {
      const live = await channel!.invoices.findLive(tenantId, statementId);
      return live && (live.status === "pending" || live.status === "authorized" || live.status === "cancel_pending")
        ? { provider: live.provider, seq: live.seq, status: live.status }
        : undefined;
    };
    const intent: Pick<StatementTx, "enqueueOutbox" | "findLiveInvoice" | "invoiceIntentFacts"> = channel
      ? {
          async enqueueOutbox(row, now) {
            pending.push({ row, now });
          },
          findLiveInvoice,
          // B-ASS-08c2 (§4.1 item 5): a fila (com as linhas que ESTE `tx` já gravou, como o banco as veria) e a nota.
          async invoiceIntentFacts(statementId) {
            const listInvoices = channel.invoices.listByStatement;
            if (!listInvoices) throw new Error("invoice_intent_tx_unsupported");
            const stored = (await channel.outbox.listByStatement(tenantId, statementId)).filter((row) => row.kind === "invoice_issue");
            const buffered = pending
              .filter((item) => item.row.tenantId === tenantId && item.row.statementId === statementId && item.row.kind === "invoice_issue")
              .map((item) => ({ kind: item.row.kind, status: "PENDING" as const, idempotencyKey: idempotencyKeyOf(item.row.kind, item.row.statementId, item.row.seq), occurredAt: item.now, skipReason: item.row.skipReason ?? null }));
            const invoices = await listInvoices.call(channel.invoices, tenantId, statementId);
            return {
              lines: [...stored, ...buffered],
              maxInvoiceSeq: invoices.reduce((max, invoice) => Math.max(max, invoice.seq), 0),
              live: await findLiveInvoice(statementId),
            };
          },
        }
      : {};
    const charging = this.#charging(tenantId);
    return {
      ...intent,
      charging: () => charging,
      async syncCharge(statementId, match, status) {
        if (!channel?.charges) return;
        await channel.charges.syncByStatement(tenantId, statementId, match, status, self.clock());
      },
      async hasOutboxNeedsReview(statementId) {
        if (!channel) return false;
        return (await channel.outbox.listByStatement(tenantId, statementId)).some((row) => row.status === "NEEDS_REVIEW");
      },
      async insertIfAbsentAndLock(input) {
        const existing = [...self.statements.values()].find(
          (row) => row.tenantId === input.tenantId && row.period === input.period,
        );
        if (existing) return { statement: existing, created: false };
        const created = emptyStatement(input, self.clock());
        self.statements.set(created.id, created);
        return { statement: created, created: true };
      },
      async lockById(statementId) {
        return own(self.statements.get(statementId));
      },
      async saveStatement(statement) {
        const saved = { ...statement, updatedAt: self.clock() };
        self.statements.set(saved.id, saved);
        return saved;
      },
      async insertPayment(input) {
        const payment: StatementPayment = {
          ...input,
          id: randomUUID(),
          reversedCents: 0,
          reversedAt: null,
          reversedBy: null,
          reversalReason: null,
          reversalKind: null,
        };
        self.payments.set(payment.id, payment);
        return payment;
      },
      async lockPayment(paymentId) {
        return own(self.payments.get(paymentId));
      },
      async savePayment(payment) {
        self.payments.set(payment.id, payment);
        return payment;
      },
      async insertCredit(input) {
        const now = self.clock();
        const credit: SubscriptionCredit = {
          ...input,
          id: randomUUID(),
          status: "open",
          appliedToStatementId: null,
          resolvedBy: null,
          resolutionNote: null,
          createdAt: now,
          updatedAt: now,
        };
        self.credits.set(credit.id, credit);
        return credit;
      },
      async lockCredit(creditId) {
        return own(self.credits.get(creditId));
      },
      async saveCredit(credit) {
        const saved = { ...credit, updatedAt: self.clock() };
        self.credits.set(saved.id, saved);
        return saved;
      },
    };
  }

  /** B-ASS-08c1c (plano §4.0 itens 1 e 2): a cobrança sobre o `tx` serializado. SÓ com as QUATRO lojas (fila, nota, cobranças,
   * índice); com menos, o "sem canal": as leituras da fila e das cobranças voltam vazias e toda escrita lança. O dublê não
   * reproduz o rollback destas escritas (escreve direto): a atomicidade é provada nos `-db`. */
  #charging(tenantId: string): ChargeIntentTx {
    const self = this;
    const channel = this.channel;
    const full = channel !== undefined && channel.charges !== undefined && channel.refs !== undefined; // [FOUR-STORES]
    const lockStatement: ChargeIntentTx["lockStatement"] = async (statementId) => {
      const statement = self.statements.get(statementId);
      return statement && statement.tenantId === tenantId
        ? { id: statement.id, status: statement.status, totalCents: statement.totalCents, paidCents: statement.paidCents, dueDate: statement.dueDate }
        : undefined;
    };
    if (!full) {
      const unsupported = async (): Promise<never> => {
        throw new Error("charge_channel_tx_unsupported");
      };
      return {
        lockStatement,
        findLiveCharge: async () => undefined,
        listChargeLines: async () => [],
        listCharges: async () => [],
        putRef: unsupported,
        enqueue: unsupported,
        skipPendingChargeCreate: unsupported,
        skipChargeCreate: unsupported,
        recordAudit: unsupported,
      };
    }
    const { outbox, charges, refs } = channel as Required<InMemoryChannelStores>;
    return {
      lockStatement,
      findLiveCharge: (statementId) => charges.findLive(tenantId, statementId),
      listChargeLines: (statementId) => outbox.listByStatement(tenantId, statementId),
      listCharges: (statementId) => charges.listByStatement(tenantId, statementId),
      async putRef(ref, now) {
        await refs.put(ref, now);
      },
      enqueue: (input, now) => outbox.enqueue(input, now),
      async skipPendingChargeCreate(outboxId, lastError, now) {
        if (!outbox.skipPendingChargeCreate) throw new Error("charge_channel_tx_unsupported");
        return outbox.skipPendingChargeCreate(tenantId, outboxId, lastError, now);
      },
      async skipChargeCreate(outboxId, skipReason, from, now) {
        if (!outbox.skipChargeCreate) throw new Error("charge_channel_tx_unsupported");
        return outbox.skipChargeCreate(tenantId, outboxId, skipReason, from, now);
      },
      async recordAudit(event) {
        self.channelAudits.push({ ...event, tenantId });
      },
    };
  }

  async findPayableCharge(tenantId: string, statementId: string): Promise<SubscriptionStatementCharge | undefined> {
    const channel = this.channel;
    const statement = this.statements.get(statementId);
    if (!channel?.charges || !statement || statement.tenantId !== tenantId) return undefined;
    const lines = await channel.outbox.listByStatement(tenantId, statementId);
    const currentClosing = (current: SubscriptionStatement, line: BillingOutboxRow | undefined) =>
      line !== undefined &&
      (current.reopenedAt === null || line.occurredAt.getTime() > current.reopenedAt.getTime()) &&
      Number(line.payload.amountCents) === current.totalCents;
    const liveCancelFor = (all: readonly BillingOutboxRow[], charge: SubscriptionStatementCharge) =>
      all.some((line) => line.kind === "charge_cancel" && (line.status === "PENDING" || line.status === "PROCESSING" || line.status === "NEEDS_REVIEW") && line.payload.chargeId === charge.externalChargeId);
    for (const charge of await channel.charges.listByStatement(tenantId, statementId)) {
      if (!CHARGE_RULES[charge.status].payable) continue;
      const line = lines.find((candidate) => candidate.kind === "charge_create" && candidate.status === "SENT" && candidate.provider === charge.provider && candidate.externalId === charge.externalChargeId);
      if (!currentClosing(statement, line)) continue; // [VIEW-VIGENTE]
      if (liveCancelFor(lines, charge)) continue; // [VIEW-LIVE]
      return charge;
    }
    return undefined;
  }

  async listStatements(tenantId: string) {
    return [...this.statements.values()]
      .filter((row) => row.tenantId === tenantId)
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async findStatement(tenantId: string, statementId: string) {
    const row = this.statements.get(statementId);
    return row && row.tenantId === tenantId ? row : undefined;
  }

  async listPayments(tenantId: string, statementId: string) {
    return [...this.payments.values()].filter((row) => row.tenantId === tenantId && row.statementId === statementId);
  }

  async listCredits(tenantId: string) {
    return [...this.credits.values()].filter((row) => row.tenantId === tenantId);
  }

  /** B-ASS-08c2 (plano §4.6): as organizações que têm demonstrativo no dublê (a enumeração do modo memória). */
  tenantIds(): readonly string[] {
    return [...new Set([...this.statements.values()].map((row) => row.tenantId))];
  }

  /** B-ASS-08c2 (plano §4.5): a MESMA busca da consulta do Prisma, sobre as lojas do canal. Sem as lojas não há onde olhar a
   * fila nem a nota: falha fechado (a varredura daquela organização falha e as emissões da rodada esperam). */
  async listInvoiceIntentCandidates(tenantId: string, cutoff: Date): Promise<readonly string[]> {
    const channel = this.channel;
    if (!channel) throw new Error("invoice_intent_tx_unsupported");
    const found: SubscriptionStatement[] = [];
    for (const statement of this.statements.values()) {
      if (statement.tenantId !== tenantId || statement.status !== "paid" || statement.totalCents <= 0 || !statement.paidAt || statement.paidAt.getTime() < cutoff.getTime()) continue;
      const live = await channel.invoices.findLive(tenantId, statement.id);
      if (live && (LIVE_INVOICE_STATUSES as readonly string[]).includes(live.status)) continue;
      const lines = (await channel.outbox.listByStatement(tenantId, statement.id)).filter((row) => row.kind === "invoice_issue");
      if (lines.some((row) => INVOICE_ISSUE_LINE_RULES[row.status].inFlight || row.occurredAt.getTime() >= statement.paidAt!.getTime())) continue;
      found.push(statement);
    }
    return found
      .sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime() || a.id.localeCompare(b.id))
      .slice(0, INVOICE_SWEEP_LIMIT)
      .map((row) => row.id);
  }

  /** Só para testes: força o estado da cobrança/nota (o canal do B-ASS-06..08 ainda não existe). */
  setChannelState(statementId: string, patch: { chargeStatus?: SubscriptionStatement["chargeStatus"]; invoiceStatus?: SubscriptionStatement["invoiceStatus"] }) {
    const row = this.statements.get(statementId);
    if (!row) throw new Error("statement not found");
    this.statements.set(statementId, { ...row, ...patch });
  }
}
