import { getMemoryWorkOrderRepositoryForTests } from "../work-orders/work-order.service.js";
import { computeWorkOrderTimeseries } from "./work-order-timeseries.compute.js";
import type {
  WorkOrderTimeseriesInput,
  WorkOrderTimeseriesResult,
  WorkOrderTimeseriesRow,
} from "./work-order-timeseries.types.js";

// Varredura completa das OSs do tenant (data set de dashboard; espelha o InMemory do technician-performance).
const FULL_SCAN_LIMIT = Number.MAX_SAFE_INTEGER;

export interface WorkOrderTimeseriesRepository {
  getTimeseries(input: WorkOrderTimeseriesInput): Promise<WorkOrderTimeseriesResult>;
}

// Read-only: lê o singleton InMemory de work_orders (o mesmo que a API escreve em modo memory) e delega ao
// MESMO compute puro do Prisma → paridade garantida. Varre TODAS as linhas do tenant (não uma página) e o
// zero-fill/janela ficam a cargo do compute (fonte única da semântica).
export class InMemoryWorkOrderTimeseriesRepository implements WorkOrderTimeseriesRepository {
  async getTimeseries(input: WorkOrderTimeseriesInput): Promise<WorkOrderTimeseriesResult> {
    const repository = getMemoryWorkOrderRepositoryForTests();
    const result = await repository.list({ tenantId: input.tenantId, limit: FULL_SCAN_LIMIT, offset: 0 });

    const rows: WorkOrderTimeseriesRow[] = result.items.map((workOrder) => ({
      status: workOrder.status,
      createdAt: workOrder.createdAt,
      completedAt: workOrder.completedAt ?? null,
      cancelledAt: workOrder.cancelledAt ?? null,
    }));

    return computeWorkOrderTimeseries(rows, input.window);
  }
}
