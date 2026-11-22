// B-GRUPO-GESTOR (1a, F1) — as portas do Painel e a composição EM MEMÓRIA.
//
// A composição Prisma (cada leitura dentro de `withTenantRls` da própria organização, sob o papel de runtime sem
// `BYPASSRLS`) é da fatia F2, e implementa a mesma `GroupPanelReaders` de `group-panel.types.ts`.
//
// A marca de gestor é a borda da fatia FM. Enquanto a FM não empurra a porta dela, o Painel lê a marca pela interface
// `GroupManagerMarksReader`, e a memória usa o falso `InMemoryGroupManagerMarks` (chaveado pela IDENTIDADE, nunca pelo
// e-mail). A F4 troca o falso pela porta real da FM.
//
// A linha marcada "âncora" é o alvo da MUT-10: não reescrever sem emenda.

import { TenantRowsLeakError } from "../../database/rls.js";
import { resolvePermissionsForRoles, type Role } from "../core-saas/permissions/catalog.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { InMemoryFinancialSummaryRepository, type FinancialSummaryRepository } from "../financial-summary/financial-summary.repository.js";
import { normalizeModuleKeys } from "../platform/platform-modules.service.js";
import type {
  GroupManagerMark,
  GroupManagerMarksReader,
  GroupMembershipRow,
  GroupPanelActor,
  GroupPanelReaders,
} from "./group-panel.types.js";
import { getMemoryWorkOrderRepositoryForTests } from "../work-orders/work-order.service.js";
import type { GroupPanelWorkOrderRow } from "./group-panel.sla.js";
import { groupPanelWorkOrderWindowStart, isInGroupPanelWorkOrderWindow } from "./group-panel.sla.js";
import type { GroupPanelStaffRow } from "./group-panel.staff.js";

/** A tabela que o canário do passo 4 nomeia. */
export const GROUP_MEMBERS_TABLE = "economic_group_members";

/** A ação da trilha de cada organização lida (E1). */
export const GROUP_PANEL_VIEW_ACTION = "group_panel.viewed";

/**
 * Canário do passo 4: toda linha de vínculo devolvida tem de ser de uma organização PEDIDA. Linha de outra organização
 * (contexto de RLS obsoleto, filtro errado) derruba o pedido inteiro: `TenantRowsLeakError`, 500, nenhum número sai.
 */
export function assertMembershipsWithinRequested(
  rows: readonly { readonly tenantId: string }[],
  tenantIds: readonly string[],
): void {
  const requested = new Set(tenantIds);
  if (rows.some((row) => !requested.has(row.tenantId))) {
    throw new TenantRowsLeakError(GROUP_MEMBERS_TABLE);
  }
}

/** O que a composição lê dos vínculos de grupo (a porta do repositório do B-ASS-09, só leitura). */
export type GroupMembershipSource = {
  listMembershipsOfTenants(tenantIds: readonly string[]): Promise<readonly GroupMembershipRow[]>;
  getGroup?(id: string): Promise<{ readonly deletedAt: Date | null } | null>;
};

/** Uma linha da trilha em memória (para o teste ler). Só os campos da allowlist do Painel. */
export type MemoryGroupPanelViewRecord = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly metadata: { readonly origin: "group_panel"; readonly complete: boolean };
};

let memoryViews: MemoryGroupPanelViewRecord[] = [];

export function getMemoryGroupPanelViewsForTests(): readonly MemoryGroupPanelViewRecord[] {
  return memoryViews;
}

/**
 * Falso EM MEMÓRIA da marca de gestor (borda da FM). A marca vive na IDENTIDADE; a retirada é lógica. A identidade do
 * ator sai do par do token, pelo mesmo serviço que normaliza o `GET /me/tenants`.
 */
export class InMemoryGroupManagerMarks implements GroupManagerMarksReader {
  private readonly marks: { identityId: string; groupId: string; revokedAt: Date | null }[] = [];

  constructor(private readonly resolveIdentity: (pair: { readonly tenantId: string; readonly userId: string }) => Promise<string | null>) {}

  grant(identityId: string, groupId: string): void {
    this.marks.push({ identityId, groupId, revokedAt: null });
  }

  revoke(identityId: string, groupId: string, at: Date = new Date()): void {
    for (const mark of this.marks) {
      if (mark.identityId === identityId && mark.groupId === groupId && mark.revokedAt === null) mark.revokedAt = at;
    }
  }

  clear(): void {
    this.marks.length = 0;
  }

  async listMarksForActor(actor: GroupPanelActor): Promise<readonly GroupManagerMark[]> {
    const identityId = await this.resolveIdentity({ tenantId: actor.tenantId, userId: actor.userId });
    if (!identityId) return [];
    return this.marks
      .filter((mark) => mark.identityId === identityId)
      .map((mark) => ({ groupId: mark.groupId, revokedAt: mark.revokedAt }));
  }
}

let memoryMarks: InMemoryGroupManagerMarks | undefined;
let memoryMarksCore: ICoreSaasService | undefined;

/** O falso da marca usado pela composição em memória do app (um por serviço de núcleo). */
export function getMemoryGroupManagerMarksForTests(core: ICoreSaasService): InMemoryGroupManagerMarks {
  if (!memoryMarks || memoryMarksCore !== core) {
    memoryMarks = new InMemoryGroupManagerMarks((pair) => core.resolveIdentityForUser(pair));
    memoryMarksCore = core;
  }
  return memoryMarks;
}

export function resetGroupPanelMemoryForTests(): void {
  memoryViews = [];
  memoryMarks = undefined;
  memoryMarksCore = undefined;
}

export type MemoryGroupPanelReadersOptions = {
  readonly marks?: GroupManagerMarksReader;
  readonly groups?: () => GroupMembershipSource | Promise<GroupMembershipSource>;
  readonly finance?: FinancialSummaryRepository;
  readonly recordView?: GroupPanelReaders["recordView"];
  readonly workOrders?: GroupPanelReaders["workOrders"];
  readonly staffRows?: GroupPanelReaders["staffRows"];
};

/** A composição em memória: o núcleo em memória, os vínculos de grupo do B-ASS-09 e o resumo financeiro em memória. */
export function createMemoryGroupPanelReaders(core: ICoreSaasService, options: MemoryGroupPanelReadersOptions = {}): GroupPanelReaders {
  const marks = options.marks ?? getMemoryGroupManagerMarksForTests(core);
  // Import preguiçoso: a fábrica da visão de cobrança puxa o Prisma no carregamento, e o app em memória não pode abri-lo
  // (tests/persistent-rbac-middleware.test.ts). O repositório em memória é o mesmo que as rotas de grupos usam.
  const groups =
    options.groups ??
    (async () => (await import("../subscription-billing/overview/overview.factory.js")).getMemoryOverviewEconomicGroupsForTests());
  const finance = options.finance ?? new InMemoryFinancialSummaryRepository();

  return {
    async activeGroupLive({ groupId }) {
      const group = await (await groups()).getGroup?.(groupId);
      return group !== undefined && group !== null && group.deletedAt === null;
    },
    async identityMemberships(actor) {
      const memberships = await core.listTenantsForIdentity(actor);
      return memberships.map((membership) => ({
        tenantId: membership.tenant.id,
        tenantName: membership.tenant.name,
        userId: membership.user.id,
      }));
    },

    async groupMemberships(tenantIds) {
      const rows = await (await groups()).listMembershipsOfTenants(tenantIds);
      // âncora (MUT-10)
      assertMembershipsWithinRequested(rows, tenantIds);
      return rows.map((row) => ({ tenantId: row.tenantId, groupId: row.groupId, validFrom: row.validFrom, validTo: row.validTo }));
    },

    managerMarks(actor) {
      return marks.listMarksForActor(actor);
    },

    async authorization({ tenantId, userId }) {
      const user = await core.getUserForTenant(userId, tenantId);
      if (user.status !== "active") return { roles: [], permissions: [] };
      return { roles: [...user.roles], permissions: resolvePermissionsForRoles(user.roles as readonly Role[]) };
    },

    async modules({ tenantId }) {
      const tenant = await core.getTenantForActor(tenantId, tenantId);
      return normalizeModuleKeys(tenant.modules);
    },

    financeSummary({ tenantId, now }) {
      return finance.getSummary({ tenantId, now });
    },

    workOrders:
      options.workOrders ??
      (async ({ tenantId, now }): Promise<readonly GroupPanelWorkOrderRow[]> => {
        const result = await getMemoryWorkOrderRepositoryForTests().list({
          tenantId,
          limit: Number.MAX_SAFE_INTEGER,
          offset: 0,
        });
        const rows = result.items.map((row) => ({
          status: row.status,
          createdAt: row.createdAt,
          scheduledFor: row.scheduledFor ?? null,
          arrivedAt: row.arrivedAt ?? null,
          completedAt: row.completedAt ?? null,
          assignedUserId: row.assignedUserId ?? null,
        }));
        const windowStart = groupPanelWorkOrderWindowStart(now);
        return rows.filter((row) => isInGroupPanelWorkOrderWindow(row, windowStart));
      }),

    staffRows:
      options.staffRows ??
      (async ({ tenantId }): Promise<readonly GroupPanelStaffRow[]> => {
        const users = await core.listUsersForTenant(tenantId);
        return Promise.all(
          users.map(async (user) => ({
            userId: user.id,
            identityId: await core.resolveIdentityForUser({ tenantId, userId: user.id }),
            localKey: `${tenantId}:${user.id}`,
            active: user.status === "active",
            profiles: [...user.roles],
          })),
        );
      }),

    recordView:
      options.recordView ??
      (async ({ tenantId, userId, complete }) => {
        memoryViews.push({ tenantId, actorUserId: userId, action: GROUP_PANEL_VIEW_ACTION, metadata: { origin: "group_panel", complete } });
      }),
  };
}
