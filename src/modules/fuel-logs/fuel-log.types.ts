import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const FUEL_TYPES = [
  "gasolina",
  "etanol",
  "diesel",
  "diesel_s10",
  "gnv",
  "eletrico",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export const DEFAULT_FUEL_TYPE: FuelType = "gasolina";

/**
 * Ω4C PR-05 — MARCAÇÃO do posto do abastecimento (enum-app, inglês no código). EXTERNAL = posto/rede
 * de terceiro (exige fornecedor); INTERNAL = tanque próprio da base (fornecedor PROIBIDO; a baixa de
 * estoque interno é DEFERIDA a PR-10/11 — aqui só se MARCA o log). Validado na app (SEM CHECK no banco).
 */
export const STATION_TYPES = ["internal", "external"] as const;

export type StationType = (typeof STATION_TYPES)[number];

export const DEFAULT_STATION_TYPE: StationType = "external";

/** Labels PT-BR de apresentação — nunca vaze o termo técnico (internal/external) para a UI (§3). */
export const STATION_TYPE_LABELS: Record<StationType, string> = {
  internal: "INTERNO",
  external: "EXTERNO",
};

export type FuelLogActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FuelLog = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly operatorId?: string;
  readonly workOrderId?: string;
  readonly fueledAt: Date;
  readonly fuelType: FuelType;
  readonly liters: number;
  readonly totalValue: number;
  readonly odometer: number;
  readonly station?: string;
  readonly stationType: StationType;
  readonly supplierId?: string;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/**
 * Derived fuel-efficiency for a single log (R1.1). NEVER stored: computed at read
 * time from the vehicle's ordered odometer history. Both fields are null for a
 * vehicle's FIRST log (baseline — there is no previous odometer to subtract).
 */
export type FuelLogEfficiency = {
  readonly kmPerLiter: number | null;
  readonly distanceKm: number | null;
};

export type FuelLogWithEfficiency = FuelLogEfficiency & {
  readonly fuelLog: FuelLog;
  /**
   * Ω4C PR-05 — nome do fornecedor como LABEL derivado (§2.8): resolvido do módulo suppliers do
   * tenant no read; nunca persistido no fuel_log e nunca expõe dado sensível do fornecedor.
   */
  readonly supplierName?: string;
};

export type ListFuelLogsInput = {
  readonly tenantId: string;
  readonly vehicleId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListFuelLogsResult = {
  readonly items: readonly FuelLog[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type ListFuelLogsWithEfficiencyResult = {
  readonly items: readonly FuelLogWithEfficiency[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateFuelLogInput = Omit<
  FuelLog,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateFuelLogInput = Partial<
  Pick<
    FuelLog,
    | "operatorId"
    | "workOrderId"
    | "fuelType"
    | "liters"
    | "totalValue"
    | "odometer"
    | "station"
    | "stationType"
    | "notes"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly fuelLogId: string;
  // `null` = limpar o fornecedor (ex.: transição EXTERNO -> INTERNO); `undefined` = manter.
  readonly supplierId?: string | null;
};

export class FuelLogError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FuelLogError";
  }
}
