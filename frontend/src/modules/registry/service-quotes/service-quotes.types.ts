// Ω3-a — Orçamentos (ServiceQuote). Documento de preço CONGELADO a partir de uma Tarifa de Tabela de
// Valores publicada. Espelho do padrão registry (tags/tariffs) adaptado: além de is_active, há uma
// máquina de situação (rascunho→aprovado/rejeitado/anulado). Linguagem PT-BR de negócio (nunca "tenant").

export type ServiceQuoteStatus = "draft" | "approved" | "rejected" | "void";
export type ServiceQuotePriceSource = "tariff" | "manual";

// Ω3F-4c — `ServiceQuoteRow` é a LINHA/REGISTRO do orçamento na lista (o documento inteiro), NÃO a
// linha-de-item. O nome "item" fica reservado para a linha-de-item real (ServiceQuoteLineItem).
export type ServiceQuoteRow = {
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
  // Ω3F-4a/4b — cabeçalho do documento. O list DTO pode não emitir todos; leitura defensiva → null.
  readonly number: string | null;
  readonly issuedAt: string | null;
  readonly validUntil: string | null;
  readonly createdWorkOrderId: string | null;
};

export type ServiceQuotesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type ServiceQuotesSource = "api" | "mock" | "fallback";

export type ServiceQuotesData = {
  readonly items: ServiceQuoteRow[];
  readonly pagination: ServiceQuotesPagination;
  readonly source: ServiceQuotesSource;
  readonly fallbackReason?: string;
};

// Ω3F-4c — linha-de-item real do orçamento (espelho de WorkOrderFinancialItem). Dinheiro SEMPRE com
// moeda; o total é AGREGADO no backend (o front NUNCA soma).
export type ServiceQuoteLineItem = {
  readonly id: string;
  readonly serviceQuoteId: string;
  readonly tariffId: string | null;
  readonly priceTableId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly source: string; // "tariff" | "manual"
  readonly notes: string | null;
};

export type ServiceQuoteLineList = {
  readonly items: readonly ServiceQuoteLineItem[];
  // Total já somado pelo backend (só itens não-deletados). O front apenas exibe.
  readonly totalAmount: number;
  readonly currency: string;
};

// Ω3F-4b — corpo do POST /:id/approve: origem/destino + modo de ativação + prioridade/título da OS.
// B-SAN3-08 (R-A4) — as coordenadas entram como texto, como no formulário de OS; o builder converte em número.
export type ServiceQuoteApprovePayload = {
  readonly serviceAddress?: string;
  readonly serviceCity?: string;
  readonly serviceState?: string;
  readonly serviceZipCode?: string;
  readonly serviceLatitude?: string;
  readonly serviceLongitude?: string;
  readonly destinationAddress?: string;
  readonly destinationCity?: string;
  readonly destinationState?: string;
  readonly destinationZipCode?: string;
  readonly destinationLatitude?: string;
  readonly destinationLongitude?: string;
  readonly activationMode?: string;
  readonly priority?: string;
  readonly title?: string;
};

export type ServiceQuoteApproveResult = {
  readonly quote: ServiceQuoteRow | null;
  readonly workOrderId: string | null;
};

export type ServiceQuoteShareResult = {
  readonly shareToken: string | null;
  readonly sharePath: string | null;
};

export type ServiceQuoteActiveFilter = "all" | "active" | "inactive";

export type ServiceQuotesFilters = {
  readonly search: string;
  readonly isActive: ServiceQuoteActiveFilter;
  readonly limit?: number;
  // Ω3F-4c — filtro por OS (aba Orçamento do hub): GET /service-quotes?work_order_id=X.
  readonly workOrderId?: string;
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
