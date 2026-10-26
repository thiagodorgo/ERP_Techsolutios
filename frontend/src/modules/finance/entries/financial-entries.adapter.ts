import type {
  AggregateBucket,
  AggregateGroupBy,
  DivergenceType,
  EntriesAggregate,
  FinancialEntriesData,
  FinancialEntriesSource,
  FinancialEntry,
  ReconciliationPolicy,
  TitleCheque,
  UnlinkResult,
} from "./financial-entries.types";

// B-SAN3-12b — adaptador dos lançamentos, do agregado, da política e do cheque do título. Defensivo: o que não tem a
// forma do contrato não vira linha nem número (F19 — a tela não renderiza o que o servidor não deu).

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as RecordLike) : undefined;
}

function str(record: RecordLike | undefined, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return undefined;
}

function num(record: RecordLike | undefined, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function unwrap(payload: unknown): RecordLike | undefined {
  const root = asRecord(payload);
  return asRecord(root?.data) ?? root;
}

function listOf(payload: unknown): { items: unknown[]; pagination: RecordLike | undefined } {
  const root = asRecord(payload);
  const nested = asRecord(root?.data);
  const items = Array.isArray(root?.items) ? root.items : Array.isArray(nested?.items) ? nested.items : Array.isArray(root?.data) ? root.data : [];
  return { items: items as unknown[], pagination: asRecord(root?.pagination) ?? asRecord(nested?.pagination) };
}

function adaptEntry(input: unknown): FinancialEntry | null {
  const item = asRecord(input);
  const id = str(item, ["id"]);
  const accountId = str(item, ["accountId", "account_id"]);
  const direction = str(item, ["direction"]);
  const amount = num(item, ["amount"]);
  if (!id || !accountId || (direction !== "in" && direction !== "out") || amount === undefined) return null;
  const divergence = str(item, ["divergenceType", "divergence_type"]);
  return {
    id,
    accountId,
    titleId: str(item, ["titleId", "title_id"]) ?? null,
    direction,
    amount,
    currency: str(item, ["currency"]) ?? "BRL",
    paymentMethod: str(item, ["paymentMethod", "payment_method"]) ?? "",
    category: str(item, ["category"]) ?? null,
    occurredAt: str(item, ["occurredAt", "occurred_at"]) ?? "",
    competencia: str(item, ["competencia"]) ?? "",
    description: str(item, ["description"]) ?? null,
    reversalOf: str(item, ["reversalOf", "reversal_of"]) ?? null,
    reconciled: item?.reconciled === true,
    divergenceType: divergence === "value" || divergence === "date" ? (divergence as DivergenceType) : null,
    reconciliationRef: str(item, ["reconciliationRef", "reconciliation_ref"]) ?? null,
    reconciledAt: str(item, ["reconciledAt", "reconciled_at"]) ?? null,
    reconciledBy: str(item, ["reconciledBy", "reconciled_by"]) ?? null,
    active: item?.active !== false,
    createdAt: str(item, ["createdAt", "created_at"]) ?? "",
    updatedAt: str(item, ["updatedAt", "updated_at"]) ?? "",
  };
}

export function adaptFinancialEntriesResponse(payload: unknown, source: FinancialEntriesSource): FinancialEntriesData {
  const { items: raw, pagination } = listOf(payload);
  const items = raw.map(adaptEntry).filter((entry): entry is FinancialEntry => entry !== null);
  return {
    items,
    pagination: {
      limit: num(pagination, ["limit"]) ?? items.length,
      offset: num(pagination, ["offset"]) ?? 0,
      total: num(pagination, ["total"]) ?? items.length,
    },
    source,
  };
}

export function adaptFinancialEntryResponse(payload: unknown): FinancialEntry | null {
  return adaptEntry(unwrap(payload));
}

export function adaptEntriesAggregate(payload: unknown): EntriesAggregate | null {
  const data = unwrap(payload);
  if (!data || !Array.isArray(data.items)) return null;
  const group = str(data, ["groupBy", "group_by"]);
  const items: AggregateBucket[] = [];
  for (const raw of data.items as unknown[]) {
    const bucket = asRecord(raw);
    const count = num(bucket, ["count"]);
    const inflow = num(bucket, ["inflow"]);
    const outflow = num(bucket, ["outflow"]);
    const net = num(bucket, ["net"]);
    if (count === undefined || inflow === undefined || outflow === undefined || net === undefined) return null;
    items.push({ bucket: str(bucket, ["bucket"]) ?? null, count, inflow, outflow, net });
  }
  return {
    groupBy: (group === "month" || group === "day" ? group : "none") as AggregateGroupBy,
    currency: str(data, ["currency"]) ?? "BRL",
    timezone: str(data, ["timezone"]) ?? "America/Sao_Paulo",
    items,
  };
}

/** Fail-closed: só `true` booleano dá o privilégio; qualquer outra coisa é "não pode". */
export function adaptReconciliationPolicy(payload: unknown): ReconciliationPolicy {
  const data = unwrap(payload);
  return { canUnreconcile: data?.canUnreconcile === true, delegatedToFinance: data?.delegatedToFinance === true };
}

/** Cheques do título que ainda bloqueiam a baixa: os pendentes (registrado ou depositado). */
export function adaptTitleCheques(payload: unknown): TitleCheque[] {
  const out: TitleCheque[] = [];
  for (const raw of listOf(payload).items) {
    const item = asRecord(raw);
    const id = str(item, ["id"]);
    const amount = num(item, ["amount"]);
    const status = str(item, ["status"]);
    if (!id || amount === undefined || (status !== "registered" && status !== "deposited")) continue;
    out.push({
      id,
      chequeNumber: str(item, ["chequeNumber", "cheque_number"]) ?? "",
      bank: str(item, ["bank"]) ?? null,
      amount,
      status,
      dueDate: str(item, ["dueDate", "due_date"]) ?? null,
    });
  }
  return out;
}

export function adaptUnlinkResult(payload: unknown): UnlinkResult | null {
  const root = asRecord(payload);
  const data = unwrap(payload);
  const id = str(data, ["id"]);
  if (!id) return null;
  return {
    cheque: { id, chequeNumber: str(data, ["chequeNumber", "cheque_number"]) ?? "", status: str(data, ["status"]) ?? "" },
    stillDepositable: root?.warning === "cheque_still_depositable",
  };
}
