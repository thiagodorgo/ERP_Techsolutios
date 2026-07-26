import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type YardActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-01 — enums em INGLÊS validados na APP (sem CHECK de enum no banco). Labels PT-BR ficam no DTO.
export const YARD_AREA_KINDS = ["BLOCK", "CORRIDOR", "ROW"] as const;
export type YardAreaKind = (typeof YARD_AREA_KINDS)[number];

export const VEHICLE_CLASSES = ["ANY", "MOTORCYCLE", "HEAVY"] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const SPOT_STATUSES = ["FREE", "OCCUPIED", "BLOCKED"] as const;
export type SpotStatus = (typeof SPOT_STATUSES)[number];

// Pátio físico (local de guarda). A capacidade REAL é COUNT(spots); capacityHint é advisory.
export type Yard = {
  readonly id: string;
  readonly tenantId: string;
  readonly branchId?: string;
  readonly name: string;
  readonly address: string;
  readonly capacityHint?: number;
  readonly timezone: string;
  readonly active: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Área hierárquica (quadra→corredor→fileira).
export type YardArea = {
  readonly id: string;
  readonly tenantId: string;
  readonly yardId: string;
  readonly parentId?: string;
  readonly kind: YardAreaKind;
  readonly name: string;
  readonly covered: boolean;
  readonly vehicleClass: VehicleClass;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Vaga — a unidade de ocupação (I1). currentProcessId sem FK dura em PR-01.
export type YardSpot = {
  readonly id: string;
  readonly tenantId: string;
  readonly areaId: string;
  readonly code: string;
  readonly covered: boolean;
  readonly vehicleClass: VehicleClass;
  readonly status: SpotStatus;
  readonly currentProcessId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateYardInput = {
  readonly tenantId: string;
  readonly branchId?: string;
  readonly name: string;
  readonly address: string;
  readonly capacityHint?: number;
  readonly timezone: string;
  readonly active?: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateYardInput = {
  readonly tenantId: string;
  readonly yardId: string;
  readonly branchId?: string | null;
  readonly name?: string;
  readonly address?: string;
  readonly capacityHint?: number | null;
  readonly timezone?: string;
  readonly active?: boolean;
  readonly updatedBy?: string;
};

export type ListYardInput = {
  readonly tenantId: string;
  readonly branchId?: string;
  readonly active?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListYardResult = {
  readonly items: readonly Yard[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateYardAreaInput = {
  readonly tenantId: string;
  readonly yardId: string;
  readonly parentId?: string;
  readonly kind: YardAreaKind;
  readonly name: string;
  readonly covered?: boolean;
  readonly vehicleClass?: VehicleClass;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateYardAreaInput = {
  readonly tenantId: string;
  readonly areaId: string;
  readonly name?: string;
  readonly covered?: boolean;
  readonly vehicleClass?: VehicleClass;
  readonly updatedBy?: string;
};

export type ListYardAreaInput = {
  readonly tenantId: string;
  readonly yardId: string;
};

export type CreateYardSpotInput = {
  readonly tenantId: string;
  readonly areaId: string;
  readonly code: string;
  readonly covered?: boolean;
  readonly vehicleClass?: VehicleClass;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateYardSpotInput = {
  readonly tenantId: string;
  readonly spotId: string;
  readonly code?: string;
  readonly covered?: boolean;
  readonly vehicleClass?: VehicleClass;
  // Bloqueio operacional FREE⇄BLOCKED (sem processo). Alocação/liberação = OccupancyService.
  readonly status?: Extract<SpotStatus, "FREE" | "BLOCKED">;
  readonly updatedBy?: string;
};

export type ListYardSpotInput = {
  readonly tenantId: string;
  readonly areaId: string;
};

export type ListYardSpotByYardInput = {
  readonly tenantId: string;
  readonly yardId: string;
};

// Ocupação (I1) — insumos dos métodos do OccupancyService (exercitados por teste em PR-01; HTTP = PR-06).
export type AllocateSpotInput = {
  readonly tenantId: string;
  readonly actorId?: string;
  readonly spotId: string;
  readonly processId: string;
};

export type VacateSpotInput = {
  readonly tenantId: string;
  readonly actorId?: string;
  readonly spotId: string;
};

export type MoveSpotInput = {
  readonly tenantId: string;
  readonly actorId?: string;
  readonly fromSpotId: string;
  readonly toSpotId: string;
};

export class YardError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "YardError";
  }
}
