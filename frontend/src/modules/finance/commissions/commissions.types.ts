// F8 Remunerações — tipos do módulo Financeiro (comissões). DTO camelCase do backend
// /commissions. O extrato é agregado por operador/período; o detalhamento é por OS.

// Situação da comissão. É um enum aberto no backend (parcerias podem introduzir estados);
// o adapter resolve os conhecidos para rótulo PT-BR e humaniza os demais (nunca token cru).
export type CommissionStatus = string;

// Linha do extrato agregado (resumo por operador no período).
export type CommissionSummaryItem = {
  readonly payeeId: string;
  readonly total: number;
  readonly count: number;
};

export type CommissionSummary = {
  readonly items: CommissionSummaryItem[];
  // Total geral do período (soma dos operadores). Preferimos o valor do backend; na
  // ausência, derivamos somando as linhas.
  readonly total: number;
  readonly from: string;
  readonly to: string;
};

export type CommissionsSource = "api" | "mock" | "fallback";

export type CommissionSummaryData = {
  readonly summary: CommissionSummary;
  readonly source: CommissionsSource;
  readonly fallbackReason?: string;
};

// Cálculo individual (detalhamento por origem). A comissão nasce de um evento-base: a origem
// é descrita por `sourceType`/`sourceId` (ex.: "work_order" + id da OS). `payeeId` pode faltar
// no extrato próprio (já é o chamador). `workOrderId` é legado/opcional — quando a origem é OS,
// preferir `sourceType === "work_order"` + `sourceId`.
export type CommissionCalculation = {
  readonly id: string;
  readonly payeeId: string | null;
  readonly amount: number;
  readonly status: CommissionStatus;
  // Origem da comissão (evento-base). Ausentes quando o backend não conhece a origem.
  readonly sourceType: string | null;
  readonly sourceId: string | null;
  // Legado: só preenchido se o DTO ainda enviar work_order_id direto (fallback de origem OS).
  readonly workOrderId: string | null;
  readonly createdAt: string;
};

export type CommissionCalculationsPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type CommissionCalculationsData = {
  readonly items: CommissionCalculation[];
  readonly pagination: CommissionCalculationsPagination;
  readonly source: CommissionsSource;
  readonly fallbackReason?: string;
};

export type CommissionsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Escopo do extrato decidido pela permissão do chamador (a UI só molda; o backend é a
// autoridade final): `all` → summary (finance/tenant_admin), `own` → my-summary (operador).
export type CommissionSummaryScope = "all" | "own";

export type CommissionDateRange = {
  readonly from?: string;
  readonly to?: string;
};

export type CommissionSummaryFilters = CommissionDateRange & {
  // Filtro opcional por operador (só no escopo `all`; o my-summary já é do chamador).
  readonly payeeId?: string;
};

export type CommissionCalculationsFilters = CommissionDateRange & {
  readonly payeeId?: string;
  readonly limit?: number;
  readonly offset?: number;
};

// Detalhamento do próprio chamador (endpoint `/calculations/mine`): sem payee_id — o servidor
// fixa a autoria pelo token. Só período/paginação.
export type MyCommissionCalculationsFilters = CommissionDateRange & {
  readonly limit?: number;
  readonly offset?: number;
};
