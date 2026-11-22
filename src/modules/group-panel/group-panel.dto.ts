// B-GRUPO-GESTOR (1a, F1) — a resposta do Painel, por LISTA FECHADA de chaves (R11, PAY-1). Nada de identificador de
// grupo, e-mail, token, caminho nem nota do grupo. O resumo de cada pátio sai no MESMO formato do `GET /financial-summary`.

import { toFinancialSummaryDto } from "../financial-summary/financial-summary.dto.js";
import type { GroupPanelScope, GroupPanelSummary } from "./group-panel.types.js";

export function toGroupPanelScopeDto(scope: GroupPanelScope) {
  return {
    inGroup: scope.inGroup,
    organizations: scope.organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      finance: organization.finance,
      operations: organization.operations,
      staff: organization.staff,
    })),
  };
}

export function toGroupPanelSummaryDto(summary: GroupPanelSummary) {
  const consolidated = summary.consolidated;
  return {
    generatedAt: summary.generatedAt.toISOString(),
    coverage: {
      complete: summary.coverage.complete,
      included: summary.coverage.included,
      failed: [...summary.coverage.failed],
      reason: summary.coverage.reason,
      withoutAccess: summary.coverage.withoutAccess.map((organization) => ({ id: organization.id, name: organization.name })),
    },
    consolidated:
      consolidated === null
        ? null
        : {
            currency: consolidated.currency,
            finance: {
              receivableOpen: consolidated.finance.receivableOpen,
              receivableOpenCount: consolidated.finance.receivableOpenCount,
              receivableOverdue: consolidated.finance.receivableOverdue,
              receivableOverdueCount: consolidated.finance.receivableOverdueCount,
              payableOpen: consolidated.finance.payableOpen,
              payableOpenCount: consolidated.finance.payableOpenCount,
              payableOverdue: consolidated.finance.payableOverdue,
              payableOverdueCount: consolidated.finance.payableOverdueCount,
              receivedThisMonth: consolidated.finance.receivedThisMonth,
              paidThisMonth: consolidated.finance.paidThisMonth,
              competencia: consolidated.finance.competencia,
              cashBalance: consolidated.finance.cashBalance,
              accountCount: consolidated.finance.accountCount,
              cashFlow: consolidated.finance.cashFlow.map((point) => ({
                competencia: point.competencia,
                inflow: point.inflow,
                outflow: point.outflow,
              })),
              receivedVariationPct: consolidated.finance.receivedVariationPct,
              paidVariationPct: consolidated.finance.paidVariationPct,
            },
            operations: { ...consolidated.operations },
            staff: {
              activeUsers: consolidated.staff.activeUsers,
              byProfile: consolidated.staff.byProfile.map((item) => ({ profile: item.profile, count: item.count })),
              inServiceNow: consolidated.staff.inServiceNow,
            },
          },
    organizations: summary.organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      finance: {
        status: organization.finance.status,
        summary: organization.finance.summary === null ? null : toFinancialSummaryDto(organization.finance.summary),
        receivedVariationPct: organization.finance.receivedVariationPct,
        paidVariationPct: organization.finance.paidVariationPct,
      },
      operations: {
        status: organization.operations.status,
        summary: organization.operations.summary === null ? null : { ...organization.operations.summary },
      },
      staff: {
        status: organization.staff.status,
        summary:
          organization.staff.summary === null
            ? null
            : {
                activeUsers: organization.staff.summary.activeUsers,
                byProfile: organization.staff.summary.byProfile.map((item) => ({ profile: item.profile, count: item.count })),
                inServiceNow: organization.staff.summary.inServiceNow,
              },
      },
    })),
  };
}
