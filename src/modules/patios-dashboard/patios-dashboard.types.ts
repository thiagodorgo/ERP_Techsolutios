import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { NotificationKind } from "../impound/impound.notifications.types.js";
import { IMPOUND_STATUSES, type ImpoundStatus } from "../impound/impound.types.js";

// Ω5P PR-20 — painel gerencial (dashboard consolidado) dos Pátios de Recolhimento. SÓ leitura/agregação sobre as
// fontes de verdade já existentes (OccupancyService/YardSpot para I1, ProcessNotification para I6,
// SettlementAllocation para I7) — nunca uma 2ª fonte de verdade. impound:read (reuso, sem permissão nova).
export type PatiosDashboardActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Buckets de fase — mapeamento dos 14 status da FSM (impound.types.ts) em 5 grupos de negócio (recon §a).
export const PROCESS_PHASE_BUCKETS = ["RECEPTION", "CUSTODY", "RELEASE", "AUCTION", "CLOSED"] as const;
export type ProcessPhaseBucket = (typeof PROCESS_PHASE_BUCKETS)[number];

export const PHASE_BUCKET_BY_STATUS: Readonly<Record<ImpoundStatus, ProcessPhaseBucket>> = {
  IN_REMOVAL: "RECEPTION",
  RECEPTION: "RECEPTION",
  ACTIVE_CUSTODY: "CUSTODY",
  JUDICIAL_HOLD: "CUSTODY",
  RELEASE_IN_PROGRESS: "RELEASE",
  RELEASED_FOR_REPAIR: "RELEASE",
  AUCTION_ELIGIBLE: "AUCTION",
  AUCTION_PREP: "AUCTION",
  LOTTED: "AUCTION",
  AUCTIONED: "AUCTION",
  RELEASED: "CLOSED",
  AUCTION_CLOSED: "CLOSED",
  DIRECT_RECYCLING: "CLOSED",
  CLOSED: "CLOSED",
};

// Belt-and-suspenders: todo status da FSM tem bucket (falha em tempo de build/teste se um status novo esquecer o
// mapeamento — nunca um processo "sem fase" no painel).
IMPOUND_STATUSES.forEach((status) => {
  if (!(status in PHASE_BUCKET_BY_STATUS)) {
    throw new Error(`patios-dashboard: status ${status} sem bucket de fase mapeado.`);
  }
});

export type ProcessesByPhase = Readonly<Record<ProcessPhaseBucket, number>>;

export function emptyProcessesByPhase(): Record<ProcessPhaseBucket, number> {
  return PROCESS_PHASE_BUCKETS.reduce((accumulator, bucket) => {
    accumulator[bucket] = 0;
    return accumulator;
  }, {} as Record<ProcessPhaseBucket, number>);
}

export type YardOccupancySummary = {
  readonly yardId: string;
  readonly yardName: string;
  readonly totalSpots: number;
  readonly occupiedSpots: number;
  readonly freeSpots: number;
  readonly blockedSpots: number;
};

export type AuctionRevenueByBeneficiary = {
  readonly beneficiaryKind: string;
  readonly totalAmount: string; // Decimal(12,2) string — dinheiro nunca float (invariante da casa)
};

export type AuctionRevenueSummary = {
  readonly currentMonthTotal: string;
  readonly grandTotal: string;
  readonly byBeneficiary: readonly AuctionRevenueByBeneficiary[];
};

export type DeadlineAlert = {
  readonly processId: string;
  readonly kind: NotificationKind;
  readonly dueAt: string; // ISO
};

export type PatiosDashboardSummary = {
  readonly occupancy: readonly YardOccupancySummary[];
  readonly totalProcesses: number;
  readonly processesByPhase: ProcessesByPhase;
  readonly overdueNotifications: number;
  readonly releaseQueueDepth: number;
  readonly openLots: number;
  readonly auctionRevenue: AuctionRevenueSummary;
  readonly deadlineAlerts: readonly DeadlineAlert[];
};

export type PatiosDashboardSummaryInput = {
  readonly tenantId: string;
  /** Fixed reference time so "current month" / "overdue" / "deadline alerts" are deterministic. */
  readonly now: Date;
};

export class PatiosDashboardError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "PatiosDashboardError";
  }
}
