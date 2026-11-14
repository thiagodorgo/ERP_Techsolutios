import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  FinancialTitle,
  FinancialTitleDirection,
  FinancialTitlePartyType,
  FinancialTitlesData,
  FinancialTitlesPagination,
  FinancialTitleStatus,
} from "./financial-titles.types";

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço). "R$ 1.234,56".
export { formatBRL };

// ── Humanização (§3/§11.2: a UI NUNCA mostra o enum cru) ─────────────────────────────────────────
const STATUS_LABEL: Record<FinancialTitleStatus, string> = {
  open: "Em aberto",
  scheduled: "Agendado",
  partially_paid: "Parcial",
  paid: "Pago",
  in_dispute: "Em contestação",
  cancelled: "Cancelado",
};

export type StatusTone = { readonly bg: string; readonly color: string };

// Cor por status COM semântica (azul=aberto · roxo=agendado · ciano=parcial · verde=pago ·
// âmbar=contestação · slate=cancelado). Sem colisão de cor entre estados distintos.
const STATUS_TONE: Record<FinancialTitleStatus, StatusTone> = {
  open: { bg: "#EFF6FF", color: "#2563EB" },
  scheduled: { bg: "#F5F3FF", color: "#7C3AED" },
  partially_paid: { bg: "#ECFEFF", color: "#0891B2" },
  paid: { bg: "#ECFDF5", color: "#059669" },
  in_dispute: { bg: "#FFFBEB", color: "#D97706" },
  cancelled: { bg: "#F1F5F9", color: "#64748B" },
};

export function getTitleStatusLabel(status: FinancialTitleStatus): string {
  return STATUS_LABEL[status];
}

export function getTitleStatusTone(status: FinancialTitleStatus): StatusTone {
  return STATUS_TONE[status];
}

export function parseAmountInput(raw: string): number {
  return Number(String(raw).replace(",", "."));
}

// ── Formatação de datas / competência ────────────────────────────────────────────────────────────
export function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => `${n}`.padStart(2, "0");
  // dd/mm em UTC (determinístico; o due_date é uma data de calendário, não um instante local).
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`;
}

// Valor grande em formato compacto para os cards de KPI ("R$ 184k", "R$ 11,5k", "R$ 1,2M").
// SEMPRE derivado de uma soma real — o front nunca inventa número. O valor exato fica no `title`/aria.
export function formatCompactBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "R$ 0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const trim = (n: number) => {
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  };
  if (abs >= 1_000_000) return `${sign}R$ ${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}R$ ${trim(abs / 1_000)}k`;
  return `${sign}R$ ${abs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

// ── Leitura defensiva do envelope { data: { items, pagination } } ────────────────────────────────
export function adaptFinancialTitlesResponse(
  response: unknown,
  source: FinancialTitlesData["source"] = "api",
  fallbackReason?: string,
): FinancialTitlesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data) ?? payload;
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? [];
  const items = itemsSource
    .map((item) => adaptFinancialTitle(item))
    .filter((item): item is FinancialTitle => item !== null);

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptFinancialTitleResponse(response: unknown): FinancialTitle | null {
  const payload = readRecord(response);
  return adaptFinancialTitle(readRecord(payload?.data) ?? response);
}

function adaptFinancialTitle(input: unknown): FinancialTitle | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const direction = normalizeDirection(readString(item, ["direction"]));
  const partyType = normalizePartyType(readString(item, ["partyType", "party_type"]));
  const partyName = readString(item, ["partyName", "party_name"]);
  const status = normalizeStatus(readString(item, ["status"]));
  const dueDate = readString(item, ["dueDate", "due_date"]);

  // Campos essenciais faltando ⇒ linha descartada (defensivo: o front nunca fabrica um título parcial).
  if (!id || !direction || !partyType || !partyName || !status || !dueDate) return null;

  return {
    id,
    direction,
    partyType,
    partyName,
    document: readNullableString(item, ["document"]),
    category: readNullableString(item, ["category"]),
    description: readNullableString(item, ["description"]),
    amount: readNumber(item, ["amount"]) ?? 0,
    currency: readString(item, ["currency"]) ?? "BRL",
    issueDate: readNullableString(item, ["issueDate", "issue_date"]),
    dueDate,
    paidAmount: readNumber(item, ["paidAmount", "paid_amount"]) ?? 0,
    status,
    competencia: readString(item, ["competencia"]) ?? "",
    accountId: readNullableString(item, ["accountId", "account_id"]),
    workOrderId: readNullableString(item, ["workOrderId", "work_order_id"]),
    overdue: readBoolean(item, ["overdue"]) ?? false,
    active: readBoolean(item, ["active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): FinancialTitlesPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

// ── Normalizadores de enum (fora do conjunto conhecido → null, linha descartada) ─────────────────
function normalizeDirection(value: string | undefined): FinancialTitleDirection | null {
  return value === "receivable" || value === "payable" ? value : null;
}

function normalizePartyType(value: string | undefined): FinancialTitlePartyType | null {
  return value === "customer" || value === "supplier" || value === "other" ? value : null;
}

function normalizeStatus(value: string | undefined): FinancialTitleStatus | null {
  if (
    value === "open" ||
    value === "scheduled" ||
    value === "partially_paid" ||
    value === "paid" ||
    value === "in_dispute" ||
    value === "cancelled"
  ) {
    return value;
  }
  return null;
}

// ── Leitores defensivos (snake_case/camelCase → DTO) ─────────────────────────────────────────────
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

function readNullableString(input: Record<string, unknown>, keys: readonly string[]): string | null {
  return readString(input, keys) ?? null;
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

function readBoolean(input: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}
