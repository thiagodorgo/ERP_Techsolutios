import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const FIELD_DISPATCH_STATUSES = [
  "draft",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
  "reassigned",
  "failed",
] as const;

export const FIELD_DISPATCH_EVENTS = [
  "field_dispatch_created",
  "field_dispatch_status_changed",
  "field_dispatch_reassigned",
  "field_dispatch_cancelled",
] as const;

export type FieldDispatchStatus = (typeof FIELD_DISPATCH_STATUSES)[number];
export type FieldDispatchEventType = (typeof FIELD_DISPATCH_EVENTS)[number];
export type JsonRecord = Record<string, unknown>;

// Ω3-b (R1 do crítico) — o ALVO de um despacho deve ser um técnico DE CAMPO. `field_technician`
// (LEGACY) e `technician` (STANDARD) são os papéis de campo; `operator` = operador web/despacho
// (direciona chamados, NÃO recebe despacho — ver decisão em controle/D-OMEGA3B). A checagem incide
// sobre `FieldDispatch.operatorUserId` (o alvo), nunca sobre o ator-despachante (D3).
export const FIELD_DISPATCH_TARGET_ROLES = ["field_technician", "technician"] as const satisfies readonly Role[];

export type FieldDispatchActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FieldDispatch = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status: FieldDispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly acceptedAt?: Date;
  readonly onRouteAt?: Date;
  readonly arrivedAt?: Date;
  readonly inServiceAt?: Date;
  readonly completedAt?: Date;
  readonly cancelledAt?: Date;
  readonly failedAt?: Date;
  readonly metadata: JsonRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type FieldDispatchEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly workOrderId: string;
  readonly eventType: FieldDispatchEventType;
  readonly fromStatus?: FieldDispatchStatus;
  readonly toStatus?: FieldDispatchStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata: JsonRecord;
  readonly createdAt: Date;
};

export type ListFieldDispatchesInput = {
  readonly tenantId: string;
  readonly workOrderId?: string;
  readonly operatorUserId?: string;
  readonly status?: FieldDispatchStatus;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListFieldDispatchesResult = {
  readonly items: readonly FieldDispatch[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateFieldDispatchInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status: FieldDispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly metadata?: JsonRecord;
};

export type ChangeFieldDispatchStatusInput = {
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly status: FieldDispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
  readonly actorUserId?: string;
};

export type ReassignFieldDispatchInput = {
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly operatorUserId: string;
  readonly observation?: string;
  readonly reason?: string;
  readonly actorUserId?: string;
};

export class FieldDispatchError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FieldDispatchError";
  }
}
