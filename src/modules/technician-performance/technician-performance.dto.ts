import type { TechnicianPerformanceResult } from "./technician-performance.types.js";

// §2.8 — OMITE tenant_id. Só o UUID do operador (chave de negócio que o front usa para alocar) e os
// agregados (contagens + índice). Sem PII, sem coordenada, sem segredo.
export function toTechnicianPerformanceDto(result: TechnicianPerformanceResult) {
  return {
    items: result.items.map((row) => ({
      operatorUserId: row.operatorUserId,
      assignedCount: row.assignedCount,
      completedCount: row.completedCount,
      cancelledCount: row.cancelledCount,
      completionRate: row.completionRate,
    })),
  };
}
