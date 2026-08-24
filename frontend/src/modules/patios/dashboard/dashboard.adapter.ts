import { formatDateTime, formatMoney } from "../charges/charges.adapter";
import { getBeneficiaryLabel } from "../settlement/settlement.adapter";
import {
  PROCESS_PHASE_BUCKETS,
  type AuctionRevenueByBeneficiary,
  type DeadlineAlert,
  type NotificationKind,
  type PatiosDashboardSummary,
  type ProcessesByPhase,
  type ProcessPhaseBucket,
  type YardOccupancySummary,
} from "./dashboard.types";

export { formatMoney, formatDateTime, getBeneficiaryLabel };

// Rótulos PT-BR dos 5 buckets de fase (mapeamento dos 14 status da FSM — impound.types.ts — feito no BACKEND;
// a UI só rotula o bucket já agregado). White-label: nunca "polícia"/"tenant".
const PHASE_LABELS: Record<ProcessPhaseBucket, string> = {
  RECEPTION: "Remoção/Recepção",
  CUSTODY: "Custódia",
  RELEASE: "Liberação",
  AUCTION: "Leilão",
  CLOSED: "Encerrado",
};

export function getPhaseBucketLabel(bucket: ProcessPhaseBucket): string {
  return PHASE_LABELS[bucket] ?? bucket;
}

// O QUE cada bucket agrega (fonte: PHASE_BUCKET_BY_STATUS em patios-dashboard.types.ts — os 14 status da FSM
// mapeados no backend). Usado no pop-up de detalhamento de cada fase; descreve o rito, nunca o nome técnico
// do status. White-label: "organização"/"autoridade solicitante", nunca "polícia".
const PHASE_HINTS: Record<ProcessPhaseBucket, string> = {
  RECEPTION: "Veículos em remoção ou em recepção no pátio — a guarda já começou, mas o processo ainda não entrou em custódia ativa.",
  CUSTODY: "Veículos sob guarda da organização, em custódia ativa ou retidos por determinação judicial.",
  RELEASE: "Processos com saída já autorizada — restituição ao proprietário em andamento ou veículo liberado para reparo.",
  AUCTION: "Processos na trilha do leilão: elegíveis, em preparação, já organizados em lote ou arrematados.",
  CLOSED: "Processos encerrados — restituídos, com leilão concluído, destinados à reciclagem direta ou arquivados.",
};

export function getPhaseBucketHint(bucket: ProcessPhaseBucket): string {
  return PHASE_HINTS[bucket] ?? "";
}

export const ORDERED_PHASE_BUCKETS: readonly ProcessPhaseBucket[] = PROCESS_PHASE_BUCKETS;

// Rótulos PT-BR dos 3 tipos de notificação/prazo (Res. 1025 arts. 15/26; Lei 14.133/2021 — impound.notifications.types.ts).
const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  OWNER_INITIAL: "Notificação inicial ao proprietário",
  COMPLEMENTARY_EDICT: "Edital complementar",
  AUCTION_EDICT: "Edital do leilão",
};

export function getNotificationKindLabel(kind: NotificationKind | string | null | undefined): string {
  return NOTIFICATION_KIND_LABELS[(kind ?? "OWNER_INITIAL") as NotificationKind] ?? "Prazo";
}

export function isDeadlineOverdue(alert: DeadlineAlert, now: Date): boolean {
  const due = new Date(alert.dueAt);
  return !Number.isNaN(due.getTime()) && due.getTime() <= now.getTime();
}

export function totalSpots(occupancy: readonly YardOccupancySummary[]): number {
  return occupancy.reduce((sum, yard) => sum + yard.totalSpots, 0);
}

export function totalOccupiedSpots(occupancy: readonly YardOccupancySummary[]): number {
  return occupancy.reduce((sum, yard) => sum + yard.occupiedSpots, 0);
}

// Percentual de ocupação (0-100, arredondado). Só calculado sobre dado real já carregado — nunca fabricado.
export function occupancyRate(occupancy: readonly YardOccupancySummary[]): number | null {
  const total = totalSpots(occupancy);
  if (total <= 0) return null;
  return Math.round((totalOccupiedSpots(occupancy) / total) * 100);
}

export function sortByBeneficiaryTotal(rows: readonly AuctionRevenueByBeneficiary[]): AuctionRevenueByBeneficiary[] {
  return [...rows].sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
}

// ── Adapter de resposta (camelCase do backend; robusto a snake_case defensivo) ──────────────────────────────
export function adaptPatiosDashboardSummary(response: unknown): PatiosDashboardSummary | null {
  const payload = readRecord(response);
  const record = readRecord(payload?.data) ?? payload;
  if (!record) return null;

  const occupancy = (readArray(record.occupancy) ?? [])
    .map((item) => adaptYardOccupancySummary(item))
    .filter((item): item is YardOccupancySummary => item !== null);

  const processesByPhase = adaptProcessesByPhase(readRecord(record.processesByPhase ?? record.processes_by_phase));

  const auctionRevenueRecord = readRecord(record.auctionRevenue ?? record.auction_revenue);
  const byBeneficiary = (readArray(auctionRevenueRecord?.byBeneficiary ?? auctionRevenueRecord?.by_beneficiary) ?? [])
    .map((item) => adaptBeneficiaryRevenue(item))
    .filter((item): item is AuctionRevenueByBeneficiary => item !== null);

  const deadlineAlerts = (readArray(record.deadlineAlerts ?? record.deadline_alerts) ?? [])
    .map((item) => adaptDeadlineAlert(item))
    .filter((item): item is DeadlineAlert => item !== null);

  return {
    occupancy,
    totalProcesses: readNumber(record, ["totalProcesses", "total_processes"]) ?? 0,
    processesByPhase,
    overdueNotifications: readNumber(record, ["overdueNotifications", "overdue_notifications"]) ?? 0,
    releaseQueueDepth: readNumber(record, ["releaseQueueDepth", "release_queue_depth"]) ?? 0,
    openLots: readNumber(record, ["openLots", "open_lots"]) ?? 0,
    auctionRevenue: {
      currentMonthTotal: readString(auctionRevenueRecord, ["currentMonthTotal", "current_month_total"]) ?? "0.00",
      grandTotal: readString(auctionRevenueRecord, ["grandTotal", "grand_total"]) ?? "0.00",
      byBeneficiary,
    },
    deadlineAlerts,
  };
}

function adaptProcessesByPhase(record: Record<string, unknown> | undefined): ProcessesByPhase {
  const result = {} as Record<ProcessPhaseBucket, number>;
  for (const bucket of PROCESS_PHASE_BUCKETS) {
    result[bucket] = readNumber(record, [bucket]) ?? 0;
  }
  return result;
}

function adaptYardOccupancySummary(input: unknown): YardOccupancySummary | null {
  const item = readRecord(input);
  const yardId = readString(item, ["yardId", "yard_id"]);
  if (!yardId) return null;
  return {
    yardId,
    yardName: readString(item, ["yardName", "yard_name"]) ?? "Pátio",
    totalSpots: readNumber(item, ["totalSpots", "total_spots"]) ?? 0,
    occupiedSpots: readNumber(item, ["occupiedSpots", "occupied_spots"]) ?? 0,
    freeSpots: readNumber(item, ["freeSpots", "free_spots"]) ?? 0,
    blockedSpots: readNumber(item, ["blockedSpots", "blocked_spots"]) ?? 0,
  };
}

function adaptBeneficiaryRevenue(input: unknown): AuctionRevenueByBeneficiary | null {
  const item = readRecord(input);
  const beneficiaryKind = readString(item, ["beneficiaryKind", "beneficiary_kind"]);
  if (!beneficiaryKind) return null;
  return {
    beneficiaryKind,
    totalAmount: readString(item, ["totalAmount", "total_amount"]) ?? "0.00",
  };
}

function adaptDeadlineAlert(input: unknown): DeadlineAlert | null {
  const item = readRecord(input);
  const processId = readString(item, ["processId", "process_id"]);
  const dueAt = readString(item, ["dueAt", "due_at"]);
  if (!processId || !dueAt) return null;
  return {
    processId,
    kind: (readString(item, ["kind"]) ?? "OWNER_INITIAL") as NotificationKind,
    dueAt,
  };
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
