// B-GRUPO-GESTOR (1a, F1) — o serviço do Painel do grupo. Só leitura.
//
// - `now` é fixado UMA vez e o mesmo valor vai a todas as organizações (plano-base §3.3): o número de um pátio no Painel
//   é igual ao do Financeiro daquele pátio no mesmo instante.
// - Em série, uma organização por vez (não abre N transações de uma vez no pool).
// - A permissão é a do PAR de cada organização (o usuário LOCAL da pessoa ali), e o módulo é o daquela organização (R15).
// - Total parcial nunca sai como total (§3.4): falha de leitura, teto ou moedas diferentes anulam o consolidado.
// - Trilha por organização lida (E1): uma linha em cada uma, com o usuário local como ator; se a de uma organização não
//   grava, aquela organização sai como `erro`, sem número, e o total vem nulo.
// - O canário de RLS (`TenantRowsLeakError`) nunca é engolido: 500, nenhum número sai.
//
// As linhas marcadas "âncora" são o alvo das mutações literais do plano: não reescrever sem emenda.

import { TenantRowsLeakError } from "../../database/rls.js";
import type { FinancialSummary } from "../financial-summary/financial-summary.types.js";
import { MembershipOverlapError, todayBusinessDate } from "../subscription-billing/economic-groups/membership.rules.js";
import { canReadOperations, canReadStaff, decideFinanceAccess, resolveActiveGroup, resolveGroupScope, type GroupScopeResult } from "./group-scope.js";
import { cashFlowVariations, consolidate, currenciesOf } from "./group-panel.money.js";
import { computeOperations, consolidateOperations, publicOperations, type GroupPanelOperationsComputed } from "./group-panel.sla.js";
import { computeStaff, consolidateStaff, publicStaff, STAFF_IN_SERVICE_STATUSES, type GroupPanelStaffComputed } from "./group-panel.staff.js";
import {
  FINANCE_MODULE_KEY,
  type BlockStatus,
  type GroupPanelActor,
  type GroupPanelCoverage,
  type GroupPanelOrganization,
  type GroupPanelReaders,
  type GroupPanelScope,
  type GroupPanelSummary,
  type ScopedOrganization,
} from "./group-panel.types.js";

type OrganizationRead = {
  readonly organization: ScopedOrganization;
  status: BlockStatus;
  summary: FinancialSummary | null;
  operationsStatus: "ok" | "sem_permissao" | "erro";
  operations: GroupPanelOperationsComputed | null;
  staffStatus: "ok" | "sem_permissao" | "erro";
  staff: GroupPanelStaffComputed | null;
};

export class GroupPanelService {
  constructor(
    private readonly readers: GroupPanelReaders,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** `GET /group-panel/scope`: os pátios do alcance e o que a pessoa pode ver em cada um. Não grava trilha. */
  async getScope(actor: GroupPanelActor): Promise<GroupPanelScope> {
    const scope = await this.resolveScope(actor, this.clock());
    const organizations = [];
    for (const organization of scope.organizations) {
      const access = await this.accessOf(organization);
      organizations.push({
        id: organization.tenantId,
        name: organization.name,
        finance: access.finance === "ok",
        operations: access.operations,
        staff: access.staff,
      });
    }
    return { inGroup: true, organizations };
  }

  /** `GET /group-panel/summary`: o financeiro somado do grupo e o de cada pátio. */
  async getSummary(actor: GroupPanelActor): Promise<GroupPanelSummary> {
    const now = this.clock();
    const scope = await this.resolveScope(actor, now);

    const reads: OrganizationRead[] = [];
    for (const organization of scope.processed) {
      reads.push(await this.readOrganization(organization, now));
    }

    let coverage = coverageOf(reads, scope);
    for (const read of reads) {
      const organization = read.organization;
      try {
        // âncora (MUT-9, MUT-9b)
        await this.readers.recordView({ tenantId: organization.tenantId, userId: organization.userId, complete: coverage.complete });
      } catch (error) {
        rethrowIntegrityError(error);
        read.status = "erro";
        read.summary = null;
      }
    }
    coverage = coverageOf(reads, scope);

    const okBlocks = reads.filter((read) => read.status === "ok" && read.summary !== null).map((read) => read.summary!);
    const operationsBlocks = reads.filter((read) => read.operationsStatus === "ok" && read.operations !== null).map((read) => read.operations!);
    const staffBlocks = reads.filter((read) => read.staffStatus === "ok" && read.staff !== null).map((read) => read.staff!);
    const staffRows = staffBlocks.flatMap((block) => block.people.map((person) => ({ identityId: person.key, localKey: person.key })));
    // âncora (MUT-19): a mesma pessoa em vários pátios conta uma vez no grupo.
    const distinctPeople = new Set(staffRows.map((row) => row.identityId ?? row.localKey)).size;
    // âncora (MUT-6)
    const consolidated = coverage.complete ? consolidate(okBlocks) : null;

    return {
      generatedAt: now,
      coverage,
      consolidated:
        consolidated === null
          ? null
          : {
              currency: okBlocks[0]?.cash.currency ?? "BRL",
              finance: consolidated,
              operations: publicOperations(consolidateOperations(operationsBlocks)),
              staff: { ...publicStaff(consolidateStaff(staffBlocks)), activeUsers: distinctPeople },
            },
      organizations: reads.map(organizationView),
    };
  }

  private async resolveScope(actor: GroupPanelActor, now: Date): Promise<GroupScopeResult> {
    const today = todayBusinessDate(now);
    // Passo 0, antes de qualquer leitura de outra organização: a marca e o grupo vigente da organização ativa.
    const managerMarks = await this.readers.managerMarks(actor);
    const activeGroupRows = await this.readers.groupMemberships([actor.tenantId]);
    const activeGroupId = resolveActiveGroup({ activeTenantId: actor.tenantId, activeGroupRows, managerMarks, today });
    // Passos 3 e 4: as organizações da identidade e o vínculo de grupo de cada uma.
    const memberships = await this.readers.identityMemberships(actor);
    const tenantIds = uniqueSorted(memberships.map((membership) => membership.tenantId));
    const groupRows = tenantIds.length === 0 ? [] : await this.readers.groupMemberships(tenantIds);
    return resolveGroupScope({ activeGroupId, memberships, groupRows, today });
  }

  private async accessOf(
    organization: ScopedOrganization,
  ): Promise<{ readonly finance: BlockStatus; readonly operations: boolean; readonly staff: boolean }> {
    try {
      // âncora (MUT-12)
      const authorization = await this.readers.authorization({ tenantId: organization.tenantId, userId: organization.userId });
      const modules = await this.readers.modules({ tenantId: organization.tenantId });
      // âncora (MUT-13)
      const financeModuleOn = modules.includes(FINANCE_MODULE_KEY);
      return {
        finance: decideFinanceAccess(authorization, financeModuleOn),
        operations: canReadOperations(authorization),
        staff: canReadStaff(authorization),
      };
    } catch (error) {
      rethrowIntegrityError(error);
      return { finance: "erro", operations: false, staff: false };
    }
  }

  private async readOrganization(organization: ScopedOrganization, now: Date): Promise<OrganizationRead> {
    const access = await this.accessOf(organization);
    let status = access.finance;
    let summary: FinancialSummary | null = null;
    if (access.finance === "ok") {
      try {
      // âncora (MUT-5)
        summary = await this.readers.financeSummary({ tenantId: organization.tenantId, now });
      } catch (error) {
        rethrowIntegrityError(error);
        status = "erro";
      }
    }

    let operationsStatus: OrganizationRead["operationsStatus"] = access.operations ? "ok" : "sem_permissao";
    let staffStatus: OrganizationRead["staffStatus"] = access.staff ? "ok" : "sem_permissao";
    let operations: GroupPanelOperationsComputed | null = null;
    let staff: GroupPanelStaffComputed | null = null;
    let workOrders = null;
    if (access.operations || access.staff) {
      try {
        workOrders = await this.readers.workOrders({ tenantId: organization.tenantId, now });
      } catch (error) {
        rethrowIntegrityError(error);
        if (access.operations) operationsStatus = "erro";
        if (access.staff) staffStatus = "erro";
      }
    }
    if (access.operations && workOrders !== null) operations = computeOperations(workOrders, now);
    if (access.staff && workOrders !== null) {
      try {
        const staffRows = await this.readers.staffRows({ tenantId: organization.tenantId });
        const inServiceUserIds = workOrders
          .filter((row) => STAFF_IN_SERVICE_STATUSES.includes(row.status as (typeof STAFF_IN_SERVICE_STATUSES)[number]))
          .flatMap((row) => (row.assignedUserId === null ? [] : [row.assignedUserId]));
        staff = computeStaff(staffRows, inServiceUserIds);
      } catch (error) {
        rethrowIntegrityError(error);
        staffStatus = "erro";
      }
    }

    return { organization, status, summary, operationsStatus, operations, staffStatus, staff };
  }
}

/** Erro de integridade (canário de RLS, vínculo duplicado) derruba o pedido: nunca vira "erro" de um pátio. */
function rethrowIntegrityError(error: unknown): void {
  if (error instanceof TenantRowsLeakError || error instanceof MembershipOverlapError) throw error;
}

function coverageOf(reads: readonly OrganizationRead[], scope: GroupScopeResult): GroupPanelCoverage {
  const okBlocks = reads.filter((read) => read.status === "ok" && read.summary !== null).map((read) => read.summary!);
  const failedReads = reads
    .filter((read) => read.status === "erro" || read.operationsStatus === "erro" || read.staffStatus === "erro")
    .map((read) => read.organization.tenantId);
  const failed = [...failedReads, ...scope.omitted.map((organization) => organization.tenantId)];
  const reason = scope.overLimit
    ? "teto"
    : failedReads.length > 0
      ? "erro_de_leitura"
      : currenciesOf(okBlocks).length > 1
        ? "moedas_diferentes"
        : null;
  return {
    complete: reason === null,
    included: okBlocks.length,
    failed,
    reason,
    withoutAccess: reads
      .filter((read) => read.status === "sem_permissao" || read.status === "modulo_desligado")
      .map((read) => ({ id: read.organization.tenantId, name: read.organization.name })),
  };
}

function organizationView(read: OrganizationRead): GroupPanelOrganization {
  const ok = read.status === "ok" && read.summary !== null;
  const variations = ok ? cashFlowVariations(read.summary!.cashFlow) : { received: null, paid: null };
  return {
    id: read.organization.tenantId,
    name: read.organization.name,
    finance: {
      status: read.status,
      summary: ok ? read.summary : null,
      receivedVariationPct: variations.received,
      paidVariationPct: variations.paid,
    },
    operations: {
      status: read.operationsStatus,
      summary: read.operations === null ? null : publicOperations(read.operations),
    },
    staff: {
      status: read.staffStatus,
      summary: read.staff === null ? null : publicStaff(read.staff),
    },
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
