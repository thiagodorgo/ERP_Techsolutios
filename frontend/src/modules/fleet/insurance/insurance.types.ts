// F4 Seguros — tipos do módulo de Frota (InsurancePolicy). DTO camelCase do backend /insurance-policies.
// `status` é DERIVADO no servidor (read-only): "vigente"/"vencida" saem das datas; "cancelada" é manual.
// Nunca enviamos status="vencida" (derivado) — só a transição vigente↔cancelada por ação de linha.

export type InsuranceStatus = "vigente" | "vencida" | "cancelada";

export type InsurancePolicy = {
  readonly id: string;
  readonly vehicleId: string;
  readonly seguradora: string;
  readonly numeroApolice: string;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string;
  readonly valor: number;
  readonly cobertura: string | null;
  readonly status: InsuranceStatus;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type InsurancePagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type InsuranceSource = "api" | "mock" | "fallback";

export type InsuranceData = {
  readonly items: InsurancePolicy[];
  readonly pagination: InsurancePagination;
  readonly source: InsuranceSource;
  readonly fallbackReason?: string;
};

// Filtro de situação lógica (compatível com a dense-list: all/active/inactive → is_active).
export type InsuranceStatusFilter = "all" | "active" | "inactive";

export type InsuranceFilters = {
  readonly search: string;
  readonly isActive: InsuranceStatusFilter;
  readonly vehicleId?: string;
  readonly status?: InsuranceStatus;
  // Apólices que vencem em N dias (parâmetro `expiring_within_days` do backend).
  readonly expiringWithinDays?: number;
  // Janela de busca (`limit`); ordenação/paginação/filtros são client-side sobre ela.
  readonly limit?: number;
  readonly offset?: number;
};

export type InsuranceApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Rascunho validado no cliente antes do envio (o valor pode faltar durante a digitação).
export type InsurancePolicyDraft = {
  readonly vehicleId: string;
  readonly seguradora: string;
  readonly numeroApolice: string;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string;
  readonly valor?: number;
  readonly cobertura?: string;
};

export type InsurancePolicyCreatePayload = {
  readonly vehicleId: string;
  readonly seguradora: string;
  readonly numeroApolice: string;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string;
  readonly valor: number;
  readonly cobertura?: string;
  readonly isActive?: boolean;
};

// PATCH único: edição de campos, transição de situação (vigente↔cancelada) e desativação lógica.
export type InsurancePolicyUpdatePayload = Partial<
  InsurancePolicyCreatePayload & {
    readonly status: InsuranceStatus;
  }
>;

export type InsurancePolicyField = keyof InsurancePolicyDraft;

export type InsurancePolicyFieldError = {
  readonly field: InsurancePolicyField;
  readonly message: string;
};
