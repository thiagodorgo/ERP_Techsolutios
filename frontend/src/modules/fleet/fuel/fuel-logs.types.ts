// F1 Abastecimento — tipos do módulo de Frota (FuelLog). DTO camelCase do backend /fuel-logs.
// `kmPerLiter`/`distanceKm` são DERIVADOS (read-only) — nunca entram como campo de formulário.

export type FuelLog = {
  readonly id: string;
  readonly vehicleId: string;
  readonly operatorId: string | null;
  readonly workOrderId: string | null;
  readonly fueledAt: string;
  readonly fuelType: string;
  readonly liters: number;
  readonly totalValue: number;
  readonly odometer: number;
  readonly station: string | null;
  readonly notes: string | null;
  readonly isActive: boolean;
  // Eficiência derivada entre abastecimentos consecutivos (R1.1). `null` no 1º lançamento (baseline).
  readonly kmPerLiter: number | null;
  readonly distanceKm: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type FuelLogsPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type FuelLogsSource = "api" | "mock" | "fallback";

export type FuelLogsData = {
  readonly items: FuelLog[];
  readonly pagination: FuelLogsPagination;
  readonly source: FuelLogsSource;
  readonly fallbackReason?: string;
};

export type FuelLogsStatusFilter = "all" | "active" | "inactive";

export type FuelLogsFilters = {
  readonly search: string;
  readonly isActive: FuelLogsStatusFilter;
  readonly vehicleId?: string;
  // Janela de período (datas YYYY-MM-DD); mapeadas para os parâmetros `from`/`to` do backend.
  readonly from?: string;
  readonly to?: string;
  // Janela de busca (parâmetro `limit`); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type FuelLogsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Rascunho validado no cliente antes do envio (números podem estar ausentes durante a digitação).
export type FuelLogDraft = {
  readonly vehicleId: string;
  readonly fueledAt: string;
  readonly fuelType: string;
  readonly liters?: number;
  readonly totalValue?: number;
  readonly odometer?: number;
  readonly station?: string;
  readonly notes?: string;
};

export type FuelLogCreatePayload = {
  readonly vehicleId: string;
  readonly fueledAt: string;
  readonly fuelType: string;
  readonly liters: number;
  readonly totalValue: number;
  readonly odometer: number;
  readonly station?: string;
  readonly notes?: string;
  readonly operatorId?: string;
  readonly workOrderId?: string;
  readonly isActive?: boolean;
};

export type FuelLogUpdatePayload = Partial<FuelLogCreatePayload>;

export type FuelLogField = keyof FuelLogDraft;

export type FuelLogFieldError = {
  readonly field: FuelLogField;
  readonly message: string;
};
