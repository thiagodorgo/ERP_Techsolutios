import {
  WORK_ORDER_CANCELLED_STATUS,
  WORK_ORDER_COMPLETED_STATUS,
  type TechnicianPerformanceRow,
  type WorkOrderPerformanceRow,
} from "./technician-performance.types.js";

export type TechnicianPerformanceFilter = {
  readonly operatorUserId?: string;
  readonly from?: Date;
  readonly to?: Date;
};

// Arredonda o índice a 4 casas para JSON estável (a paridade InMemory↔Prisma é garantida: ambos os
// repositórios delegam a ESTE compute puro).
function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

// PURO: filtra por operador/janela (created_at inclusivo em ambos os limites), agrega por TÉCNICO
// ATRIBUÍDO e ordena por índice de conclusão desc (desempate: assignedCount desc, depois operatorUserId
// asc → determinístico). Só emite operadores com assignedCount>=1 — NUNCA fabrica linha para operador
// sem OS (a síntese da linha zerada de um técnico pedido explicitamente é do serviço).
export function computeTechnicianPerformance(
  rows: readonly WorkOrderPerformanceRow[],
  filter: TechnicianPerformanceFilter = {},
): TechnicianPerformanceRow[] {
  const buckets = new Map<string, { assigned: number; completed: number; cancelled: number }>();

  for (const row of rows) {
    if (!row.operatorUserId) continue;
    if (filter.operatorUserId && row.operatorUserId !== filter.operatorUserId) continue;
    if (filter.from && row.createdAt < filter.from) continue;
    if (filter.to && row.createdAt > filter.to) continue;

    const bucket = buckets.get(row.operatorUserId) ?? { assigned: 0, completed: 0, cancelled: 0 };
    bucket.assigned += 1;
    if (row.status === WORK_ORDER_COMPLETED_STATUS) bucket.completed += 1;
    else if (row.status === WORK_ORDER_CANCELLED_STATUS) bucket.cancelled += 1;
    buckets.set(row.operatorUserId, bucket);
  }

  const items: TechnicianPerformanceRow[] = [...buckets.entries()].map(([operatorUserId, bucket]) => ({
    operatorUserId,
    assignedCount: bucket.assigned,
    completedCount: bucket.completed,
    cancelledCount: bucket.cancelled,
    completionRate: bucket.assigned === 0 ? null : roundRate(bucket.completed / bucket.assigned),
  }));

  return items.sort(sortByCompletion);
}

function sortByCompletion(left: TechnicianPerformanceRow, right: TechnicianPerformanceRow): number {
  const leftRate = left.completionRate ?? -1;
  const rightRate = right.completionRate ?? -1;
  if (rightRate !== leftRate) return rightRate - leftRate;
  if (right.assignedCount !== left.assignedCount) return right.assignedCount - left.assignedCount;
  if (left.operatorUserId < right.operatorUserId) return -1;
  if (left.operatorUserId > right.operatorUserId) return 1;
  return 0;
}
