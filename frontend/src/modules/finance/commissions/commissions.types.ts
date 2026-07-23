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
  // Ω4C PR-10 — marcador de liquidação (a "bolinha" da conferência): `settledAt` definido → liquidado
  // (verde); `null` → pendente (vermelho/âmbar). `settlementRef` = group_id do crédito no extrato do
  // profissional (deep-link "Ver no extrato"). §2.8: nunca tenant_id/CNH/payee cru.
  readonly settledAt: string | null;
  readonly settlementRef: string | null;
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

// ── Ω4C PR-10 — Liquidação em lote (conferência das remunerações) ─────────────────────────
// Profissional escolhido no filtro-modal-ao-entrar (D-Ω4C-REM-MODAL). §3 PT-BR "Profissional".
// A conferência lista as linhas de comissão do profissional (payee_id = userId) no período; o settle
// credita cada uma no extrato (D-Ω4C-REM-SETTLE-RAIL). §2.8: só nome como label, nunca CNH.
export type ConferenceProfessional = {
  readonly profileId: string;
  readonly userId: string;
  readonly name: string;
};

// Disposição por linha da liquidação (no sucesso 200). `settled` = crédito lançado + marcado;
// `already_settled` = idempotente; `skipped_zero` = amount ≤ 0 (não cria crédito vazio).
export type SettlementOutcome = "settled" | "already_settled" | "skipped_zero";

export type SettlementLine = {
  readonly calculationId: string;
  readonly outcome: SettlementOutcome;
  readonly statementGroupId: string | null;
  readonly operatorProfileId: string | null;
};

export type SettlementResult = {
  readonly settlementDate: string;
  readonly settledCount: number;
  readonly settledTotal: number;
  readonly lines: SettlementLine[];
};

// Corpo do POST /commissions/settlements — a UI só envia os ids selecionados + data/descrição opcionais;
// o backend é a autoridade (valor travado a calc.amount, tipos fixados no seam).
export type SettleCommissionsInput = {
  readonly calculationIds: readonly string[];
  readonly settlementDate?: string;
  readonly description?: string;
};

// Resultado tipado do serviço de settle — sucesso (result) ou falha honesta com mensagem PT-BR segura.
// `not_found` (404) e `not_a_professional` (422) são erros de requisição inteira (a tx aborta no backend).
export type SettleCommissionsResult =
  | { readonly kind: "ok"; readonly result: SettlementResult }
  | { readonly kind: "not_found" | "not_a_professional" | "forbidden" | "error"; readonly message: string };
