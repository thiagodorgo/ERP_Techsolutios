import type { FinanceApiContext } from "../entries/financial-entries.types";

// B-SAN3-24 (24a) — camada de dados da tela de Cheques. Espelha o contrato de `src/modules/cheques/` (rotas
// `/cheques`, DTO `toChequeDto`/`toChequeListDto`). O servidor é a autoridade de estado, de sentido do caixa e de
// permissão; a tela só mostra o que ele devolveu e só oferece o que ele aceita (P-CONTRATO, P-ACESSO).
// R-E2E-JWT: este arquivo e o serviço, o adaptador, as ações e o impacto de caixa importam só TypeScript puro.

export type ChequesApiContext = FinanceApiContext;

export const CHEQUE_STATUSES = ["registered", "deposited", "cleared", "bounced", "cancelled"] as const;
export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

export type ChequeDirection = "received" | "issued";

export type Cheque = {
  readonly id: string;
  readonly accountId: string;
  /** Título vinculado (o cheque baixa o título ao compensar); null = sem título. */
  readonly titleId: string | null;
  readonly direction: ChequeDirection;
  readonly chequeNumber: string;
  readonly bank: string;
  readonly amount: number;
  readonly currency: string;
  /** "Bom para" (data de calendário `AAAA-MM-DD`); memo, nunca decide a competência. */
  readonly dueDate: string | null;
  readonly status: ChequeStatus;
  readonly clearedEntryId: string | null;
  readonly bounceEntryId: string | null;
  /** Só o detalhe (`GET /cheques/:id`) traz o motivo; a lista não. */
  readonly bounceReason: string | null;
  readonly notes: string | null;
  readonly active: boolean;
  readonly createdAt: string;
};

export type ChequesPagination = { readonly limit: number; readonly offset: number; readonly total: number };

export type ChequesSource = "api" | "mock" | "fallback";

export type ChequesData = {
  readonly items: readonly Cheque[];
  readonly pagination: ChequesPagination;
  readonly source: ChequesSource;
  readonly fallbackReason?: string;
};

/** Filtros que o SERVIDOR aplica (`GET /cheques`): situação e título por igualdade, direção, conta e página. */
export type ChequeFilters = {
  readonly status?: ChequeStatus;
  readonly direction?: ChequeDirection;
  readonly accountId?: string;
  readonly titleId?: string;
  readonly limit?: number;
  readonly offset?: number;
};

/** Corpo de `POST /cheques`. Valor, conta e direção só existem no registro (o PATCH não os altera — N-04). */
export type RegisterChequePayload = {
  readonly account_id: string;
  readonly direction: ChequeDirection;
  readonly cheque_number: string;
  readonly bank: string;
  readonly amount: number;
  readonly due_date?: string;
  readonly notes?: string;
  readonly title_id?: string;
};

/**
 * Corpo de `PATCH /cheques/:id` (só enquanto `registered`). O servidor altera SÓ número, banco, "bom para",
 * observações e o 1º vínculo; valor, conta e direção ele ignora com 200 (N-04), por isso nem existem aqui.
 * `title_id` só vai quando o cheque ainda não tem título (R-VINCULO (iv)).
 */
export type EditChequePayload = {
  readonly cheque_number?: string;
  readonly bank?: string;
  readonly due_date?: string | null;
  readonly notes?: string | null;
  readonly title_id?: string;
};

export type ChequeAction = "deposit" | "clear" | "bounce" | "cancel" | "edit" | "delete";
