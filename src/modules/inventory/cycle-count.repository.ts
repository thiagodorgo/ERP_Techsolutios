import { randomUUID } from "node:crypto";

import { roundToDecimalPrecision } from "./inventory.calculations.js";
import {
  isTerminalCycleCountStatus,
  isWritableCycleCountStatus,
  itemsInOpenSessionError,
  type AbortCloseOutcome,
  type BeginCloseOutcome,
  type CancelOutcome,
  type CreateCycleCountInput,
  type CycleCount,
  type CycleCountEntry,
  type CycleCountWithEntries,
  type FinishCloseOutcome,
  type ListCycleCountsInput,
  type ListCycleCountsResult,
  type RecordEntryCountInput,
  type RecordEntryOutcome,
  type StampEntryInput,
} from "./cycle-count.types.js";

/**
 * B-O6R-04a (Ω6R-DAT-003) — o repositório da contagem. Cada método é UMA transação (no Prisma); as transições de
 * `status` são CAS (`status` esperado no `where`, sob `FOR UPDATE` da sessão) e a escrita em entrada roda sob o
 * lock da sessão. O fechamento é uma máquina de estados `aberta → fechando → concluida`, com saída em toda falha
 * (S-01) e o total da sessão inteira somado no banco (S-02). `applyClose` (o status sem condição) não existe mais.
 */
export interface CycleCountRepository {
  /**
   * R7.6 — opens a session and materializes the snapshot entries (one per item). B-O6R-04a (I9): recusa com
   * `itemsInOpenSessionError(n)` se algum item já está numa sessão `aberta|fechando` da organização.
   */
  createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries>;
  listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult>;
  findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined>;
  findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined>;
  /** V7 — conta uma entrada sob `FOR SHARE` da sessão; em `fechando`, só entrada ainda sem ajuste. */
  recordEntryCount(input: RecordEntryCountInput): Promise<RecordEntryOutcome>;
  /** V6 — sessão `FOR UPDATE`; `aberta` → CAS `fechando` ("started"); `fechando` → "resumed"; senão not_open. */
  beginClose(tenantId: string, cycleCountId: string): Promise<BeginCloseOutcome>;
  /** Dentro da UNIDADE (via porta): trava a sessão ANTES do item (I7). */
  lockSessionForUpdate(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined>;
  /** Releitura da entrada sob o lock da sessão. */
  findEntry(tenantId: string, cycleCountId: string, entryId: string): Promise<CycleCountEntry | undefined>;
  /** Carimbo da unidade (variância + ajuste), na MESMA transação do ajuste. */
  stampEntry(input: StampEntryInput): Promise<void>;
  /** S-01 — `fechando` + 0 carimbos → CAS `aberta` ("reverted"); com carimbos → "kept". */
  abortClose(tenantId: string, cycleCountId: string): Promise<AbortCloseOutcome>;
  /** S-02 — sem pendência: total da sessão inteira (Σ variância carimbada × avg_cost) + CAS `fechando → concluida`. */
  finishClose(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<FinishCloseOutcome>;
  /** V8 — sessão `FOR UPDATE`; `aberta` → CAS; `fechando` só com 0 carimbos; com carimbos → close_in_progress. */
  cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CancelOutcome>;
  reset?(): void;
}

/** Resolvedor do custo médio VIGENTE do item — o total do `finishClose` em memória (S-02). */
export type AvgCostResolver = (tenantId: string, itemId: string) => Promise<number>;

/**
 * Dublê em memória: a MESMA máquina de estados, sem lock (mono-thread). Não prova atomicidade — a prova é a suíte
 * `-db` contra o Postgres; aqui só o contrato.
 */
export class InMemoryCycleCountRepository implements CycleCountRepository {
  private readonly sessions = new Map<string, CycleCount>();
  private readonly entries = new Map<string, CycleCountEntry>();
  private sequence = 0;
  private readonly order = new Map<string, number>();

  constructor(private readonly avgCostOf: AvgCostResolver = async () => 0) {}

  async createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries> {
    const wanted = new Set(input.entries.map((snapshot) => snapshot.itemId));
    const overlapping = new Set(
      [...this.entries.values()]
        .filter((entry) => entry.tenantId === input.tenantId && wanted.has(entry.itemId))
        // I9 pelo lado FECHADO: a sessão segura o item enquanto o status NÃO for terminal (status
        // desconhecido segura — C2-03). A classificação vive só em cycle-count.types.ts.
        .filter((entry) => !isTerminalCycleCountStatus(this.sessions.get(entry.cycleCountId)?.status ?? ""))
        .map((entry) => entry.itemId),
    );
    if (overlapping.size > 0) {
      throw itemsInOpenSessionError(overlapping.size);
    }

    const now = new Date();
    const session: CycleCount = {
      id: randomUUID(),
      tenantId: input.tenantId,
      abcClass: input.abcClass,
      status: "aberta",
      notes: input.notes,
      isActive: true,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    this.sequence += 1;
    this.order.set(session.id, this.sequence);

    for (const snapshot of input.entries) {
      const entry: CycleCountEntry = {
        id: randomUUID(),
        tenantId: input.tenantId,
        cycleCountId: session.id,
        itemId: snapshot.itemId,
        systemQuantity: roundToDecimalPrecision(snapshot.systemQuantity),
        countedQuantity: undefined,
        variance: undefined,
        adjustmentMovementId: undefined,
        createdAt: now,
        updatedAt: now,
      };
      this.entries.set(entry.id, entry);
    }

    return this.withEntries(session);
  }

  async listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult> {
    const filtered = [...this.sessions.values()]
      .filter((session) => session.tenantId === input.tenantId)
      .filter((session) => input.status === undefined || session.status === input.status)
      .filter((session) => input.isActive === undefined || session.isActive === input.isActive)
      .sort((left, right) => (this.order.get(right.id) ?? 0) - (this.order.get(left.id) ?? 0));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    const session = this.sessions.get(cycleCountId);

    return session?.tenantId === tenantId ? session : undefined;
  }

  async findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined> {
    const session = await this.findSession(tenantId, cycleCountId);

    return session ? this.withEntries(session) : undefined;
  }

  async recordEntryCount(input: RecordEntryCountInput): Promise<RecordEntryOutcome> {
    const session = await this.findSession(input.tenantId, input.cycleCountId);
    if (!session) return { status: "not_found" };
    if (!isWritableCycleCountStatus(session.status)) {
      return { status: "not_open", current: session.status };
    }

    const entry = this.entries.get(input.entryId);
    if (!entry || entry.tenantId !== input.tenantId || entry.cycleCountId !== input.cycleCountId) {
      return { status: "entry_not_found" };
    }
    if (session.status === "fechando" && entry.adjustmentMovementId !== undefined) {
      return { status: "entry_adjusted" };
    }

    const updated: CycleCountEntry = {
      ...entry,
      countedQuantity: roundToDecimalPrecision(input.countedQuantity),
      updatedAt: new Date(),
    };
    this.entries.set(updated.id, updated);

    return { status: "ok", entry: updated };
  }

  async beginClose(tenantId: string, cycleCountId: string): Promise<BeginCloseOutcome> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session) return { status: "not_found" };

    if (session.status === "aberta") {
      const closing: CycleCount = { ...session, status: "fechando", updatedAt: new Date() };
      this.sessions.set(closing.id, closing);
      const withEntries = this.withEntries(closing);
      return { status: "started", session: withEntries, entries: withEntries.entries };
    }
    if (session.status === "fechando") {
      const withEntries = this.withEntries(session);
      return { status: "resumed", session: withEntries, entries: withEntries.entries };
    }

    return { status: "not_open", current: session.status };
  }

  async lockSessionForUpdate(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    return this.findSession(tenantId, cycleCountId);
  }

  async findEntry(tenantId: string, cycleCountId: string, entryId: string): Promise<CycleCountEntry | undefined> {
    const entry = this.entries.get(entryId);

    return entry && entry.tenantId === tenantId && entry.cycleCountId === cycleCountId ? entry : undefined;
  }

  async stampEntry(input: StampEntryInput): Promise<void> {
    const entry = await this.findEntry(input.tenantId, input.cycleCountId, input.entryId);
    if (!entry || entry.adjustmentMovementId !== undefined) {
      throw new Error("stampEntry: a entrada não existe ou já foi carimbada.");
    }

    this.entries.set(entry.id, {
      ...entry,
      variance: roundToDecimalPrecision(input.variance),
      adjustmentMovementId: input.adjustmentMovementId,
      updatedAt: new Date(),
    });
  }

  async abortClose(tenantId: string, cycleCountId: string): Promise<AbortCloseOutcome> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session || session.status !== "fechando") {
      return { status: "not_closing", current: session?.status };
    }

    const stamped = this.stampedCount(tenantId, cycleCountId);
    if (stamped > 0) return { status: "kept", stamped };

    this.sessions.set(session.id, { ...session, status: "aberta", updatedAt: new Date() });
    return { status: "reverted" };
  }

  async finishClose(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<FinishCloseOutcome> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session) return { status: "not_found" };
    if (session.status !== "fechando") return { status: "not_open", current: session.status };

    const entries = this.entriesOf(tenantId, cycleCountId);
    const remaining = entries.filter(
      (entry) =>
        entry.countedQuantity !== undefined &&
        entry.countedQuantity !== entry.systemQuantity &&
        entry.adjustmentMovementId === undefined,
    ).length;
    if (remaining > 0) return { status: "pending", remaining };

    let total = 0;
    for (const entry of entries) {
      if (entry.adjustmentMovementId === undefined) continue;
      total += (entry.variance ?? 0) * (await this.avgCostOf(tenantId, entry.itemId));
    }

    const closed: CycleCount = {
      ...session,
      status: "concluida",
      updatedBy: updatedBy ?? session.updatedBy,
      updatedAt: new Date(),
    };
    this.sessions.set(closed.id, closed);

    return { status: "ok", session: this.withEntries(closed), totalVarianceValue: roundToDecimalPrecision(total) };
  }

  async cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CancelOutcome> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session) return { status: "not_found" };
    if (!isWritableCycleCountStatus(session.status)) {
      return { status: "not_open", current: session.status };
    }
    if (session.status === "fechando") {
      const stamped = this.stampedCount(tenantId, cycleCountId);
      if (stamped > 0) return { status: "close_in_progress", stamped };
    }

    const cancelled: CycleCount = {
      ...session,
      status: "cancelada",
      isActive: false,
      updatedBy: updatedBy ?? session.updatedBy,
      updatedAt: new Date(),
    };
    this.sessions.set(cancelled.id, cancelled);

    return { status: "ok", session: cancelled };
  }

  reset(): void {
    this.sessions.clear();
    this.entries.clear();
    this.order.clear();
    this.sequence = 0;
  }

  private stampedCount(tenantId: string, cycleCountId: string): number {
    return this.entriesOf(tenantId, cycleCountId).filter((entry) => entry.adjustmentMovementId !== undefined).length;
  }

  private withEntries(session: CycleCount): CycleCountWithEntries {
    return { ...session, entries: this.entriesOf(session.tenantId, session.id) };
  }

  private entriesOf(tenantId: string, cycleCountId: string): CycleCountEntry[] {
    return [...this.entries.values()]
      .filter((entry) => entry.tenantId === tenantId && entry.cycleCountId === cycleCountId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }
}
