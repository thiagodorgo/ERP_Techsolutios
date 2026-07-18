// Ω4-2b — camada de dados das telas Cobranças (a receber) e Pagamentos (a pagar), sobre o
// backend financial-titles (Ω4-2a). O DTO espelha exatamente o que a resposta REST traz
// (§2.8: SEM tenant_id). `overdue` é DERIVADO no backend — a UI NÃO recalcula, só apresenta.

export type FinancialTitleDirection = "receivable" | "payable";
export type FinancialTitlePartyType = "customer" | "supplier" | "other";
export type FinancialTitleStatus =
  | "open"
  | "scheduled"
  | "partially_paid"
  | "paid"
  | "in_dispute"
  | "cancelled";

// Alvos MANUAIS de transição (PATCH /:id/status). paid/partially_paid NÃO entram — são dirigidos
// por pagamentos (fatia futura), nunca oferecidos no seletor de status. Espelha a máquina do backend.
export type FinancialTitleStatusTarget = "open" | "scheduled" | "in_dispute" | "cancelled";

export type FinancialTitle = {
  readonly id: string;
  readonly direction: FinancialTitleDirection;
  readonly partyType: FinancialTitlePartyType;
  readonly partyName: string;
  readonly document: string | null;
  readonly category: string | null;
  // Só o DTO de detalhe traz `description`/`issueDate`; a lista omite → leitura defensiva vira null.
  readonly description: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly issueDate: string | null;
  readonly dueDate: string;
  readonly paidAmount: number;
  readonly status: FinancialTitleStatus;
  readonly competencia: string; // 'YYYY-MM'
  readonly accountId: string | null;
  readonly overdue: boolean; // DERIVADO no backend — não recalcular
  readonly active: boolean;
  readonly createdAt: string;
};

export type FinancialTitlesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type FinancialTitlesSource = "api" | "mock" | "fallback";

export type FinancialTitlesData = {
  readonly items: FinancialTitle[];
  readonly pagination: FinancialTitlesPagination;
  readonly source: FinancialTitlesSource;
  readonly fallbackReason?: string;
};

export type FinancialTitlesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// direction é SEMPRE fixado pela tela (receivable → Cobranças, payable → Pagamentos). Os demais
// filtros são opcionais e viram query string (?status=&overdue=&party_type=&from=&to=).
export type FinancialTitlesFilters = {
  readonly direction: FinancialTitleDirection;
  readonly status?: FinancialTitleStatus;
  readonly partyType?: FinancialTitlePartyType;
  readonly overdue?: boolean;
  readonly from?: string;
  readonly to?: string;
  // Janela de busca (parâmetro `limit` do backend, 1..100). Mitiga a subcontagem dos KPIs/tabs (P-Ω4-2B-KPI-AGREGADO).
  readonly limit?: number;
};

// Payload de criação (snake_case do backend). party_type é derivado da direction pela tela; direction
// é fixado pela tela. paid_amount/competencia/status inicial são responsabilidade do backend.
export type CreateFinancialTitlePayload = {
  readonly direction: FinancialTitleDirection;
  readonly party_type: FinancialTitlePartyType;
  readonly party_name: string;
  readonly document?: string;
  readonly category?: string;
  readonly description?: string;
  readonly amount: number;
  readonly due_date: string;
};

export type ChangeFinancialTitleStatusPayload = {
  readonly status: FinancialTitleStatusTarget;
  readonly reason?: string;
};
