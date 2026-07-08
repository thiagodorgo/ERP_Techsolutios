// F3 Multas — tipos do módulo de Frota (Fine). DTO camelCase do backend /fines.
// `status` avança por transição (row action), nunca por select livre no formulário.

export type FineStatus = "recebida" | "em_recurso" | "deferida" | "indeferida" | "paga" | "cancelada";

export type Fine = {
  readonly id: string;
  readonly vehicleId: string;
  readonly driverId: string | null;
  readonly numeroAuto: string;
  readonly dataInfracao: string;
  readonly orgao: string;
  readonly descricao: string | null;
  readonly valor: number;
  readonly pontos: number;
  readonly prazoRecurso: string | null;
  readonly prazoPagamento: string | null;
  readonly status: FineStatus;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type FinesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type FinesSource = "api" | "mock" | "fallback";

export type FinesData = {
  readonly items: Fine[];
  readonly pagination: FinesPagination;
  readonly source: FinesSource;
  readonly fallbackReason?: string;
};

// Filtro de situação lógica (compatível com a dense-list: all/active/inactive → is_active).
export type FinesStatusFilter = "all" | "active" | "inactive";

export type FinesFilters = {
  readonly search: string;
  readonly isActive: FinesStatusFilter;
  readonly vehicleId?: string;
  readonly driverId?: string;
  readonly status?: FineStatus;
  // Prazos que vencem em N dias (parâmetro `due_within_days` do backend).
  readonly dueWithinDays?: number;
  // Janela de busca (`limit`); ordenação/paginação/filtros são client-side sobre ela.
  readonly limit?: number;
  readonly offset?: number;
};

export type FinesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Rascunho validado no cliente antes do envio (números podem faltar durante a digitação).
export type FineDraft = {
  readonly vehicleId: string;
  readonly driverId?: string;
  readonly numeroAuto: string;
  readonly dataInfracao: string;
  readonly orgao: string;
  readonly descricao?: string;
  readonly valor?: number;
  readonly pontos?: number;
  readonly prazoRecurso?: string;
  readonly prazoPagamento?: string;
};

export type FineCreatePayload = {
  readonly vehicleId: string;
  readonly driverId?: string;
  readonly numeroAuto: string;
  readonly dataInfracao: string;
  readonly orgao: string;
  readonly descricao?: string;
  readonly valor: number;
  readonly pontos?: number;
  readonly prazoRecurso?: string;
  readonly prazoPagamento?: string;
  readonly isActive?: boolean;
};

export type FineUpdatePayload = Partial<
  FineCreatePayload & {
    readonly status: FineStatus;
  }
>;

export type FineField = keyof FineDraft;

export type FineFieldError = {
  readonly field: FineField;
  readonly message: string;
};
