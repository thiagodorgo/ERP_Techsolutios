import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const MAINTENANCE_TYPES = ["preventiva", "corretiva"] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_STATUSES = [
  "agendada",
  "em_execucao",
  "concluida",
  "cancelada",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const DEFAULT_MAINTENANCE_STATUS: MaintenanceStatus = "agendada";

export type MaintenanceOrderActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type MaintenanceOrder = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly type: MaintenanceType;
  readonly status: MaintenanceStatus;
  readonly scheduledFor?: Date;
  readonly completedAt?: Date;
  readonly cost?: number;
  readonly supplier?: string;
  readonly odometer?: number;
  // Ω4C PR-06 — data prevista da PRÓXIMA manutenção, por TEMPO (D-Ω4C-MANUT-NEXTDUE-NOTIF).
  readonly nextDueAt?: Date;
  readonly description: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListMaintenanceOrdersInput = {
  readonly tenantId: string;
  readonly vehicleId?: string;
  readonly type?: MaintenanceType;
  readonly status?: MaintenanceStatus;
  readonly isActive?: boolean;
  readonly scheduledFrom?: Date;
  readonly scheduledTo?: Date;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListMaintenanceOrdersResult = {
  readonly items: readonly MaintenanceOrder[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateMaintenanceOrderInput = Omit<
  MaintenanceOrder,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateMaintenanceOrderInput = Partial<
  Pick<
    MaintenanceOrder,
    | "type"
    | "status"
    | "scheduledFor"
    | "completedAt"
    | "cost"
    | "supplier"
    | "odometer"
    | "nextDueAt"
    | "description"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly maintenanceOrderId: string;
};

export class MaintenanceOrderError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "MaintenanceOrderError";
  }
}
