import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { NotificationKind, NotificationStatus, ProcessNotification } from "../impound/impound.notifications.types.js";
import type { ImpoundStatus } from "../impound/impound.types.js";
import type { PatiosDashboardRepository } from "./patios-dashboard.repository.js";
import { computeDeadlineAlerts, type DeadlineAlertSource } from "./patios-dashboard.notifications.js";
import {
  emptyProcessesByPhase,
  PHASE_BUCKET_BY_STATUS,
  type PatiosDashboardSummary,
  type PatiosDashboardSummaryInput,
  type YardOccupancySummary,
} from "./patios-dashboard.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// Candidatos elegíveis para deadlineAlerts: MESMO filtro de listNotificationCandidates (PR-09, impound.
// notifications-prisma.repository.ts) — t0 setado, rito ainda correndo (não congelado), não suspenso, perfil
// PÚBLICO. Cap defensivo (não escaneia sem limite).
const DEADLINE_CANDIDATE_LIMIT = 200;
const DEADLINE_ALERT_LIMIT = 20;

/**
 * Computa o painel SERVER-SIDE com COUNT/GROUP BY/SELECT sobre as tabelas já existentes (OccupancyService/
 * YardSpot para I1, ProcessNotification para I6, SettlementAllocation para I7) — leitura pura, nenhuma tabela
 * materializada em memória, tudo dentro da tx RLS (RlsPatiosDashboardRepository).
 */
export class PrismaPatiosDashboardRepository implements PatiosDashboardRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getSummary(input: PatiosDashboardSummaryInput): Promise<PatiosDashboardSummary> {
    const { tenantId, now } = input;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [occupancy, statusGroups, overdueNotifications, releaseQueueDepth, revenueRows, monthRevenueRows, deadlineAlerts] =
      await Promise.all([
        this.computeOccupancy(tenantId),
        this.client.impoundProcess.groupBy({ by: ["status"], where: { tenant_id: tenantId }, _count: true }),
        this.client.processNotification.count({
          where: { tenant_id: tenantId, status: "DUE", due_at: { lte: now } },
        }),
        this.client.impoundRelease.count({
          where: { tenant_id: tenantId, status: { in: ["IN_PROGRESS", "AUTHORIZED"] } },
        }),
        this.client.settlementAllocation.groupBy({
          by: ["beneficiary_kind"],
          where: { tenant_id: tenantId },
          _sum: { amount: true },
        }),
        this.client.settlementAllocation.aggregate({
          where: { tenant_id: tenantId, created_at: { gte: monthStart } },
          _sum: { amount: true },
        }),
        this.computeDeadlineAlerts(tenantId, now),
      ]);

    const processesByPhase = emptyProcessesByPhase();
    let totalProcesses = 0;
    for (const group of statusGroups) {
      const status = group.status as ImpoundStatus;
      const bucket = PHASE_BUCKET_BY_STATUS[status];
      if (bucket) processesByPhase[bucket] += group._count;
      totalProcesses += group._count;
    }
    const openLots = statusGroups.find((group) => group.status === "LOTTED")?._count ?? 0;

    const grandTotal = revenueRows.reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0);

    return {
      occupancy,
      totalProcesses,
      processesByPhase,
      overdueNotifications,
      releaseQueueDepth,
      openLots,
      auctionRevenue: {
        currentMonthTotal: Number(monthRevenueRows._sum.amount ?? 0).toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        byBeneficiary: revenueRows.map((row) => ({
          beneficiaryKind: row.beneficiary_kind,
          totalAmount: Number(row._sum.amount ?? 0).toFixed(2),
        })),
      },
      deadlineAlerts,
    };
  }

  // Ocupação por pátio (I1): raw JOIN yard_spots→yard_areas→yards (o vínculo spot→yard não é direto no schema —
  // passa pela área hierárquica). Fonte IDÊNTICA à que o OccupancyService escreve (yard_spots.status), sem
  // duplicar cálculo.
  private async computeOccupancy(tenantId: string): Promise<readonly YardOccupancySummary[]> {
    const rows = await this.client.$queryRaw<
      Array<{ yard_id: string; yard_name: string; total: bigint; occupied: bigint; free: bigint; blocked: bigint }>
    >`
      SELECT y.id AS yard_id, y.name AS yard_name,
             COUNT(s.id) AS total,
             COUNT(s.id) FILTER (WHERE s.status = 'OCCUPIED') AS occupied,
             COUNT(s.id) FILTER (WHERE s.status = 'FREE') AS free,
             COUNT(s.id) FILTER (WHERE s.status = 'BLOCKED') AS blocked
      FROM yards y
      LEFT JOIN yard_areas a ON a.tenant_id = y.tenant_id AND a.yard_id = y.id
      LEFT JOIN yard_spots s ON s.tenant_id = a.tenant_id AND s.area_id = a.id
      WHERE y.tenant_id = ${tenantId}::uuid
      GROUP BY y.id, y.name
      ORDER BY y.name ASC
    `;
    return rows.map((row) => ({
      yardId: row.yard_id,
      yardName: row.yard_name,
      totalSpots: Number(row.total),
      occupiedSpots: Number(row.occupied),
      freeSpots: Number(row.free),
      blockedSpots: Number(row.blocked),
    }));
  }

  // I6 — alertas de prazo REUSANDO o motor puro do PR-09 (computeNotificationSchedule/isNotificationTrailComplete
  // via patios-dashboard.notifications.ts). Candidatos = MESMO filtro de listNotificationCandidates (t0 setado,
  // rito ainda correndo, não suspenso, perfil PÚBLICO); cap defensivo + top-N por due_at.
  private async computeDeadlineAlerts(tenantId: string, now: Date) {
    const rows = await this.client.$queryRaw<
      Array<{ id: string; entered_at: Date; owner_notif_days: number; notice_edict_day: number }>
    >`
      SELECT ip.id, ip.entered_at, jp.owner_notif_days, jp.notice_edict_day
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      WHERE ip.tenant_id = ${tenantId}::uuid
        AND ip.entered_at IS NOT NULL AND ip.frozen_at IS NULL
        AND ip.status <> 'JUDICIAL_HOLD'
        AND jp.scope = 'PUBLIC_AGREEMENT'
      ORDER BY ip.entered_at ASC
      LIMIT ${DEADLINE_CANDIDATE_LIMIT}
    `;
    if (rows.length === 0) return [];

    const notificationRows = await this.client.processNotification.findMany({
      where: { tenant_id: tenantId, process_id: { in: rows.map((row) => row.id) } },
    });
    const notificationsByProcess = new Map<string, ProcessNotification[]>();
    for (const row of notificationRows) {
      const list = notificationsByProcess.get(row.process_id) ?? [];
      list.push({
        id: row.id,
        tenantId: row.tenant_id,
        processId: row.process_id,
        kind: row.kind as NotificationKind,
        status: row.status as NotificationStatus,
        dueAt: row.due_at,
        issuedAt: row.issued_at ?? undefined,
        channel: (row.channel ?? undefined) as ProcessNotification["channel"],
        recipientRef: row.recipient_ref ?? undefined,
        reason: row.reason ?? undefined,
        createdBy: row.created_by ?? undefined,
        updatedBy: row.updated_by ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
      notificationsByProcess.set(row.process_id, list);
    }

    const sources: DeadlineAlertSource[] = rows.map((row) => ({
      processId: row.id,
      enteredAt: row.entered_at,
      profile: { ownerNotifDays: Number(row.owner_notif_days), noticeEdictDay: Number(row.notice_edict_day) },
      notifications: notificationsByProcess.get(row.id) ?? [],
    }));
    return computeDeadlineAlerts(sources, now).slice(0, DEADLINE_ALERT_LIMIT);
  }
}

export class RlsPatiosDashboardRepository implements PatiosDashboardRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getSummary(input: PatiosDashboardSummaryInput): Promise<PatiosDashboardSummary> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPatiosDashboardRepository(tx).getSummary(input));
  }
}

export async function createPrismaPatiosDashboardRepository(): Promise<RlsPatiosDashboardRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPatiosDashboardRepository(prisma);
}
