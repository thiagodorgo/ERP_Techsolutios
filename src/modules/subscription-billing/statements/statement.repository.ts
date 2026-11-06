// B-ASS-04 — porta de persistência do demonstrativo + dublê em memória (F2/F3). O Prisma (F5) implementa a mesma
// porta: `transaction` abre `withTenantRls` e o `lockByPeriod`/`lockById` faz `SELECT … FOR UPDATE` (plano §4.4,
// "corrida fechamento × baixa").

import { randomUUID } from "node:crypto";

import type {
  StatementAuditEvent,
  StatementPayment,
  SubscriptionCredit,
  SubscriptionStatement,
} from "./statement.types.js";

export type NewStatement = Pick<SubscriptionStatement, "tenantId" | "period">;
export type NewPayment = Omit<StatementPayment, "id" | "reversedCents" | "reversedAt" | "reversedBy" | "reversalReason" | "reversalKind">;
export type NewCredit = Omit<SubscriptionCredit, "id" | "status" | "appliedToStatementId" | "resolvedBy" | "resolutionNote" | "createdAt" | "updatedAt">;

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
};

export type StatementRepository = {
  transaction<T>(tenantId: string, work: (tx: StatementTx) => Promise<T>): Promise<T>;
  listStatements(tenantId: string): Promise<readonly SubscriptionStatement[]>;
  findStatement(tenantId: string, statementId: string): Promise<SubscriptionStatement | undefined>;
  listPayments(tenantId: string, statementId: string): Promise<readonly StatementPayment[]>;
  listCredits(tenantId: string): Promise<readonly SubscriptionCredit[]>;
};

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

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async transaction<T>(tenantId: string, work: (tx: StatementTx) => Promise<T>): Promise<T> {
    const previous = this.queues.get(tenantId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    this.queues.set(tenantId, previous.then(() => gate));
    await previous.catch(() => undefined);
    try {
      return await work(this.tx(tenantId));
    } finally {
      release();
    }
  }

  private tx(tenantId: string): StatementTx {
    const self = this;
    const own = <T extends { tenantId: string }>(row: T | undefined): T | undefined =>
      row && row.tenantId === tenantId ? row : undefined;
    return {
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

  /** Só para testes: força o estado da cobrança/nota (o canal do B-ASS-06..08 ainda não existe). */
  setChannelState(statementId: string, patch: { chargeStatus?: SubscriptionStatement["chargeStatus"]; invoiceStatus?: SubscriptionStatement["invoiceStatus"] }) {
    const row = this.statements.get(statementId);
    if (!row) throw new Error("statement not found");
    this.statements.set(statementId, { ...row, ...patch });
  }
}
