import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { createDefaultSupplierService } from "../suppliers/supplier.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import { computeEfficiency } from "./fuel-log.efficiency.js";
import {
  InMemoryFuelLogRepository,
  type FuelLogRepository,
} from "./fuel-log.repository.js";
import type {
  FuelLog,
  FuelLogActorContext,
  FuelLogWithEfficiency,
  ListFuelLogsInput,
  ListFuelLogsWithEfficiencyResult,
  StationType,
  UpdateFuelLogInput,
} from "./fuel-log.types.js";
import { DEFAULT_FUEL_TYPE, DEFAULT_STATION_TYPE, FuelLogError } from "./fuel-log.types.js";
import {
  parseFuelType,
  parseFueledAt,
  parseLimit,
  parseLiters,
  parseOdometer,
  parseOffset,
  parseOptionalDate,
  parseOptionalFuelType,
  parseOptionalLiters,
  parseOptionalNotes,
  parseOptionalOdometer,
  parseOptionalSearch,
  parseOptionalStation,
  parseOptionalStationType,
  parseOptionalTotalValue,
  parseOptionalUuid,
  parseRequiredUuid,
  parseStationType,
  parseTotalValue,
  readOptionalBoolean,
} from "./fuel-log.validators.js";

/** Ω4C PR-05 — fornecedor resolvido do módulo suppliers (tenant-scoped): existência p/ validação +
 * nome p/ label §2.8. `null` = não pertence a este tenant / não existe. */
type ResolvedSupplier = { readonly id: string; readonly name: string };

type RawRecord = Record<string, unknown>;

/**
 * Tenant-scoped lookup used to validate the required `vehicle_id` reference.
 * Mirrors the work-order reference resolver: the resolver receives the acting
 * tenant context, so a cross-tenant / missing id resolves to "not found" and is
 * rejected as an invalid reference (400).
 */
/**
 * Ω4C PR-08b — o contrato NÃO-AMPLIFICADOR da baixa: o abastecimento só informa QUAL item e a quantidade TRAVADA
 * (liters). O seam do inventory FIXA tipo/custódia/reason/source (o consumidor nunca escolhe). `sourceId` = o id
 * PRÉ-GERADO do fuel_log (EXIT-first).
 */
export type FuelLogStockExitInput = {
  readonly sourceId: string;
  readonly stockItemId: string;
  readonly quantity: number;
  readonly vehicleId?: string;
};

export type FuelLogReferenceResolvers = {
  readonly resolveVehicle?: (actor: FuelLogActorContext, id: string) => Promise<boolean>;
  /**
   * Ω4C PR-05 — resolve o fornecedor no tenant do ator (espelha resolveVehicle). Devolve o registro
   * (id+nome) quando existe no tenant, ou `null` (cross-tenant / inexistente) → 400 na fronteira.
   */
  readonly resolveSupplier?: (actor: FuelLogActorContext, id: string) => Promise<ResolvedSupplier | null>;
  /**
   * Ω4C PR-08b — EFEITO DE DOMÍNIO service→service (como scheduleNextDueNotification do PR-06): posta a baixa de
   * estoque do abastecimento INTERNO no InventoryService. NÃO exige `stock_movements:create` do usuário (o gate é
   * `fuel_logs:create`). O erro do seam (409 insufficient_balance / 422 item_not_fuel) PROPAGA (não é engolido).
   */
  readonly postStockExit?: (actor: FuelLogActorContext, input: FuelLogStockExitInput) => Promise<void>;
  /** Ω4C PR-08b — estorno compensatório da baixa (desativar o abastecimento). No-op idempotente. */
  readonly reverseStockExit?: (actor: FuelLogActorContext, fuelLogId: string) => Promise<void>;
  /** Ω4C PR-08b — existe baixa ATIVA (não estornada) desta fonte? (trava de edição RN-BAIXA-07 + badge). */
  readonly hasActiveStockExit?: (actor: FuelLogActorContext, fuelLogId: string) => Promise<boolean>;
};

export class FuelLogService {
  constructor(
    private readonly repository: FuelLogRepository,
    private readonly references: FuelLogReferenceResolvers = {},
  ) {}

  async list(actor: FuelLogActorContext, query: RawRecord): Promise<ListFuelLogsWithEfficiencyResult> {
    const input: ListFuelLogsInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      from: parseOptionalDate(query.from, "from"),
      to: parseOptionalDate(query.to, "to"),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    const result = await this.repository.list(input);
    const items = await this.attachEfficiencyToPage(actor, result.items);

    return {
      items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  async create(actor: FuelLogActorContext, body: RawRecord): Promise<FuelLogWithEfficiency> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const odometer = parseOdometer(body.odometer);
    // RN-ABA-05 — "desconsiderar último KM": override TRANSIENTE (não persistido) que bypassa o guard
    // monotônico (1º abastecimento / correção). Sem a flag, odômetro regressivo continua 422.
    const ignorePreviousOdometer =
      readOptionalBoolean(body.ignore_previous_odometer ?? body.ignorePreviousOdometer) ?? false;
    if (!ignorePreviousOdometer) {
      await this.assertOdometerMonotonic(actor.tenantId, vehicleId, odometer);
    }

    // RN-ABA-01/02 — posto interno/externo + fornecedor. EXTERNO explícito exige supplier (422); INTERNO
    // proíbe supplier (422); supplier cross-tenant/inexistente → 400 (resolver server-side).
    const stationTypeProvided = hasBodyValue(body, "station_type", "stationType");
    const stationType = parseStationType(body.station_type ?? body.stationType, DEFAULT_STATION_TYPE);

    // Ω4C PR-08b (RN-BAIXA-06) — a baixa só existe no abastecimento INTERNO. EXTERNO + stock_item_id → 422
    // (verificado ANTES de resolver o fornecedor: a incompatibilidade de escopo não depende do supplier).
    const stockItemId = parseOptionalUuid(body.stock_item_id ?? body.stockItemId, "stockItemId");
    if (stockItemId !== undefined && stationType !== "internal") {
      throw new FuelLogError(
        422,
        "FUEL_LOG_INVALID",
        "stock_item_not_allowed_for_external",
        "Abastecimento EXTERNO não baixa estoque (stock_item_id só no INTERNO).",
      );
    }

    const supplierId = parseOptionalUuid(body.supplier_id ?? body.supplierId, "supplierId");
    const resolved = await this.resolveStationAndSupplier(actor, {
      stationType,
      stationTypeExplicit: stationTypeProvided,
      supplierId,
    });

    const liters = parseLiters(body.liters);

    // Ω4C PR-08b (RN-BAIXA-01) — EXIT-FIRST: pré-gera o id e posta a baixa (guard atômico → 409
    // insufficient_balance / 422 item_not_fuel) ANTES de persistir a linha → nunca deixa consumo órfão.
    const fuelLogId = randomUUID();
    const shouldDecrement = resolved.stationType === "internal" && stockItemId !== undefined;
    if (shouldDecrement) {
      await this.postStockExit(actor, { sourceId: fuelLogId, stockItemId, quantity: liters, vehicleId });
    }

    let fuelLog: FuelLog;
    try {
      fuelLog = await this.repository.create({
        id: fuelLogId,
        tenantId: actor.tenantId,
        vehicleId,
        operatorId: parseOptionalUuid(body.operator_id ?? body.operatorId, "operatorId"),
        workOrderId: parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId"),
        fueledAt: parseFueledAt(body.fueled_at ?? body.fueledAt),
        fuelType: parseFuelType(body.fuel_type ?? body.fuelType, DEFAULT_FUEL_TYPE),
        liters,
        totalValue: parseTotalValue(body.total_value ?? body.totalValue),
        odometer,
        station: parseOptionalStation(body.station),
        stationType: resolved.stationType,
        supplierId: resolved.supplierId ?? undefined,
        stockItemId,
        notes: parseOptionalNotes(body.notes),
        isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
    } catch (error) {
      // Saga com compensação (R1): o EXIT já foi postado mas o insert do consumidor falhou → estorna e re-lança.
      if (shouldDecrement) {
        await this.reverseStockExit(actor, fuelLogId);
      }
      throw error;
    }

    return this.withEfficiency(actor, fuelLog);
  }

  async get(actor: FuelLogActorContext, fuelLogId: string): Promise<FuelLogWithEfficiency> {
    const fuelLog = await this.getEntity(actor, fuelLogId);

    return this.withEfficiency(actor, fuelLog);
  }

  /**
   * Tenant-scoped, read-only max odometer for a vehicle across fuel logs. Reused
   * by the maintenance module (F2 R1.2) so the odometer stays monotonic across
   * BOTH fuel_logs and maintenance_orders.
   */
  async getMaxOdometerForVehicle(actor: FuelLogActorContext, vehicleId: string): Promise<number | undefined> {
    return this.repository.maxOdometerForVehicle(actor.tenantId, vehicleId);
  }

  async update(actor: FuelLogActorContext, fuelLogId: string, body: RawRecord): Promise<FuelLogWithEfficiency> {
    const existing = await this.getEntity(actor, fuelLogId);

    // Ω4C PR-08b (RN-BAIXA-07) — com uma baixa ATIVA, os campos que a determinam (liters/stock_item_id/station_type)
    // ficam TRAVADOS (409 stock_baixa_locked). Desativar o abastecimento (is_active=false) DESTRAVA revertendo a
    // baixa (estorno compensatório). Editar só notes/odometer/etc. permanece livre.
    const deactivating = existing.isActive && (body.is_active === false || body.isActive === false);
    const editsStockField = bodyHasField(body, "liters", "stock_item_id", "stockItemId", "station_type", "stationType");
    const activeExit = await this.hasActiveStockExit(actor, existing.id);
    if (activeExit && editsStockField && !deactivating) {
      throw new FuelLogError(
        409,
        "FUEL_LOG_CONFLICT",
        "stock_baixa_locked",
        "Existe uma baixa de estoque ATIVA — desative o abastecimento (reverte a baixa) antes de editar litros/item/posto.",
      );
    }

    const { stationType, supplierId } = await this.resolveStationAndSupplierForUpdate(actor, existing, body);
    const input: UpdateFuelLogInput = {
      tenantId: actor.tenantId,
      fuelLogId: parseRequiredUuid(fuelLogId, "fuelLogId"),
      operatorId: parseOptionalUuid(body.operator_id ?? body.operatorId, "operatorId"),
      workOrderId: parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId"),
      fuelType: parseOptionalFuelType(body.fuel_type ?? body.fuelType),
      liters: parseOptionalLiters(body.liters),
      totalValue: parseOptionalTotalValue(body.total_value ?? body.totalValue),
      odometer: parseOptionalOdometer(body.odometer),
      station: parseOptionalStation(body.station),
      stationType,
      supplierId,
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new FuelLogError(404, "FUEL_LOG_NOT_FOUND", "not_found", "Fuel log was not found.");
    }

    // Ω4C PR-08b (RN-BAIXA-05) — desativar reverte a baixa (idempotente; no-op se não houver EXIT ativo).
    if (deactivating && activeExit) {
      await this.reverseStockExit(actor, existing.id);
    }

    return this.withEfficiency(actor, updated);
  }

  private async postStockExit(actor: FuelLogActorContext, input: FuelLogStockExitInput): Promise<void> {
    const resolver = this.references.postStockExit;
    if (resolver) {
      await resolver(actor, input);
    }
  }

  private async reverseStockExit(actor: FuelLogActorContext, fuelLogId: string): Promise<void> {
    const resolver = this.references.reverseStockExit;
    if (resolver) {
      await resolver(actor, fuelLogId);
    }
  }

  private async hasActiveStockExit(actor: FuelLogActorContext, fuelLogId: string): Promise<boolean> {
    const resolver = this.references.hasActiveStockExit;

    return resolver ? resolver(actor, fuelLogId) : false;
  }

  private async getEntity(actor: FuelLogActorContext, fuelLogId: string): Promise<FuelLog> {
    const fuelLog = await this.repository.findById(actor.tenantId, parseRequiredUuid(fuelLogId, "fuelLogId"));

    if (!fuelLog) {
      throw new FuelLogError(404, "FUEL_LOG_NOT_FOUND", "not_found", "Fuel log was not found.");
    }

    return fuelLog;
  }

  private async assertVehicleReference(actor: FuelLogActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new FuelLogError(
        400,
        "FUEL_LOG_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }

  // RN-ABA-02 — resolve o fornecedor no tenant do ator (server-side). Cross-tenant / inexistente → 400.
  // Reusa o resolver do módulo suppliers (sem gate de permissão próprio, igual ao resolver de veículo).
  private async resolveSupplierReference(actor: FuelLogActorContext, supplierId: string): Promise<ResolvedSupplier> {
    const resolver = this.references.resolveSupplier;
    const supplier = resolver ? await resolver(actor, supplierId) : null;

    if (!supplier) {
      throw new FuelLogError(
        400,
        "FUEL_LOG_INVALID",
        "invalid_supplier_reference",
        "supplierId does not reference a supplier in this organization.",
      );
    }

    return supplier;
  }

  // RN-ABA-01/02 — reconcilia posto x fornecedor na CRIAÇÃO. EXTERNO explícito exige supplier (422);
  // INTERNO proíbe supplier (422). Sem `station_type` no corpo → default external SEM exigir supplier
  // (compat: logs legados / `station` texto-livre coexistem — D-Ω4C-FUEL-STATION-TYPE).
  private async resolveStationAndSupplier(
    actor: FuelLogActorContext,
    input: { readonly stationType: StationType; readonly stationTypeExplicit: boolean; readonly supplierId?: string },
  ): Promise<{ readonly stationType: StationType; readonly supplierId?: string }> {
    if (input.stationType === "internal") {
      if (input.supplierId !== undefined) {
        throw new FuelLogError(
          422,
          "FUEL_LOG_INVALID",
          "supplier_not_allowed_for_internal",
          "Abastecimento INTERNO não aceita fornecedor.",
        );
      }
      return { stationType: "internal", supplierId: undefined };
    }

    if (input.supplierId !== undefined) {
      await this.resolveSupplierReference(actor, input.supplierId);
      return { stationType: "external", supplierId: input.supplierId };
    }

    if (input.stationTypeExplicit) {
      throw new FuelLogError(
        422,
        "FUEL_LOG_INVALID",
        "supplier_required_for_external",
        "Abastecimento EXTERNO exige um fornecedor.",
      );
    }

    // Compat: station_type omitido → external de retrocompat, sem fornecedor obrigatório.
    return { stationType: "external", supplierId: undefined };
  }

  // RN-ABA-01/02 — mesma reconciliação para a EDIÇÃO (parcial). `supplierId` no retorno: `undefined`
  // mantém o valor atual; `null` limpa (transição EXTERNO -> INTERNO); string define/valida um novo.
  private async resolveStationAndSupplierForUpdate(
    actor: FuelLogActorContext,
    existing: FuelLog,
    body: RawRecord,
  ): Promise<{ readonly stationType?: StationType; readonly supplierId?: string | null }> {
    const stationType = parseOptionalStationType(body.station_type ?? body.stationType);
    const supplierId = parseOptionalUuid(body.supplier_id ?? body.supplierId, "supplierId");
    const effectiveStationType = stationType ?? existing.stationType;

    if (effectiveStationType === "internal") {
      if (supplierId !== undefined) {
        throw new FuelLogError(
          422,
          "FUEL_LOG_INVALID",
          "supplier_not_allowed_for_internal",
          "Abastecimento INTERNO não aceita fornecedor.",
        );
      }
      // Transição EXTERNO -> INTERNO: limpa o fornecedor herdado. Já-interno: mantém (undefined).
      const clearSupplier = stationType === "internal" && existing.stationType !== "internal";
      return { stationType, supplierId: clearSupplier ? null : undefined };
    }

    if (supplierId !== undefined) {
      await this.resolveSupplierReference(actor, supplierId);
      return { stationType, supplierId };
    }

    // EXTERNO explícito sem fornecedor no corpo só é válido se o log já tiver um fornecedor.
    if (stationType === "external" && !existing.supplierId) {
      throw new FuelLogError(
        422,
        "FUEL_LOG_INVALID",
        "supplier_required_for_external",
        "Abastecimento EXTERNO exige um fornecedor.",
      );
    }

    return { stationType, supplierId: undefined };
  }

  // R1.2 — odometer is monotonic non-decreasing per vehicle. On create the new
  // reading must be >= the highest already recorded for the vehicle (F1 scope:
  // checked against fuel_logs only).
  private async assertOdometerMonotonic(tenantId: string, vehicleId: string, odometer: number): Promise<void> {
    const maxOdometer = await this.repository.maxOdometerForVehicle(tenantId, vehicleId);

    if (maxOdometer !== undefined && odometer < maxOdometer) {
      throw new FuelLogError(
        422,
        "FUEL_LOG_INVALID",
        "odometer_regressive",
        `Odômetro (${odometer}) deve ser ≥ ao último registrado (${maxOdometer}) para a viatura.`,
      );
    }
  }

  private async withEfficiency(actor: FuelLogActorContext, fuelLog: FuelLog): Promise<FuelLogWithEfficiency> {
    const history = await this.repository.listByVehicleAscending(actor.tenantId, fuelLog.vehicleId);
    const supplierNames = await this.resolveSupplierNames(actor, [fuelLog]);

    return {
      fuelLog,
      ...computeEfficiency(fuelLog, history),
      supplierName: fuelLog.supplierId ? supplierNames.get(fuelLog.supplierId) : undefined,
    };
  }

  // Computes km/L per page item from each vehicle's full ordered history, fetched
  // once per distinct vehicle so a page mixing several viaturas stays cheap.
  private async attachEfficiencyToPage(
    actor: FuelLogActorContext,
    items: readonly FuelLog[],
  ): Promise<FuelLogWithEfficiency[]> {
    const vehicleIds = [...new Set(items.map((item) => item.vehicleId))];
    const histories = new Map<string, FuelLog[]>();

    await Promise.all(
      vehicleIds.map(async (vehicleId) => {
        histories.set(vehicleId, await this.repository.listByVehicleAscending(actor.tenantId, vehicleId));
      }),
    );

    const supplierNames = await this.resolveSupplierNames(actor, items);

    return items.map((fuelLog) => ({
      fuelLog,
      ...computeEfficiency(fuelLog, histories.get(fuelLog.vehicleId) ?? []),
      supplierName: fuelLog.supplierId ? supplierNames.get(fuelLog.supplierId) : undefined,
    }));
  }

  // §2.8 — nome do fornecedor como LABEL derivado; resolvido 1× por supplier distinto (evita N+1) e só
  // quando há supplier_id na página (custo zero no caso legado/interno sem fornecedor).
  private async resolveSupplierNames(
    actor: FuelLogActorContext,
    items: readonly FuelLog[],
  ): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const resolver = this.references.resolveSupplier;
    if (!resolver) return names;

    const supplierIds = [...new Set(items.map((item) => item.supplierId).filter((id): id is string => Boolean(id)))];

    await Promise.all(
      supplierIds.map(async (supplierId) => {
        const supplier = await resolver(actor, supplierId);
        if (supplier) names.set(supplierId, supplier.name);
      }),
    );

    return names;
  }
}

/** True quando ao menos uma das chaves (snake/camel) está presente e não-vazia no corpo. */
function hasBodyValue(body: RawRecord, snakeKey: string, camelKey: string): boolean {
  for (const key of [snakeKey, camelKey]) {
    const value = body[key];
    if (value !== undefined && value !== null && value !== "") return true;
  }

  return false;
}

/**
 * Ω4C PR-08b — a chave está PRESENTE no corpo (mesmo `null`, p.ex. limpar stock_item_id). Distinto de hasBodyValue:
 * a trava da baixa dispara em QUALQUER tentativa de mexer no campo (setar OU limpar), não só em valor não-vazio.
 */
function bodyHasField(body: RawRecord, ...keys: string[]): boolean {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined);
}

const memoryRepository = new InMemoryFuelLogRepository();
let defaultServicePromise: Promise<FuelLogService> | undefined;

export function createMemoryFuelLogService(): FuelLogService {
  return new FuelLogService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryFuelLogRepositoryForTests(): InMemoryFuelLogRepository {
  return memoryRepository;
}

export async function createDefaultFuelLogService(): Promise<FuelLogService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFuelLogService();
  }

  defaultServicePromise ??= createPrismaFuelLogService();

  return defaultServicePromise;
}

export function resetFuelLogRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFuelLogService(): Promise<FuelLogService> {
  const { createPrismaFuelLogRepository } = await import("./fuel-log-prisma.repository.js");
  const repository = await createPrismaFuelLogRepository();

  return new FuelLogService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds the tenant-scoped vehicle resolver over the vehicles module's default
 * service. In memory mode this shares the same singleton the vehicle routes use,
 * so a vehicle created via POST /vehicles is visible here.
 */
function createDefaultReferenceResolvers(): FuelLogReferenceResolvers {
  return {
    resolveVehicle: async (actor, id) => {
      try {
        const service = await createDefaultVehicleService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
    // Ω4C PR-05 — resolve o fornecedor via SupplierService.get (tenant-scoped, sem gate próprio, igual
    // ao resolver de veículo). Em memória compartilha o singleton do módulo suppliers.
    resolveSupplier: async (actor, id) => {
      try {
        const service = await createDefaultSupplierService();
        const supplier = await service.get(actor, id);

        return { id: supplier.id, name: supplier.name };
      } catch {
        return null;
      }
    },
    // Ω4C PR-08b — baixa de estoque do abastecimento INTERNO via InventoryService.createExitForSource
    // (service→service, sem `stock_movements:create` do usuário — como scheduleNextDueNotification do PR-06). O
    // sourceType é FIXADO em `fuel_log` aqui (o consumidor não escolhe) e o erro do seam (409/422) PROPAGA — NÃO
    // é engolido como os resolvers de existência (a rejeição precisa abortar o create). `import()` DINÂMICO:
    // direção consumidor→inventory sem aresta estática (inventory→work-orders→maintenance→fuel já é ciclo lazy).
    postStockExit: async (actor, input) => {
      const { createDefaultInventoryService } = await import("../inventory/inventory.service.js");
      const service = await createDefaultInventoryService();
      await service.createExitForSource(actor, {
        sourceType: "fuel_log",
        sourceId: input.sourceId,
        itemId: input.stockItemId,
        quantity: input.quantity,
        vehicleId: input.vehicleId,
      });
    },
    reverseStockExit: async (actor, fuelLogId) => {
      const { createDefaultInventoryService } = await import("../inventory/inventory.service.js");
      const service = await createDefaultInventoryService();
      await service.removeExitForSource(actor, "fuel_log", fuelLogId);
    },
    hasActiveStockExit: async (actor, fuelLogId) => {
      const { createDefaultInventoryService } = await import("../inventory/inventory.service.js");
      const service = await createDefaultInventoryService();

      return (await service.findExitBySource(actor, "fuel_log", fuelLogId)) !== undefined;
    },
  };
}
