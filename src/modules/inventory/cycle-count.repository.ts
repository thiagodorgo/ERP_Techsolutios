import { randomUUID } from "node:crypto";

import { roundToDecimalPrecision } from "./inventory.calculations.js";
import {
  type ApplyCloseInput,
  type CreateCycleCountInput,
  type CycleCount,
  type CycleCountEntry,
  type CycleCountWithEntries,
  type ListCycleCountsInput,
  type ListCycleCountsResult,
  type RecordEntryCountInput,
} from "./cycle-count.types.js";

export interface CycleCountRepository {
  /** R7.6 — opens a session and materializes the snapshot entries (one per item). */
  createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries>;
  listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult>;
  findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined>;
  findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined>;
  /** Records a counted quantity on one entry; `undefined` when the entry is missing in-tenant. */
  recordEntryCount(input: RecordEntryCountInput): Promise<CycleCountEntry | undefined>;
  /** R7.6 — writes the variance results and moves the session to `concluida`. */
  applyClose(input: ApplyCloseInput): Promise<CycleCountWithEntries | undefined>;
  /** R7.6 — moves an open session to `cancelada`. */
  cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CycleCount | undefined>;
  reset?(): void;
}

export class InMemoryCycleCountRepository implements CycleCountRepository {
  private readonly sessions = new Map<string, CycleCount>();
  private readonly entries = new Map<string, CycleCountEntry>();
  private sequence = 0;
  private readonly order = new Map<string, number>();

  async createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries> {
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

  async recordEntryCount(input: RecordEntryCountInput): Promise<CycleCountEntry | undefined> {
    const entry = this.entries.get(input.entryId);

    if (!entry || entry.tenantId !== input.tenantId || entry.cycleCountId !== input.cycleCountId) {
      return undefined;
    }

    const updated: CycleCountEntry = {
      ...entry,
      countedQuantity: roundToDecimalPrecision(input.countedQuantity),
      updatedAt: new Date(),
    };
    this.entries.set(updated.id, updated);

    return updated;
  }

  async applyClose(input: ApplyCloseInput): Promise<CycleCountWithEntries | undefined> {
    const session = await this.findSession(input.tenantId, input.cycleCountId);
    if (!session) return undefined;

    const now = new Date();
    const resultByEntry = new Map(input.entryResults.map((result) => [result.entryId, result]));

    for (const entry of this.entriesOf(input.tenantId, input.cycleCountId)) {
      const result = resultByEntry.get(entry.id);
      if (!result) continue;

      this.entries.set(entry.id, {
        ...entry,
        variance: roundToDecimalPrecision(result.variance),
        adjustmentMovementId: result.adjustmentMovementId,
        updatedAt: now,
      });
    }

    const closed: CycleCount = { ...session, status: "concluida", updatedBy: input.updatedBy ?? session.updatedBy, updatedAt: now };
    this.sessions.set(closed.id, closed);

    return this.withEntries(closed);
  }

  async cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CycleCount | undefined> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session) return undefined;

    const cancelled: CycleCount = {
      ...session,
      status: "cancelada",
      isActive: false,
      updatedBy: updatedBy ?? session.updatedBy,
      updatedAt: new Date(),
    };
    this.sessions.set(cancelled.id, cancelled);

    return cancelled;
  }

  reset(): void {
    this.sessions.clear();
    this.entries.clear();
    this.order.clear();
    this.sequence = 0;
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
