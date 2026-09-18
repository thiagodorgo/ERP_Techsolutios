import pino from "pino";

import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { roundToDecimalPrecision } from "./inventory.calculations.js";
import { getMemoryInventoryRepositoryForTests } from "./inventory.service.js";
import type { InventoryRepository } from "./inventory.repository.js";
import { MemoryInventoryUnitOfWork, type InventoryUnitOfWork } from "./inventory-uow.js";
import { InMemoryCycleCountRepository, type CycleCountRepository } from "./cycle-count.repository.js";
import {
  CycleCountError,
  closeIncompleteError,
  closeInProgressError,
  cycleCountEntryNotFound,
  cycleCountNotFound,
  cycleCountNotOpen,
  entryAlreadyAdjustedError,
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

const logger = pino({ level: env.LOG_LEVEL });

/**
 * B-O6R-04a — GANCHO DE TESTE do fechamento. `beforeUnitCommit` é chamado DENTRO da transação da unidade, depois
 * do ajuste e do carimbo e ANTES do commit — enquanto a unidade segura a sessão e o item `FOR UPDATE`. Só as
 * suítes o passam; a rota não. Lançar nele desfaz a unidade inteira (a prova da retomada).
 */
export type CycleCountCloseHooks = {
  readonly beforeUnitCommit?: (unit: { readonly index: number; readonly itemId: string }) => Promise<void>;
};

export class CycleCountService {
  constructor(
    private readonly repository: CycleCountRepository,
    private readonly inventory: InventoryRepository,
    private readonly uow: InventoryUnitOfWork,
  ) {}

  /**
   * R7.6 — open a session: snapshot the DERIVED saldo of every ACTIVE item of the
   * chosen `abc_class` (or all active items when null) into one entry each. The
   * snapshot uses the same movement ledger as the stock API, so `system_quantity`
   * is the live saldo at open time. B-O6R-04a (I9): o repositório recusa (409
   * `items_in_open_session`) item que já esteja numa contagem aberta ou fechando.
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

  /**
   * R7.6 — record a counted quantity on one entry. B-O6R-04a (V7): a decisão (sessão aberta? entrada já ajustada?)
   * e a escrita acontecem na MESMA transação, sob `FOR SHARE` da sessão — o TOCTOU de "ler aberta, gravar depois
   * que fechou" deixou de existir. Em `fechando`, a entrada ainda sem ajuste é recontada (saída do S-01).
   */
  async recordEntry(
    actor: CycleCountActorContext,
    cycleCountId: string,
    entryId: string,
    body: RawRecord,
  ): Promise<CycleCountEntry> {
    const id = parseRequiredUuid(cycleCountId, "cycleCountId");

    // Precedência de erros preservada (404 / 422 de sessão terminal antes da validação do corpo): leitura
    // ADVISORY — só recusa estados que nunca voltam (inexistente, concluida, cancelada); a decisão que vale é
    // refeita sob o lock no repositório.
    const session = await this.repository.findSession(actor.tenantId, id);
    if (!session) {
      throw cycleCountNotFound();
    }
    if (session.status === "concluida" || session.status === "cancelada") {
      throw cycleCountNotOpen(session.status);
    }

    const outcome = await this.repository.recordEntryCount({
      tenantId: actor.tenantId,
      cycleCountId: session.id,
      entryId: parseRequiredUuid(entryId, "entryId"),
      countedQuantity: parseCountedQuantity(body.counted_quantity ?? body.countedQuantity),
      updatedBy: actor.userId,
    });

    switch (outcome.status) {
      case "ok":
        return outcome.entry;
      case "not_found":
        throw cycleCountNotFound();
      case "entry_not_found":
        throw cycleCountEntryNotFound();
      case "not_open":
        throw cycleCountNotOpen(outcome.current);
      case "entry_adjusted":
        throw entryAlreadyAdjustedError();
    }
  }

  /**
   * R7.6 / B-O6R-04a (Ω6R-DAT-003) — fecha a sessão em UNIDADES POR ITEM (emenda 2-h):
   *   1. `beginClose` — sessão `FOR UPDATE` + CAS `aberta → fechando` (ou retoma um `fechando`);
   *   2. uma unidade por entrada divergente ainda sem ajuste — sessão `FOR UPDATE` → releitura da entrada →
   *      ajuste (o lock do item é tomado DENTRO da unidade, depois da sessão — I7) → carimbo;
   *   3. em QUALQUER erro do laço, `abortClose` (S-01): sem ajuste aplicado a sessão volta a `aberta`; com
   *      ajuste aplicado fica `fechando` (recontar as pendentes + fechar de novo) — e o erro original propaga;
   *   4. `finishClose` — sessão `FOR UPDATE`, total da sessão INTEIRA somado no banco (S-02) + CAS
   *      `fechando → concluida`: exatamente UM 200 por sessão, inclusive sob dois `close` concorrentes.
   */
  async close(
    actor: CycleCountActorContext,
    cycleCountId: string,
    hooks?: CycleCountCloseHooks,
  ): Promise<CycleCountVarianceReport> {
    const id = parseRequiredUuid(cycleCountId, "cycleCountId");

    const begin = await this.repository.beginClose(actor.tenantId, id);
    if (begin.status === "not_found") {
      throw cycleCountNotFound();
    }
    if (begin.status === "not_open") {
      throw cycleCountNotOpen(begin.current);
    }

    // Só determinismo (a ordem não é o que evita impasse — I7 é): por item.
    const pending = begin.entries
      .filter(
        (entry) =>
          entry.countedQuantity !== undefined &&
          roundToDecimalPrecision(entry.countedQuantity - entry.systemQuantity) !== 0 &&
          entry.adjustmentMovementId === undefined,
      )
      .sort((left, right) => (left.itemId < right.itemId ? -1 : left.itemId > right.itemId ? 1 : 0));

    try {
      for (const [index, entry] of pending.entries()) {
        await this.uow.run(actor.tenantId, async (ctx) => {
          const session = await ctx.cycleCounts.lockSessionForUpdate(actor.tenantId, id);
          if (!session) {
            throw cycleCountNotFound();
          }
          if (session.status !== "fechando") {
            // Outro `close` concluiu, ou a sessão saiu do fechamento: esta chamada perde.
            throw cycleCountNotOpen(session.status);
          }

          const current = await ctx.cycleCounts.findEntry(actor.tenantId, id, entry.id);
          if (!current || current.adjustmentMovementId !== undefined || current.countedQuantity === undefined) {
            return; // outra unidade (de outro `close`) já aplicou este item
          }
          const variance = roundToDecimalPrecision(current.countedQuantity - current.systemQuantity);
          if (variance === 0) {
            return; // recontada para o sistema durante o `fechando`: nada a ajustar
          }

          // P-021 — ajuste de legado desta sessão para o item (gravado antes do bloco, fora de unidade): reaproveita.
          const prior = (
            await ctx.inventory.listMovements({
              tenantId: actor.tenantId,
              cycleCountId: id,
              itemId: current.itemId,
              limit: 1,
              offset: 0,
            })
          ).items[0];
          // V1 real: o `createMovement` trava o item DENTRO desta transação (a sessão já está travada — I7).
          const movement =
            prior ??
            (await ctx.inventory.createMovement({
              tenantId: actor.tenantId,
              itemId: current.itemId,
              type: "ajuste",
              quantidadeSinalizada: variance,
              reason: `contagem cíclica ${id}`,
              cycleCountId: id,
              createdBy: actor.userId,
            }));

          if (!movement) {
            throw new CycleCountError(
              400,
              "CYCLE_COUNT_INVALID",
              "invalid_item_reference",
              "A cycle count entry references an item that no longer exists in this organization.",
            );
          }

          await ctx.cycleCounts.stampEntry({
            tenantId: actor.tenantId,
            cycleCountId: id,
            entryId: current.id,
            variance,
            adjustmentMovementId: movement.id,
          });

          await hooks?.beforeUnitCommit?.({ index, itemId: current.itemId });
        });
      }
    } catch (error) {
      // S-01 — nenhum estado sem saída: sem ajuste aplicado, a sessão volta a `aberta`; com ajuste aplicado, fica
      // `fechando` (recontar as pendentes + fechar de novo). O erro ORIGINAL propaga com o status de hoje. Se o
      // próprio `abortClose` falhar, ele não engole o erro: a sessão fica `fechando` e `cancel` (0 ajustes),
      // `recordEntry` e `close` continuam possíveis.
      try {
        await this.repository.abortClose(actor.tenantId, id);
      } catch (abortError) {
        logger.error(
          { cycleCountId: id, reason: abortError instanceof Error ? abortError.name : "error" },
          "cycle-count.close: abortClose falhou; a sessão segue retomável em fechando",
        );
      }

      throw error;
    }

    const finish = await this.repository.finishClose(actor.tenantId, id, actor.userId);
    switch (finish.status) {
      case "ok":
        return { cycleCount: finish.session, totalVarianceValue: finish.totalVarianceValue };
      case "not_found":
        throw cycleCountNotFound();
      case "not_open":
        throw cycleCountNotOpen(finish.current);
      case "pending":
        throw closeIncompleteError(finish.remaining);
    }
  }

  /**
   * R7.6 — cancel a session. B-O6R-04a (V8): decidido sob `FOR UPDATE` da sessão. `aberta` → `cancelada`;
   * `fechando` sem ajuste aplicado → `cancelada`; `fechando` com ajuste aplicado → 422 `close_in_progress`
   * (nunca cancelar por cima de ajuste já no razão); `concluida`/`cancelada` → 422.
   */
  async cancel(actor: CycleCountActorContext, cycleCountId: string): Promise<CycleCount> {
    const outcome = await this.repository.cancelSession(
      actor.tenantId,
      parseRequiredUuid(cycleCountId, "cycleCountId"),
      actor.userId,
    );

    switch (outcome.status) {
      case "ok":
        return outcome.session;
      case "not_found":
        throw cycleCountNotFound();
      case "not_open":
        throw cycleCountNotOpen(outcome.current);
      case "close_in_progress":
        throw closeInProgressError(outcome.stamped);
    }
  }
}

const memoryCycleCountRepository = new InMemoryCycleCountRepository(
  async (tenantId, itemId) => (await getMemoryInventoryRepositoryForTests().findItemById(tenantId, itemId))?.avgCost ?? 0,
);
let defaultServicePromise: Promise<CycleCountService> | undefined;

export function createMemoryCycleCountService(_coreService: ICoreSaasService): CycleCountService {
  // Shares the SAME in-memory inventory ledger the stock API uses, so the snapshot
  // and the close ajustes are visible to /inventory-items and /stock-movements.
  const inventory = getMemoryInventoryRepositoryForTests();

  return new CycleCountService(
    memoryCycleCountRepository,
    inventory,
    new MemoryInventoryUnitOfWork(inventory, memoryCycleCountRepository),
  );
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
  const [{ createPrismaCycleCountRepository }, { createPrismaInventoryRepository }, { createPrismaInventoryUnitOfWork }] =
    await Promise.all([
      import("./cycle-count-prisma.repository.js"),
      import("./inventory-prisma.repository.js"),
      import("./inventory-uow-prisma.js"),
    ]);
  const [cycleCountRepository, inventoryRepository, unitOfWork] = await Promise.all([
    createPrismaCycleCountRepository(),
    createPrismaInventoryRepository(),
    createPrismaInventoryUnitOfWork(),
  ]);

  return new CycleCountService(cycleCountRepository, inventoryRepository, unitOfWork);
}
