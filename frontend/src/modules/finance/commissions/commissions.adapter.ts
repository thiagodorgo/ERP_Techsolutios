import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  CommissionCalculation,
  CommissionCalculationsData,
  CommissionCalculationsFilters,
  CommissionCalculationsPagination,
  CommissionStatus,
  CommissionSummaryData,
  CommissionSummaryFilters,
  CommissionSummaryItem,
  CommissionSummaryScope,
  SettlementLine,
  SettlementOutcome,
  SettlementResult,
} from "./commissions.types";

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

type Tone = "default" | "success" | "warning" | "danger" | "info" | "pending" | "audit";

// Situação: token técnico -> rótulo PT-BR + tom do Chip (cor com semântica de fluxo).
// Enum aberto: os conhecidos são mapeados; os demais são humanizados (nunca token cru).
const COMMISSION_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pendente", tone: "warning" },
  calculated: { label: "Calculada", tone: "default" },
  approved: { label: "Aprovada", tone: "info" },
  paid: { label: "Paga", tone: "success" },
  cancelled: { label: "Cancelada", tone: "audit" },
  canceled: { label: "Cancelada", tone: "audit" },
  reversed: { label: "Estornada", tone: "danger" },
  rejected: { label: "Rejeitada", tone: "danger" },
};

// Humaniza um token desconhecido: "pending_review" -> "Pending review" (sem underscore cru).
function humanizeStatus(status: string): string {
  const clean = status.trim().replace(/[_-]+/g, " ");
  if (!clean) return "—";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function getCommissionStatusLabel(status: CommissionStatus | null | undefined): string {
  if (!status || !status.trim()) return "—";
  const key = status.trim().toLowerCase();
  return COMMISSION_STATUS_META[key]?.label ?? humanizeStatus(status);
}

export function getCommissionStatusTone(status: CommissionStatus | null | undefined): Tone {
  if (!status || !status.trim()) return "default";
  return COMMISSION_STATUS_META[status.trim().toLowerCase()]?.tone ?? "default";
}

// ── Origem da comissão (evento-base: sourceType) ───────────────────────────────────────
// Só a origem "work_order" vira link navegável (para /work-orders/:sourceId); as demais são
// rótulos PT-BR informativos. Enum aberto: desconhecidos são humanizados (nunca token cru).
const COMMISSION_SOURCE_LABELS: Record<string, string> = {
  work_order: "Ordem de serviço",
  workorder: "Ordem de serviço",
  checklist_run: "Checklist",
  checklist: "Checklist",
  dispatch: "Despacho",
  field_dispatch: "Despacho",
  invoice: "Fatura",
  manual: "Ajuste manual",
  adjustment: "Ajuste",
};

export function getCommissionSourceLabel(sourceType: string | null | undefined): string {
  if (!sourceType || !sourceType.trim()) return "—";
  const key = sourceType.trim().toLowerCase();
  return COMMISSION_SOURCE_LABELS[key] ?? humanizeStatus(sourceType);
}

// A comissão navega para a OS somente quando a origem é uma ordem de serviço com id.
export function isWorkOrderSource(sourceType: string | null | undefined): boolean {
  if (!sourceType) return false;
  const key = sourceType.trim().toLowerCase();
  return key === "work_order" || key === "workorder";
}

// Descreve como exibir a origem (fonte única, pura e testável — a célula "Origem" delega aqui):
//   `none`  → sem tipo de origem conhecido → "—"
//   `link`  → OS (work_order) com id → link para /work-orders/:id
//   `label` → demais origens (ou OS sem id) → APENAS o rótulo PT-BR (nunca id cru/fragmento)
export type CommissionOriginDisplay =
  | { readonly kind: "none" }
  | { readonly kind: "label"; readonly label: string }
  | { readonly kind: "link"; readonly label: string; readonly href: string };

export function describeCommissionOrigin(
  sourceType: string | null | undefined,
  sourceId: string | null | undefined,
): CommissionOriginDisplay {
  if (!sourceType || !sourceType.trim()) return { kind: "none" };
  const label = getCommissionSourceLabel(sourceType);
  if (isWorkOrderSource(sourceType) && sourceId && sourceId.trim()) {
    return { kind: "link", label, href: `/work-orders/${sourceId}` };
  }
  return { kind: "label", label };
}

// ── Query de período (from/to) + operador/paginação (date-range query build) ──────────
export function buildCommissionsQuery(filters: CommissionSummaryFilters & CommissionCalculationsFilters): string {
  const query = new URLSearchParams();
  const from = filters.from?.trim();
  const to = filters.to?.trim();
  const payeeId = filters.payeeId?.trim();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (payeeId) query.set("payee_id", payeeId);
  if (filters.limit && Number.isFinite(filters.limit)) query.set("limit", String(filters.limit));
  if (filters.offset && Number.isFinite(filters.offset)) query.set("offset", String(filters.offset));
  return query.size ? `?${query.toString()}` : "";
}

// Escolhe o endpoint de detalhamento conforme o escopo permitido ao chamador (fonte única,
// pura e testável — o serviço e o drawer delegam aqui):
//   `own` → /commissions/calculations/mine  (commissions:read_own; o servidor fixa o payee
//            pelo token, então NUNCA propagamos payee_id — a rota geral daria 403 ao operador)
//   `all` → /commissions/calculations?payee_id=…  (commissions:read; filtra por operador)
export function buildCalculationsPath(scope: CommissionSummaryScope, filters: CommissionCalculationsFilters): string {
  if (scope === "own") {
    // Sem payee_id: autoria resolvida no servidor.
    return `/commissions/calculations/mine${buildCommissionsQuery({ from: filters.from, to: filters.to, limit: filters.limit, offset: filters.offset })}`;
  }
  return `/commissions/calculations${buildCommissionsQuery(filters)}`;
}

// ── Extrato agregado (summary / my-summary — mesmo shape) ──────────────────────────────
export function adaptCommissionSummaryResponse(
  response: unknown,
  source: CommissionSummaryData["source"] = "api",
  fallbackReason?: string,
): CommissionSummaryData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data) ?? payload;
  const itemsSource = readArray(dataRecord?.items) ?? readArray(payload?.items) ?? [];
  const items = itemsSource
    .map((item) => adaptSummaryItem(item))
    .filter((item): item is CommissionSummaryItem => Boolean(item));

  // Total geral: preferimos o valor explícito do backend; na ausência, somamos as linhas.
  const explicitTotal = readNumber(dataRecord, ["total"]);
  const total = explicitTotal ?? items.reduce((sum, item) => sum + item.total, 0);

  return {
    summary: {
      items,
      total,
      from: readString(dataRecord, ["from"]) ?? "",
      to: readString(dataRecord, ["to"]) ?? "",
    },
    source,
    fallbackReason,
  };
}

function adaptSummaryItem(input: unknown): CommissionSummaryItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const payeeId = readString(item, ["payeeId", "payee_id"]);
  if (!payeeId) return null;

  return {
    payeeId,
    total: readNumber(item, ["total"]) ?? 0,
    count: readNumber(item, ["count"]) ?? 0,
  };
}

// ── Detalhamento por origem (calculations) ─────────────────────────────────────────────
export function adaptCommissionCalculationsResponse(
  response: unknown,
  source: CommissionCalculationsData["source"] = "api",
  fallbackReason?: string,
): CommissionCalculationsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data) ?? payload;
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? [];
  const items = itemsSource
    .map((item) => adaptCommissionCalculation(item))
    .filter((item): item is CommissionCalculation => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

function adaptCommissionCalculation(input: unknown): CommissionCalculation | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  if (!id) return null;

  // Origem preferencial: sourceType/sourceId (evento-base). Legado: work_order_id direto — se
  // presente e sem sourceType, promove a origem OS para manter o link navegável.
  const workOrderId = readNullableString(item, ["workOrderId", "work_order_id"]);
  const rawSourceType = readNullableString(item, ["sourceType", "source_type"]);
  const rawSourceId = readNullableString(item, ["sourceId", "source_id"]);
  const sourceType = rawSourceType ?? (workOrderId ? "work_order" : null);
  const sourceId = rawSourceId ?? (rawSourceType ? null : workOrderId);

  return {
    id,
    payeeId: readNullableString(item, ["payeeId", "payee_id"]),
    amount: readNumber(item, ["amount"]) ?? 0,
    status: readString(item, ["status"]) ?? "pending",
    sourceType,
    sourceId,
    workOrderId,
    // Ω4C PR-10 — marcador de liquidação (§2.8: só estado/link, nunca dado sensível).
    settledAt: readNullableString(item, ["settledAt", "settled_at"]),
    settlementRef: readNullableString(item, ["settlementRef", "settlement_ref"]),
    createdAt:
      readString(item, ["createdAt", "created_at", "calculatedAt", "calculated_at"]) ?? new Date().toISOString(),
  };
}

// ── Ω4C PR-10 — Liquidação: adapter do resultado + rótulos/bolinha + CSV da conferência ──────

// Bolinha de status: liquidado (settledAt definido) = verde; pendente = âmbar (espera, não erro).
export function isCalculationSettled(calc: Pick<CommissionCalculation, "settledAt">): boolean {
  return Boolean(calc.settledAt && calc.settledAt.trim());
}

export function getSettlementLabel(settled: boolean): string {
  return settled ? "Liquidado" : "Pendente";
}

export function getSettlementTone(settled: boolean): "success" | "pending" {
  return settled ? "success" : "pending";
}

// Resposta do POST /commissions/settlements → resultado tipado (envelope { data } desembrulhado).
export function adaptSettlementResult(response: unknown): SettlementResult {
  const payload = readRecord(response);
  const data = readRecord(payload?.data) ?? payload;
  const lines = (readArray(data?.lines) ?? [])
    .map((line) => adaptSettlementLine(line))
    .filter((line): line is SettlementLine => Boolean(line));
  return {
    settlementDate: readString(data, ["settlementDate", "settlement_date"]) ?? "",
    settledCount: readNumber(data, ["settledCount", "settled_count"]) ?? lines.filter((l) => l.outcome === "settled").length,
    settledTotal: readNumber(data, ["settledTotal", "settled_total"]) ?? 0,
    lines,
  };
}

const SETTLEMENT_OUTCOME_SET: ReadonlySet<string> = new Set(["settled", "already_settled", "skipped_zero"]);

function adaptSettlementLine(input: unknown): SettlementLine | null {
  const item = readRecord(input);
  if (!item) return null;
  const calculationId = readString(item, ["calculationId", "calculation_id"]);
  const rawOutcome = readString(item, ["outcome"]);
  if (!calculationId || !rawOutcome || !SETTLEMENT_OUTCOME_SET.has(rawOutcome)) return null;
  return {
    calculationId,
    outcome: rawOutcome as SettlementOutcome,
    statementGroupId: readNullableString(item, ["statementGroupId", "statement_group_id"]),
    operatorProfileId: readNullableString(item, ["operatorProfileId", "operator_profile_id"]),
  };
}

// Mensagem de feedback honesta a partir do resultado (para o Alert de sucesso). Reflete os 3 desfechos:
// liquidadas / já-liquidadas / valor-zero — sem inventar contagem.
export function describeSettlementResult(result: SettlementResult): string {
  const already = result.lines.filter((line) => line.outcome === "already_settled").length;
  const zero = result.lines.filter((line) => line.outcome === "skipped_zero").length;
  const parts: string[] = [];
  parts.push(
    result.settledCount === 1
      ? "1 remuneração liquidada"
      : `${result.settledCount.toLocaleString("pt-BR")} remunerações liquidadas`,
  );
  if (result.settledCount > 0) parts.push(`total ${formatBRL(result.settledTotal)}`);
  if (already > 0) parts.push(`${already} já estava(m) liquidada(s)`);
  if (zero > 0) parts.push(`${zero} sem valor a liquidar`);
  return `${parts.join(" · ")}.`;
}

// CSV da conferência — SOMENTE as linhas reais carregadas (D-007). Cabeçalho PT-BR; §2.8: nome como label.
export function buildRemuneracoesCsv(
  professionalName: string,
  calcs: readonly CommissionCalculation[],
): { header: string[]; rows: string[][] } {
  const header = ["Profissional", "Data", "Origem", "Valor da remuneração", "Situação"];
  const rows = calcs.map((calc) => [
    professionalName,
    formatCommissionDate(calc.createdAt),
    getCommissionSourceLabel(calc.sourceType),
    formatBRL(calc.amount),
    getSettlementLabel(isCalculationSettled(calc)),
  ]);
  return { header, rows };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): CommissionCalculationsPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

// ── Formatação ─────────────────────────────────────────────────────────────────────────
export function formatCommissionCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0";
  return Math.trunc(value).toLocaleString("pt-BR");
}

export function formatCommissionDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

// Rótulo do período para subtítulos/cabeçalhos ("01/06/2026 – 30/06/2026", ou aberto).
export function formatPeriodLabel(from: string | null | undefined, to: string | null | undefined): string {
  const start = from?.trim() ? formatCommissionDate(from) : null;
  const end = to?.trim() ? formatCommissionDate(to) : null;
  if (start && end) return `${start} – ${end}`;
  if (start) return `A partir de ${start}`;
  if (end) return `Até ${end}`;
  return "Todo o período";
}

// ── Leitores defensivos (snake_case/camelCase → DTO) ───────────────────────────────────
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
