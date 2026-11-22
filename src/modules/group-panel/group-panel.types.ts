// B-GRUPO-GESTOR (1a, fatia F1) — o Painel do grupo: tipos e portas.
//
// O Painel é SÓ DE LEITURA. A porta é a marca de gestor do grupo, dada pela plataforma (Emenda 2 §2.1, passo 0); o
// alcance é (organizações com vínculo de identidade da pessoa) ∩ (mesmo grupo da organização ativa, hoje) ∩ (permissão
// do PAR daquela organização), e cada leitura roda no contexto da própria organização (plano-base §3.1 e §3.3).
// Nenhuma rota recebe organização do cliente (P-E): todo identificador de organização daqui sai dos vínculos da
// identidade do ator autenticado.
//
// As portas (`GroupPanelReaders`) têm duas composições: a em memória (`group-panel.readers.ts`, desta fatia) e a Prisma
// (fatia F2). A marca de gestor é a BORDA da fatia FM: a porta `GroupManagerMarksReader` é o que o Painel espera dela.

import type { AuthenticatedActor } from "../auth/types/auth.types.js";
import type { FinancialSummary } from "../financial-summary/financial-summary.types.js";
import type { GroupPanelOperations, GroupPanelOperationsComputed, GroupPanelWorkOrderRow } from "./group-panel.sla.js";
import type { GroupPanelStaff, GroupPanelStaffComputed, GroupPanelStaffRow } from "./group-panel.staff.js";

/** Teto de organizações lidas por pedido (plano-base §3.1, passo 8). Acima disso: sem total (§3.4). */
export const GROUP_PANEL_MAX_ORGANIZATIONS = 30;

/** A chave de módulo da classe do `financial-summary` em `route-modules.ts` (Emenda 1 §1.2, medido: `finance`). */
export const FINANCE_MODULE_KEY = "finance";

/** O ator do Painel é SEMPRE o do JWT (`auth.types.ts`), nunca o homônimo de `core-saas.types.ts`. */
export type GroupPanelActor = AuthenticatedActor;

/** Uma organização em que a identidade do ator tem conta ATIVA (usuário ativo, organização ativa). */
export type IdentityMembershipRow = {
  readonly tenantId: string;
  readonly tenantName: string;
  /** O usuário LOCAL da pessoa naquela organização (vem do vínculo de identidade). */
  readonly userId: string;
};

/** O vínculo de uma organização a um grupo econômico: `[validFrom, validTo)`, datas de negócio de São Paulo. */
export type GroupMembershipRow = {
  readonly tenantId: string;
  readonly groupId: string;
  /** `AAAA-MM-DD`, inclusivo. */
  readonly validFrom: string;
  /** `AAAA-MM-DD`, exclusivo; `null` = aberto. */
  readonly validTo: string | null;
};

/**
 * A marca de gestor do grupo, como o Painel a lê. Borda da fatia FM: a FM grava a marca na IDENTIDADE (nunca no e-mail)
 * e a retirada é lógica (`revokedAt`). O Painel recebe as marcas da identidade do ator, inclusive as retiradas, e decide
 * sozinho (âncora `isGroupManager` em `group-scope.ts`).
 */
export type GroupManagerMark = {
  readonly groupId: string;
  readonly revokedAt: Date | null;
};

/** O que o Painel espera da FM: as marcas da identidade do ator autenticado (e só dela). */
export interface GroupManagerMarksReader {
  listMarksForActor(actor: GroupPanelActor): Promise<readonly GroupManagerMark[]>;
}

/** As permissões do PAR (organização, usuário local), pelo mesmo resolvedor que guarda as rotas (H4). */
export type PairAuthorization = {
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
};

/** Uma organização do alcance, com o usuário local da pessoa nela. */
export type ScopedOrganization = {
  readonly tenantId: string;
  readonly name: string;
  readonly userId: string;
};

/**
 * As portas do Painel. Cada uma lê UMA organização por vez, no contexto dela (a composição Prisma usa `withTenantRls`);
 * nenhuma aceita lista de organizações num `IN`, exceto `groupMemberships`, que lê organização por organização e passa
 * pelo canário `assertMembershipsWithinRequested`.
 */
export interface GroupPanelReaders {
  /** Passo 3: as organizações da identidade do ator (o mesmo predicado do `GET /me/tenants`). */
  identityMemberships(actor: GroupPanelActor): Promise<readonly IdentityMembershipRow[]>;
  /** Passo 4: os vínculos de grupo das organizações pedidas, lidos no contexto de cada uma. */
  groupMemberships(tenantIds: readonly string[]): Promise<readonly GroupMembershipRow[]>;
  /** Passo 0: as marcas de gestor da identidade do ator (borda da FM). */
  managerMarks(actor: GroupPanelActor): Promise<readonly GroupManagerMark[]>;
  /** Passo 7: as permissões do PAR daquela organização. */
  authorization(input: { readonly tenantId: string; readonly userId: string }): Promise<PairAuthorization>;
  /** R15: os módulos ligados daquela organização (as mesmas funções do portão global). */
  modules(input: { readonly tenantId: string }): Promise<readonly string[]>;
  /** O resumo financeiro daquela organização, no instante `now`, no contexto dela. */
  financeSummary(input: { readonly tenantId: string; readonly now: Date }): Promise<FinancialSummary>;
  /** F3: as OS daquela organização necessárias para OPS/SLA, sempre no contexto do próprio pátio. */
  workOrders(input: { readonly tenantId: string; readonly now: Date }): Promise<readonly GroupPanelWorkOrderRow[]>;
  /** F3: usuários ativos/inativos e seus perfis, com chave interna de identidade para deduplicação do grupo. */
  staffRows(input: { readonly tenantId: string }): Promise<readonly GroupPanelStaffRow[]>;
  /** E1: UMA linha `group_panel.viewed` na trilha daquela organização, com o usuário local como ator. */
  recordView(input: { readonly tenantId: string; readonly userId: string; readonly complete: boolean }): Promise<void>;
}

export type BlockStatus = "ok" | "sem_permissao" | "modulo_desligado" | "erro";

export type CoverageReason = "teto" | "erro_de_leitura" | "moedas_diferentes";

/** A soma do grupo, em reais, já somada no servidor (a tela não soma nada). */
export type ConsolidatedFinance = {
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
  readonly cashFlow: readonly { readonly competencia: string; readonly inflow: number; readonly outflow: number }[];
  /** Emenda 1 §5.2: variação do mês corrente sobre o anterior, em pontos percentuais inteiros; nulo com anterior zero. */
  readonly receivedVariationPct: number | null;
  readonly paidVariationPct: number | null;
};

export type OrganizationFinanceBlock = {
  readonly status: BlockStatus;
  /** O `FinancialSummary` daquela organização, no MESMO formato do `GET /financial-summary`; nulo fora de `ok`. */
  readonly summary: FinancialSummary | null;
  readonly receivedVariationPct: number | null;
  readonly paidVariationPct: number | null;
};

export type OrganizationOperationsBlock = {
  readonly status: Exclude<BlockStatus, "modulo_desligado">;
  readonly summary: GroupPanelOperations | null;
};

export type OrganizationStaffBlock = {
  readonly status: "ok" | "sem_permissao" | "erro";
  readonly summary: GroupPanelStaff | null;
};

export type GroupPanelOrganization = {
  readonly id: string;
  readonly name: string;
  readonly finance: OrganizationFinanceBlock;
  readonly operations: OrganizationOperationsBlock;
  readonly staff: OrganizationStaffBlock;
};

export type GroupPanelCoverage = {
  readonly complete: boolean;
  /** Quantas organizações entraram na soma do financeiro. */
  readonly included: number;
  /** As organizações que falharam na leitura, ou que o teto cortou. */
  readonly failed: readonly string[];
  readonly reason: CoverageReason | null;
  /** Emenda 1 §5.2: pátios em que a pessoa tem conta mas não tem o Financeiro (não anulam o total). */
  readonly withoutAccess: readonly { readonly id: string; readonly name: string }[];
};

export type GroupPanelSummary = {
  readonly generatedAt: Date;
  readonly coverage: GroupPanelCoverage;
  readonly consolidated: {
    readonly currency: string;
    readonly finance: ConsolidatedFinance;
    readonly operations: GroupPanelOperations;
    readonly staff: GroupPanelStaff;
  } | null;
  readonly organizations: readonly GroupPanelOrganization[];
};

export type GroupPanelScopeOrganization = {
  readonly id: string;
  readonly name: string;
  readonly finance: boolean;
  readonly operations: boolean;
  readonly staff: boolean;
};

/** Forma interna usada só pelo serviço para consolidar sem média de médias nem duplicar pessoa. */
export type GroupPanelInternalBlocks = {
  readonly operations: GroupPanelOperationsComputed | null;
  readonly staff: GroupPanelStaffComputed | null;
};

export type GroupPanelScope = {
  readonly inGroup: boolean;
  readonly organizations: readonly GroupPanelScopeOrganization[];
};
