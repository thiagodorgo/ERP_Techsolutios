import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { roundToDecimalPrecision } from "./inventory.calculations.js";
import { getMemoryInventoryRepositoryForTests } from "./inventory.service.js";
import type { InventoryRepository } from "./inventory.repository.js";
import { InMemoryCycleCountRepository, type CycleCountRepository } from "./cycle-count.repository.js";
import {
  CycleCountError,
  cycleCountEntryNotFound,
  cycleCountNotFound,
  cycleCountNotOpen,
  type CloseEntryResult,
  type CycleCount,
  type CycleCountActorContext,
  type CycleCountEntry,
  type CycleCountVarianceReport,
  type CycleCountWithEntries,
  type ListCycleCountsInput,
  type ListCycleCountsResult,
} from "./cycle-count.types.js";
import {
  parseCountedQuantity,
  parseLimit,
  parseOffset,
  parseOptionalAbcClass,
  parseOptionalNotes,
  parseOptionalStatus,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./cycle-count.validators.js";

type RawRecord = Record<string, unknown>;

/** A cycle count never counts more items than this in one session (guard rail). */
const SNAPSHOT_LIMIT = 10_000;

export class CycleCountService {
  constructor(
    private readonly repository: CycleCountRepository,
    private readonly inventory: InventoryRepository,
  ) {}

  /**
   * R7.6 — open a session: snapshot the DERIVED saldo of every ACTIVE item of the
   * chosen `abc_class` (or all active items when null) into one entry each. The
   * snapshot uses the same movement ledger as the stock API, so `system_quantity`
   * is the live saldo at open time.
   */
  async open(actor: CycleCountActorContext, body: RawRecord): Promise<CycleCountWithEntries> {
    const abcClass = parseOptionalAbcClass(body.abc_class ?? body.abcClass);
    const notes = parseOptionalNotes(body.notes);

    const { items } = await this.inventory.listItems({
      tenantId: actor.tenantId,
      isActive: true,
      abcClass,
      limit: SNAPSHOT_LIMIT,
      offset: 0,
    });

    return this.repository.createSession({
      tenantId: actor.tenantId,
      abcClass,
      notes,
      createdBy: actor.userId,
      entries: items.map((item) => ({ itemId: item.id, systemQuantity: item.saldo })),
    });
  }

  async list(actor: CycleCountActorContext, query: RawRecord): Promise<ListCycleCountsResult> {
    const input: ListCycleCountsInput = {
      tenantId: actor.tenantId,
      status: parseOptionalStatus(query.status),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.listSessions(input);
  }

  async get(actor: CycleCountActorContext, cycleCountId: string): Promise<CycleCountWithEntries> {
    const session = await this.repository.findSessionWithEntries(
      actor.tenantId,
      parseRequiredUuid(cycleCountId, "cycleCountId"),
    );

    if (!session) {
      throw cycleCountNotFound();
    }

    return session;
  }

  /** R7.6 — record a counted quantity on one entry of an OPEN session. */
  async recordEntry(
    actor: CycleCountActorContext,
    cycleCountId: string,
    entryId: string,
    body: RawRecord,
  ): Promise<CycleCountEntry> {
    const session = await this.repository.findSession(actor.tenantId, parseRequiredUuid(cycleCountId, "cycleCountId"));

    if (!session) {
      throw cycleCountNotFound();
    }
    if (session.status !== "aberta") {
      throw cycleCountNotOpen(session.status);
    }

    const updated = await this.repository.recordEntryCount({
      tenantId: actor.tenantId,
      cycleCountId: session.id,
      entryId: parseRequiredUuid(entryId, "entryId"),
      countedQuantity: parseCountedQuantity(body.counted_quantity ?? body.countedQuantity),
      updatedBy: actor.userId,
    });

    if (!updated) {
      throw cycleCountEntryNotFound();
    }

    return updated;
  }

  /**
   * R7.6 — close the session: for each entry whose counted quantity differs from
   * the snapshot, compute the variance (counted − system) and generate a REAL
   * `ajuste` StockMovement through the F7a transactional movement flow (saldo check
   * + insert atomic), linking the movement back to the session. Entries are then
   * stamped with their variance + movement id and the session moves to `concluida`.
   * Returns the variance report (the closed session + total variance value).
   */
  async close(actor: CycleCountActorContext, cycleCountId: string): Promise<CycleCountVarianceReport> {
    const session = await this.repository.findSessionWithEntries(
      actor.tenantId,
      parseRequiredUuid(cycleCountId, "cycleCountId"),
    );

    if (!session) {
      throw cycleCountNotFound();
    }
    if (session.status !== "aberta") {
      throw cycleCountNotOpen(session.status);
    }

    const entryResults: CloseEntryResult[] = [];
    let totalVarianceValue = 0;

    for (const entry of session.entries) {
      if (entry.countedQuantity === undefined) continue;

      const variance = roundToDecimalPrecision(entry.countedQuantity - entry.systemQuantity);
      if (variance === 0) continue;

      // Generate the ajuste through the F7a flow (signed variance is applied as-is
      // for an ajuste). The reason + cycle_count_id link it back to this session.
      const movement = await this.inventory.createMovement({
        tenantId: actor.tenantId,
        itemId: entry.itemId,
        type: "ajuste",
        quantidadeSinalizada: variance,
        reason: `contagem cíclica ${session.id}`,
        cycleCountId: session.id,
        createdBy: actor.userId,
      });

      if (!movement) {
        throw new CycleCountError(
          400,
          "CYCLE_COUNT_INVALID",
          "invalid_item_reference",
          "A cycle count entry references an item that no longer exists in this organization.",
        );
      }

      entryResults.push({ entryId: entry.id, variance, adjustmentMovementId: movement.id });

      const item = await this.inventory.findItemById(actor.tenantId, entry.itemId);
      totalVarianceValue += variance * (item?.avgCost ?? 0);
    }

    const closed = await this.repository.applyClose({
      tenantId: actor.tenantId,
      cycleCountId: session.id,
      updatedBy: actor.userId,
      entryResults,
    });

    if (!closed) {
      throw cycleCountNotFound();
    }

    return { cycleCount: closed, totalVarianceValue: roundToDecimalPrecision(totalVarianceValue) };
  }

  /** R7.6 — cancel an OPEN session (concluida/cancelada are terminal → 422). */
  async cancel(actor: CycleCountActorContext, cycleCountId: string): Promise<CycleCount> {
    const session = await this.repository.findSession(actor.tenantId, parseRequiredUuid(cycleCountId, "cycleCountId"));

    if (!session) {
      throw cycleCountNotFound();
    }
    if (session.status !== "aberta") {
      throw cycleCountNotOpen(session.status);
    }

    const cancelled = await this.repository.cancelSession(actor.tenantId, session.id, actor.userId);

    if (!cancelled) {
      throw cycleCountNotFound();
    }

    return cancelled;
  }
}

const memoryCycleCountRepository = new InMemoryCycleCountRepository();
let defaultServicePromise: Promise<CycleCountService> | undefined;

export function createMemoryCycleCountService(_coreService: ICoreSaasService): CycleCountService {
  // Shares the SAME in-memory inventory ledger the stock API uses, so the snapshot
  // and the close ajustes are visible to /inventory-items and /stock-movements.
  return new CycleCountService(memoryCycleCountRepository, getMemoryInventoryRepositoryForTests());
}

export function getMemoryCycleCountRepositoryForTests(): InMemoryCycleCountRepository {
  return memoryCycleCountRepository;
}

export async function createDefaultCycleCountService(coreService: ICoreSaasService): Promise<CycleCountService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCycleCountService(coreService);
  }

  defaultServicePromise ??= createPrismaCycleCountService();

  return defaultServicePromise;
}

export function resetCycleCountRuntimeForTests(): void {
  memoryCycleCountRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCycleCountService(): Promise<CycleCountService> {
  const [{ createPrismaCycleCountRepository }, { createPrismaInventoryRepository }] = await Promise.all([
    import("./cycle-count-prisma.repository.js"),
    import("./inventory-prisma.repository.js"),
  ]);
  const [cycleCountRepository, inventoryRepository] = await Promise.all([
    createPrismaCycleCountRepository(),
    createPrismaInventoryRepository(),
  ]);

  return new CycleCountService(cycleCountRepository, inventoryRepository);
}
