// Ω4C PR-03 — Extrato do Profissional (razão financeiro POR profissional). DTO camelCase do backend
// /professional-statements. §2.8/LGPD: o DTO NUNCA traz tenant_id/source_id/client_action_id nem CNH — só
// o nome do profissional como rótulo (professionalName). `runningBalance`/summary são DERIVADOS server-side.

// Enums em INGLÊS no contrato (labels PT-BR só na fronteira de apresentação — statement.adapter.ts).
export type StatementEntryType = "damage" | "fine" | "remuneration" | "adjustment";
export type StatementDirection = "debit" | "credit";
export type StatementStatus = "pending" | "settled" | "cancelled";

// Uma PARCELA do extrato (linha da lista densa). `amount` é o valor DA PARCELA (> 0); a direção define o
// sinal na apresentação. `runningBalance` é o saldo corrente acumulado até a linha (Σcredit − Σdebit).
export type ProfessionalStatementEntry = {
  readonly id: string;
  readonly operatorProfileId: string;
  readonly groupId: string;
  readonly entryType: string;
  readonly direction: string;
  readonly description: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly installmentNumber: number;
  readonly installmentTotal: number;
  readonly dueDate: string;
  readonly competencia: string;
  readonly status: string;
  readonly settledAt: string | null;
  readonly sourceType: string | null;
  readonly createdAt: string;
  readonly runningBalance: number;
};

// Resumo agregado (DERIVADO server-side): Saldo = Σcredit − Σdebit. Positivo = a empresa deve ao
// profissional; negativo = o profissional deve à empresa (D-Ω4C-EXTRATO-DIRECTION).
export type ProfessionalStatementSummary = {
  readonly currentBalance: number;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly count: number;
};

export type StatementPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

// `forbidden` é o estado §7 "acesso não permitido" (403 mapeado no service) — distinto do fallback genérico.
export type StatementSource = "api" | "mock" | "fallback" | "forbidden";

// Extrato de UM profissional. `operatorProfileId` é null enquanto nenhum profissional está selecionado.
export type ProfessionalStatementLedger = {
  readonly operatorProfileId: string | null;
  readonly professionalName: string | null;
  readonly summary: ProfessionalStatementSummary;
  readonly items: ProfessionalStatementEntry[];
  readonly pagination: StatementPagination;
  readonly source: StatementSource;
  readonly fallbackReason?: string;
};

export type StatementApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Filtros server-side (janela do razão). Ordenação/paginação da tabela são client-side na dense-list.
export type StatementQuery = {
  readonly entryType?: string;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
  readonly offset?: number;
};

// Rascunho do AJUSTE manual validado no cliente (números podem faltar durante a digitação). O POST público
// cria SOMENTE adjustment (D-Ω4C-EXTRATO-CREATE-SCOPE) — tipo é fixo, a direção é escolhida.
export type StatementAdjustmentDraft = {
  readonly operatorProfileId: string;
  readonly direction: StatementDirection;
  readonly description: string;
  readonly amount?: number;
  readonly installmentTotal?: number;
  readonly firstDueDate: string;
};

export type StatementAdjustmentPayload = {
  readonly operatorProfileId: string;
  readonly direction: StatementDirection;
  readonly description: string;
  readonly amount: number;
  readonly installmentTotal: number;
  readonly firstDueDate: string;
};

// Lançamento (grupo) + suas parcelas — resposta de create/delete (envelope { data }).
export type ProfessionalStatementGroup = {
  readonly groupId: string;
  readonly operatorProfileId: string;
  readonly entryType: string;
  readonly direction: string;
  readonly description: string | null;
  readonly currency: string;
  readonly sourceType: string | null;
  readonly installmentTotal: number;
  readonly totalAmount: number;
  readonly installments: ProfessionalStatementEntry[];
  readonly createdAt: string;
};

export type StatementAdjustmentField = "direction" | "description" | "amount" | "installmentTotal" | "firstDueDate";

export type StatementAdjustmentFieldError = {
  readonly field: StatementAdjustmentField;
  readonly message: string;
};
