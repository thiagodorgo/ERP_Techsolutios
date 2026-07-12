// Ω2-b — Fornecedores (cadastro denso, multi-tenant). Espelho de customers/tariffs (padrão
// registry), com a diferença-chave de que o NOME é a chave natural do 409 (duplicado por
// organização) mas PERMANECE editável — o backend aceita renomear (não é imutável como o
// `code` de Filiais ou as referências de Tarifas).

export type SupplierItem = {
  readonly id: string;
  readonly name: string;
  readonly document: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly category: string | null;
  readonly notes: string | null;
  // `status` textual opaco do backend; a situação de cadastro exibida vem de `isActive`.
  readonly status: string;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type SuppliersPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type SuppliersSource = "api" | "mock" | "fallback";

export type SuppliersData = {
  readonly items: SupplierItem[];
  readonly pagination: SuppliersPagination;
  readonly source: SuppliersSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (isActive) — mesmo vocabulário da dense-list ("all"/"active"/"inactive").
export type SupplierActiveFilter = "all" | "active" | "inactive";

export type SuppliersFilters = {
  readonly search: string;
  readonly isActive: SupplierActiveFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type SuppliersApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — apenas o nome é obrigatório; demais campos opcionais.
export type SupplierCreatePayload = {
  readonly name: string;
  readonly document?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly category?: string;
  readonly notes?: string;
};

export type SupplierUpdatePayload = Partial<SupplierCreatePayload> & {
  readonly isActive?: boolean;
};

export type SupplierField = keyof SupplierCreatePayload;

export type SupplierFieldError = {
  readonly field: SupplierField;
  readonly message: string;
};
