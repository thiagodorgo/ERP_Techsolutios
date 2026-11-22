// B-GRUPO-GESTOR (1a, F3) — chamados do mês e tempo de chegada, em funções puras.
//
// Decisão direta do dono (mandato F3): o tempo de chegada começa na ABERTURA (`createdAt`) e termina em `arrivedAt`
// (No local). `scheduledFor` não desloca o início. O mês é sempre o mês de negócio de São Paulo.

import { deriveBusinessDate, deriveCompetencia } from "../../config/business-time.js";
import { DASHBOARD_TERMINAL_STATUSES } from "../dashboard/dashboard.types.js";
import type { WorkOrderStatus } from "../work-orders/work-order.types.js";

const MINUTE_MS = 60_000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;

export const GROUP_PANEL_IN_PROGRESS_STATUSES: readonly WorkOrderStatus[] = [
  "on_route",
  "on_site",
  "in_progress",
  "paused",
];

export type GroupPanelWorkOrderRow = {
  readonly status: WorkOrderStatus;
  readonly createdAt: Date;
  readonly scheduledFor: Date | null;
  readonly arrivedAt: Date | null;
  readonly completedAt: Date | null;
  readonly assignedUserId: string | null;
};

export type GroupPanelOperations = {
  readonly openedToday: number;
  readonly openedThisWeek: number;
  readonly inProgress: number;
  readonly overdue: number;
  readonly openedThisMonth: number;
  readonly completedThisMonth: number;
  readonly openedPreviousMonth: number;
  readonly completionRatePct: number | null;
  readonly arrivalAvgMinutes: number | null;
  readonly arrivalCount: number;
  readonly arrivalMissingCount: number;
  readonly completionAvgMinutes: number | null;
};

/** Totais internos para consolidar o grupo sem calcular uma média de médias. Nunca saem no DTO. */
export type GroupPanelOperationsComputed = GroupPanelOperations & {
  readonly arrivalTotalMinutes: number;
  readonly completionTotalMinutes: number;
  readonly completionCount: number;
};

export function computeOperations(rows: readonly GroupPanelWorkOrderRow[], now: Date): GroupPanelOperationsComputed {
  const currentMonth = deriveCompetencia(now);
  const previousMonth = previousCompetencia(currentMonth);
  const today = deriveBusinessDate(now);
  const weekStart = now.getTime() - WEEK_MS;

  let openedToday = 0;
  let openedThisWeek = 0;
  let inProgress = 0;
  let overdue = 0;
  let openedThisMonth = 0;
  let completedThisMonth = 0;
  let openedPreviousMonth = 0;
  let arrivalTotalMinutes = 0;
  let arrivalCount = 0;
  let arrivalMissingCount = 0;
  let completionTotalMinutes = 0;
  let completionCount = 0;

  for (const row of rows) {
    const createdAtMs = row.createdAt.getTime();
    const month = deriveCompetencia(row.createdAt);
    if (deriveBusinessDate(row.createdAt) === today) openedToday += 1;
    if (createdAtMs >= weekStart && createdAtMs <= now.getTime()) openedThisWeek += 1;
    if (GROUP_PANEL_IN_PROGRESS_STATUSES.includes(row.status)) inProgress += 1;
    if (
      row.scheduledFor !== null &&
      row.scheduledFor.getTime() < now.getTime() &&
      !DASHBOARD_TERMINAL_STATUSES.includes(row.status)
    ) {
      overdue += 1;
    }
    if (month === previousMonth) openedPreviousMonth += 1;
    if (month !== currentMonth) continue;

    openedThisMonth += 1;
    if (row.status === "completed") completedThisMonth += 1;
    if ((row.status === "completed" || row.completedAt !== null) && row.arrivedAt === null) arrivalMissingCount += 1;
    if (row.status === "cancelled" || row.status === "rejected") continue;

    // âncora (MUT-17, atualizada pela decisão direta do dono): SLA começa sempre na abertura.
    const startedAt = row.createdAt;

    if (row.arrivedAt !== null) {
      const arrivalMinutes = elapsedMinutes(startedAt, row.arrivedAt);
      if (arrivalMinutes !== null) {
        arrivalTotalMinutes += arrivalMinutes;
        arrivalCount += 1;
      }
    }
    if (row.completedAt !== null) {
      const completionMinutes = elapsedMinutes(startedAt, row.completedAt);
      if (completionMinutes !== null) {
        completionTotalMinutes += completionMinutes;
        completionCount += 1;
      }
    }
  }

  // âncora (MUT-14 e MUT-18)
  const completionRatePct = openedThisMonth === 0 ? null : Math.round((completedThisMonth / openedThisMonth) * 100);
  const arrivalAvgMinutes = arrivalCount === 0 ? null : Math.round(arrivalTotalMinutes / arrivalCount);
  const completionAvgMinutes = completionCount === 0 ? null : Math.round(completionTotalMinutes / completionCount);

  return {
    openedToday,
    openedThisWeek,
    inProgress,
    overdue,
    openedThisMonth,
    completedThisMonth,
    openedPreviousMonth,
    completionRatePct,
    arrivalAvgMinutes,
    arrivalCount,
    arrivalMissingCount,
    completionAvgMinutes,
    arrivalTotalMinutes,
    completionTotalMinutes,
    completionCount,
  };
}

export function consolidateOperations(blocks: readonly GroupPanelOperationsComputed[]): GroupPanelOperationsComputed {
  const sum = (pick: (block: GroupPanelOperationsComputed) => number) => blocks.reduce((total, block) => total + pick(block), 0);
  const openedThisMonth = sum((block) => block.openedThisMonth);
  const completedThisMonth = sum((block) => block.completedThisMonth);
  const arrivalTotalMinutes = sum((block) => block.arrivalTotalMinutes);
  const arrivalCount = sum((block) => block.arrivalCount);
  const completionTotalMinutes = sum((block) => block.completionTotalMinutes);
  const completionCount = sum((block) => block.completionCount);

  return {
    openedToday: sum((block) => block.openedToday),
    openedThisWeek: sum((block) => block.openedThisWeek),
    inProgress: sum((block) => block.inProgress),
    overdue: sum((block) => block.overdue),
    openedThisMonth,
    completedThisMonth,
    openedPreviousMonth: sum((block) => block.openedPreviousMonth),
    completionRatePct: openedThisMonth === 0 ? null : Math.round((completedThisMonth / openedThisMonth) * 100),
    arrivalAvgMinutes: arrivalCount === 0 ? null : Math.round(arrivalTotalMinutes / arrivalCount),
    arrivalCount,
    arrivalMissingCount: sum((block) => block.arrivalMissingCount),
    completionAvgMinutes: completionCount === 0 ? null : Math.round(completionTotalMinutes / completionCount),
    arrivalTotalMinutes,
    completionTotalMinutes,
    completionCount,
  };
}

export function publicOperations(value: GroupPanelOperationsComputed): GroupPanelOperations {
  const { arrivalTotalMinutes: _arrival, completionTotalMinutes: _completion, completionCount: _count, ...result } = value;
  return result;
}

function elapsedMinutes(start: Date, end: Date): number | null {
  const elapsed = end.getTime() - start.getTime();
  return elapsed < 0 ? null : elapsed / MINUTE_MS;
}

function previousCompetencia(value: string): string {
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return `${String(previous.year).padStart(4, "0")}-${String(previous.month).padStart(2, "0")}`;
}
