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
  /**
   * Ω4C PR-07 — CONDUTOR RESPONSÁVEL (D-Ω4C-MULSEG-RESPONSIBLE-MODEL): um operator_profile (o
   * profissional de campo que tem folha), distinto de `driverId` (User genérico). Quando setado, a
   * multa é lançada como débito no extrato desse profissional (RN-MUL-01); quando ausente, a
   * disposição fica livre para "empresa paga" (contas a pagar, PR-02).
   */
  readonly responsibleOperatorProfileId?: string;
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
  // `null` = LIMPAR o condutor responsável (disposição volta a "empresa paga"); `undefined` = não muda.
  readonly responsibleOperatorProfileId?: string | null;
};

// Ω4C PR-07 — "disposição" DERIVADA da própria multa (D-Ω4C-MULSEG-DISPOSITION): `statement` quando há
// condutor responsável (débito no extrato); `none` caso contrário. O estado `payable` (empresa paga) é
// DERIVADO à parte pelo badge do rail de contas a pagar (GET /fines/:id/payable), não pela coluna da multa.
export const FINE_DISPOSITIONS = ["statement", "none"] as const;
export type FineDisposition = (typeof FINE_DISPOSITIONS)[number];

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
