// B-GRUPO-GESTOR (1a, fatia F2) — a composição PRISMA do Painel do grupo e a leitura das marcas da própria pessoa.
//
// Implementa a MESMA porta `GroupPanelReaders` da composição em memória (`group-panel.readers.ts`), sob o papel de
// runtime sem `BYPASSRLS`. Cada leitura roda no contexto de RLS da PRÓPRIA organização, uma por vez (plano-base §3.3):
//   - vínculos de identidade: `listTenantsForIdentity` do núcleo (o mesmo predicado do `GET /me/tenants`);
//   - vínculos de grupo: o repositório do B-ASS-09 (`forEachTenantRls`, canário por volta), mais o canário do Painel;
//   - permissão do par: o MESMO resolvedor que guarda as rotas (`createPersistentAuthorizationResolver`, H4);
//   - módulos: `getTenantForActor` + `normalizeModuleKeys`, as duas funções do portão global (E3);
//   - financeiro: `RlsPrismaFinancialSummaryRepository.getSummary` (o mesmo do `GET /financial-summary`);
//   - trilha: `group_panel.viewed` na trilha DAQUELA organização, dentro do contexto dela, com o usuário local (E1).
// Proibido aqui (plano-base §3.3): SQL cru, lista de organizações num `IN`, cliente sem contexto, `SECURITY DEFINER`,
// `BYPASSRLS` e `set_config` fora de `src/database/rls.ts`.
//
// A marca de gestor (borda da FM, Emenda 3 §2.3): a pessoa lê a PRÓPRIA marca pelo braço de identidade da política T3b,
// dentro de `setIdentityRlsContext(tx, actor)`, com o contexto de organização do pátio ATIVO (nunca o da organização de
// sistema). Filtra só por `identity_id` e devolve também as retiradas: quem decide é a âncora `isGroupManager`.
//
// Este arquivo só é carregado no modo Prisma (import preguiçoso em `group-panel.factory.ts`): o modo memória não abre
// o Prisma. As linhas marcadas "âncora" são o alvo das mutações da F2: não reescrever sem emenda.

import type { Prisma, PrismaClient } from "@prisma/client";

import { assertRowsBelongToTenant, setIdentityRlsContext, TenantRowsLeakError, withTenantRls } from "../../database/rls.js";
import { createPersistentAuthorizationResolver } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { RlsPrismaFinancialSummaryRepository } from "../financial-summary/financial-summary-prisma.repository.js";
import type { FinancialSummaryRepository } from "../financial-summary/financial-summary.repository.js";
import { normalizeModuleKeys } from "../platform/platform-modules.service.js";
import { PrismaEconomicGroupsRepository } from "../subscription-billing/economic-groups/economic-groups.prisma.js";
import type { WorkOrderStatus } from "../work-orders/work-order.types.js";
import { GROUP_PANEL_OPEN_STATUSES, groupPanelWorkOrderWindowStart } from "./group-panel.sla.js";
import { assertMembershipsWithinRequested, GROUP_PANEL_VIEW_ACTION, type GroupMembershipSource } from "./group-panel.readers.js";
import type { GroupManagerMark, GroupManagerMarksReader, GroupPanelActor, GroupPanelReaders } from "./group-panel.types.js";

/** A tabela que o canário da leitura de marcas nomeia. */
export const GROUP_MANAGERS_TABLE = "economic_group_managers";

/**
 * Canário da leitura de marcas: toda linha devolvida tem de ser da identidade resolvida do par do token. Linha de outra
 * identidade (contexto de organização que casa com o dono das marcas, filtro errado) derruba o pedido:
 * `TenantRowsLeakError`, 500, nenhum número sai.
 */
export function assertMarksOfIdentity(rows: readonly { readonly identity_id: string }[], identityId: string): void {
  if (rows.some((row) => row.identity_id !== identityId)) {
    throw new TenantRowsLeakError(GROUP_MANAGERS_TABLE);
  }
}

/** A porta `GroupManagerMarksReader` sobre o banco: as marcas da identidade do ator (inclusive as retiradas). */
export class PrismaGroupManagerMarksReader implements GroupManagerMarksReader {
  constructor(private readonly client: PrismaClient) {}

  listMarksForActor(actor: GroupPanelActor): Promise<readonly GroupManagerMark[]> {
    return this.client.$transaction(async (tx) => {
      // O setter fixa o contexto de organização no pátio ATIVO (o do token) e re-resolve a identidade pelo par.
      const identityId = await setIdentityRlsContext(tx, actor);
      // âncora (MUT-F2-3)
      if (identityId === null) return [];
      // âncora (MUT-F2-1, MUT-F2-2)
      const rows = await tx.economicGroupManager.findMany({ where: { identity_id: identityId }, select: { identity_id: true, group_id: true, revoked_at: true }, orderBy: { granted_at: "asc" } });
      assertMarksOfIdentity(rows, identityId);
      return rows.map((row) => ({ groupId: row.group_id, revokedAt: row.revoked_at }));
    });
  }
}

export type PrismaGroupPanelReadersOptions = {
  /** A fonte dos vínculos de grupo; o padrão é o repositório Prisma do B-ASS-09 (o teste do canário a substitui). */
  readonly groups?: GroupMembershipSource;
  /** O resumo financeiro por organização; o padrão é o mesmo do `GET /financial-summary`. */
  readonly finance?: FinancialSummaryRepository;
  readonly marks?: GroupManagerMarksReader;
};

/** A composição Prisma: cada porta lê UMA organização, no contexto de RLS dela. */
export function createPrismaGroupPanelReaders(
  client: PrismaClient,
  core: ICoreSaasService,
  options: PrismaGroupPanelReadersOptions = {},
): GroupPanelReaders {
  const groups = options.groups ?? new PrismaEconomicGroupsRepository(client);
  const finance = options.finance ?? new RlsPrismaFinancialSummaryRepository(client);
  const marks = options.marks ?? new PrismaGroupManagerMarksReader(client);
  const resolveAuthorization = createPersistentAuthorizationResolver(client);

  return {
    async activeGroupLive(input) {
      const liveGroup = await client.economicGroup.findFirst({ where: { id: input.groupId, deleted_at: null }, select: { id: true } });
      return liveGroup !== null;
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
      const rows = await groups.listMembershipsOfTenants(tenantIds);
      // âncora (MUT-10p)
      assertMembershipsWithinRequested(rows, tenantIds);
      return rows.map((row) => ({ tenantId: row.tenantId, groupId: row.groupId, validFrom: row.validFrom, validTo: row.validTo }));
    },

    managerMarks(actor) {
      return marks.listMarksForActor(actor);
    },

    async authorization({ tenantId, userId }) {
      const resolved = await resolveAuthorization({ tenantId, userId });
      return { roles: [...resolved.roles], permissions: [...resolved.permissions] };
    },

    async modules({ tenantId }) {
      const tenant = await core.getTenantForActor(tenantId, tenantId);
      return normalizeModuleKeys(tenant.modules);
    },

    financeSummary({ tenantId, now }) {
      return finance.getSummary({ tenantId, now });
    },

    workOrders({ tenantId, now }) {
      return readGroupPanelWorkOrderRows(client, { tenantId, now });
    },

    staffRows({ tenantId }) {
      return readGroupPanelStaffRows(client, { tenantId });
    },

    async recordView({ tenantId, userId, complete }) {
      const [{ EnterpriseAuditLogService }, { AuditLogRepository }] = await Promise.all([
        import("../core-saas/audit/audit-log.service.js"),
        import("../core-saas/repositories/audit-log.repository.js"),
      ]);
      await withTenantRls(client, tenantId, async (tx) => {
        await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
          tenantId,
          actorId: userId,
          actorType: "user",
          action: GROUP_PANEL_VIEW_ACTION,
          resourceType: "group_panel",
          resourceId: null,
          metadata: { origin: "group_panel", complete },
        });
      });
    },
  };
}

// ------------------------------------------------------------------------------------------------------------------
// Leitores Prisma das portas da F3 (chamados/SLA e funcionários). A porta `GroupPanelReaders` desta base (F1) ainda não
// tem `workOrders` nem `staffRows`: elas nascem na F3 (`feat/grupo-gestor-1a-f3`), que este ramo não toca. As duas
// funções abaixo devolvem exatamente as linhas que a F3 declara (`GroupPanelWorkOrderRow`, `GroupPanelStaffRow`), cada
// uma no contexto de RLS da própria organização e com o canário de organização; a F4 as liga à composição acima.
// ------------------------------------------------------------------------------------------------------------------

/** As colunas da OS que o Painel lê (a mesma forma de `GroupPanelWorkOrderRow`, da F3). */
export type PrismaGroupPanelWorkOrderRow = {
  readonly status: WorkOrderStatus;
  readonly createdAt: Date;
  readonly scheduledFor: Date | null;
  readonly arrivedAt: Date | null;
  readonly completedAt: Date | null;
  readonly assignedUserId: string | null;
};

/** Um usuário do pátio, para a contagem de funcionários (a mesma forma de `GroupPanelStaffRow`, da F3). */
export type PrismaGroupPanelStaffRow = {
  readonly userId: string;
  readonly identityId: string | null;
  readonly localKey: string;
  readonly active: boolean;
  readonly profiles: readonly string[];
};

/** As OS daquela organização, no contexto dela; linha de outra organização derruba a leitura. */
export function readGroupPanelWorkOrderRows(client: PrismaClient, input: { readonly tenantId: string; readonly now: Date }): Promise<readonly PrismaGroupPanelWorkOrderRow[]> {
  const windowStart = groupPanelWorkOrderWindowStart(input.now);
  return withTenantRls(client, input.tenantId, async (tx) => {
    const rows = await tx.workOrder.findMany({
      where: { tenant_id: input.tenantId, OR: [{ created_at: { gte: windowStart } }, { status: { in: [...GROUP_PANEL_OPEN_STATUSES] } }] },
      select: { tenant_id: true, status: true, created_at: true, scheduled_for: true, arrived_at: true, completed_at: true, assigned_user_id: true },
    });
    assertRowsBelongToTenant(rows.map((row) => ({ tenantId: row.tenant_id })), input.tenantId, "work_orders");
    return rows.map((row) => ({
      status: row.status as WorkOrderStatus,
      createdAt: row.created_at,
      scheduledFor: row.scheduled_for,
      arrivedAt: row.arrived_at,
      completedAt: row.completed_at,
      assignedUserId: row.assigned_user_id,
    }));
  });
}

/**
 * Os usuários daquela organização, com os perfis e a identidade (a chave interna que não deixa a mesma pessoa contar
 * duas vezes no grupo; nunca sai na resposta). Tudo no contexto da organização; sem vínculo, a chave é local.
 */
export function readGroupPanelStaffRows(client: PrismaClient, input: { readonly tenantId: string }): Promise<readonly PrismaGroupPanelStaffRow[]> {
  return withTenantRls(client, input.tenantId, async (tx: Prisma.TransactionClient) => {
    const users = await tx.user.findMany({
      where: { tenant_id: input.tenantId },
      select: { id: true, tenant_id: true, status: true, role_assignments: { select: { role: { select: { key: true } } } } },
    });
    assertRowsBelongToTenant(users.map((user) => ({ tenantId: user.tenant_id })), input.tenantId, "users");
    const links = await tx.authIdentityLink.findMany({ where: { tenant_id: input.tenantId }, select: { tenant_id: true, user_id: true, identity_id: true } });
    assertRowsBelongToTenant(links.map((link) => ({ tenantId: link.tenant_id })), input.tenantId, "auth_identity_links");
    const identityByUser = new Map(links.map((link) => [link.user_id, link.identity_id]));
    return users.map((user) => ({
      userId: user.id,
      identityId: identityByUser.get(user.id) ?? null,
      localKey: `${input.tenantId}:${user.id}`,
      active: user.status === "active",
      profiles: [...new Set(user.role_assignments.map((assignment) => assignment.role.key))],
    }));
  });
}
