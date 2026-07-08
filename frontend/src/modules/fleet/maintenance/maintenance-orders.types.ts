// F2 Manutenção — tipos do módulo de Frota (MaintenanceOrder). DTO camelCase do backend /maintenance-orders.
// `status` avança por transição (row action), nunca por select livre no formulário.

export type MaintenanceType = "preventiva" | "corretiva";

export type MaintenanceStatus = "agendada" | "em_execucao" | "concluida" | "cancelada";

export type MaintenanceOrder = {
  readonly id: string;
  readonly vehicleId: string;
  readonly type: MaintenanceType;
  readonly status: MaintenanceStatus;
  readonly scheduledFor: string | null;
  readonly completedAt: string | null;
  readonly cost: number | null;
  readonly supplier: string | null;
  readonly odometer: number | null;
  readonly description: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type MaintenanceOrdersPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type MaintenanceOrdersSource = "api" | "mock" | "fallback";

export type MaintenanceOrdersData = {
  readonly items: MaintenanceOrder[];
  readonly pagination: MaintenanceOrdersPagination;
  readonly source: MaintenanceOrdersSource;
  readonly fallbackReason?: string;
};

// Filtro de situação lógica (compatível com a dense-list: all/active/inactive → is_active).
export type MaintenanceStatusFilter = "all" | "active" | "inactive";

// Abas de fluxo (eixo próprio do F2, persistido em `tab=` na URL).
export type MaintenanceTab = "preventivas" | "corretivas" | "historico";

export type MaintenanceOrdersFilters = {
  readonly search: string;
  readonly isActive: MaintenanceStatusFilter;
  readonly vehicleId?: string;
  readonly type?: MaintenanceType;
  readonly status?: MaintenanceStatus;
  // Janela de agendamento (datas YYYY-MM-DD) → parâmetros `scheduled_from`/`scheduled_to`.
  readonly from?: string;
  readonly to?: string;
  // Janela de busca (`limit`); ordenação/paginação/abas são client-side sobre ela.
  readonly limit?: number;
  readonly offset?: number;
};

export type MaintenanceOrdersApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Rascunho validado no cliente antes do envio (números podem faltar durante a digitação).
export type MaintenanceOrderDraft = {
  readonly vehicleId: string;
  readonly type: MaintenanceType;
  readonly description: string;
  readonly scheduledFor?: string;
  readonly odometer?: number;
  readonly supplier?: string;
};

export type MaintenanceOrderCreatePayload = {
  readonly vehicleId: string;
  readonly type: MaintenanceType;
  readonly description: string;
  readonly scheduledFor?: string;
  readonly odometer?: number;
  readonly supplier?: string;
  readonly isActive?: boolean;
};

export type MaintenanceOrderUpdatePayload = Partial<
  MaintenanceOrderCreatePayload & {
    readonly status: MaintenanceStatus;
    readonly completedAt: string;
    readonly cost: number;
  }
>;

export type MaintenanceOrderField = keyof MaintenanceOrderDraft;

export type MaintenanceOrderFieldError = {
  readonly field: MaintenanceOrderField;
  readonly message: string;
};

// Rascunho da conclusão (custo + data são obrigatórios — espelha 422 completion_requires_cost_and_date).
export type MaintenanceCompletionField = "cost" | "completedAt";

export type MaintenanceCompletionDraft = {
  readonly cost?: number;
  readonly completedAt?: string;
};

export type MaintenanceCompletionFieldError = {
  readonly field: MaintenanceCompletionField;
  readonly message: string;
};
