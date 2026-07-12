// Ω2-a.1 — Tabela de Valores (cadastro denso, multi-tenant). Espelho de service-catalog,
// com a diferença-chave do status de PUBLICAÇÃO (draft→published→archived; máquina no backend).

// Status de publicação (RN-CAD-008). Token técnico nunca exibido cru na UI (ver adapter).
export type PriceTableStatus = "draft" | "published" | "archived";

export type PriceTableItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly currency: string;
  readonly version: number;
  readonly validFrom: string | null;
  readonly validTo: string | null;
  readonly status: PriceTableStatus;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type PriceTablesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type PriceTablesSource = "api" | "mock" | "fallback";

export type PriceTablesData = {
  readonly items: PriceTableItem[];
  readonly pagination: PriceTablesPagination;
  readonly source: PriceTablesSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (isActive) — mesmo vocabulário da dense-list ("all"/"active"/"inactive").
export type PriceTableActiveFilter = "all" | "active" | "inactive";

// Filtro de publicação — inclui rascunho/publicada/arquivada, além de "todos".
export type PriceTablePublishFilter = "all" | PriceTableStatus;

export type PriceTablesFilters = {
  readonly search: string;
  readonly isActive: PriceTableActiveFilter;
  readonly status?: PriceTablePublishFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type PriceTablesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação sempre nasce em rascunho no backend (status não é aceito no POST).
export type PriceTableCreatePayload = {
  readonly name: string;
  readonly description?: string;
  readonly currency?: string;
  readonly version?: number;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly isActive?: boolean;
};

// Atualização aceita transição de status (validada pela máquina de estado no backend → 422 se inválida).
export type PriceTableUpdatePayload = Partial<PriceTableCreatePayload> & {
  readonly status?: PriceTableStatus;
};

export type PriceTableField = keyof PriceTableCreatePayload;

export type PriceTableFieldError = {
  readonly field: PriceTableField;
  readonly message: string;
};

// Transições permitidas — espelho fiel de PRICE_TABLE_STATUS_TRANSITIONS no backend (RN-CAD-008).
// Fonte da verdade é o backend; esta cópia só molda a UI para oferecer apenas o que é válido.
export const PRICE_TABLE_STATUS_TRANSITIONS: Record<PriceTableStatus, readonly PriceTableStatus[]> = {
  draft: ["published", "archived"],
  published: ["archived"],
  archived: [],
};
