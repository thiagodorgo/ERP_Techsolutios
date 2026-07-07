import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type VehicleActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type Vehicle = {
  readonly id: string;
  readonly tenantId: string;
  readonly plate: string;
  readonly model: string;
  readonly type?: string;
  readonly year?: number;
  readonly status: string;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListVehiclesInput = {
  readonly tenantId: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListVehiclesResult = {
  readonly items: readonly Vehicle[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateVehicleInput = Omit<
  Vehicle,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateVehicleInput = Partial<
  Pick<
    Vehicle,
    | "plate"
    | "model"
    | "type"
    | "year"
    | "status"
    | "notes"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly vehicleId: string;
};

export class VehicleError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "VehicleError";
  }
}
