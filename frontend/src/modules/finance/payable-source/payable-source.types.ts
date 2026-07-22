// Ω4C PR-02 — "Contas a Pagar por origem" (front). Recria o COMPORTAMENTO do AutEM: um registro de
// frota (Abastecimento/Manutenção/Seguro) pode virar um título A PAGAR no Financeiro. No cadastro há um
// checkbox "Gerar lançamento em contas a pagar"; na edição, o registro mostra o badge "lançado" + as
// ações Lançar/Retirar. Visual = design system do ERP.
//
// D-007 / RN-FIN-ORIGEM-05: o badge "lançado" é DERIVADO do backend — o GET /:module/:id/payable devolve
// o título ATIVO da fonte (ou null). `title != null` = lançado. A UI NUNCA fabrica esse estado por flag.
// §2.8: o TitleDTO já OMITE tenant_id/deleted_at; aqui projetamos só o mínimo que o toggle exibe.

// Módulos-fonte com endpoint de payable. Ω4C PR-07 acrescenta `fines` (a multa como fonte de contas a
// pagar — o caminho "empresa paga", either/or com o extrato do condutor responsável).
export type PayableSourceModule = "fuel-logs" | "maintenance-orders" | "insurance-policies" | "fines";

// Projeção segura do TitleDTO para o toggle (§2.8): só id/status/amount/currency/dueDate/active.
export type PayableTitleView = {
  readonly id: string;
  readonly status: string; // enum de negócio (open/scheduled/paid…); humanizado na UI, nunca cru como principal
  readonly amount: number;
  readonly currency: string;
  readonly dueDate: string; // ISO
  readonly active: boolean;
};

export type PayableSourceSource = "api" | "mock" | "fallback";

export type PayableSourceData = {
  // null = fonte SEM título a pagar ativo (não lançado). Nunca inventado (D-007).
  readonly title: PayableTitleView | null;
  readonly source: PayableSourceSource;
  readonly forbidden: boolean;
};

// Contexto de auth+tenant (claims do JWT); o backend é a autoridade final de autorização.
export type PayableSourceApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Corpo do POST /:module/:id/payable (o service traduz para snake_case na fronteira). `dueDate` (ISO)
// é obrigatório; `partyType`/`currency` têm default de negócio (fornecedor / BRL).
export type PayableLaunchBody = {
  readonly partyType?: "supplier" | "customer" | "other";
  readonly partyName: string;
  readonly amount: number; // Decimal(12,2) no backend — sem float mágico; parse pt-BR na borda
  readonly dueDate: string; // ISO obrigatório
  readonly issueDate?: string;
  readonly partyId?: string;
  readonly currency?: string;
  readonly description?: string;
};

// Estado "não lançado" honesto (mock/erro/registro sem id): sem fabricar título (D-007).
export function emptyPayableSource(source: PayableSourceSource): PayableSourceData {
  return { title: null, source, forbidden: false };
}
