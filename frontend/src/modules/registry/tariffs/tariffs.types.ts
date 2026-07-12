// Ω2-a.2 — Tarifas (cadastro denso, multi-tenant). Espelho de price-tables (Ω2-a.1),
// com a diferença-chave de que uma Tarifa é um ITEM de preço que PERTENCE a uma Tabela de
// Valores (priceTableId, obrigatório), opcionalmente ligado a um Serviço e a um Cliente.

// Situação de cadastro da tarifa (isActive) — FEMININO ("Ativa"/"Inativa"), mesmo vocabulário
// da dense-list ("all"/"active"/"inactive"). O backend também expõe um `status` textual opaco.
export type TariffItem = {
  readonly id: string;
  readonly name: string | null;
  readonly priceTableId: string;
  readonly serviceCatalogId: string | null;
  readonly customerId: string | null;
  readonly unitPrice: number;
  readonly currency: string;
  readonly origin: string;
  readonly rule: string | null;
  readonly validFrom: string | null;
  readonly validTo: string | null;
  readonly status: string;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type TariffsPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type TariffsSource = "api" | "mock" | "fallback";

export type TariffsData = {
  readonly items: TariffItem[];
  readonly pagination: TariffsPagination;
  readonly source: TariffsSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (isActive) — mesmo vocabulário da dense-list ("all"/"active"/"inactive").
export type TariffActiveFilter = "all" | "active" | "inactive";

export type TariffsFilters = {
  readonly search: string;
  readonly isActive: TariffActiveFilter;
  // Filtro server-side por Tabela de Valores (query `price_table_id`). Muda a janela buscada.
  readonly priceTableId?: string;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type TariffsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — priceTableId, unitPrice e origin são obrigatórios; demais opcionais.
export type TariffCreatePayload = {
  readonly priceTableId: string;
  readonly unitPrice: number;
  readonly origin: string;
  readonly name?: string;
  readonly serviceCatalogId?: string;
  readonly customerId?: string;
  readonly currency?: string;
  readonly rule?: string;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly isActive?: boolean;
};

// `status` da Tarifa é texto livre (máx. 40) — diferente da Tabela de Valores, NÃO há máquina de
// estado aqui. Referências (tabela/serviço/cliente) são imutáveis no update (o backend as ignora;
// na edição os selects ficam desabilitados e fora do payload — veto B2 da junta Ω2-a.2).
export type TariffUpdatePayload = Partial<TariffCreatePayload> & {
  readonly status?: string;
};

export type TariffField = keyof TariffCreatePayload;

export type TariffFieldError = {
  readonly field: TariffField;
  readonly message: string;
};

// Opção de select das telas de referência (Tabela de Valores / Serviço / Cliente) do formulário.
export type TariffReferenceOption = {
  readonly id: string;
  readonly label: string;
};
