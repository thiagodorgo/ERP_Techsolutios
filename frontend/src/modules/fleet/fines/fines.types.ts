// F3 Multas — tipos do módulo de Frota (Fine). DTO camelCase do backend /fines.
// `status` avança por transição (row action), nunca por select livre no formulário.

export type FineStatus = "recebida" | "em_recurso" | "deferida" | "indeferida" | "paga" | "cancelada";

// Ω4C PR-07 — disposição DERIVADA do backend: `statement` = lançada no extrato do condutor responsável
// (débito na folha do profissional); `none` = sem condutor responsável. O estado "empresa paga" (contas a
// pagar) NÃO vem nesta coluna — é derivado à parte pelo badge do rail de contas a pagar (GET /fines/:id/payable).
export type FineDisposition = "statement" | "none";

export type Fine = {
  readonly id: string;
  readonly vehicleId: string;
  readonly driverId: string | null;
  // Ω4C PR-07 — condutor responsável = um Profissional (operator_profile) que tem folha/extrato. Distinto de
  // `driverId` (Usuário genérico). Setar → a multa é descontada no extrato desse profissional (RN-MUL-01).
  readonly responsibleOperatorProfileId: string | null;
  readonly disposition: FineDisposition;
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
  // Ω4C PR-07 — condutor responsável (Profissional) e parcelas do desconto no extrato (default 1).
  readonly responsibleOperatorProfileId?: string;
  readonly responsibleInstallmentTotal?: number;
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
  // Ω4C PR-07 — o backend aceita camelCase (`responsibleOperatorProfileId`/`responsibleInstallmentTotal`).
  // Setar o responsável no create dispara o débito no extrato; parcelas controla o plano do desconto (default 1).
  readonly responsibleOperatorProfileId?: string;
  readonly responsibleInstallmentTotal?: number;
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
  Omit<FineCreatePayload, "responsibleOperatorProfileId"> & {
    readonly status: FineStatus;
    // `null` LIMPA o condutor responsável (retira o débito do extrato); string SETA/TROCA; omitido = não muda.
    readonly responsibleOperatorProfileId: string | null;
  }
>;

export type FineField = keyof FineDraft;

export type FineFieldError = {
  readonly field: FineField;
  readonly message: string;
};
