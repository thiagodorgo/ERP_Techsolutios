// F2 Manutenção — tipos do módulo de Frota (MaintenanceOrder). DTO camelCase do backend /maintenance-orders.
// `status` avança por transição (row action), nunca por select livre no formulário.

export type MaintenanceType = "preventiva" | "corretiva";

export type MaintenanceStatus = "agendada" | "em_execucao" | "concluida" | "cancelada";

// Ω4C PR-06 — tipo do item (token backend em inglês → rótulo PT-BR SERVIÇO/PRODUTO/ESTOQUE só na apresentação).
export type MaintenanceItemType = "service" | "product" | "stock";

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
  // Ω4C PR-06 — data prevista da PRÓXIMA manutenção (por tempo; por-KM é PR-16). Dispara a notificação no backend.
  readonly nextDueAt: string | null;
  readonly description: string;
  readonly isActive: boolean;
  // Ω4C PR-06 — do header da LISTA (Σ itens DERIVADO server-side; nunca fabricado no cliente).
  readonly itemCount: number;
  readonly itemsTotal: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// Ω4C PR-06 — linha de item do DTO do backend. `lineTotal` é DERIVADO server-side (unit × qty), NUNCA fabricado.
export type MaintenanceOrderItem = {
  readonly id: string;
  readonly itemType: MaintenanceItemType;
  readonly description: string;
  readonly unitValue: number;
  readonly quantity: number;
  readonly lineTotal: number;
  readonly notes: string | null;
};

// Ω4C PR-06 — totalizadores do cabeçalho, DERIVADOS server-side (D-Ω4C-MANUT-TOTALS-DERIVED). Exibidos como vêm.
export type MaintenanceOrderTotals = {
  readonly totalServices: number;
  readonly totalProducts: number;
  readonly total: number;
  readonly itemCount: number;
};

// Detalhe (GET /:id): cabeçalho + itens + totais derivados.
export type MaintenanceOrderDetail = {
  readonly order: MaintenanceOrder;
  readonly items: readonly MaintenanceOrderItem[];
  readonly totals: MaintenanceOrderTotals;
};

// Sugestão de hodômetro (GET /odometer-suggestion) — null honesto sem histórico (D-007, nunca inventa).
export type OdometerSuggestion = {
  readonly suggestedOdometer: number;
  readonly source: "fuel_log" | "maintenance_order";
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
  readonly nextDueAt?: string;
};

export type MaintenanceOrderCreatePayload = {
  readonly vehicleId: string;
  readonly type: MaintenanceType;
  readonly description: string;
  readonly scheduledFor?: string;
  readonly odometer?: number;
  readonly supplier?: string;
  readonly isActive?: boolean;
  // Ω4C PR-06 — próxima manutenção (por tempo). Com data, o backend cria a notificação agendada (sempre PRIVADA;
  // não há visibilidade no contrato — broadcast tenant-wide exige notifications:create pela rota do motor).
  readonly nextDueAt?: string;
};

// Ω4C PR-06 — rascunho do item validado no cliente (números podem faltar durante a digitação).
export type MaintenanceItemDraft = {
  readonly itemType: MaintenanceItemType;
  readonly description: string;
  readonly unitValue?: number;
  readonly quantity?: number;
  readonly notes?: string;
};

export type MaintenanceItemPayload = {
  readonly itemType: MaintenanceItemType;
  readonly description: string;
  readonly unitValue: number;
  readonly quantity: number;
  readonly notes?: string;
};

export type MaintenanceItemField = "itemType" | "description" | "unitValue" | "quantity";

export type MaintenanceItemFieldError = {
  readonly field: MaintenanceItemField;
  readonly message: string;
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
