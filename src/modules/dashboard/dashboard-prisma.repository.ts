import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  WorkOrderEventType,
  WorkOrderPriority,
  WorkOrderStatus,
} from "../work-orders/work-order.types.js";
import type { DashboardRepository } from "./dashboard.repository.js";
import {
  startOfDay,
  toCriticalWorkOrder,
  toRecentEvent,
  weekAgoFrom,
} from "./dashboard.repository.js";
import type { DashboardSummary, DashboardSummaryInput } from "./dashboard.types.js";
import {
  DASHBOARD_CRITICAL_LIMIT,
  DASHBOARD_RECENT_EVENTS_LIMIT,
  DASHBOARD_TERMINAL_STATUSES,
  emptyWorkOrdersByStatus,
} from "./dashboard.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

/**
 * Computes the summary server-side with COUNT / GROUP BY / recent-SELECT over the
 * existing tables. Every query is scoped by tenant_id and runs inside the RLS
 * transaction (see the Rls wrapper below). No table is materialized in memory.
 */
export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getSummary(input: DashboardSummaryInput): Promise<DashboardSummary> {
    const { tenantId, now } = input;
    const todayStart = startOfDay(now);
    const weekStart = weekAgoFrom(now);
    const nonTerminalStatus = { notIn: [...DASHBOARD_TERMINAL_STATUSES] };

    const [
      total,
      statusGroups,
      createdToday,
      createdThisWeek,
      overdue,
      customers,
      vehicles,
      teams,
      services,
      criticalRows,
      eventRows,
    ] = await Promise.all([
      this.client.workOrder.count({ where: { tenant_id: tenantId } }),
      this.client.workOrder.groupBy({
        by: ["status"],
        where: { tenant_id: tenantId },
        _count: true,
      }),
      this.client.workOrder.count({
        where: { tenant_id: tenantId, created_at: { gte: todayStart } },
      }),
      this.client.workOrder.count({
        where: { tenant_id: tenantId, created_at: { gte: weekStart } },
      }),
      this.client.workOrder.count({
        where: {
          tenant_id: tenantId,
          scheduled_for: { lt: now },
          status: nonTerminalStatus,
        },
      }),
      this.client.customer.count({ where: { tenant_id: tenantId, is_active: true } }),
      this.client.vehicle.count({ where: { tenant_id: tenantId, is_active: true } }),
      this.client.team.count({ where: { tenant_id: tenantId, is_active: true } }),
      this.client.serviceCatalog.count({ where: { tenant_id: tenantId, is_active: true } }),
      this.client.workOrder.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { scheduled_for: { lt: now }, status: nonTerminalStatus },
            { priority: { in: ["high", "urgent"] } },
          ],
        },
        orderBy: [
          { scheduled_for: { sort: "asc", nulls: "last" } },
          { priority: "asc" },
          { created_at: "desc" },
        ],
        take: DASHBOARD_CRITICAL_LIMIT,
      }),
      // Ω3-b (P-034 do validador-mestre): o comentário livre (work_order_comment) NÃO entra no feed do
      // dashboard — o corpo pode conter PII e o feed é visível a papéis com dashboard:read porém SEM
      // work_orders:read (ex.: support). Comentário é dado de detalhe da OS, não de atividade agregada.
      this.client.workOrderEvent.findMany({
        where: { tenant_id: tenantId, event_type: { not: "work_order_comment" } },
        orderBy: [{ created_at: "desc" }],
        take: DASHBOARD_RECENT_EVENTS_LIMIT,
      }),
    ]);

    const byStatus = emptyWorkOrdersByStatus();
    for (const group of statusGroups) {
      const status = group.status as WorkOrderStatus;
      if (status in byStatus) {
        byStatus[status] = group._count;
      }
    }

    return {
      workOrders: {
        total,
        byStatus,
        createdToday,
        createdThisWeek,
        overdue,
      },
      registry: {
        customers,
        vehicles,
        teams,
        services,
      },
      criticalWorkOrders: criticalRows.map((row) =>
        toCriticalWorkOrder({
          id: row.id,
          code: row.code,
          title: row.title,
          status: row.status as WorkOrderStatus,
          priority: row.priority as WorkOrderPriority,
          scheduledFor: row.scheduled_for ?? undefined,
          customerName: row.customer_name ?? undefined,
        }),
      ),
      recentEvents: eventRows.map((row) =>
        toRecentEvent({
          id: row.id,
          workOrderId: row.work_order_id,
          eventType: row.event_type as WorkOrderEventType,
          message: row.message,
          createdAt: row.created_at,
        }),
      ),
    };
  }
}

export class RlsPrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getSummary(input: DashboardSummaryInput): Promise<DashboardSummary> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaDashboardRepository(tx).getSummary(input),
    );
  }
}

export async function createPrismaDashboardRepository(): Promise<RlsPrismaDashboardRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaDashboardRepository(prisma);
}
