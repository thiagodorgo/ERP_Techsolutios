import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { InventoryAbcClass } from "./inventory.types.js";

/** R7.6 — cycle count session status. `concluida`/`cancelada` are terminal. */
export const CYCLE_COUNT_STATUSES = ["aberta", "concluida", "cancelada"] as const;
export type CycleCountStatus = (typeof CYCLE_COUNT_STATUSES)[number];

export type CycleCountActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

/** A counting session (R7.6). The saldo is NEVER stored — only the snapshot. */
export type CycleCount = {
  readonly id: string;
  readonly tenantId: string;
  readonly abcClass?: InventoryAbcClass;
  readonly status: CycleCountStatus;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/**
 * A counted line. `systemQuantity` is the saldo snapshotted at OPEN;
 * `countedQuantity` is filled while counting; `variance` (counted − system) and
 * `adjustmentMovementId` (the generated ajuste) are filled at CLOSE.
 */
export type CycleCountEntry = {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly itemId: string;
  readonly systemQuantity: number;
  readonly countedQuantity?: number;
  readonly variance?: number;
  readonly adjustmentMovementId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CycleCountWithEntries = CycleCount & {
  readonly entries: readonly CycleCountEntry[];
};

export type CycleCountEntrySnapshot = {
  readonly itemId: string;
  readonly systemQuantity: number;
};

export type CreateCycleCountInput = {
  readonly tenantId: string;
  readonly abcClass?: InventoryAbcClass;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly entries: readonly CycleCountEntrySnapshot[];
};

export type ListCycleCountsInput = {
  readonly tenantId: string;
  readonly status?: CycleCountStatus;
  readonly isActive?: boolean;
  readonly limit: number;
  readonly offset: number;
};

export type ListCycleCountsResult = {
  readonly items: readonly CycleCount[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type RecordEntryCountInput = {
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly entryId: string;
  readonly countedQuantity: number;
  readonly updatedBy?: string;
};

/** The per-entry outcome computed at close (variance + the ajuste it generated). */
export type CloseEntryResult = {
  readonly entryId: string;
  readonly variance: number;
  readonly adjustmentMovementId: string;
};

export type ApplyCloseInput = {
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly updatedBy?: string;
  readonly entryResults: readonly CloseEntryResult[];
};

/** The variance report returned by close: the closed session + total variance value. */
export type CycleCountVarianceReport = {
  readonly cycleCount: CycleCountWithEntries;
  readonly totalVarianceValue: number;
};

export class CycleCountError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CycleCountError";
  }
}

export function cycleCountNotFound(): CycleCountError {
  return new CycleCountError(404, "CYCLE_COUNT_NOT_FOUND", "not_found", "Cycle count was not found.");
}

export function cycleCountEntryNotFound(): CycleCountError {
  return new CycleCountError(404, "CYCLE_COUNT_ENTRY_NOT_FOUND", "not_found", "Cycle count entry was not found.");
}

/** R7.6 — a concluida/cancelada session is terminal: any further mutation is a 422. */
export function cycleCountNotOpen(status: CycleCountStatus): CycleCountError {
  return new CycleCountError(
    422,
    "CYCLE_COUNT_INVALID",
    "invalid_status_transition",
    `A contagem cíclica está "${status}" e não aceita mais alterações.`,
  );
}
