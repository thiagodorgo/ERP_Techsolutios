export type WorkOrderStatus =
  | "open"
  | "assigned"
  | "accepted"
  | "on_route"
  | "on_site"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled"
  | "rejected";

export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

// Ω3F-6a — destino do dinheiro no cancelamento. Valores TÉCNICOS: só payload/DTO, NUNCA texto de UI
// (§3 / C2 da J-Ω3F-6A). Os rótulos de negócio moram em CancelWorkOrderModal.
export type WorkOrderFinancialCancellationDecision = "keep" | "keep_unpaid" | "zero";

export type WorkOrderListItem = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description?: string | null;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly customerName?: string | null;
  readonly customerPhone?: string | null;
  readonly serviceAddress?: string | null;
  readonly serviceCity?: string | null;
  readonly serviceState?: string | null;
  readonly serviceZipCode?: string | null;
  readonly serviceLatitude?: number | null;
  readonly serviceLongitude?: number | null;
  readonly assignedOperatorId?: string | null;
  readonly assignedUserId?: string | null;
  // F6 (Mapa): viatura vinculada à OS (B1). O adapter lê vehicleId/vehicle_id de forma
  // defensiva — o DTO de lista pode omitir o campo; nesse caso fica null e o Mapa
  // simplesmente não exibe badges de Frota para esta OS.
  readonly vehicleId?: string | null;
  readonly checklistId?: string | null;
  readonly scheduledFor?: string | null;
  readonly startedAt?: string | null;
  readonly arrivedAt?: string | null;
  readonly completedAt?: string | null;
  readonly cancelledAt?: string | null;
  readonly cancellationReason?: string | null;
  // Ω3F-6a — decisão financeira gravada no cancelamento. `null` em OS não cancelada e também em OS
  // cancelada pelo caminho legado (PATCH /status), que não grava decisão.
  readonly financialCancellationDecision?: WorkOrderFinancialCancellationDecision | null;
  readonly createdAt: string;
  readonly updatedAt?: string;
};

// C2 (Detalhe de OS enriquecido): vínculos resolvidos que o backend anexa ao
// GET /work-orders/:id. Cada campo é null quando a FK está ausente/irresolúvel.
export type WorkOrderLinkedCustomer = {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
};

export type WorkOrderLinkedVehicle = {
  readonly id: string;
  readonly plate: string;
  readonly model: string | null;
};

export type WorkOrderLinkedTeam = {
  readonly id: string;
  readonly name: string;
};

export type WorkOrderLinkedServiceCatalog = {
  readonly id: string;
  readonly name: string;
  readonly basePrice: number | null;
};

export type WorkOrderRegistryLinksDetail = {
  readonly customer: WorkOrderLinkedCustomer | null;
  readonly vehicle: WorkOrderLinkedVehicle | null;
  readonly team: WorkOrderLinkedTeam | null;
  readonly serviceCatalog: WorkOrderLinkedServiceCatalog | null;
};

export type WorkOrderDetail = WorkOrderListItem & {
  readonly customerDocument?: string | null;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  // C2: vínculos resolvidos com os Cadastros (A1-A4). Ausente em OS antigas
  // ou em backend sem C2 — a tela degrada para o snapshot do cliente.
  readonly links?: WorkOrderRegistryLinksDetail | null;
};

export type WorkOrderEvent = {
  readonly id: string;
  readonly workOrderId?: string;
  readonly eventType: string;
  readonly fromStatus?: WorkOrderStatus | null;
  readonly toStatus?: WorkOrderStatus | null;
  readonly actorUserId?: string | null;
  readonly message: string;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt: string;
};

export type WorkOrdersPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type WorkOrdersSource = "api" | "mock" | "fallback";

export type WorkOrdersData = {
  readonly items: WorkOrderListItem[];
  readonly pagination: WorkOrdersPagination;
  readonly source: WorkOrdersSource;
  readonly fallbackReason?: string;
};

export type WorkOrdersFilters = {
  readonly search: string;
  readonly status: WorkOrderStatus | "all";
  readonly priority: WorkOrderPriority | "all";
  readonly assignedOperatorId: string;
  readonly from: string;
  readonly to: string;
};

export type WorkOrdersApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type WorkOrderCreatePayload = {
  readonly title: string;
  readonly description?: string;
  readonly customerName?: string;
  readonly customerPhone?: string;
  readonly serviceAddress?: string;
  readonly serviceCity?: string;
  readonly serviceState?: string;
  readonly serviceZipCode?: string;
  readonly serviceLatitude?: number | null;
  readonly serviceLongitude?: number | null;
  // Ω3F-2b — destino (#24, tipos que exigem: reboque) + campos dinâmicos por tipo (#23).
  // Backend é a autoridade (422 destination_required); a UI só espelha. service_details = objeto plano.
  readonly destinationAddress?: string;
  readonly destinationCity?: string;
  readonly destinationState?: string;
  readonly destinationZipCode?: string;
  readonly destinationLatitude?: number | null;
  readonly destinationLongitude?: number | null;
  readonly service_details?: Record<string, string>;
  readonly priority: WorkOrderPriority;
  readonly scheduledFor?: string | null;
  // B1 (OS integrada): vínculos opcionais com os Cadastros (A1-A4).
  // Enviados em snake_case, exatamente como o contrato POST /work-orders espera.
  // Quando customer_id é enviado, o backend deriva o snapshot do cliente (nome/documento/telefone).
  readonly customer_id?: string;
  readonly vehicle_id?: string;
  readonly team_id?: string;
  readonly service_catalog_id?: string;
};

// Vínculos de cadastro selecionados na UI (ids camelCase internos do formulário).
export type WorkOrderRegistryLinks = {
  readonly customerId?: string;
  readonly vehicleId?: string;
  readonly teamId?: string;
  readonly serviceCatalogId?: string;
};

export type WorkOrderUpdatePayload = Partial<WorkOrderCreatePayload> & {
  readonly checklistId?: string | null;
};

export type WorkOrderStatusPayload = {
  readonly status: WorkOrderStatus;
  readonly message?: string;
  readonly cancellationReason?: string;
};

// Ω3F-6b — POST /work-orders/:id/cancel. A decisão é OBRIGATÓRIA (o backend recusa 422
// invalid_financial_decision quando ausente/inválida) e o motivo também (400 cancellation_reason_required).
export type WorkOrderCancelPayload = {
  readonly financialDecision: WorkOrderFinancialCancellationDecision;
  readonly reason: string;
};

// Ω3F-6b — POST /work-orders/:id/duplicate. NÃO existe "copiar orçamento": a OS duplicada nasce sem
// valores/preço congelado (invariante do domínio). `clientActionId` blinda o duplo-clique (409 no replay).
export type WorkOrderDuplicatePayload = {
  readonly copyComments?: boolean;
  readonly copyChecklist?: boolean;
  readonly clientActionId?: string;
};

export type WorkOrderAssignPayload = {
  readonly operatorId: string;
  readonly userId?: string;
  readonly message?: string;
};

export type WorkOrdersSummary = {
  readonly total: number;
  readonly open: number;
  readonly assigned: number;
  readonly inService: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly urgent: number;
};

export const WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  "open",
  "assigned",
  "accepted",
  "on_route",
  "on_site",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
  "rejected",
];

export const WORK_ORDER_PRIORITIES: readonly WorkOrderPriority[] = ["low", "medium", "high", "urgent"];
