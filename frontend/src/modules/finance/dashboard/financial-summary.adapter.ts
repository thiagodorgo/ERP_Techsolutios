import type {
  CashFlowPoint,
  DirectionSummary,
  FinancialSummary,
  FinancialSummarySource,
  FinancialSummaryData,
  RecentTitle,
} from "./financial-summary.types";
import { emptyFinancialSummary } from "./financial-summary.types";

class InvalidFinancialSummary extends Error {
  constructor(readonly field: string) {
    super(field);
  }
}

const invalidSummary = (field: string): FinancialSummaryData => ({
  ...emptyFinancialSummary(),
  source: "fallback",
  fallbackReason: `Resumo financeiro indisponível: ${field} ausente ou inválido.`,
});

// Leitura defensiva do envelope { data }: aceita snake/camel, mas falha fechado quando um número obrigatório ou
// uma coleção do contrato vem ausente/inválida. Assim, ausência nunca é apresentada como R$ 0,00 legítimo.
export function adaptFinancialSummaryResponse(payload: unknown, source: FinancialSummarySource): FinancialSummaryData {
  const root = readRecord(payload);
  const data = readRecord(root?.data) ?? root;
  if (!data) return invalidSummary("data");

  try {
    return {
      receivable: readDirection(readRecord(data.receivable), "receivable"),
      payable: readDirection(readRecord(data.payable), "payable"),
      settledThisMonth: readSettled(readRecord(data.settledThisMonth ?? data.settled_this_month)),
      cash: readCash(readRecord(data.cash)),
      cheques: readCheques(readRecord(data.cheques)),
      cashFlow: readCashFlow(data.cashFlow ?? data.cash_flow),
      recentTitles: readRecentTitles(data.recentTitles ?? data.recent_titles),
      source,
    };
  } catch (error) {
    if (error instanceof InvalidFinancialSummary) return invalidSummary(error.field);
    throw error;
  }
}

function readDirection(record: Record<string, unknown> | undefined, path: "receivable" | "payable"): DirectionSummary {
  return {
    openAmount: requiredNum(record, ["openAmount", "open_amount"], `${path}.openAmount`),
    openCount: requiredNum(record, ["openCount", "open_count"], `${path}.openCount`),
    overdueAmount: requiredNum(record, ["overdueAmount", "overdue_amount"], `${path}.overdueAmount`),
    overdueCount: requiredNum(record, ["overdueCount", "overdue_count"], `${path}.overdueCount`),
    inDisputeCount: requiredNum(record, ["inDisputeCount", "in_dispute_count"], `${path}.inDisputeCount`),
  };
}

function readSettled(record: Record<string, unknown> | undefined): FinancialSummary["settledThisMonth"] {
  return {
    competencia: str(record, ["competencia"]) ?? "",
    inflow: requiredNum(record, ["inflow"], "settledThisMonth.inflow"),
    outflow: requiredNum(record, ["outflow"], "settledThisMonth.outflow"),
  };
}

function readCash(record: Record<string, unknown> | undefined): FinancialSummary["cash"] {
  return {
    totalBalance: requiredNum(record, ["totalBalance", "total_balance"], "cash.totalBalance"),
    accountCount: requiredNum(record, ["accountCount", "account_count"], "cash.accountCount"),
    currency: str(record, ["currency"]) ?? "BRL",
  };
}

function readCheques(record: Record<string, unknown> | undefined): FinancialSummary["cheques"] {
  return {
    pendingReceivedCount: requiredNum(record, ["pendingReceivedCount", "pending_received_count"], "cheques.pendingReceivedCount"),
    pendingReceivedAmount: requiredNum(record, ["pendingReceivedAmount", "pending_received_amount"], "cheques.pendingReceivedAmount"),
    pendingIssuedCount: requiredNum(record, ["pendingIssuedCount", "pending_issued_count"], "cheques.pendingIssuedCount"),
    pendingIssuedAmount: requiredNum(record, ["pendingIssuedAmount", "pending_issued_amount"], "cheques.pendingIssuedAmount"),
    linkedPendingCount: requiredNum(record, ["linkedPendingCount", "linked_pending_count"], "cheques.linkedPendingCount"),
    linkedPendingAmount: requiredNum(record, ["linkedPendingAmount", "linked_pending_amount"], "cheques.linkedPendingAmount"),
  };
}

function readCashFlow(value: unknown): CashFlowPoint[] {
  if (!Array.isArray(value)) throw new InvalidFinancialSummary("cashFlow");
  return value.map((raw, index) => {
    const record = readRecord(raw);
    return {
      competencia: str(record, ["competencia"]) ?? "",
      inflow: requiredNum(record, ["inflow"], `cashFlow[${index}].inflow`),
      outflow: requiredNum(record, ["outflow"], `cashFlow[${index}].outflow`),
    };
  });
}

// enums conhecidos — o adapter NORMALIZA status/direction aqui (fonte única) para o consumo (chip/label) nunca
// receber um valor fora do mapa e quebrar o render (condição MÉDIA da junta). Valor desconhecido → fallback seguro.
const KNOWN_STATUSES = new Set(["open", "scheduled", "partially_paid", "paid", "in_dispute", "cancelled"]);
const KNOWN_DIRECTIONS = new Set(["receivable", "payable"]);

function normalizeStatus(value: string | undefined): string {
  return value !== undefined && KNOWN_STATUSES.has(value) ? value : "open";
}

function normalizeDirection(value: string | undefined): string {
  return value !== undefined && KNOWN_DIRECTIONS.has(value) ? value : "receivable";
}

function readRecentTitles(value: unknown): RecentTitle[] {
  if (!Array.isArray(value)) throw new InvalidFinancialSummary("recentTitles");
  return value.map((raw, index) => {
    const record = readRecord(raw);
    return {
      id: str(record, ["id"]) ?? "",
      direction: normalizeDirection(str(record, ["direction"])),
      partyName: str(record, ["partyName", "party_name"]) ?? "—",
      amount: requiredNum(record, ["amount"], `recentTitles[${index}].amount`),
      openAmount: requiredNum(record, ["openAmount", "open_amount"], `recentTitles[${index}].openAmount`),
      dueDate: str(record, ["dueDate", "due_date"]) ?? "",
      status: normalizeStatus(str(record, ["status"])),
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

function requiredNum(record: Record<string, unknown> | undefined, keys: readonly string[], path: string): number {
  if (!record) throw new InvalidFinancialSummary(path);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  throw new InvalidFinancialSummary(path);
}

function bool(record: Record<string, unknown> | undefined, keys: readonly string[]): boolean {
  if (!record) return false;
  for (const key of keys) {
    if (record[key] === true) return true;
  }
  return false;
}
