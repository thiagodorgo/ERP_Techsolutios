// B-GRUPO-GESTOR (1a, F1) — a regra do alcance do Painel do grupo, em funções PURAS (sem banco, sem relógio).
//
// Ordem (plano-base §3.1 com a Emenda 2 §2.1), e só nesta:
//   0. a marca: a identidade do ator é gestora do grupo VIGENTE da organização ativa, sem retirada → senão 403;
//   3. as organizações em que a identidade tem conta ativa (vêm prontas da porta, nunca do e-mail);
//   4. o vínculo de grupo vigente de cada uma, hoje (data de negócio de São Paulo), `[validFrom, validTo)`;
//   6. corte pelo grupo da organização ativa;
//   7. a permissão do PAR de cada organização (decidida aqui; resolvida pela porta, no serviço);
//   8. o teto de 30.
//
// As linhas marcadas "âncora" são o alvo das mutações literais do plano (§8.1, Emendas 1 e 2): não reescrever sem emenda.

import { FINANCIAL_SUMMARY_PERMISSION } from "../financial-summary/financial-summary.routes.js";
import { MembershipOverlapError } from "../subscription-billing/economic-groups/membership.rules.js";
import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import type { Role } from "../core-saas/permissions/catalog.js";
import { actorReadsAssignedOnly } from "../work-orders/work-order.types.js";
import {
  GROUP_PANEL_MAX_ORGANIZATIONS,
  type BlockStatus,
  type GroupManagerMark,
  type GroupMembershipRow,
  type IdentityMembershipRow,
  type PairAuthorization,
  type ScopedOrganization,
} from "./group-panel.types.js";

/** A permissão do bloco de chamados (a mesma do Dashboard). */
export const OPERATIONS_PERMISSION = "dashboard:read";
export const STAFF_USERS_PERMISSION = "users.read";
export const STAFF_WORK_ORDERS_PERMISSION = "work_orders:read";

/** Passo 0 falhou: sem marca de gestor no grupo vigente da organização ativa (P-F). Nada mais é lido. */
export class GroupPanelAccessError extends CoreSaasError {
  constructor() {
    super(403, "FORBIDDEN", "not_group_manager", "Só o gestor do grupo abre o Painel do grupo.");
    this.name = "GroupPanelAccessError";
  }
}

/** O vínculo de grupo vigente da organização no dia `today`, ou `null`. Dois no mesmo dia: falha fechado (P5 do B-ASS-09). */
export function currentMembershipOf(
  rows: readonly GroupMembershipRow[],
  tenantId: string,
  today: string,
): GroupMembershipRow | null {
  const hits: GroupMembershipRow[] = [];
  for (const membership of rows) {
    if (membership.tenantId !== tenantId) continue;
    // âncora (MUT-4)
    const startsByToday = membership.validFrom <= today;
    // âncora (MUT-3)
    const stillOpenToday = membership.validTo === null || membership.validTo > today;
    if (startsByToday && stillOpenToday) hits.push(membership);
  }
  if (hits.length > 1) throw new MembershipOverlapError(tenantId);
  return hits[0] ?? null;
}

export type ActiveGroupInput = {
  readonly activeTenantId: string;
  /** Os vínculos de grupo da organização ATIVA (lidos no contexto dela). */
  readonly activeGroupRows: readonly GroupMembershipRow[];
  readonly managerMarks: readonly GroupManagerMark[];
  readonly today: string;
};

/**
 * Passo 0: o grupo vigente da organização ativa e a marca de gestor da identidade nele. Sem grupo hoje, ou sem marca
 * viva nesse grupo: `GroupPanelAccessError` (403 `not_group_manager`), e nada de outra organização é lido.
 */
export function resolveActiveGroup(input: ActiveGroupInput): string {
  const { activeTenantId, activeGroupRows, managerMarks, today } = input;

  const activeMembership = currentMembershipOf(activeGroupRows, activeTenantId, today);
  if (activeMembership === null) throw new GroupPanelAccessError();
  const activeGroupId = activeMembership.groupId;

  // âncora (MUT-8, MUT-15, MUT-16)
  const isGroupManager = managerMarks.some((mark) => mark.groupId === activeGroupId && mark.revokedAt === null);
  if (!isGroupManager) throw new GroupPanelAccessError();

  return activeGroupId;
}

export type GroupScopeInput = {
  readonly activeGroupId: string;
  readonly memberships: readonly IdentityMembershipRow[];
  readonly groupRows: readonly GroupMembershipRow[];
  readonly today: string;
};

export type GroupScopeResult = {
  readonly activeGroupId: string;
  /** Todas as organizações do alcance (passos 3, 4 e 6), em ordem de nome. */
  readonly organizations: readonly ScopedOrganization[];
  /** As que serão lidas (até o teto). */
  readonly processed: readonly ScopedOrganization[];
  /** As que o teto cortou. */
  readonly omitted: readonly ScopedOrganization[];
  readonly overLimit: boolean;
};

/** Passos 3, 4, 6 e 8, depois do passo 0. Nunca devolve organização fora do grupo ativo, hoje. */
export function resolveGroupScope(input: GroupScopeInput): GroupScopeResult {
  const { activeGroupId, memberships, groupRows, today } = input;

  const organizations: ScopedOrganization[] = [];
  const seen = new Set<string>();
  for (const organization of memberships) {
    if (seen.has(organization.tenantId)) continue;
    const current = currentMembershipOf(groupRows, organization.tenantId, today);
    if (current === null) continue;
    // âncora (MUT-1)
    const sameGroup = current.groupId === activeGroupId;
    if (!sameGroup) continue;
    seen.add(organization.tenantId);
    organizations.push({ tenantId: organization.tenantId, name: organization.tenantName, userId: organization.userId });
  }
  organizations.sort(byNameThenId);

  // âncora (MUT-11)
  const overLimit = organizations.length > GROUP_PANEL_MAX_ORGANIZATIONS;
  const processed = overLimit ? organizations.slice(0, GROUP_PANEL_MAX_ORGANIZATIONS) : organizations;
  const omitted = overLimit ? organizations.slice(GROUP_PANEL_MAX_ORGANIZATIONS) : [];

  return { activeGroupId, organizations, processed, omitted, overLimit };
}

/** Passo 7, bloco financeiro: a permissão do PAR e o módulo daquela organização (R15). */
export function decideFinanceAccess(authorization: PairAuthorization, financeModuleOn: boolean): BlockStatus {
  // âncora (MUT-2)
  const canReadFinance = authorization.permissions.includes(FINANCIAL_SUMMARY_PERMISSION);
  if (!canReadFinance) return "sem_permissao";
  if (!financeModuleOn) return "modulo_desligado";
  return "ok";
}

/** Passo 7, bloco de chamados: `dashboard:read` e não ser papel de campo com recorte (o mesmo do serviço do Dashboard). */
export function canReadOperations(authorization: PairAuthorization): boolean {
  if (!authorization.permissions.includes(OPERATIONS_PERMISSION)) return false;
  return !actorReadsAssignedOnly({ tenantId: "", userId: "", roles: authorization.roles as readonly Role[], permissions: [] });
}

/** Funcionários: exige ler usuários e OS, sem recorte de campo que revelaria uma visão parcial como total do pátio. */
export function canReadStaff(authorization: PairAuthorization): boolean {
  const hasPermissions =
    authorization.permissions.includes(STAFF_USERS_PERMISSION) &&
    authorization.permissions.includes(STAFF_WORK_ORDERS_PERMISSION);
  if (!hasPermissions) return false;
  return !actorReadsAssignedOnly({ tenantId: "", userId: "", roles: authorization.roles as readonly Role[], permissions: [] });
}

function byNameThenId(left: ScopedOrganization, right: ScopedOrganization): number {
  const byName = left.name.localeCompare(right.name, "pt-BR");
  if (byName !== 0) return byName;
  return left.tenantId < right.tenantId ? -1 : left.tenantId > right.tenantId ? 1 : 0;
}
