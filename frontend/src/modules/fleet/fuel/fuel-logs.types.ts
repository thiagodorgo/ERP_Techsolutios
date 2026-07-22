// F1 Abastecimento — tipos do módulo de Frota (FuelLog). DTO camelCase do backend /fuel-logs.
// `kmPerLiter`/`distanceKm` são DERIVADOS (read-only) — nunca entram como campo de formulário.

// Ω4C PR-05 — marcação do posto (enum-app, inglês no contrato; rótulo PT-BR na UI, §3).
// EXTERNAL = posto/rede de terceiro (exige fornecedor); INTERNAL = tanque próprio da base.
export type StationType = "internal" | "external";

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
  // Ω4C PR-05 — posto interno/externo + fornecedor. `supplierName` é LABEL derivado (§2.8): só o nome,
  // nunca tenant_id nem dado sensível do fornecedor.
  readonly stationType: StationType;
  readonly supplierId: string | null;
  readonly supplierName: string | null;
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
  // Ω4C PR-05 — posto interno/externo; `supplierId` obrigatório quando externo (espelha o backend).
  readonly stationType: StationType;
  readonly supplierId?: string;
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
  readonly stationType?: StationType;
  readonly supplierId?: string;
  // Ω4C PR-05 — "desconsiderar último KM": override TRANSIENTE (não persistido) que bypassa o guard
  // de odômetro monotônico no backend (1º abastecimento / correção).
  readonly ignorePreviousOdometer?: boolean;
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
