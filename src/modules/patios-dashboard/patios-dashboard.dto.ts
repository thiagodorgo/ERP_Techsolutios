import type { PatiosDashboardSummary } from "./patios-dashboard.types.js";

/**
 * Serializa o resumo para o envelope `{ data }`. §2.8: só agregados/contagens/valores — nenhum tenant_id, nenhum
 * dado de identidade do bem/proprietário, nenhum PII (deadlineAlerts carrega só processId/kind/dueAt, já os
 * mesmos campos que o painel de notificações do processo já expõe sob impound:read).
 */
export function toPatiosDashboardSummaryDto(summary: PatiosDashboardSummary) {
  return {
    occupancy: summary.occupancy.map((yard) => ({
      yardId: yard.yardId,
      yardName: yard.yardName,
      totalSpots: yard.totalSpots,
      occupiedSpots: yard.occupiedSpots,
      freeSpots: yard.freeSpots,
      blockedSpots: yard.blockedSpots,
    })),
    totalProcesses: summary.totalProcesses,
    processesByPhase: { ...summary.processesByPhase },
    overdueNotifications: summary.overdueNotifications,
    releaseQueueDepth: summary.releaseQueueDepth,
    openLots: summary.openLots,
    auctionRevenue: {
      currentMonthTotal: summary.auctionRevenue.currentMonthTotal,
      grandTotal: summary.auctionRevenue.grandTotal,
      byBeneficiary: summary.auctionRevenue.byBeneficiary.map((row) => ({
        beneficiaryKind: row.beneficiaryKind,
        totalAmount: row.totalAmount,
      })),
    },
    deadlineAlerts: summary.deadlineAlerts.map((alert) => ({
      processId: alert.processId,
      kind: alert.kind,
      dueAt: alert.dueAt,
    })),
  };
}
