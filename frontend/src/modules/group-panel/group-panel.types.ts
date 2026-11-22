// B-GRUPO-GESTOR-1b — espelho do contrato `group_panel@2026-11.b-grupo-gestor-1a` (API_CONTRACTS.md, `GET /group-panel/scope`
// e `GET /group-panel/summary`; o DTO do servidor é `src/modules/group-panel/group-panel.dto.ts`). Todo número já vem
// SOMADO do servidor: a tela não soma nada (plano §6). O resumo de cada pátio é o MESMO `FinancialSummary` do
// `GET /financial-summary`, por isso o tipo é reutilizado do módulo do Financeiro.

import type { FinancialSummary } from "../finance/dashboard/financial-summary.types";

/** Situação de cada bloco de um pátio. Fora de `ok`, o servidor manda o bloco SEM número (corpo nulo). */
export type GroupPanelBlockStatus = "ok" | "sem_permissao" | "modulo_desligado" | "erro";

export type GroupPanelCoverageReason = "teto" | "erro_de_leitura" | "moedas_diferentes";

export type GroupPanelScopeOrganization = {
  readonly id: string;
  readonly name: string;
  readonly finance: boolean;
  readonly operations: boolean;
  readonly staff: boolean;
};

export type GroupPanelScope = {
  readonly inGroup: boolean;
  readonly overLimit: boolean;
  readonly omittedCount: number;
  readonly organizations: readonly GroupPanelScopeOrganization[];
};

export type GroupPanelCashFlowPoint = {
  readonly competencia: string;
  readonly inflow: number;
  readonly outflow: number;
};

export type GroupPanelConsolidatedFinance = {
  readonly receivableOpen: number;
  readonly receivableOpenCount: number;
  readonly receivableOverdue: number;
  readonly receivableOverdueCount: number;
  readonly payableOpen: number;
  readonly payableOpenCount: number;
  readonly payableOverdue: number;
  readonly payableOverdueCount: number;
  readonly receivedThisMonth: number;
  readonly paidThisMonth: number;
  readonly competencia: string;
  readonly cashBalance: number;
  readonly accountCount: number;
  readonly cashFlow: readonly GroupPanelCashFlowPoint[];
  readonly receivedVariationPct: number | null;
  readonly paidVariationPct: number | null;
};

/** Chamados do mês e tempo de chegada (Emenda 2 §3.3), por pátio e no consolidado. */
export type GroupPanelOperations = {
  readonly openedToday: number;
  readonly openedThisWeek: number;
  readonly inProgress: number;
  readonly overdue: number;
  readonly openedThisMonth: number;
  readonly completedThisMonth: number;
  readonly openedPreviousMonth: number;
  readonly completionRatePct: number | null;
  readonly arrivalAvgMinutes: number | null;
  readonly arrivalCount: number;
  readonly arrivalMissingCount: number;
  readonly completionAvgMinutes: number | null;
};

/** Funcionários (Emenda 2 §4.2): só contagens; `profile` é a chave do perfil, o rótulo é da tela. */
export type GroupPanelStaff = {
  readonly activeUsers: number;
  readonly byProfile: readonly { readonly profile: string; readonly count: number }[];
  readonly inServiceNow: number;
};

export type GroupPanelOrganization = {
  readonly id: string;
  readonly name: string;
  readonly finance: {
    readonly status: GroupPanelBlockStatus;
    readonly summary: FinancialSummary | null;
    readonly receivedVariationPct: number | null;
    readonly paidVariationPct: number | null;
  };
  readonly operations: { readonly status: Exclude<GroupPanelBlockStatus, "modulo_desligado">; readonly summary: GroupPanelOperations | null };
  readonly staff: { readonly status: "ok" | "sem_permissao" | "erro"; readonly summary: GroupPanelStaff | null };
};

export type GroupPanelCoverage = {
  readonly complete: boolean;
  readonly included: number;
  readonly failed: readonly string[];
  readonly reason: GroupPanelCoverageReason | null;
  readonly withoutAccess: readonly { readonly id: string; readonly name: string }[];
};

export type GroupPanelConsolidated = {
  readonly currency: string;
  readonly finance: GroupPanelConsolidatedFinance;
  readonly operations: GroupPanelOperations & { readonly included: number };
  readonly staff: GroupPanelStaff;
};

export type GroupPanelSummary = {
  readonly generatedAt: string;
  readonly coverage: GroupPanelCoverage;
  /** Nulo quando o total não pode ser publicado (teto, erro de leitura, moedas diferentes — plano §3.4). */
  readonly consolidated: GroupPanelConsolidated | null;
  readonly organizations: readonly GroupPanelOrganization[];
};

export type GroupPanelApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

/** Por que a leitura não trouxe dado: o estado da tela sai daqui (§7: acesso não permitido ≠ erro). */
export type GroupPanelFailure =
  | { readonly kind: "forbidden"; readonly reason: "not_group_manager" | "sem_permissao" }
  | { readonly kind: "error"; readonly message: string };

export type GroupPanelResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly failure: GroupPanelFailure };
