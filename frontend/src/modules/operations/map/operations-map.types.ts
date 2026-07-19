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

// J-MAPAS-6 (redesign) — padding de câmera do mapa em px, para os pins não ficarem escondidos
// sob os rails de vidro / o card do 4º quadrante. Aplicado via map.setPadding (MapLibre) e como
// padding do fitBounds (Google). Compatível com maplibregl PaddingOptions e google.maps.Padding.
export type OperationsMapPadding = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

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

// Ω1b — chamado (OS aberta) posicionável como pin no Mapa Operacional.
export type OperationsMapWorkOrderPin = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly priority: WorkOrderPriority;
  readonly status: WorkOrderStatus;
  readonly customerName?: string | null;
  readonly serviceAddress?: string | null;
  readonly latitude: number;
  readonly longitude: number;
  // M-4 (J-MAPAS-6) — datas honestas que alimentam o SLA-PROXY da lista de chamados ("Agendado para"/
  // "Aberto há"). NUNCA um deadline fabricado; SLA real é Fase 2/M-7. Aditivo/opcional.
  readonly scheduledFor?: string | null;
  readonly createdAt?: string | null;
};

// Ω1b — OS aberta com endereço mas SEM coordenada válida (vai para o painel "Sem localização").
export type OperationsMapWorkOrderWithoutLocation = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly priority: WorkOrderPriority;
  readonly customerName?: string | null;
  readonly serviceAddress?: string | null;
  // M-4 (J-MAPAS-6) — mesmas datas do pin para o SLA-PROXY (chamado sem GPS também entra na fila). Aditivo.
  readonly scheduledFor?: string | null;
  readonly createdAt?: string | null;
};

// M-4 (J-MAPAS-6) — item da LISTA de "chamados que chegam" (triagem do operador de despacho). É uma
// PROJEÇÃO das OS mapeáveis (withLocation + withoutLocation) com SÓ o que a lista mostra: código, cliente,
// prioridade e as datas do SLA-PROXY. LGPD §12: NUNCA carrega latitude/longitude — coordenada não trafega
// para a lista nem para log. `hasLocation` diz se o chamado tem pin no mapa (clique → pan) ou é "sem GPS".
export type OperationsIncomingCall = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly priority: WorkOrderPriority;
  readonly customerName?: string | null;
  readonly scheduledFor?: string | null;
  readonly createdAt?: string | null;
  readonly hasLocation: boolean;
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
  // Ω1b — pins de chamado (OS abertas com coordenada) e OS abertas sem coordenada (painel).
  // `undefined` = leitura de OS indisponível (sem permissão/erro) → nenhum pin de chamado.
  readonly workOrderPins?: readonly OperationsMapWorkOrderPin[];
  readonly workOrdersWithoutLocation?: readonly OperationsMapWorkOrderWithoutLocation[];
  // R1 (junta Ω1b) — `true` quando há mais OS no sistema do que as carregadas para o mapa
  // (nunca truncar em silêncio: a página avisa "há OS além das exibidas").
  readonly workOrdersTruncated?: boolean;
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
