import type { ImpoundRepository } from "../impound/impound.repository.js";
import type { NotificationRepository } from "../impound/impound.notifications.repository.js";
import type { ImpoundStatus } from "../impound/impound.types.js";
import type { AuctionSettlementRepository } from "../auction/auction.settlement.repository.js";
import type { ReleaseRepository } from "../release/release.repository.js";
import type { YardRepository } from "../yard/yard.repository.js";
import { computeDeadlineAlerts, type DeadlineAlertSource } from "./patios-dashboard.notifications.js";
import {
  emptyProcessesByPhase,
  PHASE_BUCKET_BY_STATUS,
  type PatiosDashboardSummary,
  type PatiosDashboardSummaryInput,
  type YardOccupancySummary,
} from "./patios-dashboard.types.js";

export interface PatiosDashboardRepository {
  getSummary(input: PatiosDashboardSummaryInput): Promise<PatiosDashboardSummary>;
}

const RELEASE_IN_PROGRESS_STATUSES: readonly ImpoundStatus[] = ["RELEASE_IN_PROGRESS", "RELEASED_FOR_REPAIR"];

// Cap defensivo: candidatos varridos por chamada (mesmo espírito do listNotificationCandidates do PR-09 — nunca
// escaneia sem limite). Telas de painel não precisam da população inteira; um cap generoso já cobre qualquer
// tenant de demonstração/teste.
const SCAN_LIMIT = 5000;

/**
 * Computa o painel a partir dos SINGLETONS de memória dos módulos donos de cada fonte (impound/yard/notificações/
 * liberação/liquidação) — SÓ leitura via os métodos públicos já existentes desses repositórios (I1/I6/I7 nunca
 * ganham uma 2ª fonte de verdade aqui). Pensado para o mesmo escopo pequeno dos testes InMemory dos módulos donos.
 */
export class InMemoryPatiosDashboardRepository implements PatiosDashboardRepository {
  constructor(
    private readonly impound: ImpoundRepository,
    private readonly yard: YardRepository,
    private readonly notifications: NotificationRepository,
    private readonly release?: ReleaseRepository,
    private readonly settlement?: AuctionSettlementRepository,
  ) {}

  async getSummary(input: PatiosDashboardSummaryInput): Promise<PatiosDashboardSummary> {
    const { tenantId, now } = input;

    const { items: processes } = await this.impound.listProcesses({ tenantId, limit: SCAN_LIMIT, offset: 0 });

    const processesByPhase = emptyProcessesByPhase();
    for (const process of processes) {
      processesByPhase[PHASE_BUCKET_BY_STATUS[process.status]] += 1;
    }
    const openLots = processes.filter((process) => process.status === "LOTTED").length;

    const occupancy = await this.computeOccupancy(tenantId);

    // overdueNotifications lê DIRETO a materialização I6 (ProcessNotification.status=DUE) — mesma fonte que o
    // sweep do PR-09 escreve. deadlineAlerts (que reusa computeNotificationSchedule/isNotificationTrailComplete)
    // exige o JurisdictionProfile por processo; a variante InMemory (só usada em teste de pequena escala) não tem
    // esse repositório injetado — fica vazio aqui e é o caminho Prisma (produção) que a preenche de verdade.
    let overdueNotifications = 0;
    const deadlineSources: DeadlineAlertSource[] = [];
    for (const process of processes) {
      const notifications = await this.notifications.listNotifications({ tenantId, processId: process.id });
      overdueNotifications += notifications.filter(
        (notification) => notification.status === "DUE" && notification.dueAt.getTime() <= now.getTime(),
      ).length;
    }

    let releaseQueueDepth = 0;
    if (this.release) {
      for (const process of processes) {
        if (!RELEASE_IN_PROGRESS_STATUSES.includes(process.status)) continue;
        if (await this.release.hasActiveRelease(tenantId, process.id)) releaseQueueDepth += 1;
      }
    }

    const byBeneficiary = new Map<string, number>();
    let currentMonthTotalCents = 0;
    let grandTotalCents = 0;
    if (this.settlement) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      for (const process of processes) {
        const view = await this.settlement.getByProcess(tenantId, process.id);
        if (!view) continue;
        for (const allocation of view.allocations) {
          const cents = Math.round(Number(allocation.amount) * 100);
          grandTotalCents += cents;
          if (allocation.createdAt.getTime() >= monthStart.getTime()) currentMonthTotalCents += cents;
          byBeneficiary.set(allocation.beneficiaryKind, (byBeneficiary.get(allocation.beneficiaryKind) ?? 0) + cents);
        }
      }
    }

    return {
      occupancy,
      totalProcesses: processes.length,
      processesByPhase,
      overdueNotifications,
      releaseQueueDepth,
      openLots,
      auctionRevenue: {
        currentMonthTotal: centsToMoney(currentMonthTotalCents),
        grandTotal: centsToMoney(grandTotalCents),
        byBeneficiary: [...byBeneficiary.entries()].map(([beneficiaryKind, cents]) => ({
          beneficiaryKind,
          totalAmount: centsToMoney(cents),
        })),
      },
      deadlineAlerts: computeDeadlineAlerts(deadlineSources, now),
    };
  }

  private async computeOccupancy(tenantId: string): Promise<readonly YardOccupancySummary[]> {
    const { items: yards } = await this.yard.listYards({ tenantId, limit: SCAN_LIMIT, offset: 0 });
    const summaries: YardOccupancySummary[] = [];
    for (const yardRow of yards) {
      const spots = await this.yard.listSpotsByYard({ tenantId, yardId: yardRow.id });
      summaries.push({
        yardId: yardRow.id,
        yardName: yardRow.name,
        totalSpots: spots.length,
        occupiedSpots: spots.filter((spot) => spot.status === "OCCUPIED").length,
        freeSpots: spots.filter((spot) => spot.status === "FREE").length,
        blockedSpots: spots.filter((spot) => spot.status === "BLOCKED").length,
      });
    }
    return summaries;
  }
}

function centsToMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}
