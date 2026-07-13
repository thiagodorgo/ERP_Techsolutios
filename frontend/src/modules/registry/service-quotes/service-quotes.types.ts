// Ω3-a — Orçamentos (ServiceQuote). Documento de preço CONGELADO a partir de uma Tarifa de Tabela de
// Valores publicada. Espelho do padrão registry (tags/tariffs) adaptado: além de is_active, há uma
// máquina de situação (rascunho→aprovado/rejeitado/anulado). Linguagem PT-BR de negócio (nunca "tenant").

export type ServiceQuoteStatus = "draft" | "approved" | "rejected" | "void";
export type ServiceQuotePriceSource = "tariff" | "manual";

export type ServiceQuoteItem = {
  readonly id: string;
  readonly workOrderId: string | null;
  readonly customerId: string | null;
  readonly serviceCatalogId: string;
  readonly sourceTariffId: string | null;
  readonly frozenUnitPrice: number;
  readonly frozenCurrency: string;
  readonly quantity: number;
  readonly frozenTotal: number;
  readonly frozenAt: string;
  readonly priceSource: ServiceQuotePriceSource;
  readonly status: ServiceQuoteStatus;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type ServiceQuotesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type ServiceQuotesSource = "api" | "mock" | "fallback";

export type ServiceQuotesData = {
  readonly items: ServiceQuoteItem[];
  readonly pagination: ServiceQuotesPagination;
  readonly source: ServiceQuotesSource;
  readonly fallbackReason?: string;
};

export type ServiceQuoteActiveFilter = "all" | "active" | "inactive";

export type ServiceQuotesFilters = {
  readonly search: string;
  readonly isActive: ServiceQuoteActiveFilter;
  readonly limit?: number;
};

export type ServiceQuotesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação — congela o preço. `serviceCatalogId` obrigatório. `priceSource=tariff` (default) resolve a
// Tarifa vigente; `manual` exige `unitPrice`.
export type ServiceQuoteCreatePayload = {
  readonly serviceCatalogId: string;
  readonly workOrderId?: string;
  readonly customerId?: string;
  readonly priceSource: ServiceQuotePriceSource;
  readonly unitPrice?: number;
  readonly quantity?: number;
  readonly notes?: string;
};

export type ServiceQuoteUpdatePayload = {
  readonly quantity?: number;
  readonly notes?: string;
};

// Opção de referência (id → rótulo humano) usada para resolver as colunas Serviço/OS/Cliente e
// preencher os selects do modal — espelho de TariffReferenceOption.
export type ServiceQuoteReferenceOption = {
  readonly id: string;
  readonly label: string;
};

export type ServiceQuoteField = "serviceCatalogId" | "workOrderId" | "customerId" | "unitPrice" | "quantity";

export type ServiceQuoteFieldError = {
  readonly field: ServiceQuoteField;
  readonly message: string;
};
