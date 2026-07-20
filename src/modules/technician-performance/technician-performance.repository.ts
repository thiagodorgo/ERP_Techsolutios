import { getMemoryWorkOrderRepositoryForTests } from "../work-orders/work-order.service.js";
import { computeTechnicianPerformance } from "./technician-performance.compute.js";
import type {
  TechnicianPerformanceInput,
  TechnicianPerformanceResult,
  WorkOrderPerformanceRow,
} from "./technician-performance.types.js";

// Varredura completa das OSs do tenant (data set operacional; espelha o InMemory do financial-summary).
const FULL_SCAN_LIMIT = Number.MAX_SAFE_INTEGER;

export interface TechnicianPerformanceRepository {
  getPerformance(input: TechnicianPerformanceInput): Promise<TechnicianPerformanceResult>;
}

// Read-only: lê o singleton InMemory de work_orders (o mesmo que a API escreve em modo memory), descarta
// as OSs SEM técnico atribuído e delega ao MESMO compute puro do Prisma → paridade garantida. Soma NO
// BACKEND — varre TODAS as linhas do tenant (não uma página).
export class InMemoryTechnicianPerformanceRepository implements TechnicianPerformanceRepository {
  async getPerformance(input: TechnicianPerformanceInput): Promise<TechnicianPerformanceResult> {
    const repository = getMemoryWorkOrderRepositoryForTests();
    const result = await repository.list({ tenantId: input.tenantId, limit: FULL_SCAN_LIMIT, offset: 0 });

    const rows: WorkOrderPerformanceRow[] = result.items
      .filter((workOrder) => Boolean(workOrder.assignedUserId))
      .map((workOrder) => ({
        operatorUserId: workOrder.assignedUserId as string,
        status: workOrder.status,
        createdAt: workOrder.createdAt,
      }));

    return {
      items: computeTechnicianPerformance(rows, {
        operatorUserId: input.operatorUserId,
        from: input.from,
        to: input.to,
      }),
    };
  }
}
