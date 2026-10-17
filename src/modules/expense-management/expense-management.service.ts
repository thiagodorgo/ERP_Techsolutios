import { env } from "../../config/env.js";
import type { Permission } from "../core-saas/permissions/catalog.js";
import {
  InMemoryExpenseManagementRepository,
  hashExpensePayload,
  type ExpenseDomainRepository,
  type ExpenseManagementRepository,
  type ExpenseSyncTransactionRepository,
} from "./expense-management.repository.js";
import {
  ExpenseManagementError,
  type CreateExpenseItemInput,
  type CreateExpenseReportInput,
  type ExpenseActorContext,
  type ExpenseCategory,
  type ExpenseItem,
  type ExpenseReport,
  type ListResult,
  type SyncExpenseActionResult,
  type SyncExpenseActionsResult,
} from "./expense-management.types.js";
import {
  EXPENSE_SYNC_EVENT_TYPE,
  SyncActionAlreadyClaimedError,
  decodeSyncReceiptKey,
  isCompleteSyncReceipt,
  mapTransientSyncFailure,
  parseCreateItemCommand,
  parseCreateReportCommand,
  prepareSyncAction,
  syncBusyError,
  syncCommandReportId,
  type ExpenseSyncCommand,
  type ExpenseSyncConflictCode,
  type PreparedSyncAction,
} from "./expense-sync.js";
import {
  optionalString,
  parseLimit,
  parseNonNegativeNumber,
  parseOffset,
  parseOptionalDate,
  parseOptionalUuid,
  parseReportStatus,
} from "./expense-management.validators.js";

type RawRecord = Record<string, unknown>;

const editableStatuses = new Set(["draft", "returned"]);
const expenseCategories: ExpenseCategory[] = [
  { key: "fuel", label: "Combustivel", receiptRequired: true, defaultLimit: 300 },
  { key: "meal", label: "Alimentacao", receiptRequired: true, defaultLimit: 150 },
  { key: "hotel", label: "Hotel", receiptRequired: true, defaultLimit: 800 },
  { key: "toll", label: "Pedagio", receiptRequired: true },
  { key: "parking", label: "Estacionamento", receiptRequired: true },
  { key: "transport", label: "Transporte", receiptRequired: true },
  { key: "materials", label: "Materiais emergenciais", receiptRequired: true },
  { key: "other", label: "Outros", receiptRequired: false },
];

type SyncEffect = {
  readonly resultRef: string;
  /** relatório ORIGINAL do efeito — agregado do evento de prova (v2 §4.5: o evento de item aponta o relatório) */
  readonly aggregateId: string;
};

export class ExpenseManagementService {
  constructor(private readonly repository: ExpenseManagementRepository) {}

  listPolicies(actor: ExpenseActorContext, query: RawRecord) {
    return this.repository.listPolicies({
      tenantId: actor.tenantId,
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  listCategories(): ListResult<ExpenseCategory> {
    return {
      items: expenseCategories,
      total: expenseCategories.length,
      limit: expenseCategories.length,
      offset: 0,
    };
  }

  listReports(actor: ExpenseActorContext, query: RawRecord) {
    const canReadAll = hasPermission(actor, "expense_report:read");
    return this.repository.listReports({
      tenantId: actor.tenantId,
      employeeUserId: canReadAll ? optionalString(query.employeeUserId ?? query.employee_user_id, 80) : actor.userId,
      status: parseReportStatus(query.status),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  getReport(actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    return this.loadReadableReport(this.repository, actor, reportId);
  }

  async createReport(actor: ExpenseActorContext, body: RawRecord): Promise<ExpenseReport> {
    const input = parseCreateReportCommand(actor, body);

    return this.applyCreateReport(this.repository, actor, input);
  }

  async updateReport(actor: ExpenseActorContext, reportId: string, body: RawRecord): Promise<ExpenseReport> {
    const current = await this.getReport(actor, reportId);
    if (!editableStatuses.has(current.status)) {
      throw new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_editable", "Only draft or returned reports can be updated.");
    }

    const periodStart = parseOptionalDate(body.periodStart ?? body.period_start, "periodStart");
    const periodEnd = parseOptionalDate(body.periodEnd ?? body.period_end, "periodEnd");
    const advanceAmountValue = body.advanceAmount ?? body.advance_amount;
    const updated = await this.repository.updateReport({
      tenantId: actor.tenantId,
      reportId,
      periodStart,
      periodEnd,
      origin: optionalString(body.origin, 80),
      workOrderId: parseOptionalUuid(body.workOrderId ?? body.work_order_id, "workOrderId"),
      projectId: optionalString(body.projectId ?? body.project_id, 120),
      costCenter: optionalString(body.costCenter ?? body.cost_center, 120),
      city: optionalString(body.city, 120),
      advanceAmount: advanceAmountValue === undefined
        ? undefined
        : parseNonNegativeNumber(advanceAmountValue, "advanceAmount"),
      policyVersion: optionalString(body.policyVersion ?? body.policy_version, 80),
    });

    await this.recordEvent(this.repository, actor, updated.id, "expense_report.updated", { status: updated.status });

    return updated;
  }

  async addItem(actor: ExpenseActorContext, reportId: string, body: RawRecord) {
    await this.loadReportReceivingItems(this.repository, actor, reportId);
    const input = parseCreateItemCommand(actor.tenantId, reportId, body);

    return this.insertItem(this.repository, actor, input);
  }

  submitReport(actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    return this.applySubmitReport(this.repository, actor, reportId);
  }

  /**
   * B-O6R-03a (Ω6R-DIN-009) — sync de despesas do app de campo. Por ação, em ordem:
   *   1. valida e normaliza o comando e calcula o fingerprint v2 — SEM tocar o banco (400 antes de qualquer tx);
   *   2. lookup compatível (chave crua do legado + K2t), resolvido sem efeito se a ação já existe;
   *   3. uma transação por ação: repete o lookup, faz o CLAIM como primeira escrita, executa o efeito, completa o
   *      recibo e grava o evento de prova — tudo no mesmo commit;
   *   4. quem perde a corrida na PK relê FORA da transação abortada e resolve; não achou recibo completo → 503.
   * A ação pertence a quem a enviou primeiro (`D-03a-MESMA-CHAVE-OUTRO-ATOR = A`): outro ator recebe conflito.
   * Erro na ação k deixa 1..k-1 confirmadas, como antes; o reenvio delas é reconhecido.
   */
  async syncExpenseActions(actor: ExpenseActorContext, body: RawRecord): Promise<SyncExpenseActionsResult> {
    const actions = body.actions;
    if (!Array.isArray(actions)) {
      throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "invalid_actions", "actions must be an array.");
    }

    const results: SyncExpenseActionResult[] = [];
    for (const action of actions) {
      if (!isRecord(action)) {
        throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "invalid_action", "Each action must be an object.");
      }

      // passo 1 — validação e normalização PURAS: erro sintático sai 400 sem abrir transação (A10).
      const prepared = prepareSyncAction(actor, action);
      results.push(await this.runSyncAction(actor, prepared));
    }

    return { results };
  }

  private async runSyncAction(actor: ExpenseActorContext, prepared: PreparedSyncAction): Promise<SyncExpenseActionResult> {
    try {
      const recorded = await this.repository.withSyncTransaction(actor.tenantId, (repository) =>
        this.resolveRecordedAction(repository, actor, prepared),
      );
      if (recorded) return recorded;

      return await this.repository.withSyncTransaction(actor.tenantId, async (repository) => {
        const concurrent = await this.resolveRecordedAction(repository, actor, prepared);
        if (concurrent) return concurrent;

        const claim = await repository.claimMobileActionReceipt({
          tenantId: actor.tenantId,
          receiptKey: prepared.receiptKey,
          actorUserId: actor.userId,
          actionType: prepared.actionType,
        });
        const effect = await this.applySyncCommand(repository, actor, prepared.command);
        await repository.completeMobileActionReceipt(claim, { resultRef: effect.resultRef, processedAt: new Date() });
        await repository.createEvent({
          tenantId: actor.tenantId,
          aggregateId: effect.aggregateId,
          eventType: EXPENSE_SYNC_EVENT_TYPE,
          payloadHash: prepared.fingerprint,
          actorUserId: actor.userId,
        });

        return syncResult(prepared, "processed", effect.resultRef, false, null);
      });
    } catch (error) {
      if (error instanceof SyncActionAlreadyClaimedError) return this.resolveAfterLostClaim(actor, prepared);
      throw mapTransientSyncFailure(error);
    }
  }

  /** Perdedor da PK: a transação dele já rolou para trás; relê numa transação NOVA e nunca refaz o efeito. */
  private async resolveAfterLostClaim(actor: ExpenseActorContext, prepared: PreparedSyncAction): Promise<SyncExpenseActionResult> {
    let resolved: SyncExpenseActionResult | undefined;
    try {
      resolved = await this.repository.withSyncTransaction(actor.tenantId, (repository) =>
        this.resolveRecordedAction(repository, actor, prepared),
      );
    } catch (error) {
      throw mapTransientSyncFailure(error);
    }
    if (!resolved) throw syncBusyError();

    return resolved;
  }

  /**
   * A ação já tem recibo? Resolve SEM escrita (v2 §2.1, §4.2; v3). `undefined` = ação nova.
   * Ordem fail-closed: dono → ambiguidade → legado → K2t (completo, tipo, agregado original, prova do MESMO ator).
   */
  private async resolveRecordedAction(
    repository: ExpenseSyncTransactionRepository,
    actor: ExpenseActorContext,
    prepared: PreparedSyncAction,
  ): Promise<SyncExpenseActionResult | undefined> {
    const { legacy, current } = await repository.findSyncActionReceipts({
      tenantId: actor.tenantId,
      clientActionId: prepared.clientActionId,
    });
    if (!legacy && !current) return undefined;

    // v3 + D-03a-MESMA-CHAVE-OUTRO-ATOR = A: a ação pertence a quem a enviou primeiro.
    if ((legacy && legacy.actorUserId !== actor.userId) || (current && current.actorUserId !== actor.userId)) {
      return conflict(prepared, "action_owned_by_other_actor", undefined);
    }
    if (legacy && current) return conflict(prepared, "receipt_ambiguous", undefined);

    if (legacy) {
      // O evento antigo hasheava só {type, clientActionId}: não há prova do payload. Responder processed seria
      // autenticação falsa; o pedido atual NUNCA é promovido a prova (M13).
      if (legacy.actionType !== prepared.actionType) return conflict(prepared, "payload_mismatch", legacy.resultRef);
      if (!isCompleteSyncReceipt(legacy)) return conflict(prepared, "receipt_unverifiable", undefined);
      return conflict(prepared, "legacy_payload_unverifiable", legacy.resultRef);
    }

    const receipt = current!;
    if (decodeSyncReceiptKey(receipt.clientActionId) !== prepared.clientActionId) return conflict(prepared, "receipt_unverifiable", undefined);
    if (!isCompleteSyncReceipt(receipt)) return conflict(prepared, "receipt_unverifiable", undefined);
    if (receipt.actionType !== prepared.actionType) return conflict(prepared, "payload_mismatch", receipt.resultRef);

    // O agregado vem do RECIBO e da relação persistida, nunca do novo payload (A13).
    const aggregateId = await repository.findSyncReceiptAggregate({ tenantId: actor.tenantId, receipt });
    if (!aggregateId) return conflict(prepared, "receipt_unverifiable", undefined);
    const requestedReportId = syncCommandReportId(prepared.command);
    if (requestedReportId !== undefined && requestedReportId !== aggregateId) {
      return conflict(prepared, "payload_mismatch", receipt.resultRef);
    }

    const proof = await repository.findExpenseEvent({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      aggregateId,
      eventType: EXPENSE_SYNC_EVENT_TYPE,
      payloadHash: prepared.fingerprint,
    });
    if (!proof) {
      const ownSyncEvents = await repository.countExpenseEvents({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        aggregateId,
        eventType: EXPENSE_SYNC_EVENT_TYPE,
      });
      return ownSyncEvents > 0
        ? conflict(prepared, "payload_mismatch", receipt.resultRef)
        : conflict(prepared, "receipt_unverifiable", undefined);
    }

    // Um hash não concede permissão: a leitura do agregado é conferida AGORA.
    await this.loadReadableReport(repository, actor, aggregateId);

    return syncResult(prepared, "processed", receipt.resultRef, true, null);
  }

  /** Efeito do comando no repositório da transação. Regras de transição só rodam aqui — nunca num replay (A7). */
  private async applySyncCommand(
    repository: ExpenseSyncTransactionRepository,
    actor: ExpenseActorContext,
    command: ExpenseSyncCommand,
  ): Promise<SyncEffect> {
    if (command.type === "expense_report.create") {
      const report = await this.applyCreateReport(repository, actor, command.input);
      return { resultRef: report.id, aggregateId: report.id };
    }
    if (command.type === "expense_item.create") {
      await this.loadReportReceivingItems(repository, actor, command.reportId);
      const item = await this.insertItem(repository, actor, command.input);
      return { resultRef: item.id, aggregateId: item.reportId };
    }

    const report = await this.applySubmitReport(repository, actor, command.reportId);
    return { resultRef: report.id, aggregateId: report.id };
  }

  // ---------- rotinas internas compartilhadas por REST e sync (o repositório decide a transação) ----------

  private async loadReadableReport(repository: ExpenseDomainRepository, actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    const report = await repository.getReport({ tenantId: actor.tenantId, reportId });
    if (!report) throw notFound();
    this.assertCanReadReport(actor, report);

    return report;
  }

  private async loadReportReceivingItems(repository: ExpenseDomainRepository, actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    const current = await this.loadReadableReport(repository, actor, reportId);
    if (!editableStatuses.has(current.status)) {
      throw new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_editable", "Only draft or returned reports can receive new items.");
    }

    return current;
  }

  private async applyCreateReport(repository: ExpenseDomainRepository, actor: ExpenseActorContext, input: CreateExpenseReportInput): Promise<ExpenseReport> {
    const report = await repository.createReport(input);
    await this.recordEvent(repository, actor, report.id, "expense_report.created", { status: report.status });

    return report;
  }

  private async insertItem(repository: ExpenseDomainRepository, actor: ExpenseActorContext, input: CreateExpenseItemInput): Promise<ExpenseItem> {
    const item = await repository.addItem(input);
    await this.recordEvent(repository, actor, input.reportId, "expense_item.created", { itemId: item.id, amount: item.amount });

    return item;
  }

  private async applySubmitReport(repository: ExpenseDomainRepository, actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    const current = await this.loadReadableReport(repository, actor, reportId);
    if (!editableStatuses.has(current.status) && current.status !== "ready_to_submit") {
      throw new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_submittable", "Only draft, returned or ready_to_submit reports can be submitted.");
    }
    if (current.items.length === 0) {
      throw new ExpenseManagementError(422, "EXPENSE_REPORT_INVALID", "empty_report", "At least one expense item is required before submit.");
    }

    const submitted = await repository.submitReport({
      tenantId: actor.tenantId,
      reportId,
      submittedAt: new Date(),
    });
    await this.recordEvent(repository, actor, submitted.id, "expense_report.submitted", { status: submitted.status });

    return submitted;
  }

  private assertCanReadReport(actor: ExpenseActorContext, report: ExpenseReport): void {
    if (hasPermission(actor, "expense_report:read")) return;
    if (hasPermission(actor, "expense_report:read_own") && report.employeeUserId === actor.userId) return;

    throw new ExpenseManagementError(403, "FORBIDDEN", "permission_required", "Report is not visible for this actor.");
  }

  private recordEvent(repository: ExpenseDomainRepository, actor: ExpenseActorContext, aggregateId: string, eventType: string, payload: RawRecord) {
    return repository.createEvent({
      tenantId: actor.tenantId,
      aggregateId,
      eventType,
      payloadHash: hashExpensePayload(payload),
      actorUserId: actor.userId,
    });
  }
}

const memoryRepository = new InMemoryExpenseManagementRepository();
let defaultServicePromise: Promise<ExpenseManagementService> | undefined;

export function createMemoryExpenseManagementService(): ExpenseManagementService {
  return new ExpenseManagementService(memoryRepository);
}

export function getMemoryExpenseManagementRepositoryForTests(): InMemoryExpenseManagementRepository {
  return memoryRepository;
}

export async function createDefaultExpenseManagementService(): Promise<ExpenseManagementService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryExpenseManagementService();
  }

  defaultServicePromise ??= createPrismaExpenseManagementService();

  return defaultServicePromise;
}

export function resetExpenseManagementRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaExpenseManagementService(): Promise<ExpenseManagementService> {
  const { createPrismaExpenseManagementRepository } = await import("./expense-management-prisma.repository.js");
  const repository = await createPrismaExpenseManagementRepository();

  return new ExpenseManagementService(repository);
}

function syncResult(
  prepared: PreparedSyncAction,
  status: SyncExpenseActionResult["status"],
  resultRef: string | undefined,
  replayed: boolean,
  errorCode: ExpenseSyncConflictCode | null,
): SyncExpenseActionResult {
  return { clientActionId: prepared.clientActionId, type: prepared.actionType, status, resultRef, replayed, errorCode };
}

/** Conflito por ação: não aborta o lote, não grava nada, e não altera o recibo original (v2 §4.2). */
function conflict(prepared: PreparedSyncAction, errorCode: ExpenseSyncConflictCode, resultRef: string | undefined): SyncExpenseActionResult {
  return syncResult(prepared, "conflict", resultRef, true, errorCode);
}

function hasPermission(actor: ExpenseActorContext, permission: Permission): boolean {
  return actor.permissions.includes(permission);
}

function notFound(): ExpenseManagementError {
  return new ExpenseManagementError(404, "EXPENSE_NOT_FOUND", "not_found", "Expense report was not found.");
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
