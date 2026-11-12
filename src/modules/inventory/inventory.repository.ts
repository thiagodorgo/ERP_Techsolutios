import { randomUUID } from "node:crypto";

import {
  computeMovingAverage,
  deriveReorder,
  REORDER_USAGE_WINDOW_DAYS,
  roundToDecimalPrecision,
  sumSignedQuantities,
  wouldOverdraw,
} from "./inventory.calculations.js";
import {
  custodyOfMovement,
  duplicateSkuError,
  stockBaixaReversedError,
  insufficientBalanceError,
  type AbcClassAssignment,
  type CreateInventoryItemInput,
  type CreateStockExitForSourceInput,
  type CreateStockMovementInput,
  type CreateTransferInput,
  type CustodyItemBalance,
  type CustodySummaryRaw,
  type InventoryItem,
  type InventoryItemView,
  type InventoryItemWithSaldo,
  type ItemConsumptionValue,
  type ListInventoryItemsInput,
  type ListInventoryItemsResult,
  type ListStockMovementsInput,
  type ListStockMovementsResult,
  type RemoveStockExitForSourceInput,
  type ReverseStockMovementInput,
  type ReverseStockMovementResult,
  type StockCustody,
  type StockMovement,
  type StockTransferResult,
  type UpdateInventoryItemInput,
} from "./inventory.types.js";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** Movement types that count as OUTFLOW for the R7.5 usage window (saida + consumo). */
const OUTFLOW_TYPES = new Set(["saida", "consumo"]);

/** Ω4C PR-08 — the default custody bucket (BASE): both typed refs empty. */
const BASE_CUSTODY: StockCustody = { custodyType: "base" };

/** Ω4C PR-08 — a movement belongs to `custody` when type + both typed refs match exactly (null-normalized). */
function custodyMatches(movement: StockMovement, custody: StockCustody): boolean {
  return (
    movement.custodyType === custody.custodyType &&
    (movement.custodyOperatorProfileId ?? undefined) === (custody.custodyOperatorProfileId ?? undefined) &&
    (movement.custodyVehicleId ?? undefined) === (custody.custodyVehicleId ?? undefined)
  );
}

/** B-SAN3-15a — um balde do razão: o saldo de um item numa custódia (derivado, nunca coluna). */
type CustodyBucket = {
  readonly itemId: string;
  readonly custodyType: StockMovement["custodyType"];
  readonly custodyOperatorProfileId?: string;
  readonly custodyVehicleId?: string;
  readonly available: number;
};

/**
 * B-SAN3-15a (P1) — a linha do razão (ou o balde que a soma) é da custódia PROFISSIONAL deste perfil? O perfil é o do
 * ator, escolhido pelo servidor (`resolveActorStockCustody`); a custódia de outro profissional nunca casa.
 */
function isSameProfessionalCustody(
  movement: Pick<StockMovement, "custodyType" | "custodyOperatorProfileId">,
  custody: StockCustody,
): boolean {
  return (
    custody.custodyType === "professional" &&
    movement.custodyType === "professional" &&
    movement.custodyOperatorProfileId === custody.custodyOperatorProfileId
  );
}

export interface InventoryRepository {
  createItem(input: CreateInventoryItemInput): Promise<InventoryItem>;
  listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult>;
  findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined>;
  findItemBySku(tenantId: string, sku: string): Promise<InventoryItem | undefined>;
  findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemView | undefined>;
  updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined>;
  /**
   * R7.1/R7.3 — the transactional flow: derive saldo (Σ quantidade_sinalizada),
   * throw 409 insufficient_balance when a negative movement would overdraw,
   * recompute the moving average on `entrada` and persist movement + avg_cost
   * atomically. Returns `undefined` when the item is missing in-tenant.
   */
  createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined>;
  /**
   * Ω4C PR-08 — a BASE↔custody transfer (LINK/UNLINK). Writes the sibling pair atomically with the
   * per-custody non-negative guard on the ORIGIN. Returns `undefined` when the item is missing in-tenant.
   */
  createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined>;
  /**
   * Ω4C PR-08 — post the compensating movement(s) for a movement (or its whole transfer group). The original
   * stays intact (imutabilidade); a second reverse is rejected (`already_reversed`).
   */
  reverseMovement(input: ReverseStockMovementInput): Promise<ReverseStockMovementResult>;
  /** Ω4C PR-08 — per-custody aggregation (baseQty + professionals/vehicles), derived from the ledger. */
  getCustodySummary(tenantId: string, itemId: string): Promise<CustodySummaryRaw>;
  /**
   * B-SAN3-15a (P1) — o saldo de CADA item numa custódia (a profissional de um perfil, ou a BASE), derivado do razão
   * (Σ quantidade_sinalizada), com o item da organização. Leitura de exibição: não decide escrita (a baixa confere o
   * saldo sob o lock do item). O filtro de saldo > 0 e de item ativo é do serviço.
   */
  listCustodyBalances(tenantId: string, custody: StockCustody): Promise<readonly CustodyItemBalance[]>;
  /**
   * Ω4C PR-08b — the EXIT movement (`saida`) posted for a source (fuel_log/maintenance_item), if any. At most one
   * row per (tenant, source_type, source_id) thanks to the partial unique index. Returned RAW (reversed or not).
   */
  findExitBySource(tenantId: string, sourceType: string, sourceId: string): Promise<StockMovement | undefined>;
  /** Ω4C PR-08b — true when a compensating movement already points at the given movement (reversed EXIT). */
  isExitReversed(tenantId: string, movementId: string): Promise<boolean>;
  /**
   * Ω4C PR-08b — idempotent EXIT for a source inside ONE tx: reuse the existing EXIT (409 when it was already
   * reversed — re-baixa one-shot), else guard the selected custody balance (409 insufficient_balance) and insert a single
   * `saida` carrying source_type/source_id. Returns `undefined` when the item is missing in-tenant.
   */
  createExitForSource(input: CreateStockExitForSourceInput): Promise<StockMovement | undefined>;
  /**
   * Ω4C PR-08b — compensating reversal of a source's EXIT (opposite sign, source_id NULL). Missing / already
   * reversed → no-op (`undefined`). The original EXIT stays intact (ledger imutável).
   */
  removeExitForSource(input: RemoveStockExitForSourceInput): Promise<StockMovement | undefined>;
  listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult>;
  findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined>;
  /** R7.4 — consumption value (Σ |qty| × cost) over the ABC window, per ACTIVE item. */
  getConsumptionValues(tenantId: string, since: Date): Promise<readonly ItemConsumptionValue[]>;
  /** R7.4 — atomically write the ABC class for the classified items. */
  applyAbcClasses(tenantId: string, assignments: readonly AbcClassAssignment[], updatedBy?: string): Promise<void>;
  reset?(): void;
}

export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly items = new Map<string, InventoryItem>();
  private readonly movements = new Map<string, StockMovement>();
  private movementSequence = 0;
  private readonly movementOrder = new Map<string, number>();

  async createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    // P6 — composite unique (tenant_id, sku). Same sku in another tenant is
    // allowed; duplicate in the SAME tenant is a 409.
    if (this.hasSku(input.tenantId, input.sku)) {
      throw duplicateSkuError();
    }

    const now = new Date();
    const item: InventoryItem = {
      ...input,
      id: randomUUID(),
      abcClass: undefined,
      avgCost: 0,
      isActive: input.isActive ?? true,
      isFuel: input.isFuel ?? false,
      itemType: input.itemType ?? "product",
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);

    return item;
  }

  async listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult> {
    const now = new Date();
    const filtered = this.sortedItems()
      .filter((item) => item.tenantId === input.tenantId)
      .filter((item) => input.isActive === undefined || item.isActive === input.isActive)
      .filter((item) => input.abcClass === undefined || item.abcClass === input.abcClass)
      .filter((item) => matchesSearch(item, input.search))
      .map((item) => this.withView(item, now))
      .filter((item) => matchesBelowMin(item, input.belowMin))
      .filter((item) => matchesNeedsReorder(item, input.needsReorder));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined> {
    const item = this.items.get(itemId);

    return item?.tenantId === tenantId ? item : undefined;
  }

  async findItemBySku(tenantId: string, sku: string): Promise<InventoryItem | undefined> {
    return [...this.items.values()].find((item) => item.tenantId === tenantId && item.sku === sku);
  }

  async findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemView | undefined> {
    const item = await this.findItemById(tenantId, itemId);

    return item ? this.withView(item, new Date()) : undefined;
  }

  async updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined> {
    const current = await this.findItemById(input.tenantId, input.itemId);
    if (!current) return undefined;

    if (input.sku !== undefined && input.sku !== current.sku && this.hasSku(input.tenantId, input.sku, current.id)) {
      throw duplicateSkuError();
    }

    const updated: InventoryItem = {
      ...current,
      ...definedFields(input),
      id: current.id,
      tenantId: current.tenantId,
      updatedAt: new Date(),
    };
    this.items.set(updated.id, updated);

    return updated;
  }

  async createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined> {
    const item = await this.findItemById(input.tenantId, input.itemId);
    if (!item) return undefined;

    const custody = input.custody ?? BASE_CUSTODY;

    // R7.1 + Ω4C PR-08 — the non-negative guard runs against THIS custody's balance (stricter than the
    // legacy global guard: custody base ⊆ global). A negative movement that would overdraw the custody is
    // rejected (409) and nothing is written. The synchronous check-then-write mirrors the Prisma transaction.
    const custodySaldoBefore = this.saldoOfCustody(input.tenantId, input.itemId, custody);

    if (wouldOverdraw(custodySaldoBefore, input.quantidadeSinalizada)) {
      throw insufficientBalanceError(custodySaldoBefore);
    }

    // R7.3 — moving average recalculated on `entrada`, atomically with the insert. Uses the GLOBAL on-hand
    // (avg cost is an item-wide attribute); entrada always lands in BASE (D-Ω4C-INV-MOVEMENT-TYPES).
    if (input.type === "entrada" && input.unitCost !== undefined) {
      const globalSaldoBefore = this.saldoOf(input.tenantId, input.itemId);
      const avgCost = computeMovingAverage(globalSaldoBefore, item.avgCost, input.quantidadeSinalizada, input.unitCost);
      this.items.set(item.id, { ...item, avgCost, updatedBy: input.createdBy ?? item.updatedBy, updatedAt: new Date() });
    }

    return this.insertMovement({ ...input, custody });
  }

  async createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {
    const item = await this.findItemById(input.tenantId, input.itemId);
    if (!item) return undefined;

    // Ω4C PR-08 — LINK = BASE→custody; UNLINK = custody→BASE. The pair nets to zero globally; guard the ORIGIN.
    const origin = input.type === "link" ? BASE_CUSTODY : input.custody;
    const destination = input.type === "link" ? input.custody : BASE_CUSTODY;
    const quantity = roundToDecimalPrecision(Math.abs(input.quantity));

    const originSaldo = this.saldoOfCustody(input.tenantId, input.itemId, origin);
    if (wouldOverdraw(originSaldo, -quantity)) {
      throw insufficientBalanceError(originSaldo);
    }

    const transferGroupId = randomUUID();
    const from = this.insertMovement({
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantidadeSinalizada: -quantity,
      reason: input.reason,
      custody: origin,
      transferGroupId,
      createdBy: input.createdBy,
    });
    const to = this.insertMovement({
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantidadeSinalizada: quantity,
      reason: input.reason,
      custody: destination,
      transferGroupId,
      createdBy: input.createdBy,
    });

    return { from, to };
  }

  async reverseMovement(input: ReverseStockMovementInput): Promise<ReverseStockMovementResult> {
    const original = await this.findMovementById(input.tenantId, input.movementId);
    if (!original) return { status: "not_found" };

    const siblings = original.transferGroupId
      ? this.movementsInGroup(input.tenantId, original.transferGroupId)
      : [original];
    const siblingIds = new Set(siblings.map((movement) => movement.id));

    if (this.hasReversalOf(input.tenantId, siblingIds)) {
      return { status: "already_reversed" };
    }

    // Insert credits (positive legs) before debits (negative legs) so a legitimate reversal never trips the
    // per-custody guard on ordering. A genuine overdraw (stock already left the custody) still raises 409.
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
      const custodySaldoBefore = this.saldoOfCustody(input.tenantId, leg.itemId, custody);
      if (wouldOverdraw(custodySaldoBefore, signed)) {
        throw insufficientBalanceError(custodySaldoBefore);
      }

      movements.push(
        this.insertMovement({
          tenantId: input.tenantId,
          itemId: leg.itemId,
          type: leg.type,
          quantidadeSinalizada: signed,
          reason: input.reason,
          custody,
          transferGroupId,
          reversesMovementId: leg.id,
          createdBy: input.createdBy,
        }),
      );
    }

    return { status: "ok", movements };
  }

  async getCustodySummary(tenantId: string, itemId: string): Promise<CustodySummaryRaw> {
    const rows = [...this.movements.values()].filter(
      (movement) => movement.tenantId === tenantId && movement.itemId === itemId,
    );

    let baseQty = 0;
    const professionalById = new Map<string, number>();
    const vehicleById = new Map<string, number>();

    for (const movement of rows) {
      if (movement.custodyType === "professional" && movement.custodyOperatorProfileId) {
        professionalById.set(
          movement.custodyOperatorProfileId,
          (professionalById.get(movement.custodyOperatorProfileId) ?? 0) + movement.quantidadeSinalizada,
        );
      } else if (movement.custodyType === "vehicle" && movement.custodyVehicleId) {
        vehicleById.set(movement.custodyVehicleId, (vehicleById.get(movement.custodyVehicleId) ?? 0) + movement.quantidadeSinalizada);
      } else {
        baseQty += movement.quantidadeSinalizada;
      }
    }

    return {
      baseQty: roundToDecimalPrecision(baseQty),
      professionals: [...professionalById.entries()]
        .map(([operatorProfileId, qty]) => ({ operatorProfileId, qty: roundToDecimalPrecision(qty) }))
        .filter((entry) => entry.qty !== 0),
      vehicles: [...vehicleById.entries()]
        .map(([vehicleId, qty]) => ({ vehicleId, qty: roundToDecimalPrecision(qty) }))
        .filter((entry) => entry.qty !== 0),
    };
  }

  async listCustodyBalances(tenantId: string, custody: StockCustody): Promise<readonly CustodyItemBalance[]> {
    const byItem = new Map<string, number>();

    // Os baldes da organização (item × custódia) e, deles, só os da custódia pedida: a BASE, ou a profissional DESTE
    // perfil. Custódia de viatura não se resolve pelo ator (P-SAN3-15-CUSTODIA-VIATURA): nunca entra.
    for (const balance of this.custodyBuckets(tenantId)) {
      if (custody.custodyType === "base") {
        if (balance.custodyType !== "base") continue;
      } else if (!isSameProfessionalCustody(balance, custody)) {
        continue;
      }
      byItem.set(balance.itemId, (byItem.get(balance.itemId) ?? 0) + balance.available);
    }

    return [...byItem.entries()].map(([itemId, available]) => {
      const item = this.items.get(itemId);

      return {
        item: item?.tenantId === tenantId ? item : undefined,
        available: roundToDecimalPrecision(available),
      };
    });
  }

  async findExitBySource(tenantId: string, sourceType: string, sourceId: string): Promise<StockMovement | undefined> {
    // At most one EXIT row per (tenant, source_type, source_id) — the partial unique index in Prisma; here a scan.
    return [...this.movements.values()].find(
      (movement) =>
        movement.tenantId === tenantId && movement.sourceType === sourceType && movement.sourceId === sourceId,
    );
  }

  async isExitReversed(tenantId: string, movementId: string): Promise<boolean> {
    return this.hasReversalOf(tenantId, new Set([movementId]));
  }

  async createExitForSource(input: CreateStockExitForSourceInput): Promise<StockMovement | undefined> {
    const item = await this.findItemById(input.tenantId, input.itemId);
    if (!item) return undefined;

    // Idempotência ABSOLUTA por origem (backstop do índice parcial único): no MÁX. 1 EXIT por fonte.
    const existing = await this.findExitBySource(input.tenantId, input.sourceType, input.sourceId);
    if (existing) {
      if (await this.isExitReversed(input.tenantId, existing.id)) {
        throw stockBaixaReversedError();
      }
      return existing;
    }

    // RN-BAIXA-01 — o guard de saldo da custódia selecionada roda ANTES de gravar. Sem custódia explícita,
    // combustível e manutenção preservam a BASE fixada por D-Ω4C-INV-STOCK-DECREMENT.
    const signed = -roundToDecimalPrecision(Math.abs(input.quantity));
    const custody = input.custody ?? BASE_CUSTODY;
    const custodySaldoBefore = this.saldoOfCustody(input.tenantId, input.itemId, custody);
    if (wouldOverdraw(custodySaldoBefore, signed)) {
      throw insufficientBalanceError(custodySaldoBefore);
    }

    return this.insertMovement({
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: "saida",
      quantidadeSinalizada: signed,
      workOrderId: input.workOrderId,
      vehicleId: input.vehicleId,
      reason: input.reason,
      custody,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
    });
  }

  async removeExitForSource(input: RemoveStockExitForSourceInput): Promise<StockMovement | undefined> {
    const exit = await this.findExitBySource(input.tenantId, input.sourceType, input.sourceId);
    if (!exit) return undefined; // no-op: nunca houve baixa desta fonte.
    if (await this.isExitReversed(input.tenantId, exit.id)) return undefined; // no-op idempotente.

    // Estorno compensatório (D-Ω4C-INV-LEDGER-IMMUTABLE): sinal oposto, mesma custódia BASE, source_id NULL (fora
    // do índice parcial) e reverses_movement_id apontando ao EXIT. O crédito nunca provoca overdraw.
    return this.insertMovement({
      tenantId: input.tenantId,
      itemId: exit.itemId,
      type: exit.type,
      quantidadeSinalizada: roundToDecimalPrecision(-exit.quantidadeSinalizada),
      vehicleId: exit.vehicleId,
      reason: input.reason ?? exit.reason,
      custody: custodyOfMovement(exit),
      reversesMovementId: exit.id,
      createdBy: input.createdBy ?? exit.createdBy,
    });
  }

  private insertMovement(
    input: CreateStockMovementInput & { readonly custody: StockCustody; readonly transferGroupId?: string; readonly reversesMovementId?: string },
  ): StockMovement {
    const movement: StockMovement = {
      id: randomUUID(),
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantidadeSinalizada: input.quantidadeSinalizada,
      unitCost: input.unitCost,
      workOrderId: input.workOrderId,
      vehicleId: input.vehicleId,
      reason: input.reason,
      cycleCountId: input.cycleCountId,
      custodyType: input.custody.custodyType,
      custodyOperatorProfileId: input.custody.custodyOperatorProfileId,
      custodyVehicleId: input.custody.custodyVehicleId,
      transferGroupId: input.transferGroupId,
      reversesMovementId: input.reversesMovementId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };

    this.movements.set(movement.id, movement);
    this.movementSequence += 1;
    this.movementOrder.set(movement.id, this.movementSequence);

    return movement;
  }

  private movementsInGroup(tenantId: string, transferGroupId: string): StockMovement[] {
    return [...this.movements.values()].filter(
      (movement) => movement.tenantId === tenantId && movement.transferGroupId === transferGroupId,
    );
  }

  private hasReversalOf(tenantId: string, movementIds: ReadonlySet<string>): boolean {
    return [...this.movements.values()].some(
      (movement) =>
        movement.tenantId === tenantId &&
        movement.reversesMovementId !== undefined &&
        movementIds.has(movement.reversesMovementId),
    );
  }

  /** B-SAN3-15a — Σ quantidade_sinalizada por (item, custódia) da organização: os "baldes" do razão. */
  private custodyBuckets(tenantId: string): CustodyBucket[] {
    const buckets = new Map<string, CustodyBucket>();

    for (const movement of this.movements.values()) {
      if (movement.tenantId !== tenantId) continue;
      const key = [movement.itemId, movement.custodyType, movement.custodyOperatorProfileId ?? "", movement.custodyVehicleId ?? ""].join("|");
      const current = buckets.get(key);
      buckets.set(key, {
        itemId: movement.itemId,
        custodyType: movement.custodyType,
        custodyOperatorProfileId: movement.custodyOperatorProfileId,
        custodyVehicleId: movement.custodyVehicleId,
        available: (current?.available ?? 0) + movement.quantidadeSinalizada,
      });
    }

    return [...buckets.values()];
  }

  private saldoOfCustody(tenantId: string, itemId: string, custody: StockCustody): number {
    return sumSignedQuantities(
      [...this.movements.values()]
        .filter(
          (movement) =>
            movement.tenantId === tenantId && movement.itemId === itemId && custodyMatches(movement, custody),
        )
        .map((movement) => movement.quantidadeSinalizada),
    );
  }

  async listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    const filtered = this.sortedMovements()
      .filter((movement) => movement.tenantId === input.tenantId)
      .filter((movement) => input.itemId === undefined || movement.itemId === input.itemId)
      .filter((movement) => input.type === undefined || movement.type === input.type)
      .filter((movement) => input.workOrderId === undefined || movement.workOrderId === input.workOrderId)
      .filter((movement) => input.cycleCountId === undefined || movement.cycleCountId === input.cycleCountId)
      .filter((movement) => input.from === undefined || movement.createdAt.getTime() >= input.from.getTime())
      .filter((movement) => input.to === undefined || movement.createdAt.getTime() <= input.to.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    const movement = this.movements.get(movementId);

    return movement?.tenantId === tenantId ? movement : undefined;
  }

  async getConsumptionValues(tenantId: string, since: Date): Promise<readonly ItemConsumptionValue[]> {
    const activeItems = [...this.items.values()].filter((item) => item.tenantId === tenantId && item.isActive);

    return activeItems.map((item) => {
      const consumptionValue = [...this.movements.values()]
        .filter(
          (movement) =>
            movement.tenantId === tenantId &&
            movement.itemId === item.id &&
            OUTFLOW_TYPES.has(movement.type) &&
            movement.createdAt.getTime() >= since.getTime(),
        )
        .reduce(
          (sum, movement) => sum + Math.abs(movement.quantidadeSinalizada) * (movement.unitCost ?? item.avgCost),
          0,
        );

      return { id: item.id, consumptionValue: roundToDecimalPrecision(consumptionValue) };
    });
  }

  async applyAbcClasses(tenantId: string, assignments: readonly AbcClassAssignment[], updatedBy?: string): Promise<void> {
    for (const assignment of assignments) {
      const item = this.items.get(assignment.id);
      if (!item || item.tenantId !== tenantId) continue;

      this.items.set(item.id, {
        ...item,
        abcClass: assignment.abcClass,
        updatedBy: updatedBy ?? item.updatedBy,
        updatedAt: new Date(),
      });
    }
  }

  reset(): void {
    this.items.clear();
    this.movements.clear();
    this.movementOrder.clear();
    this.movementSequence = 0;
  }

  private withView(item: InventoryItem, now: Date): InventoryItemView {
    const saldo = this.saldoOf(item.tenantId, item.id);
    const usageAbs = this.usageOf(item.tenantId, item.id, now);
    const { reorderPoint, needsReorder } = deriveReorder({
      saldo,
      usageAbs,
      leadTimeDays: item.leadTimeDays,
      safetyStock: item.safetyStock,
    });

    return { ...item, saldo, reorderPoint, needsReorder };
  }

  private saldoOf(tenantId: string, itemId: string): number {
    return sumSignedQuantities(
      [...this.movements.values()]
        .filter((movement) => movement.tenantId === tenantId && movement.itemId === itemId)
        .map((movement) => movement.quantidadeSinalizada),
    );
  }

  /** R7.5 — absolute outflow (saida + consumo) over the last REORDER window. */
  private usageOf(tenantId: string, itemId: string, now: Date): number {
    const since = now.getTime() - REORDER_USAGE_WINDOW_DAYS * MILLIS_PER_DAY;

    return roundToDecimalPrecision(
      [...this.movements.values()]
        .filter(
          (movement) =>
            movement.tenantId === tenantId &&
            movement.itemId === itemId &&
            OUTFLOW_TYPES.has(movement.type) &&
            movement.createdAt.getTime() >= since,
        )
        .reduce((sum, movement) => sum + Math.abs(movement.quantidadeSinalizada), 0),
    );
  }

  private hasSku(tenantId: string, sku: string, exceptId?: string): boolean {
    const normalized = sku.toLowerCase();

    return [...this.items.values()].some(
      (item) => item.tenantId === tenantId && item.id !== exceptId && item.sku.toLowerCase() === normalized,
    );
  }

  private sortedItems(): InventoryItem[] {
    return [...this.items.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }

  private sortedMovements(): StockMovement[] {
    return [...this.movements.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return (this.movementOrder.get(right.id) ?? 0) - (this.movementOrder.get(left.id) ?? 0);
    });
  }
}

function matchesSearch(item: InventoryItem, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return item.sku.toLowerCase().includes(normalized) || item.name.toLowerCase().includes(normalized);
}

function matchesBelowMin(item: InventoryItemWithSaldo, belowMin: boolean | undefined): boolean {
  if (belowMin === undefined) return true;

  return belowMin ? item.saldo < item.minQuantity : item.saldo >= item.minQuantity;
}

function matchesNeedsReorder(item: InventoryItemView, needsReorder: boolean | undefined): boolean {
  if (needsReorder === undefined) return true;

  return item.needsReorder === needsReorder;
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
