import { createHash, randomUUID } from "node:crypto";

import {
  SyncActionAlreadyClaimedError,
  findCompatibleSyncReceipts,
  issueSyncClaim,
  type ClaimMobileActionReceiptInput,
  type SyncClaim,
  type SyncReceiptLookup,
} from "./expense-sync.js";
import type {
  CompleteMobileActionReceiptInput,
  CountExpenseEventsInput,
  CreateExpenseEventInput,
  CreateExpenseItemInput,
  CreateExpenseReportInput,
  ExpenseEvent,
  ExpenseItem,
  ExpensePolicy,
  ExpenseReport,
  FindExpenseEventInput,
  ListExpenseReportsInput,
  ListResult,
  MobileActionReceipt,
  UpdateExpenseReportInput,
} from "./expense-management.types.js";

/** Operações de domínio de despesa — as mesmas fora e dentro da transação de sync. */
export interface ExpenseDomainRepository {
  listPolicies(input: { readonly tenantId: string; readonly limit: number; readonly offset: number }): Promise<ListResult<ExpensePolicy>>;
  listReports(input: ListExpenseReportsInput): Promise<ListResult<ExpenseReport>>;
  getReport(input: { readonly tenantId: string; readonly reportId: string }): Promise<ExpenseReport | undefined>;
  createReport(input: CreateExpenseReportInput): Promise<ExpenseReport>;
  updateReport(input: UpdateExpenseReportInput): Promise<ExpenseReport>;
  addItem(input: CreateExpenseItemInput): Promise<ExpenseItem>;
  submitReport(input: { readonly tenantId: string; readonly reportId: string; readonly submittedAt: Date }): Promise<ExpenseReport>;
  createEvent(input: CreateExpenseEventInput): Promise<ExpenseEvent>;
}

/**
 * B-O6R-03a — repositório LIGADO a uma transação de sync. Só existe dentro de `withSyncTransaction`: claim,
 * efeito, recibo e eventos usam a mesma transação. Não tem `withSyncTransaction` — a rotina interna nunca abre
 * transação aninhada nem readquire a fila da memória (v2 §4.3).
 */
export interface ExpenseSyncTransactionRepository extends ExpenseDomainRepository {
  /** Busca EXATA pela chave gravada (crua do legado ou K2t). */
  findMobileActionReceipt(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<MobileActionReceipt | undefined>;
  /** Lookup compatível: chave crua E K2t do mesmo id externo, origem discriminada pela busca. */
  findSyncActionReceipts(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<SyncReceiptLookup>;
  /** PRIMEIRA escrita da transação: INSERT puro, status processed, resultado nulo transitório. Colisão → SyncActionAlreadyClaimedError. */
  claimMobileActionReceipt(input: ClaimMobileActionReceiptInput): Promise<SyncClaim>;
  /** Completa o recibo do claim desta transação com o resultado, antes do commit. */
  completeMobileActionReceipt(claim: SyncClaim, completion: CompleteMobileActionReceiptInput): Promise<void>;
  /** Prova de replay: tenant + ATOR + agregado + tipo + hash — o ator é obrigatório no predicado. */
  findExpenseEvent(input: FindExpenseEventInput): Promise<ExpenseEvent | undefined>;
  countExpenseEvents(input: CountExpenseEventsInput): Promise<number>;
  /** Relatório ORIGINAL de um recibo, no tenant: create/submit → resultRef; item → item persistido → relatório. */
  findSyncReceiptAggregate(input: { readonly tenantId: string; readonly receipt: MobileActionReceipt }): Promise<string | undefined>;
}

export interface ExpenseManagementRepository extends ExpenseDomainRepository {
  /** Uma transação tenant-scoped por ação de sync; o callback recebe o repositório ligado a ela. Throw = rollback de tudo. */
  withSyncTransaction<T>(tenantId: string, work: (repository: ExpenseSyncTransactionRepository) => Promise<T>): Promise<T>;
  reset?(): void;
}

type MemorySnapshot = {
  readonly policies: Map<string, ExpensePolicy>;
  readonly reports: Map<string, ExpenseReport>;
  readonly items: Map<string, ExpenseItem>;
  readonly receipts: Map<string, MobileActionReceipt>;
  readonly events: Map<string, ExpenseEvent>;
};

export class InMemoryExpenseManagementRepository implements ExpenseManagementRepository, ExpenseSyncTransactionRepository {
  private readonly policies = new Map<string, ExpensePolicy>();
  private readonly reports = new Map<string, ExpenseReport>();
  private readonly items = new Map<string, ExpenseItem>();
  private readonly receipts = new Map<string, MobileActionReceipt>();
  private readonly events = new Map<string, ExpenseEvent>();
  // B-O6R-03a (v2 §4.3, B5/M14) — fila por instância: transações de sync em memória são SERIALIZADAS. Sem ela, o
  // restore do snapshot de uma transação que falha apagaria o commit de outra que rodou no meio.
  private syncQueue: Promise<void> = Promise.resolve();

  async withSyncTransaction<T>(_tenantId: string, work: (repository: ExpenseSyncTransactionRepository) => Promise<T>): Promise<T> {
    const previous = this.syncQueue;
    let release!: () => void;
    this.syncQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    const snapshot = this.snapshot();
    try {
      return await work(this);
    } catch (error) {
      this.restore(snapshot);
      throw error;
    } finally {
      release();
    }
  }

  async listPolicies(input: { readonly tenantId: string; readonly limit: number; readonly offset: number }): Promise<ListResult<ExpensePolicy>> {
    this.ensureDefaultPolicy(input.tenantId);
    const items = [...this.policies.values()]
      .filter((policy) => policy.tenantId === input.tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return paginate(items, input.limit, input.offset);
  }

  async listReports(input: ListExpenseReportsInput): Promise<ListResult<ExpenseReport>> {
    const items = this.sortedReports()
      .filter((report) => report.tenantId === input.tenantId)
      .filter((report) => !input.employeeUserId || report.employeeUserId === input.employeeUserId)
      .filter((report) => !input.status || report.status === input.status);

    return paginate(items, input.limit, input.offset);
  }

  async getReport(input: { readonly tenantId: string; readonly reportId: string }): Promise<ExpenseReport | undefined> {
    const report = this.reports.get(input.reportId);
    if (!report || report.tenantId !== input.tenantId) return undefined;

    return this.attachItems(report);
  }

  async createReport(input: CreateExpenseReportInput): Promise<ExpenseReport> {
    const now = new Date();
    const report: ExpenseReport = {
      id: randomUUID(),
      tenantId: input.tenantId,
      employeeUserId: input.employeeUserId,
      status: "draft",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      origin: input.origin,
      workOrderId: input.workOrderId,
      projectId: input.projectId,
      costCenter: input.costCenter,
      city: input.city,
      advanceAmount: input.advanceAmount,
      totalAmount: 0,
      reimbursementAmount: 0,
      currency: input.currency,
      policyVersion: input.policyVersion,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      items: [],
    };

    this.reports.set(report.id, report);

    return report;
  }

  async updateReport(input: UpdateExpenseReportInput): Promise<ExpenseReport> {
    const current = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!current) throw new Error("Report not found.");

    const updated = this.recalculate({
      ...current,
      periodStart: input.periodStart ?? current.periodStart,
      periodEnd: input.periodEnd ?? current.periodEnd,
      origin: input.origin ?? current.origin,
      workOrderId: input.workOrderId ?? current.workOrderId,
      projectId: input.projectId ?? current.projectId,
      costCenter: input.costCenter ?? current.costCenter,
      city: input.city ?? current.city,
      advanceAmount: input.advanceAmount ?? current.advanceAmount,
      policyVersion: input.policyVersion ?? current.policyVersion,
      updatedAt: new Date(),
    });

    this.reports.set(updated.id, { ...updated, items: [] });

    return updated;
  }

  async addItem(input: CreateExpenseItemInput): Promise<ExpenseItem> {
    const report = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!report) throw new Error("Report not found.");

    const now = new Date();
    const item: ExpenseItem = {
      id: randomUUID(),
      tenantId: input.tenantId,
      reportId: input.reportId,
      categoryKey: input.categoryKey,
      spentAt: input.spentAt,
      city: input.city,
      vendorName: input.vendorName,
      amount: input.amount,
      currency: input.currency,
      km: input.km,
      notes: input.notes,
      policyFlags: input.policyFlags,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);
    const updated = this.recalculate({ ...report, items: [...report.items, item], updatedAt: now });
    this.reports.set(updated.id, { ...updated, items: [] });

    return item;
  }

  async submitReport(input: { readonly tenantId: string; readonly reportId: string; readonly submittedAt: Date }): Promise<ExpenseReport> {
    const report = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!report) throw new Error("Report not found.");
    const updated = {
      ...report,
      status: "submitted" as const,
      submittedAt: input.submittedAt,
      updatedAt: input.submittedAt,
    };
    this.reports.set(updated.id, { ...updated, items: [] });

    return updated;
  }

  async findMobileActionReceipt(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<MobileActionReceipt | undefined> {
    const receipt = this.receipts.get(receiptKey(input.tenantId, input.clientActionId));
    return receipt?.tenantId === input.tenantId ? receipt : undefined;
  }

  findSyncActionReceipts(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<SyncReceiptLookup> {
    return findCompatibleSyncReceipts((exact) => this.findMobileActionReceipt(exact), input);
  }

  async claimMobileActionReceipt(input: ClaimMobileActionReceiptInput): Promise<SyncClaim> {
    const key = receiptKey(input.tenantId, input.receiptKey);
    if (this.receipts.has(key)) throw new SyncActionAlreadyClaimedError(input.receiptKey);

    this.receipts.set(key, {
      tenantId: input.tenantId,
      clientActionId: input.receiptKey,
      actorUserId: input.actorUserId,
      actionType: input.actionType,
      status: "processed",
      resultRef: undefined,
      processedAt: undefined,
      createdAt: new Date(),
    });

    return issueSyncClaim(input);
  }

  async completeMobileActionReceipt(claim: SyncClaim, completion: CompleteMobileActionReceiptInput): Promise<void> {
    const key = receiptKey(claim.tenantId, claim.receiptKey);
    const pending = this.receipts.get(key);
    if (!pending || pending.actorUserId !== claim.actorUserId || pending.resultRef !== undefined) {
      throw new Error("Sync claim is not pending in this transaction.");
    }

    // objeto NOVO, nunca mutação no lugar: o snapshot da transação guarda a referência antiga.
    this.receipts.set(key, { ...pending, resultRef: completion.resultRef, processedAt: completion.processedAt });
  }

  async findExpenseEvent(input: FindExpenseEventInput): Promise<ExpenseEvent | undefined> {
    return [...this.events.values()].find(
      (event) =>
        event.tenantId === input.tenantId &&
        event.actorUserId === input.actorUserId &&
        event.aggregateId === input.aggregateId &&
        event.eventType === input.eventType &&
        event.payloadHash === input.payloadHash,
    );
  }

  async countExpenseEvents(input: CountExpenseEventsInput): Promise<number> {
    return [...this.events.values()].filter(
      (event) =>
        event.tenantId === input.tenantId &&
        event.actorUserId === input.actorUserId &&
        event.aggregateId === input.aggregateId &&
        event.eventType === input.eventType,
    ).length;
  }

  async findSyncReceiptAggregate(input: { readonly tenantId: string; readonly receipt: MobileActionReceipt }): Promise<string | undefined> {
    const resultRef = input.receipt.resultRef;
    if (!resultRef) return undefined;

    if (input.receipt.actionType === "expense_item.create") {
      const item = this.items.get(resultRef);
      return item && item.tenantId === input.tenantId ? item.reportId : undefined;
    }

    const report = this.reports.get(resultRef);
    return report && report.tenantId === input.tenantId ? report.id : undefined;
  }

  async createEvent(input: CreateExpenseEventInput): Promise<ExpenseEvent> {
    const event: ExpenseEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      actorUserId: input.actorUserId,
      createdAt: new Date(),
    };
    this.events.set(event.id, event);

    return event;
  }

  /** Só para testes: os eventos gravados, para contagem escopada. */
  listEventsForTests(tenantId: string): ExpenseEvent[] {
    return [...this.events.values()].filter((event) => event.tenantId === tenantId);
  }

  /** Só para testes: os recibos gravados, para contagem escopada. */
  listReceiptsForTests(tenantId: string): MobileActionReceipt[] {
    return [...this.receipts.values()].filter((receipt) => receipt.tenantId === tenantId);
  }

  /** Só para testes: o tamanho dos cinco mapas — é o que o rollback em memória precisa restaurar (B5). */
  countsForTests(): { policies: number; reports: number; items: number; receipts: number; events: number } {
    return {
      policies: this.policies.size,
      reports: this.reports.size,
      items: this.items.size,
      receipts: this.receipts.size,
      events: this.events.size,
    };
  }

  reset(): void {
    this.policies.clear();
    this.reports.clear();
    this.items.clear();
    this.receipts.clear();
    this.events.clear();
  }

  private snapshot(): MemorySnapshot {
    return {
      policies: new Map(this.policies),
      reports: new Map(this.reports),
      items: new Map(this.items),
      receipts: new Map(this.receipts),
      events: new Map(this.events),
    };
  }

  private restore(snapshot: MemorySnapshot): void {
    restoreMap(this.policies, snapshot.policies);
    restoreMap(this.reports, snapshot.reports);
    restoreMap(this.items, snapshot.items);
    restoreMap(this.receipts, snapshot.receipts);
    restoreMap(this.events, snapshot.events);
  }

  private sortedReports(): ExpenseReport[] {
    return [...this.reports.values()].map((report) => this.attachItems(report)).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private attachItems(report: ExpenseReport): ExpenseReport {
    const items = [...this.items.values()].filter((item) => item.tenantId === report.tenantId && item.reportId === report.id);
    return this.recalculate({ ...report, items });
  }

  private recalculate(report: ExpenseReport): ExpenseReport {
    const totalAmount = report.items.reduce((sum, item) => sum + item.amount, 0);
    return {
      ...report,
      totalAmount,
      reimbursementAmount: Math.abs(totalAmount - report.advanceAmount),
    };
  }

  private ensureDefaultPolicy(tenantId: string): void {
    const key = `${tenantId}:default`;
    if (this.policies.has(key)) return;

    const now = new Date();
    this.policies.set(key, {
      id: randomUUID(),
      tenantId,
      version: "default",
      name: "Politica padrao de despesas",
      status: "active",
      categoryRules: {},
      limits: {},
      approvalRules: {},
      receiptRules: {},
      effectiveFrom: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export function hashExpensePayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function receiptKey(tenantId: string, clientActionId: string): string {
  return `${tenantId}:${clientActionId}`;
}

function restoreMap<K, V>(target: Map<K, V>, source: ReadonlyMap<K, V>): void {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
}

function paginate<T>(items: readonly T[], limit: number, offset: number): ListResult<T> {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}
