// Ω5P PR-20 — painel gerencial dos Pátios (console do operador, /patios/painel). Espelha o DTO REAL do backend
// (src/modules/patios-dashboard/patios-dashboard.types.ts / .dto.ts — NÃO inventar campo). GET
// /api/v1/patios/dashboard/summary sob impound:read (REUSADA — sem permissão nova). §2.8: só agregados/contagens/
// valores — nenhum tenant_id, nenhuma identidade do bem/proprietário. Dinheiro é sempre string canônica "0.00".

export const PROCESS_PHASE_BUCKETS = ["RECEPTION", "CUSTODY", "RELEASE", "AUCTION", "CLOSED"] as const;
export type ProcessPhaseBucket = (typeof PROCESS_PHASE_BUCKETS)[number];

export type ProcessesByPhase = Readonly<Record<ProcessPhaseBucket, number>>;

export type NotificationKind = "OWNER_INITIAL" | "COMPLEMENTARY_EDICT" | "AUCTION_EDICT";

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
  readonly totalAmount: string; // Decimal(12,2) string
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

export type PatiosDashboardApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};
