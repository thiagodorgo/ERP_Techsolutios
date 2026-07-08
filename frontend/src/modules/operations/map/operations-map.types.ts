import type { WorkOrderPriority, WorkOrderStatus } from "../../work-orders/work-orders.types";
import type { DispatchStatus } from "../dispatches/dispatches.types";

export type FieldLocationStatus =
  | "available"
  | "on_route"
  | "on_site"
  | "in_service"
  | "paused"
  | "offline"
  | "blocked"
  | "unknown";

export type OperationsMapSource = "api" | "mock" | "fallback";

export type FieldLocationItem = {
  readonly id: string;
  readonly operatorId: string;
  readonly userId?: string;
  readonly displayName: string;
  readonly operatorName?: string;
  readonly teamName?: string | null;
  readonly status: FieldLocationStatus;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters?: number | null;
  readonly speed?: number | null;
  readonly heading?: number | null;
  readonly batteryLevel?: number | null;
  readonly capturedAt: string;
  readonly receivedAt?: string;
  readonly isStale: boolean;
  readonly currentWorkOrder?: OperationsMapWorkOrder | null;
  readonly currentDispatch?: OperationsMapDispatch | null;
};

export type OperationsMapWorkOrder = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly customerName?: string | null;
  readonly serviceAddress?: string | null;
  readonly scheduledFor?: string | null;
  // F6 (R6.4): viatura vinculada à OS — habilita os badges "Em manutenção"/"Sem seguro" no pin.
  readonly vehicleId?: string | null;
};

export type OperationsMapDispatch = {
  readonly id: string;
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status: DispatchStatus;
  readonly observation?: string | null;
  readonly reason?: string | null;
  readonly createdAt: string;
  readonly updatedAt?: string;
};

export type OperationsMapData = {
  readonly locations: FieldLocationItem[];
  readonly source: OperationsMapSource;
  readonly fallbackReason?: string;
  // F6 (R6.4) — conjuntos de viaturas derivados das fontes reais da Frota, buscados
  // UMA vez por refresh e SOMENTE quando o papel tem a permissão de leitura:
  // `maintenanceVehicleIds` ← /maintenance-orders?status=em_execucao (maintenance_orders:read);
  // `insuredVehicleIds` ← /insurance-policies?status=vigente (insurance_policies:read).
  // `undefined` = fonte indisponível (sem permissão ou erro) → nenhum badge é exibido;
  // nunca inferimos "Sem seguro" sem a lista vigente real.
  readonly maintenanceVehicleIds?: readonly string[];
  readonly insuredVehicleIds?: readonly string[];
};

export type OperationsMapRealtimeEvent = {
  readonly id: string;
  readonly name: string;
  readonly payload: Record<string, unknown>;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly correlationId: string;
  readonly occurredAt: string;
};

export type OperationsMapRealtimeStatus = "connected" | "degraded" | "fallback" | "unavailable";

export type OperationsMapRealtimeState = {
  readonly status: OperationsMapRealtimeStatus;
  readonly label: string;
  readonly detail: string;
  readonly fallbackPolling: boolean;
  readonly retryCount: number;
  readonly lastConnectedAt?: string;
  readonly lastEventAt?: string;
};

export type OperationsMapFilters = {
  readonly status: FieldLocationStatus | "all";
  readonly team: string;
  readonly staleOnly: boolean;
  readonly search: string;
};

export type OperationsMapApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type FieldLocationHistoryParams = {
  readonly operatorUserId: string;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
};

export type OperationsMapSummary = {
  readonly total: number;
  readonly available: number;
  readonly onRoute: number;
  readonly inService: number;
  readonly stale: number;
  readonly offlineOrBlocked: number;
};

export const FIELD_LOCATION_STATUSES: readonly FieldLocationStatus[] = [
  "available",
  "on_route",
  "on_site",
  "in_service",
  "paused",
  "offline",
  "blocked",
  "unknown",
];
