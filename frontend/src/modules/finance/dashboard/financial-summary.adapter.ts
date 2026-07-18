import type {
  CashFlowPoint,
  DirectionSummary,
  FinancialSummary,
  FinancialSummarySource,
  FinancialSummaryData,
  RecentTitle,
} from "./financial-summary.types";
import { emptyFinancialSummary } from "./financial-summary.types";

// Leitura DEFENSIVA do envelope { data }: tolera snake/camel e campos ausentes → 0/"" (o front nunca inventa).
export function adaptFinancialSummaryResponse(payload: unknown, source: FinancialSummarySource): FinancialSummaryData {
  const root = readRecord(payload);
  const data = readRecord(root?.data) ?? root;
  if (!data) return { ...emptyFinancialSummary(), source };

  return {
    receivable: readDirection(readRecord(data.receivable)),
    payable: readDirection(readRecord(data.payable)),
    settledThisMonth: readSettled(readRecord(data.settledThisMonth ?? data.settled_this_month)),
    cash: readCash(readRecord(data.cash)),
    cheques: readCheques(readRecord(data.cheques)),
    cashFlow: readCashFlow(data.cashFlow ?? data.cash_flow),
    recentTitles: readRecentTitles(data.recentTitles ?? data.recent_titles),
    source,
  };
}

function readDirection(record: Record<string, unknown> | undefined): DirectionSummary {
  return {
    openAmount: num(record, ["openAmount", "open_amount"]),
    openCount: num(record, ["openCount", "open_count"]),
    overdueAmount: num(record, ["overdueAmount", "overdue_amount"]),
    overdueCount: num(record, ["overdueCount", "overdue_count"]),
    inDisputeCount: num(record, ["inDisputeCount", "in_dispute_count"]),
  };
}

function readSettled(record: Record<string, unknown> | undefined): FinancialSummary["settledThisMonth"] {
  return { competencia: str(record, ["competencia"]) ?? "", inflow: num(record, ["inflow"]), outflow: num(record, ["outflow"]) };
}

function readCash(record: Record<string, unknown> | undefined): FinancialSummary["cash"] {
  return {
    totalBalance: num(record, ["totalBalance", "total_balance"]),
    accountCount: num(record, ["accountCount", "account_count"]),
    currency: str(record, ["currency"]) ?? "BRL",
  };
}

function readCheques(record: Record<string, unknown> | undefined): FinancialSummary["cheques"] {
  return {
    pendingReceivedCount: num(record, ["pendingReceivedCount", "pending_received_count"]),
    pendingReceivedAmount: num(record, ["pendingReceivedAmount", "pending_received_amount"]),
    pendingIssuedCount: num(record, ["pendingIssuedCount", "pending_issued_count"]),
    pendingIssuedAmount: num(record, ["pendingIssuedAmount", "pending_issued_amount"]),
  };
}

function readCashFlow(value: unknown): CashFlowPoint[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const record = readRecord(raw);
    return { competencia: str(record, ["competencia"]) ?? "", inflow: num(record, ["inflow"]), outflow: num(record, ["outflow"]) };
  });
}

function readRecentTitles(value: unknown): RecentTitle[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const record = readRecord(raw);
    return {
      id: str(record, ["id"]) ?? "",
      direction: str(record, ["direction"]) ?? "receivable",
      partyName: str(record, ["partyName", "party_name"]) ?? "—",
      amount: num(record, ["amount"]),
      openAmount: num(record, ["openAmount", "open_amount"]),
      dueDate: str(record, ["dueDate", "due_date"]) ?? "",
      status: str(record, ["status"]) ?? "open",
      overdue: bool(record, ["overdue"]),
    };
  });
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function str(record: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function num(record: Record<string, unknown> | undefined, keys: readonly string[]): number {
  if (!record) return 0;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function bool(record: Record<string, unknown> | undefined, keys: readonly string[]): boolean {
  if (!record) return false;
  for (const key of keys) {
    if (record[key] === true) return true;
  }
  return false;
}
