import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const WORK_ORDER_STATUSES = [
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
] as const;

export const WORK_ORDER_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const WORK_ORDER_EVENTS = [
  "work_order_created",
  "work_order_updated",
  "work_order_assigned",
  "work_order_status_changed",
  "work_order_cancelled",
  "work_order_completed",
  // Ω3-b — comentário livre do usuário na timeline da OS (evento imutável; sem migration, event_type
  // é String livre no Postgres). O corpo vai só em `message`; NUNCA em metadados de auditoria (§2.8).
  "work_order_comment",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];
export type WorkOrderEventType = (typeof WORK_ORDER_EVENTS)[number];
export type JsonRecord = Record<string, unknown>;

export type WorkOrderActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type WorkOrder = {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly title: string;
  readonly description?: string;
  readonly customerName?: string;
  readonly customerDocument?: string;
  readonly customerPhone?: string;
  readonly serviceAddress?: string;
  readonly serviceCity?: string;
  readonly serviceState?: string;
  readonly serviceZipCode?: string;
  readonly serviceLatitude?: number;
  readonly serviceLongitude?: number;
  // Ω1b-2 — metadados do cache de geocodificação (null enquanto a OS não foi geocodificada).
  readonly serviceGeocodedAt?: Date;
  readonly serviceGeocodeSource?: string;
  // Ω3F-2a — DESTINO (a origem = os campos service_* acima). Espelho simétrico, preenchido quando o
  // tipo do serviço exige destino (ex.: reboque). Aditivo/opcional; retrocompat mantida.
  readonly destinationAddress?: string;
  readonly destinationCity?: string;
  readonly destinationState?: string;
  readonly destinationZipCode?: string;
  readonly destinationLatitude?: number;
  readonly destinationLongitude?: number;
  readonly destinationGeocodedAt?: Date;
  readonly destinationGeocodeSource?: string;
  // Ω3F-2a — campos dinâmicos por tipo (socorro {plate,vehicle,color}; residencial {access_code,object,
  // description}). §2.8: access_code é SENSÍVEL — vive aqui (payload funcional), NUNCA em metadata/log.
  readonly serviceDetails?: Record<string, unknown>;
  readonly priority: WorkOrderPriority;
  readonly status: WorkOrderStatus;
  readonly assignedOperatorId?: string;
  readonly assignedUserId?: string;
  readonly checklistId?: string;
  // Ω3-c — snapshot imutável do template de checklist, congelado no despacho. null antes do despacho.
  readonly checklistSnapshot?: Record<string, unknown> | null;
  readonly customerId?: string;
  readonly vehicleId?: string;
  readonly teamId?: string;
  readonly serviceCatalogId?: string;
  readonly scheduledFor?: Date;
  readonly startedAt?: Date;
  readonly arrivedAt?: Date;
  readonly completedAt?: Date;
  readonly cancelledAt?: Date;
  readonly cancellationReason?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/**
 * Resolved cadastro summaries attached to the OS detail response (C2). Each is a
 * small, tenant-scoped projection of the linked entity, or null when the FK is
 * absent or no longer resolves. Never carries tenant_id or other internal fields.
 */
export type WorkOrderCustomerLink = {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
};

export type WorkOrderVehicleLink = {
  readonly id: string;
  readonly plate: string;
  readonly model: string;
};

export type WorkOrderTeamLink = {
  readonly id: string;
  readonly name: string;
};

export type WorkOrderServiceCatalogLink = {
  readonly id: string;
  readonly name: string;
  readonly basePrice: number | null;
};

export type WorkOrderLinks = {
  readonly customer: WorkOrderCustomerLink | null;
  readonly vehicle: WorkOrderVehicleLink | null;
  readonly team: WorkOrderTeamLink | null;
  readonly serviceCatalog: WorkOrderServiceCatalogLink | null;
};

export type WorkOrderEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly eventType: WorkOrderEventType;
  readonly fromStatus?: WorkOrderStatus;
  readonly toStatus?: WorkOrderStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata: JsonRecord;
  readonly createdAt: Date;
};

export type WorkOrderAssignment = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly operatorId: string;
  readonly userId?: string;
  readonly status: "assigned" | "accepted" | "rejected" | "completed" | "cancelled";
  readonly assignedBy?: string;
  readonly assignedAt: Date;
  readonly acceptedAt?: Date;
  readonly rejectedAt?: Date;
  readonly completedAt?: Date;
  readonly metadata: JsonRecord;
};

export type ListWorkOrdersInput = {
  readonly tenantId: string;
  readonly status?: WorkOrderStatus;
  readonly priority?: WorkOrderPriority;
  readonly assignedOperatorId?: string;
  readonly assignedUserId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListWorkOrdersResult = {
  readonly items: readonly WorkOrder[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateWorkOrderInput = Omit<
  WorkOrder,
  "id" | "status" | "createdAt" | "updatedAt"
> & {
  readonly status?: WorkOrderStatus;
};

export type UpdateWorkOrderInput = Partial<
  Pick<
    WorkOrder,
    | "title"
    | "description"
    | "customerName"
    | "customerDocument"
    | "customerPhone"
    | "serviceAddress"
    | "serviceCity"
    | "serviceState"
    | "serviceZipCode"
    | "serviceLatitude"
    | "serviceLongitude"
    | "destinationAddress"
    | "destinationCity"
    | "destinationState"
    | "destinationZipCode"
    | "destinationLatitude"
    | "destinationLongitude"
    | "serviceDetails"
    | "priority"
    | "checklistId"
    | "scheduledFor"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly workOrderId: string;
};

export type ChangeWorkOrderStatusInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly status: WorkOrderStatus;
  readonly message: string;
  readonly cancellationReason?: string;
  readonly actorUserId?: string;
};

// Ω1b-2 — grava a coordenada geocodificada + metadados do cache na OS (tenant-scoped).
export type UpdateWorkOrderGeocodeInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly source: string;
  readonly geocodedAt: Date;
  readonly actorUserId?: string;
};

// Ω3-c — congela (ou limpa) o snapshot de checklist na OS. tenant-scoped (OS de outro tenant → undefined).
export type FreezeChecklistSnapshotInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly checklistSnapshot: Record<string, unknown> | null;
  readonly actorUserId?: string;
};

export type AssignWorkOrderInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly operatorId: string;
  readonly userId?: string;
  // D1 — optional viatura/equipe selection. When present the OS vehicle_id/team_id
  // FKs (added in B1) are set; when absent they are left untouched.
  readonly vehicleId?: string;
  readonly teamId?: string;
  readonly message: string;
  readonly assignedBy?: string;
};

export class WorkOrderError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderError";
  }
}
