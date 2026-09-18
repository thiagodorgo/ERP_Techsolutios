import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  computeMovingAverage,
  deriveReorder,
  REORDER_USAGE_WINDOW_DAYS,
  roundToDecimalPrecision,
  wouldOverdraw,
} from "./inventory.calculations.js";
import {
  duplicateSkuError,
  stockBaixaReversedError,
  stockBusyError,
  insufficientBalanceError,
  transferGroupInconsistentError,
  type AbcClassAssignment,
  type CreateInventoryItemInput,
  type CreateStockExitForSourceInput,
  type CreateStockMovementInput,
  type CreateTransferInput,
  type CustodySummaryRaw,
  type InventoryAbcClass,
  type InventoryItem,
  type InventoryItemType,
  type InventoryItemView,
  type ItemConsumptionValue,
  type ListInventoryItemsInput,
  type ListInventoryItemsResult,
  type ListStockMovementsInput,
  type ListStockMovementsResult,
  type RemoveStockExitForSourceInput,
  type ReverseStockMovementInput,
  type ReverseStockMovementResult,
  type StockCustody,
  type StockCustodyType,
  type StockMovement,
  type StockMovementType,
  type StockTransferResult,
  type UpdateInventoryItemInput,
} from "./inventory.types.js";
import type { InventoryRepository } from "./inventory.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** Movement types that count as OUTFLOW for the R7.5 usage window (saida + consumo). */
const OUTFLOW_TYPES = ["saida", "consumo"] as const;

/** Ω4C PR-08 — the default custody bucket (BASE): both typed refs empty. */
const BASE_CUSTODY: StockCustody = { custodyType: "base" };

// -----------------------------------------------------------------------------------------------
// B-O6R-04a (Ω6R-DAT-002 / P-020) — O LOCK DO ITEM COMO TIPO.
//
// A saída lia o saldo, decidia e escrevia SEM lock: 20 saídas concorrentes de 1 sobre saldo 10 eram
// TODAS aceitas (saldo −10). Agora toda via que chega a `insertMovement`/`avg_cost` (V1–V5) toma
// `FOR UPDATE` na linha `inventory_items(tenant_id, id)` ANTES da primeira leitura que decide, e toda
// leitura que decide roda sob esse lock. `FOR UPDATE` (não `NO KEY UPDATE`) porque só ele conflita com o
// `KEY SHARE` que todo INSERT em `stock_movements` toma na linha do item pela FK — serializa até um
// escritor que esqueça o lock.
//
// O token `ItemWriteLock` é a prova de que o lock foi tomado NESTA transação: só `lockItemForUpdate` o
// produz, e `insertMovement` + as leituras `*Locked` o exigem. Via nova que escreva sem o lock não compila.
// As versões SEM lock das leituras que DECIDEM não existem mais neste arquivo (o guard D2 as reprova);
// antes do lock só há leitura de IDENTIFICAÇÃO (`findMovementById`, `findExitBySource`), que diz QUAL
// item travar e é relida sob o lock antes de qualquer decisão.
//
// I7: toda transação que toma `FOR UPDATE` de item toma EXATAMENTE UM (e, na unidade da contagem, a
// sessão antes). Perna de transferência de outro item = dado corrompido → 409, nunca 2º lock.
// -----------------------------------------------------------------------------------------------
declare const ItemWriteLockBrand: unique symbol;

/** Prova de que a transação corrente segura `FOR UPDATE` no item. SÓ `lockItemForUpdate` produz. */
export type ItemWriteLock = { readonly [ItemWriteLockBrand]: true; readonly item: InventoryItem };

type ItemRecord = Parameters<typeof mapItemRecord>[0];

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    try {
      const item = await this.client.inventoryItem.create({
        data: {
          tenant_id: input.tenantId,
          sku: input.sku,
          name: input.name,
          unit: input.unit,
          min_quantity: input.minQuantity,
          max_quantity: input.maxQuantity ?? null,
          lead_time_days: input.leadTimeDays ?? null,
          safety_stock: input.safetyStock ?? null,
          is_active: input.isActive ?? true,
          is_fuel: input.isFuel ?? false,
          item_type: input.itemType ?? "product",
          purchase_price: input.purchasePrice ?? null,
          sale_price: input.salePrice ?? null,
          description: input.description ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapItemRecord(item);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateSkuError();
      }

      throw error;
    }
  }

  async listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult> {
    const where = buildItemWhere(input);
    const now = new Date();

    // `below_min` (R7.1) and `needs_reorder` (R7.5) are DERIVED filters: the saldos
    // and the 90-day usage for every matching item come from TWO groupBys, the
    // predicate is applied, and only then the page is sliced. Without a derived
    // filter, a plain page + those groupBys for the page's ids resolves the views.
    if (input.belowMin !== undefined || input.needsReorder !== undefined) {
      const rows = await this.client.inventoryItem.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
      });
      const views = await this.buildViews(input.tenantId, rows, now);
      const filtered = views
        .filter((item) =>
          input.belowMin === undefined ? true : input.belowMin ? item.saldo < item.minQuantity : item.saldo >= item.minQuantity,
        )
        .filter((item) => (input.needsReorder === undefined ? true : item.needsReorder === input.needsReorder));

      return {
        items: filtered.slice(input.offset, input.offset + input.limit),
        total: filtered.length,
        limit: input.limit,
        offset: input.offset,
      };
    }

    const [rows, total] = await Promise.all([
      this.client.inventoryItem.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.inventoryItem.count({ where }),
    ]);

    return {
      items: await this.buildViews(input.tenantId, rows, now),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined> {
    const item = await this.client.inventoryItem.findFirst({
      where: {
        tenant_id: tenantId,
        id: itemId,
      },
    });

    return item ? mapItemRecord(item) : undefined;
  }

  async findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemView | undefined> {
    const item = await this.findItemById(tenantId, itemId);
    if (!item) return undefined;

    const now = new Date();
    // Leitura de EXIBIÇÃO (não decide nada): o mesmo groupBy da listagem — a versão sem lock de `saldoOf`
    // deixou de existir neste arquivo (B-O6R-04a, D-02).
    const saldo = (await this.sumByItem(tenantId, [itemId])).get(itemId) ?? 0;
    const usageAbs = await this.usageOf(tenantId, itemId, now);
    const { reorderPoint, needsReorder } = deriveReorder({
      saldo,
      usageAbs,
      leadTimeDays: item.leadTimeDays,
      safetyStock: item.safetyStock,
    });

    return { ...item, saldo, reorderPoint, needsReorder };
  }

  async updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined> {
    try {
      const updated = await this.client.inventoryItem.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.itemId,
        },
        data: compactRecord({
          sku: input.sku,
          name: input.name,
          unit: input.unit,
          min_quantity: input.minQuantity,
          max_quantity: nullable(input.maxQuantity),
          lead_time_days: nullable(input.leadTimeDays),
          safety_stock: nullable(input.safetyStock),
          is_active: input.isActive,
          is_fuel: input.isFuel,
          item_type: input.itemType,
          purchase_price: input.purchasePrice,
          sale_price: input.salePrice,
          description: input.description,
          updated_by: nullable(input.updatedBy),
        }),
      });

      return updated[0] ? mapItemRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateSkuError();
      }

      throw error;
    }
  }

  /**
   * R7.1/R7.3 (V1) — runs on the executor it was constructed with; wrapped by the RLS repository the whole flow
   * lives inside ONE `$transaction`. B-O6R-04a: o lock do item vem PRIMEIRO; o saldo da custódia, o custo médio
   * e a escrita decidem sob ele (I1, I4) — a saída concorrente espera o commit desta e relê o saldo novo.
   */
  async createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined> {
    const lock = await this.lockItemForUpdate(input.tenantId, input.itemId);
    if (!lock) return undefined;

    const custody = input.custody ?? BASE_CUSTODY;

    // Ω4C PR-08 — the non-negative guard runs against THIS custody's balance (stricter than the legacy global
    // guard). The aggregate sees the transaction's own writes and, under the lock, every committed one.
    const custodySaldoBefore = await this.saldoOfCustodyLocked(lock, custody);

    if (wouldOverdraw(custodySaldoBefore, input.quantidadeSinalizada)) {
      throw insufficientBalanceError(custodySaldoBefore);
    }

    if (input.type === "entrada" && input.unitCost !== undefined) {
      const globalSaldoBefore = await this.saldoOfLocked(lock);
      const avgCost = computeMovingAverage(globalSaldoBefore, lock.item.avgCost, input.quantidadeSinalizada, input.unitCost);

      await this.client.inventoryItem.updateMany({
        where: {
          tenant_id: input.tenantId,
          id: input.itemId,
        },
        data: {
          avg_cost: avgCost,
          updated_by: input.createdBy ?? null,
        },
      });
    }

    return this.insertMovement({ ...input, custody }, lock);
  }

  /** V2 — as duas pernas (mesmo item) sob UM lock; o guard da ORIGEM decide sob ele. */
  async createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {
    const lock = await this.lockItemForUpdate(input.tenantId, input.itemId);
    if (!lock) return undefined;

    const origin = input.type === "link" ? BASE_CUSTODY : input.custody;
    const destination = input.type === "link" ? input.custody : BASE_CUSTODY;
    const quantity = roundToDecimalPrecision(Math.abs(input.quantity));

    const originSaldo = await this.saldoOfCustodyLocked(lock, origin);
    if (wouldOverdraw(originSaldo, -quantity)) {
      throw insufficientBalanceError(originSaldo);
    }

    const transferGroupId = randomUUID();
    const from = await this.insertMovement(
      {
        tenantId: input.tenantId,
        itemId: input.itemId,
        type: input.type,
        quantidadeSinalizada: -quantity,
        reason: input.reason,
        custody: origin,
        transferGroupId,
        createdBy: input.createdBy,
      },
      lock,
    );
    const to = await this.insertMovement(
      {
        tenantId: input.tenantId,
        itemId: input.itemId,
        type: input.type,
        quantidadeSinalizada: quantity,
        reason: input.reason,
        custody: destination,
        transferGroupId,
        createdBy: input.createdBy,
      },
      lock,
    );

    return { from, to };
  }

  /**
   * V3 — `findMovementById` é leitura de IDENTIFICAÇÃO (diz qual item travar). Grupo, estorno anterior e saldo
   * de cada perna são relidos SOB o lock. A 2ª compensação concorrente espera o commit da 1ª e vê
   * `already_reversed`; o índice `stock_movements_reversal_active_key` é o cinto para escritor sem lock (o
   * `P2002` é mapeado FORA da transação, no wrapper — nunca `25P02`).
   */
  async reverseMovement(input: ReverseStockMovementInput): Promise<ReverseStockMovementResult> {
    const original = await this.findMovementById(input.tenantId, input.movementId);
    if (!original) return { status: "not_found" };

    const lock = await this.lockItemForUpdate(input.tenantId, original.itemId);
    if (!lock) return { status: "not_found" };

    const siblings = original.transferGroupId
      ? await this.movementsInGroupLocked(lock, original.transferGroupId)
      : [original];
    if (siblings.some((movement) => movement.itemId !== lock.item.id)) {
      // Um grupo legítimo é sempre do MESMO item. Perna alheia = dado corrompido: recusa, nunca 2º lock (I7).
      throw transferGroupInconsistentError();
    }
    const siblingIds = siblings.map((movement) => movement.id);

    if (await this.hasReversalOfLocked(lock, siblingIds)) {
      return { status: "already_reversed" };
    }

    // Credits (positive legs) before debits (negative legs): a legitimate reversal never trips the per-custody
    // guard on ordering; a genuine overdraw (stock already left the custody) still raises 409.
    const legs = [...siblings].sort((left, right) => right.quantidadeSinalizada - left.quantidadeSinalizada);
    const transferGroupId = legs.length > 1 ? randomUUID() : undefined;
    const movements: StockMovement[] = [];

    for (const leg of legs) {
      const signed = roundToDecimalPrecision(-leg.quantidadeSinalizada);
      const custody: StockCustody = {
        custodyType: leg.custodyType,
        custodyOperatorProfileId: leg.custodyOperatorProfileId,
        custodyVehicleId: leg.custodyVehicleId,
      };
      const custodySaldoBefore = await this.saldoOfCustodyLocked(lock, custody);
      if (wouldOverdraw(custodySaldoBefore, signed)) {
        throw insufficientBalanceError(custodySaldoBefore);
      }

      movements.push(
        await this.insertMovement(
          {
            tenantId: input.tenantId,
            itemId: leg.itemId,
            type: leg.type,
            quantidadeSinalizada: signed,
            reason: input.reason,
            custody,
            transferGroupId,
            reversesMovementId: leg.id,
            createdBy: input.createdBy,
          },
          lock,
        ),
      );
    }

    return { status: "ok", movements };
  }

  async getCustodySummary(tenantId: string, itemId: string): Promise<CustodySummaryRaw> {
    const grouped = await this.client.stockMovement.groupBy({
      by: ["custody_type", "custody_operator_profile_id", "custody_vehicle_id"],
      where: { tenant_id: tenantId, item_id: itemId },
      _sum: { quantidade_sinalizada: true },
    });

    let baseQty = 0;
    const professionals: { operatorProfileId: string; qty: number }[] = [];
    const vehicles: { vehicleId: string; qty: number }[] = [];

    for (const row of grouped) {
      const qty = roundToDecimalPrecision(decimalToNumber(row._sum.quantidade_sinalizada));
      if (row.custody_type === "professional" && row.custody_operator_profile_id) {
        if (qty !== 0) professionals.push({ operatorProfileId: row.custody_operator_profile_id, qty });
      } else if (row.custody_type === "vehicle" && row.custody_vehicle_id) {
        if (qty !== 0) vehicles.push({ vehicleId: row.custody_vehicle_id, qty });
      } else {
        baseQty += qty;
      }
    }

    return { baseQty: roundToDecimalPrecision(baseQty), professionals, vehicles };
  }

  /** Leitura de IDENTIFICAÇÃO (qual EXIT, qual item) — nunca decide escrita sozinha. */
  async findExitBySource(tenantId: string, sourceType: string, sourceId: string): Promise<StockMovement | undefined> {
    // At most one EXIT row per (tenant, source_type, source_id) thanks to stock_movements_source_active_key.
    const movement = await this.client.stockMovement.findFirst({
      where: { tenant_id: tenantId, source_type: sourceType, source_id: sourceId },
    });

    return movement ? mapMovementRecord(movement) : undefined;
  }

  /**
   * Membro PÚBLICO de leitura da interface (`InventoryService.findExitBySource` → badge/edição do consumidor).
   * Não decide escrita nenhuma: as vias que escrevem usam `isExitReversedLocked`, sob o lock do item.
   */
  async isExitReversed(tenantId: string, movementId: string): Promise<boolean> {
    const count = await this.client.stockMovement.count({
      where: { tenant_id: tenantId, reverses_movement_id: movementId },
    });

    return count > 0;
  }

  /**
   * V4 — idempotência ABSOLUTA por origem (no MÁX. 1 EXIT por fonte; já estornada → 409). O lock do item vem
   * ANTES da releitura da fonte e do saldo BASE: a 2ª baixa concorrente da MESMA fonte espera, relê e devolve o
   * EXIT vencedor. O `P2002` de `stock_movements_source_active_key` (escritor sem lock) é tratado no wrapper,
   * FORA da transação — dentro dela o `catch` deixava a transação abortada (`25P02`).
   */
  async createExitForSource(input: CreateStockExitForSourceInput): Promise<StockMovement | undefined> {
    const lock = await this.lockItemForUpdate(input.tenantId, input.itemId);
    if (!lock) return undefined;

    const existing = await this.findExitBySourceLocked(lock, input.sourceType, input.sourceId);
    if (existing) {
      if (await this.isExitReversedLocked(lock, existing.id)) {
        throw stockBaixaReversedError();
      }
      return existing;
    }

    // RN-BAIXA-01 — guard de saldo por custódia BASE dentro da tx (EXIT-first no consumidor). BASE fixada.
    const signed = -roundToDecimalPrecision(Math.abs(input.quantity));
    const custodySaldoBefore = await this.saldoOfCustodyLocked(lock, BASE_CUSTODY);
    if (wouldOverdraw(custodySaldoBefore, signed)) {
      throw insufficientBalanceError(custodySaldoBefore);
    }

    return this.insertMovement(
      {
        tenantId: input.tenantId,
        itemId: input.itemId,
        type: "saida",
        quantidadeSinalizada: signed,
        vehicleId: input.vehicleId,
        reason: input.reason,
        custody: BASE_CUSTODY,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdBy: input.createdBy,
      },
      lock,
    );
  }

  /**
   * V5 — `findExitBySource` é leitura de IDENTIFICAÇÃO (qual item travar); "já estornada?" é relido SOB o lock.
   * O 2º estorno concorrente da mesma fonte espera e devolve `undefined` (no-op idempotente).
   */
  async removeExitForSource(input: RemoveStockExitForSourceInput): Promise<StockMovement | undefined> {
    const exit = await this.findExitBySource(input.tenantId, input.sourceType, input.sourceId);
    if (!exit) return undefined; // no-op: nunca houve baixa desta fonte.

    const lock = await this.lockItemForUpdate(input.tenantId, exit.itemId);
    if (!lock) return undefined;
    if (await this.isExitReversedLocked(lock, exit.id)) return undefined; // no-op idempotente.

    // Estorno compensatório: sinal oposto, custódia BASE, source_id NULL (fora do índice parcial) + reverses.
    return this.insertMovement(
      {
        tenantId: input.tenantId,
        itemId: exit.itemId,
        type: exit.type,
        quantidadeSinalizada: roundToDecimalPrecision(-exit.quantidadeSinalizada),
        vehicleId: exit.vehicleId,
        reason: input.reason ?? exit.reason,
        custody: BASE_CUSTODY,
        reversesMovementId: exit.id,
        createdBy: input.createdBy ?? exit.createdBy,
      },
      lock,
    );
  }

  /**
   * B-O6R-04a — `SELECT … FOR UPDATE` na linha do item, tagged (nunca `Unsafe` com string montada). `undefined` =
   * inexistente ou de outro tenant (a RLS esconde a linha) → 400/404 como antes. É o ÚNICO produtor do token.
   */
  private async lockItemForUpdate(tenantId: string, itemId: string): Promise<ItemWriteLock | undefined> {
    const rows = await this.client.$queryRaw<ItemRecord[]>`
      SELECT * FROM "inventory_items" WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid FOR UPDATE
    `;

    return rows[0] ? ({ item: mapItemRecord(rows[0]) } as unknown as ItemWriteLock) : undefined;
  }

  private async insertMovement(
    input: CreateStockMovementInput & {
      readonly custody: StockCustody;
      readonly transferGroupId?: string;
      readonly reversesMovementId?: string;
    },
    lock: ItemWriteLock,
  ): Promise<StockMovement> {
    if (input.itemId !== lock.item.id || input.tenantId !== lock.item.tenantId) {
      // Invariante de programação: o movimento só pode ser do item cujo lock a transação segura.
      throw new Error("insertMovement: o movimento não é do item travado nesta transação.");
    }

    const movement = await this.client.stockMovement.create({
      data: {
        tenant_id: input.tenantId,
        item_id: input.itemId,
        type: input.type,
        quantidade_sinalizada: input.quantidadeSinalizada,
        unit_cost: input.unitCost ?? null,
        work_order_id: input.workOrderId ?? null,
        vehicle_id: input.vehicleId ?? null,
        reason: input.reason ?? null,
        cycle_count_id: input.cycleCountId ?? null,
        custody_type: input.custody.custodyType,
        custody_operator_profile_id: input.custody.custodyOperatorProfileId ?? null,
        custody_vehicle_id: input.custody.custodyVehicleId ?? null,
        transfer_group_id: input.transferGroupId ?? null,
        reverses_movement_id: input.reversesMovementId ?? null,
        source_type: input.sourceType ?? null,
        source_id: input.sourceId ?? null,
        created_by: input.createdBy ?? null,
      },
    });

    return mapMovementRecord(movement);
  }

  /** Todas as pernas do grupo (sem filtrar por item: perna de outro item tem de APARECER para ser recusada). */
  private async movementsInGroupLocked(lock: ItemWriteLock, transferGroupId: string): Promise<StockMovement[]> {
    const rows = await this.client.stockMovement.findMany({
      where: { tenant_id: lock.item.tenantId, transfer_group_id: transferGroupId },
    });

    return rows.map(mapMovementRecord);
  }

  private async hasReversalOfLocked(lock: ItemWriteLock, movementIds: readonly string[]): Promise<boolean> {
    if (movementIds.length === 0) return false;

    const count = await this.client.stockMovement.count({
      where: { tenant_id: lock.item.tenantId, reverses_movement_id: { in: [...movementIds] } },
    });

    return count > 0;
  }

  private async isExitReversedLocked(lock: ItemWriteLock, movementId: string): Promise<boolean> {
    return this.hasReversalOfLocked(lock, [movementId]);
  }

  private async findExitBySourceLocked(
    lock: ItemWriteLock,
    sourceType: string,
    sourceId: string,
  ): Promise<StockMovement | undefined> {
    const movement = await this.client.stockMovement.findFirst({
      where: { tenant_id: lock.item.tenantId, source_type: sourceType, source_id: sourceId },
    });

    return movement ? mapMovementRecord(movement) : undefined;
  }

  private async saldoOfCustodyLocked(lock: ItemWriteLock, custody: StockCustody): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({
      where: {
        tenant_id: lock.item.tenantId,
        item_id: lock.item.id,
        custody_type: custody.custodyType,
        custody_operator_profile_id: custody.custodyOperatorProfileId ?? null,
        custody_vehicle_id: custody.custodyVehicleId ?? null,
      },
      _sum: { quantidade_sinalizada: true },
    });

    return roundToDecimalPrecision(decimalToNumber(aggregate._sum.quantidade_sinalizada));
  }

  private async saldoOfLocked(lock: ItemWriteLock): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({
      where: {
        tenant_id: lock.item.tenantId,
        item_id: lock.item.id,
      },
      _sum: { quantidade_sinalizada: true },
    });

    return roundToDecimalPrecision(decimalToNumber(aggregate._sum.quantidade_sinalizada));
  }

  async listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    const where = buildMovementWhere(input);
    const [items, total] = await Promise.all([
      this.client.stockMovement.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.stockMovement.count({ where }),
    ]);

    return {
      items: items.map(mapMovementRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    const movement = await this.client.stockMovement.findFirst({
      where: {
        tenant_id: tenantId,
        id: movementId,
      },
    });

    return movement ? mapMovementRecord(movement) : undefined;
  }

  /**
   * R7.4 — consumption value per ACTIVE item over the ABC window. Movements carry a
   * unit_cost only on entrada, so consumo/saida fall back to the item avg_cost;
   * the per-movement fallback is why this reduces in JS rather than a plain groupBy.
   */
  async getConsumptionValues(tenantId: string, since: Date): Promise<readonly ItemConsumptionValue[]> {
    const items = await this.client.inventoryItem.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, avg_cost: true },
    });
    const avgCostById = new Map(items.map((item) => [item.id, decimalToNumber(item.avg_cost)]));

    const movements = await this.client.stockMovement.findMany({
      where: {
        tenant_id: tenantId,
        type: { in: [...OUTFLOW_TYPES] },
        created_at: { gte: since },
        item_id: { in: items.map((item) => item.id) },
      },
      select: { item_id: true, quantidade_sinalizada: true, unit_cost: true },
    });

    const valueByItem = new Map<string, number>();
    for (const movement of movements) {
      const cost = movement.unit_cost !== null ? decimalToNumber(movement.unit_cost) : avgCostById.get(movement.item_id) ?? 0;
      const value = Math.abs(decimalToNumber(movement.quantidade_sinalizada)) * cost;
      valueByItem.set(movement.item_id, (valueByItem.get(movement.item_id) ?? 0) + value);
    }

    return items.map((item) => ({
      id: item.id,
      consumptionValue: roundToDecimalPrecision(valueByItem.get(item.id) ?? 0),
    }));
  }

  /** R7.4 — write the ABC class for each classified item (one updateMany per item, in-tenant). */
  async applyAbcClasses(tenantId: string, assignments: readonly AbcClassAssignment[], updatedBy?: string): Promise<void> {
    for (const assignment of assignments) {
      await this.client.inventoryItem.updateMany({
        where: { tenant_id: tenantId, id: assignment.id },
        data: { abc_class: assignment.abcClass, updated_by: updatedBy ?? null },
      });
    }
  }

  /** Builds the derived views (saldo + reorder) for a set of rows with two groupBys. */
  private async buildViews(
    tenantId: string,
    rows: readonly Parameters<typeof mapItemRecord>[0][],
    now: Date,
  ): Promise<InventoryItemView[]> {
    const ids = rows.map((row) => row.id);
    const [saldoByItem, usageByItem] = await Promise.all([
      this.sumByItem(tenantId, ids),
      this.usageByItem(tenantId, ids, now),
    ]);

    return rows.map((row) => {
      const item = mapItemRecord(row);
      const saldo = saldoByItem.get(item.id) ?? 0;
      const { reorderPoint, needsReorder } = deriveReorder({
        saldo,
        usageAbs: usageByItem.get(item.id) ?? 0,
        leadTimeDays: item.leadTimeDays,
        safetyStock: item.safetyStock,
      });

      return { ...item, saldo, reorderPoint, needsReorder };
    });
  }

  /** ONE groupBy resolves the saldos for a whole page of items (no N+1). */
  private async sumByItem(tenantId: string, itemIds: readonly string[]): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const sums = await this.client.stockMovement.groupBy({
      by: ["item_id"],
      where: {
        tenant_id: tenantId,
        item_id: { in: [...itemIds] },
      },
      _sum: { quantidade_sinalizada: true },
    });

    return new Map(
      sums.map((entry) => [entry.item_id, roundToDecimalPrecision(decimalToNumber(entry._sum.quantidade_sinalizada))]),
    );
  }

  /** R7.5 — absolute outflow (saida + consumo) over the last REORDER window for one item. */
  private async usageOf(tenantId: string, itemId: string, now: Date): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({
      where: {
        tenant_id: tenantId,
        item_id: itemId,
        type: { in: [...OUTFLOW_TYPES] },
        created_at: { gte: usageSince(now) },
      },
      _sum: { quantidade_sinalizada: true },
    });

    return roundToDecimalPrecision(Math.abs(decimalToNumber(aggregate._sum.quantidade_sinalizada)));
  }

  /** R7.5 — ONE groupBy resolves the 90-day outflow for a whole page of items (no N+1). */
  private async usageByItem(tenantId: string, itemIds: readonly string[], now: Date): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const sums = await this.client.stockMovement.groupBy({
      by: ["item_id"],
      where: {
        tenant_id: tenantId,
        item_id: { in: [...itemIds] },
        type: { in: [...OUTFLOW_TYPES] },
        created_at: { gte: usageSince(now) },
      },
      _sum: { quantidade_sinalizada: true },
    });

    return new Map(
      sums.map((entry) => [entry.item_id, roundToDecimalPrecision(Math.abs(decimalToNumber(entry._sum.quantidade_sinalizada)))]),
    );
  }
}

function usageSince(now: Date): Date {
  return new Date(now.getTime() - REORDER_USAGE_WINDOW_DAYS * MILLIS_PER_DAY);
}

// -----------------------------------------------------------------------------------------------
// B-O6R-04a — O WRAPPER RLS: toda porta pública passa por `this.tx`, que abre a transação tenant-scoped e
// mapeia a falha TRANSITÓRIA de banco (contenção > timeout, impasse, serialização, trava indisponível,
// fila de conexões) para 503 `STOCK_UNAVAILABLE/stock_busy` — nada gravado, repetir resolve. Antes, o erro
// cru chegava ao `sendRouteError` e virava 400 com a mensagem do banco. O guard D7 reprova porta pública
// que não passe por `this.tx`, e `withTenantRls` chamado fora dele.
//
// V3/V4/V5 ainda envolvem `this.tx` num try/catch para a violação de índice único (`P2002`/`23505`):
// alcançável só por escritor que NÃO segura o lock do item (SQL cru, bug futuro). O mapeamento acontece
// FORA da transação — dentro dela, o `catch` deixava a transação abortada e o próximo statement caía em
// `25P02`.
// -----------------------------------------------------------------------------------------------
export class RlsPrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    return this.tx(input.tenantId, (repo) => repo.createItem(input));
  }

  listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult> {
    return this.tx(input.tenantId, (repo) => repo.listItems(input));
  }

  findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined> {
    return this.tx(tenantId, (repo) => repo.findItemById(tenantId, itemId));
  }

  findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemView | undefined> {
    return this.tx(tenantId, (repo) => repo.findItemWithSaldo(tenantId, itemId));
  }

  updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined> {
    return this.tx(input.tenantId, (repo) => repo.updateItem(input));
  }

  /** R7.1 — `withTenantRls` opens the `$transaction`; lock + check + insert + avg update commit or roll back together. */
  createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined> {
    return this.tx(input.tenantId, (repo) => repo.createMovement(input));
  }

  /** Ω4C PR-08 — the transfer pair is written in ONE `$transaction` (lock + guard + two inserts). */
  createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {
    return this.tx(input.tenantId, (repo) => repo.createTransfer(input));
  }

  /** Ω4C PR-08 — the compensating movement(s) are written in ONE `$transaction`; `P2002` → already_reversed, FORA dela. */
  async reverseMovement(input: ReverseStockMovementInput): Promise<ReverseStockMovementResult> {
    try {
      return await this.tx(input.tenantId, (repo) => repo.reverseMovement(input));
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Outra compensação do mesmo original commitou por um escritor que não segura o lock do item: o índice
        // stock_movements_reversal_active_key recusou a nossa. A transação já foi desfeita inteira.
        return { status: "already_reversed" };
      }

      throw error;
    }
  }

  getCustodySummary(tenantId: string, itemId: string): Promise<CustodySummaryRaw> {
    return this.tx(tenantId, (repo) => repo.getCustodySummary(tenantId, itemId));
  }

  findExitBySource(tenantId: string, sourceType: string, sourceId: string): Promise<StockMovement | undefined> {
    return this.tx(tenantId, (repo) => repo.findExitBySource(tenantId, sourceType, sourceId));
  }

  isExitReversed(tenantId: string, movementId: string): Promise<boolean> {
    return this.tx(tenantId, (repo) => repo.isExitReversed(tenantId, movementId));
  }

  /** Ω4C PR-08b — lock + guard + idempotent EXIT insert in ONE `$transaction`; `P2002` → relê a fonte, FORA dela. */
  async createExitForSource(input: CreateStockExitForSourceInput): Promise<StockMovement | undefined> {
    try {
      return await this.tx(input.tenantId, (repo) => repo.createExitForSource(input));
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Corrida por escritor sem o lock: outro EXIT da MESMA fonte commitou primeiro. Devolve o vencedor
        // (idempotente), lido numa transação NOVA — a nossa já foi desfeita.
        const raced = await this.findExitBySource(input.tenantId, input.sourceType, input.sourceId);
        if (raced) return raced;
      }

      throw error;
    }
  }

  /** Ω4C PR-08b — the compensating reversal is written in ONE `$transaction`; `P2002` → no-op, FORA dela. */
  async removeExitForSource(input: RemoveStockExitForSourceInput): Promise<StockMovement | undefined> {
    try {
      return await this.tx(input.tenantId, (repo) => repo.removeExitForSource(input));
    } catch (error) {
      if (isUniqueViolation(error)) {
        // O EXIT já tem compensação (commitada por escritor sem o lock): no-op idempotente, como o caminho normal.
        return undefined;
      }

      throw error;
    }
  }

  listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    return this.tx(input.tenantId, (repo) => repo.listMovements(input));
  }

  findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    return this.tx(tenantId, (repo) => repo.findMovementById(tenantId, movementId));
  }

  getConsumptionValues(tenantId: string, since: Date): Promise<readonly ItemConsumptionValue[]> {
    return this.tx(tenantId, (repo) => repo.getConsumptionValues(tenantId, since));
  }

  applyAbcClasses(tenantId: string, assignments: readonly AbcClassAssignment[], updatedBy?: string): Promise<void> {
    return this.tx(tenantId, (repo) => repo.applyAbcClasses(tenantId, assignments, updatedBy));
  }

  /** A ÚNICA porta para o banco: transação tenant-scoped + falha transitória → 503 `stock_busy`. */
  private async tx<T>(tenantId: string, work: (repo: PrismaInventoryRepository) => Promise<T>): Promise<T> {
    try {
      return await withTenantRls(this.prismaClient, tenantId, (tx) => work(new PrismaInventoryRepository(tx)));
    } catch (error) {
      throw mapTransientDbFailure(error, stockBusyError);
    }
  }
}

export async function createPrismaInventoryRepository(): Promise<RlsPrismaInventoryRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaInventoryRepository(prisma);
}

function buildItemWhere(input: ListInventoryItemsInput): Prisma.InventoryItemWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.abcClass !== undefined ? { abc_class: input.abcClass } : {}),
    ...(input.search
      ? {
          OR: [
            { sku: { contains: input.search, mode: "insensitive" } },
            { name: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function buildMovementWhere(input: ListStockMovementsInput): Prisma.StockMovementWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.itemId ? { item_id: input.itemId } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.workOrderId ? { work_order_id: input.workOrderId } : {}),
    ...(input.cycleCountId ? { cycle_count_id: input.cycleCountId } : {}),
    ...(input.from || input.to
      ? {
          created_at: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };
}

function mapItemRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly min_quantity: unknown;
  readonly max_quantity: unknown;
  readonly abc_class: string | null;
  readonly avg_cost: unknown;
  readonly lead_time_days: number | null;
  readonly safety_stock: unknown;
  readonly is_active: boolean;
  readonly is_fuel: boolean;
  readonly item_type: string;
  readonly purchase_price: unknown;
  readonly sale_price: unknown;
  readonly description: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): InventoryItem {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    sku: record.sku,
    name: record.name,
    unit: record.unit,
    minQuantity: decimalToNumber(record.min_quantity),
    maxQuantity: optionalDecimal(record.max_quantity),
    abcClass: (record.abc_class as InventoryAbcClass | null) ?? undefined,
    avgCost: decimalToNumber(record.avg_cost),
    leadTimeDays: record.lead_time_days ?? undefined,
    safetyStock: optionalDecimal(record.safety_stock),
    isActive: record.is_active,
    isFuel: record.is_fuel,
    itemType: (record.item_type as InventoryItemType | null) ?? "product",
    purchasePrice: optionalDecimal(record.purchase_price),
    salePrice: optionalDecimal(record.sale_price),
    description: record.description ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapMovementRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly item_id: string;
  readonly type: string;
  readonly quantidade_sinalizada: unknown;
  readonly unit_cost: unknown;
  readonly work_order_id: string | null;
  readonly vehicle_id: string | null;
  readonly reason: string | null;
  readonly cycle_count_id: string | null;
  readonly custody_type: string;
  readonly custody_operator_profile_id: string | null;
  readonly custody_vehicle_id: string | null;
  readonly transfer_group_id: string | null;
  readonly reverses_movement_id: string | null;
  readonly source_type: string | null;
  readonly source_id: string | null;
  readonly created_by: string | null;
  readonly created_at: Date;
}): StockMovement {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    itemId: record.item_id,
    type: record.type as StockMovementType,
    quantidadeSinalizada: decimalToNumber(record.quantidade_sinalizada),
    unitCost: optionalDecimal(record.unit_cost),
    workOrderId: record.work_order_id ?? undefined,
    vehicleId: record.vehicle_id ?? undefined,
    reason: record.reason ?? undefined,
    cycleCountId: record.cycle_count_id ?? undefined,
    custodyType: (record.custody_type as StockCustodyType | null) ?? "base",
    custodyOperatorProfileId: record.custody_operator_profile_id ?? undefined,
    custodyVehicleId: record.custody_vehicle_id ?? undefined,
    transferGroupId: record.transfer_group_id ?? undefined,
    reversesMovementId: record.reverses_movement_id ?? undefined,
    sourceType: record.source_type ?? undefined,
    sourceId: record.source_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
  };
}

/**
 * B-O6R-04a (N-03, emenda 2-m) — falha que o TEMPO resolve vira o erro de domínio `busy()` (503); qualquer outra
 * passa intacta. Lista FECHADA de códigos (R15: nunca engolir erro determinístico); detecta pelo CÓDIGO, nunca pela
 * mensagem. Precedente: `checklist-prisma.repository.ts` (isTransientDatabaseFailure).
 *   P2028  transação interativa expirada (a espera pelo lock passou do timeout de 5 s do `$transaction`)
 *   P2034  conflito de escrita / impasse (wrapper Prisma)
 *   P2024  pool esgotado esperando conexão
 *   40P01  deadlock_detected · 40001 serialization_failure · 55P03 lock_not_available
 */
const TRANSIENT_DB_CODES: ReadonlySet<string> = new Set(["P2028", "P2034", "P2024", "40P01", "40001", "55P03"]);

export function mapTransientDbFailure(error: unknown, busy: () => Error): unknown {
  return databaseErrorCodes(error).some((code) => TRANSIENT_DB_CODES.has(code)) ? busy() : error;
}

/**
 * Códigos candidatos de um erro de banco, nas TRÊS formas medidas no Prisma 7 + `@prisma/adapter-pg`:
 *   · `PrismaClientKnownRequestError.code`                              (ex.: P2028, P2002)
 *   · query ORM → `DriverAdapterError.cause.code` / `.cause.originalCode` (ex.: 40P01 num updateMany)
 *   · query crua → `P2010` com `meta.driverAdapterError.cause.code`      (ex.: 40P01 num $queryRaw … FOR UPDATE)
 * e o `meta.code` do precedente dos checklists, por compatibilidade.
 */
export function databaseErrorCodes(error: unknown): readonly string[] {
  if (typeof error !== "object" || error === null) return [];

  const codes: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value !== "") codes.push(value);
  };
  const record = error as {
    readonly code?: unknown;
    readonly meta?: { readonly code?: unknown; readonly driverAdapterError?: { readonly cause?: { readonly code?: unknown; readonly originalCode?: unknown } } };
    readonly cause?: { readonly code?: unknown; readonly originalCode?: unknown };
  };

  push(record.code);
  push(record.meta?.code);
  push(record.meta?.driverAdapterError?.cause?.code);
  push(record.meta?.driverAdapterError?.cause?.originalCode);
  push(record.cause?.code);
  push(record.cause?.originalCode);

  return codes;
}

/** Violação de índice único (Prisma `P2002` / Postgres `23505`), pelo código em qualquer das formas acima. */
function isUniqueViolation(error: unknown): boolean {
  return databaseErrorCodes(error).some((code) => code === "P2002" || code === "23505");
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
