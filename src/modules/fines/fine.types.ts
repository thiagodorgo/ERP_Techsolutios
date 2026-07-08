import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const FINE_STATUSES = [
  "recebida",
  "em_recurso",
  "deferida",
  "indeferida",
  "paga",
  "cancelada",
] as const;

export type FineStatus = (typeof FINE_STATUSES)[number];

export const DEFAULT_FINE_STATUS: FineStatus = "recebida";

/** Roles allowed to transition a fine to `cancelada` (admin-only guard). */
export const FINE_CANCEL_ROLES = ["tenant_admin", "super_admin"] as const;

export type FineActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type Fine = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly driverId?: string;
  readonly numeroAuto: string;
  readonly dataInfracao: Date;
  readonly orgao: string;
  readonly descricao?: string;
  readonly valor: number;
  readonly pontos: number;
  readonly prazoRecurso?: Date;
  readonly prazoPagamento?: Date;
  readonly status: FineStatus;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListFinesInput = {
  readonly tenantId: string;
  readonly vehicleId?: string;
  readonly driverId?: string;
  readonly status?: FineStatus;
  readonly isActive?: boolean;
  readonly prazoFrom?: Date;
  readonly prazoTo?: Date;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListFinesResult = {
  readonly items: readonly Fine[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateFineInput = Omit<Fine, "id" | "isActive" | "createdAt" | "updatedAt"> & {
  readonly isActive?: boolean;
};

export type UpdateFineInput = Partial<
  Pick<
    Fine,
    | "vehicleId"
    | "driverId"
    | "numeroAuto"
    | "dataInfracao"
    | "orgao"
    | "descricao"
    | "valor"
    | "pontos"
    | "prazoRecurso"
    | "prazoPagamento"
    | "status"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly fineId: string;
};

export class FineError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FineError";
  }
}
