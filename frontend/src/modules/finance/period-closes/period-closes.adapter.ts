import { PERIOD_STATUSES, type DirectionTotals, type PeriodChecklist, type PeriodDetail, type PeriodRow, type PeriodSnapshot, type PeriodStatus, type PeriodsData } from "./period-closes.types";

// B-SAN3-24 (24b) — adaptador do DTO do fechamento (`financial-period-close.dto.ts`). Defensivo: situação desconhecida
// não vira linha; número ausente não vira zero inventado no retrato (o retrato inteiro vira null).

type RecordLike = Record<string, unknown>;
const STATUS_SET: ReadonlySet<string> = new Set(PERIOD_STATUSES);

function asRecord(value: unknown): RecordLike | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as RecordLike) : undefined;
}

function str(record: RecordLike | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function num(record: RecordLike | undefined, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function status(record: RecordLike | undefined): PeriodStatus | null {
  const value = str(record, "status");
  return value && STATUS_SET.has(value) ? (value as PeriodStatus) : null;
}

export function adaptPeriodRow(raw: unknown): PeriodRow | null {
  const item = asRecord(raw);
  const period = str(item, "period");
  const value = status(item);
  if (!period || !value) return null;
  return { period, status: value, closedAt: str(item, "closedAt"), reopenedAt: str(item, "reopenedAt") };
}

export function adaptPeriodsList(payload: unknown): PeriodsData {
  const root = asRecord(payload);
  const items: PeriodRow[] = [];
  for (const raw of Array.isArray(root?.items) ? (root?.items as unknown[]) : []) {
    const row = adaptPeriodRow(raw);
    if (row) items.push(row);
  }
  return { items, total: num(asRecord(root?.pagination), "total") ?? items.length, source: "api" };
}

export function adaptChecklist(raw: unknown): PeriodChecklist | null {
  const checklist = asRecord(raw);
  const blocking = asRecord(checklist?.blocking);
  const informational = asRecord(checklist?.informational);
  const inDisputeTitles = num(blocking, "inDisputeTitles");
  const unpaidTitles = num(informational, "unpaidTitles");
  const unreconciledEntries = num(informational, "unreconciledEntries");
  if (inDisputeTitles === null || unpaidTitles === null || unreconciledEntries === null) return null;
  return { inDisputeTitles, unpaidTitles, unreconciledEntries };
}

function totals(raw: unknown): DirectionTotals | null {
  const record = asRecord(raw);
  const count = num(record, "count");
  const sumAmount = num(record, "sumAmount");
  return count === null || sumAmount === null ? null : { count, sumAmount };
}

export function adaptSnapshot(raw: unknown): PeriodSnapshot | null {
  const body = asRecord(raw);
  if (!body) return null;
  const entries = asRecord(body.entries);
  const titles = asRecord(body.titles);
  const entriesIn = totals(entries?.in);
  const entriesOut = totals(entries?.out);
  const net = num(entries, "net");
  const receivable = totals(titles?.receivable);
  const payable = totals(titles?.payable);
  const pending = asRecord(body.pending);
  const pendingAtClose = adaptChecklist(pending);
  if (!entriesIn || !entriesOut || net === null || !receivable || !payable || !pendingAtClose) return null;
  return {
    computedAt: str(body, "computedAt"),
    forced: body.forced === true,
    forcedReason: str(body, "forcedReason"),
    entriesIn,
    entriesOut,
    net,
    receivable,
    payable,
    pendingAtClose,
  };
}

/** `{ data: <status|close dto> }` → `PeriodDetail`. Forma inválida → erro (a tela não inventa o estado). */
export function adaptPeriodDetail(payload: unknown): PeriodDetail {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const period = str(data, "period");
  const value = status(data);
  if (!period || !value) throw new Error("invalid_financial_period_response");
  const history = data?.snapshotHistory;
  return {
    period,
    status: value,
    closedAt: str(data, "closedAt"),
    reopenedAt: str(data, "reopenedAt"),
    reopenReason: str(data, "reopenReason"),
    snapshot: adaptSnapshot(data?.snapshot),
    closeCount: Array.isArray(history) ? history.length : 0,
    checklist: data && "checklist" in data ? adaptChecklist(data.checklist) : null,
  };
}
