// Ω2-b — Filiais (cadastro denso, multi-tenant). Espelho de price-tables/tariffs (Ω2-a),
// com a diferença-chave de que NÃO há isActive: a situação vem do enum `status`
// ('active' | 'inactive'), e o `code` é chave natural IMUTÁVEL após a criação (lição do
// veto B2 de Tarifas — nunca dar falso sucesso editando campo que o backend ignora).

// Situação da filial — enum do backend. Rótulo PT-BR FEMININO ("Ativa"/"Inativa") no adapter.
export type BranchStatus = "active" | "inactive";

export type BranchItem = {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly status: BranchStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BranchesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type BranchesSource = "api" | "mock" | "fallback";

export type BranchesData = {
  readonly items: BranchItem[];
  readonly pagination: BranchesPagination;
  readonly source: BranchesSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro — mesmo vocabulário da dense-list ("all"/"active"/"inactive");
// no servidor mapeia para o query param `status` (não existe `is_active` em Filiais).
export type BranchActiveFilter = "all" | "active" | "inactive";

export type BranchesFilters = {
  readonly search: string;
  readonly isActive: BranchActiveFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type BranchesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — nome e código obrigatórios. O código é a chave natural (409 se duplicado).
export type BranchCreatePayload = {
  readonly name: string;
  readonly code: string;
};

// Atualização — `code` é IMUTÁVEL (fica fora do payload na edição; input desabilitado com
// dica). Desativar/reativar acontece pela transição de `status` no próprio modal.
export type BranchUpdatePayload = {
  readonly name?: string;
  readonly status?: BranchStatus;
};

export type BranchField = keyof BranchCreatePayload;

export type BranchFieldError = {
  readonly field: BranchField;
  readonly message: string;
};
