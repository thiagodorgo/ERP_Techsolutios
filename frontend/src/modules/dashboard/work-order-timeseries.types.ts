// WS-CARDS-CHARTS-F2 — espelho do DTO de GET /api/v1/operations/work-orders-timeseries (#245). O backend
// agrega a série diária de OS por dia civil (bucket "day", America/Sao_Paulo); o front NUNCA soma nem
// fabrica ponto (D-007). `source` distingue api/mock/fallback e `forbidden` marca o 403 do gate RBAC
// (work_orders:read) para a UI mostrar "acesso não permitido" honesto — sem inventar dado.

export type WorkOrderTimeseriesPoint = {
  readonly date: string; // dia civil YYYY-MM-DD em America/Sao_Paulo (já resolvido pelo backend)
  readonly created: number;
  readonly completed: number;
  readonly cancelled: number;
};

export type WorkOrderTimeseriesSource = "api" | "mock" | "fallback";

export type WorkOrderTimeseriesData = {
  readonly from: string;
  readonly to: string;
  readonly points: readonly WorkOrderTimeseriesPoint[];
  readonly source: WorkOrderTimeseriesSource;
  readonly forbidden: boolean;
};

export type WorkOrderTimeseriesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Série VAZIA honesta (mock/erro/403): sem inventar ponto (D-007). A UI mostra emptyLabel / acesso-negado.
export function emptyTimeseries(source: WorkOrderTimeseriesSource): WorkOrderTimeseriesData {
  return { from: "", to: "", points: [], source, forbidden: false };
}
