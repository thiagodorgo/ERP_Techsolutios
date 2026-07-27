import type {
  ChargeCap,
  ChargeKind,
  ChargeLine,
  ChargeStatementView,
  ChargeSubtotal,
  DailyCap,
  DailyModel,
} from "./charges.types";

const CHARGE_KINDS: readonly ChargeKind[] = ["REMOVAL", "DAILY", "ADDITIONAL", "ADJUSTMENT"];
const DAILY_MODELS: readonly DailyModel[] = ["ROLLING_24H", "CALENDAR"];
const DAILY_CAPS: readonly DailyCap[] = ["SIX_MONTHS", "THIRTY_DAYS_LEGACY", "UNLIMITED"];

// Rótulos PT-BR de FALLBACK (o backend já devolve kindLabel; a UI reusa e só cai aqui se ausente). White-label.
const KIND_LABELS: Record<ChargeKind, string> = {
  REMOVAL: "Remoção",
  DAILY: "Diária",
  ADDITIONAL: "Adicional",
  ADJUSTMENT: "Ajuste (correção retroativa)",
};

// §4.2/§9 — modelo de diária por perfil normativo. ROLLING_24H = §21 §1º (janela rolante de 24h a partir da
// entrada). CALENDAR = diária por dia-calendário (perfil contratual/legado). A UI só ROTULA o que o backend resolveu.
const DAILY_MODEL_LABELS: Record<DailyModel, string> = {
  ROLLING_24H: "Diária de 24h (janela rolante)",
  CALENDAR: "Diária por calendário",
};

// Teto intertemporal (I4): pela DATA DE ENTRADA — 6 meses (Res. 1025) | 30 diárias (Tema 124/STJ legado) | ilimitado.
const DAILY_CAP_LABELS: Record<DailyCap, string> = {
  SIX_MONTHS: "6 meses (Res. 1025)",
  THIRTY_DAYS_LEGACY: "30 diárias (regime legado)",
  UNLIMITED: "Sem teto (ilimitado)",
};

export function getKindLabel(kind: ChargeKind | string | null | undefined): string {
  return KIND_LABELS[(kind ?? "ADDITIONAL") as ChargeKind] ?? "Encargo";
}

export function getDailyModelLabel(model: DailyModel | string | null | undefined): string {
  return DAILY_MODEL_LABELS[(model ?? "ROLLING_24H") as DailyModel] ?? "Diária";
}

export function getDailyCapLabel(cap: DailyCap | string | null | undefined): string {
  return DAILY_CAP_LABELS[(cap ?? "UNLIMITED") as DailyCap] ?? "—";
}

// §2.8 — dinheiro sempre Decimal→BRL PT-BR (nunca float cru). value é a string canônica "0.00" do ledger; um
// ADJUSTMENT de redução vem negativo ("-50.00") e é formatado como -R$ 50,00.
export function formatMoney(value: string | null | undefined, currency = "BRL"): string {
  if (value == null || value.trim() === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    // Moeda não-ISO improvável (ledger é BRL); cai num formato numérico seguro sem quebrar a tela.
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
}

// refDate ("YYYY-MM-DD") → DD/MM/AAAA (legenda secundária local). NUNCA é o identificador primário de uma DAILY (F4).
export function formatRefDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

// F4 (herdado do PR-07) — o TÍTULO PRIMÁRIO de uma linha. Em DAILY o identificador é o `periodSeq`
// ("Diária #N"), NUNCA a `refDate` (não-injetiva no DST em ROLLING_24H). Nas demais, description → kindLabel.
export function getLinePrimaryLabel(line: ChargeLine): string {
  if (line.kind === "DAILY" && line.periodSeq != null) return `Diária #${line.periodSeq}`;
  if (line.description && line.description.trim()) return line.description.trim();
  return line.kindLabel || getKindLabel(line.kind);
}

// F4 — legenda da JANELA da diária (rótulo do período de 24h). Para CALENDAR, "dia de calendário".
export function getDailyWindowLabel(model: DailyModel | string | null | undefined): string {
  return (model ?? "ROLLING_24H") === "CALENDAR" ? "Dia de calendário" : "Janela de 24h";
}

export function adaptStatement(response: unknown): ChargeStatementView | null {
  const payload = readRecord(response);
  const record = readRecord(payload?.data) ?? payload;
  if (!record) return null;
  const processId = readString(record, ["processId", "process_id"]);
  if (!processId) return null;
  const currency = readString(record, ["currency"]) ?? "BRL";
  return {
    processId,
    currency,
    lines: (readArray(record.lines) ?? []).map((item) => adaptLine(item, currency)).filter((line): line is ChargeLine => Boolean(line)),
    subtotals: (readArray(record.subtotals) ?? []).map((item) => adaptSubtotal(item)).filter((entry): entry is ChargeSubtotal => Boolean(entry)),
    total: readMoney(record, ["total"]) ?? "0.00",
    cap: adaptCap(readRecord(record.cap)),
    asOf: readString(record, ["asOf", "as_of"]) ?? new Date().toISOString(),
    reconciliationPending: readBoolean(record, ["reconciliationPending", "reconciliation_pending"]) ?? false,
    overAccruedDailies: readNumber(record, ["overAccruedDailies", "over_accrued_dailies"]) ?? 0,
  };
}

function adaptLine(input: unknown, fallbackCurrency: string): ChargeLine | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  if (!id) return null;
  const kind = coerceKind(readString(item, ["kind"]));
  return {
    id,
    kind,
    kindLabel: readString(item, ["kindLabel"]) ?? getKindLabel(kind),
    periodSeq: readNumber(item, ["periodSeq", "period_seq"]) ?? null,
    refDate: readString(item, ["refDate", "ref_date"]) ?? null,
    description: readString(item, ["description"]) ?? null,
    quantity: readMoney(item, ["quantity"]) ?? "0.00",
    unitAmount: readMoney(item, ["unitAmount", "unit_amount"]) ?? "0.00",
    totalAmount: readMoney(item, ["totalAmount", "total_amount"]) ?? "0.00",
    currency: readString(item, ["currency"]) ?? fallbackCurrency,
    tariffId: readString(item, ["tariffId", "tariff_id"]) ?? null,
    adjustmentOfChargeId: readString(item, ["adjustmentOfChargeId", "adjustment_of_charge_id"]) ?? null,
    settledAt: readString(item, ["settledAt", "settled_at"]) ?? null,
  };
}

function adaptSubtotal(input: unknown): ChargeSubtotal | null {
  const item = readRecord(input);
  if (!item) return null;
  const kind = coerceKind(readString(item, ["kind"]));
  return { kind, kindLabel: readString(item, ["kindLabel"]) ?? getKindLabel(kind), total: readMoney(item, ["total"]) ?? "0.00" };
}

function adaptCap(item: Record<string, unknown> | undefined): ChargeCap | null {
  if (!item) return null;
  const model = coerceModel(readString(item, ["model"]));
  const cap = coerceCap(readString(item, ["cap"]));
  return {
    model,
    cap,
    capCount: readNumber(item, ["capCount", "cap_count"]) ?? null,
    nDue: readNumber(item, ["nDue", "n_due"]) ?? 0,
    nAccrue: readNumber(item, ["nAccrue", "n_accrue"]) ?? 0,
    capReached: readBoolean(item, ["capReached", "cap_reached"]) ?? false,
  };
}

// Só encargos NÃO-ADJUSTMENT podem ser alvo de um ADJUSTMENT (o backend recusa adjustment_of_adjustment). O
// seletor usa o id como key/decisão (nunca renderiza o UUID) e exibe rótulo+valor amigável (§2.8).
export function adjustableLines(lines: readonly ChargeLine[]): ChargeLine[] {
  return lines.filter((line) => line.kind !== "ADJUSTMENT");
}

// Normaliza a entrada de dinheiro do operador ("150,00" | "150.00" | "-50,00") → canônica "0.00". Retorna null se
// inválida. `allowNegative` só p/ ADJUSTMENT (estorno/redução). Nunca float cru vai ao backend.
export function normalizeMoneyInput(raw: string, allowNegative = false): string | null {
  const trimmed = (raw ?? "").trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  // Aceita "1234.56" (após normalizar milhar/decimal) ou "1234" — e o sinal quando permitido.
  const withDot = /,/.test(trimmed) ? normalized : trimmed.replace(",", ".");
  const numeric = Number(withDot);
  if (!Number.isFinite(numeric)) return null;
  if (!allowNegative && numeric < 0) return null;
  return numeric.toFixed(2);
}

function coerceKind(value: string | undefined): ChargeKind {
  return value && CHARGE_KINDS.includes(value as ChargeKind) ? (value as ChargeKind) : "ADDITIONAL";
}

function coerceModel(value: string | undefined): DailyModel {
  return value && DAILY_MODELS.includes(value as DailyModel) ? (value as DailyModel) : "ROLLING_24H";
}

function coerceCap(value: string | undefined): DailyCap {
  return value && DAILY_CAPS.includes(value as DailyCap) ? (value as DailyCap) : "UNLIMITED";
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

// Money vem como string canônica do backend; aceitamos number defensivamente e mantemos "0.00".
function readMoney(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
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

function readBoolean(input: Record<string, unknown> | undefined, keys: readonly string[]): boolean | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}
