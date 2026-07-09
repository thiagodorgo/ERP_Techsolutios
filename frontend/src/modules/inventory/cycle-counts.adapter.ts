// F7b Estoque avançado — adaptação/normalização de /cycle-counts (contagem cíclica R7.6).
// Mantém o mesmo padrão defensivo do inventory.adapter (envelope {data}, snake/camel).
import { isAbcClass } from "./inventory.adapter";
import type {
  CycleCount,
  CycleCountCloseResult,
  CycleCountEntry,
  CycleCountStatus,
  CycleCountSubmitFeedback,
  CycleCountsData,
  VarianceLine,
  VarianceReport,
} from "./cycle-counts.types";
import type { InventoryPagination, InventorySource } from "./inventory.types";

// ── Situação: token técnico -> rótulo PT-BR + tom do Chip ────────────────────
// aberta=aviso, concluída=sucesso, cancelada=neutro (muted).
const CYCLE_COUNT_STATUS_META: Record<CycleCountStatus, { label: string; tone: "warning" | "success" | "default" }> = {
  aberta: { label: "Aberta", tone: "warning" },
  concluida: { label: "Concluída", tone: "success" },
  cancelada: { label: "Cancelada", tone: "default" },
};

const CYCLE_COUNT_STATUS_VALUES = Object.keys(CYCLE_COUNT_STATUS_META) as CycleCountStatus[];

export function isCycleCountStatus(value: string | null | undefined): value is CycleCountStatus {
  return typeof value === "string" && CYCLE_COUNT_STATUS_VALUES.includes(value as CycleCountStatus);
}

export function getCycleCountStatusLabel(status: CycleCountStatus): string {
  return CYCLE_COUNT_STATUS_META[status]?.label ?? "—";
}

export function getCycleCountStatusTone(status: CycleCountStatus) {
  return CYCLE_COUNT_STATUS_META[status]?.tone ?? ("default" as const);
}

// Classe da sessão: null = Todas as classes.
export function getCycleCountClassLabel(abcClass: CycleCount["abcClass"]): string {
  return abcClass ?? "Todas";
}

// Sessão aberta é a única editável (registra contagem / fecha / cancela).
export function isCycleCountEditable(status: CycleCountStatus): boolean {
  return status === "aberta";
}

// ── Variância = contado − sistema (null enquanto não houver contagem) ────────
export function computeVariance(systemQuantity: number, countedQuantity: number | null | undefined): number | null {
  if (countedQuantity === null || countedQuantity === undefined || !Number.isFinite(countedQuantity)) return null;
  return countedQuantity - systemQuantity;
}

// ── Adaptação de respostas ───────────────────────────────────────────────────
export function adaptCycleCountsResponse(response: unknown, source: InventorySource = "api", fallbackReason?: string): CycleCountsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptCycleCount(item)).filter((item): item is CycleCount => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptCycleCountResponse(response: unknown): CycleCount | null {
  const payload = readRecord(response);
  return adaptCycleCount(readRecord(payload?.data) ?? response);
}

// PATCH de uma entrada pode devolver só a entrada, ou a sessão inteira.
export function adaptCycleCountEntryResponse(response: unknown): CycleCountEntry | null {
  const payload = readRecord(response);
  const data = readRecord(payload?.data) ?? payload;
  const entry = readRecord(data?.entry) ?? data;
  return adaptCycleCountEntry(entry);
}

// Fechamento → relatório de variância + ajustes gerados.
export function adaptCycleCountCloseResponse(response: unknown): CycleCountCloseResult {
  const payload = readRecord(response);
  const data = readRecord(payload?.data) ?? payload ?? {};
  const cycleCount =
    adaptCycleCount(readRecord(data.cycleCount) ?? data) ??
    ({ id: "", abcClass: null, status: "concluida", notes: null, entries: [], countedCount: 0, totalCount: 0, createdAt: new Date().toISOString() } as CycleCount);
  const adjustmentsOverride = readNumber(data, ["adjustmentsGenerated", "adjustments_generated", "generatedAdjustments"]);
  const report = buildVarianceReport(cycleCount.entries, adjustmentsOverride);
  return { cycleCount, report };
}

// Relatório: linhas com variância ≠ 0, total e nº de ajustes gerados.
export function buildVarianceReport(entries: readonly CycleCountEntry[], adjustmentsGeneratedOverride?: number): VarianceReport {
  const lines: VarianceLine[] = entries
    .filter((entry) => entry.variance !== null && entry.variance !== 0)
    .map((entry) => ({
      entryId: entry.id,
      itemId: entry.itemId,
      systemQuantity: entry.systemQuantity,
      countedQuantity: entry.countedQuantity,
      variance: entry.variance as number,
    }));

  const totalVariance = lines.reduce((sum, line) => sum + line.variance, 0);
  const generatedFromEntries = entries.filter((entry) => Boolean(entry.adjustmentMovementId)).length;
  const adjustmentsGenerated =
    adjustmentsGeneratedOverride !== undefined && Number.isFinite(adjustmentsGeneratedOverride)
      ? adjustmentsGeneratedOverride
      : generatedFromEntries > 0
        ? generatedFromEntries
        : lines.length;

  return { lines, totalVariance, adjustmentsGenerated };
}

function adaptCycleCount(input: unknown): CycleCount | null {
  const record = readRecord(input);
  if (!record) return null;

  const id = readString(record, ["id"]);
  if (!id) return null;

  const statusRaw = readString(record, ["status"]);
  const status: CycleCountStatus = isCycleCountStatus(statusRaw) ? statusRaw : "aberta";
  const abcRaw = readString(record, ["abcClass", "abc_class"]);
  const entriesRaw = readArray(record.entries) ?? [];
  const entries = entriesRaw.map((entry) => adaptCycleCountEntry(entry)).filter((entry): entry is CycleCountEntry => Boolean(entry));

  const totalCount = readNumber(record, ["totalCount", "total_count", "itemsTotal", "items_total", "entriesTotal", "entries_total"]) ?? entries.length;
  const countedCount =
    readNumber(record, ["countedCount", "counted_count", "itemsCounted", "items_counted"]) ??
    entries.filter((entry) => entry.countedQuantity !== null).length;

  return {
    id,
    abcClass: isAbcClass(abcRaw) ? abcRaw : null,
    status,
    notes: readNullableString(record, ["notes", "notas"]),
    entries,
    countedCount,
    totalCount,
    createdAt: readString(record, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptCycleCountEntry(input: unknown): CycleCountEntry | null {
  const record = readRecord(input);
  if (!record) return null;

  const id = readString(record, ["id"]);
  const itemId = readString(record, ["itemId", "item_id"]);
  if (!id || !itemId) return null;

  const systemQuantity = readNumber(record, ["systemQuantity", "system_quantity"]) ?? 0;
  const countedQuantity = readNullableNumber(record, ["countedQuantity", "counted_quantity"]);
  const variance = readNullableNumber(record, ["variance"]) ?? computeVariance(systemQuantity, countedQuantity);

  return {
    id,
    itemId,
    systemQuantity,
    countedQuantity,
    variance,
    adjustmentMovementId: readNullableString(record, ["adjustmentMovementId", "adjustment_movement_id"]),
  };
}

// ── Interpretação dos erros de domínio ({error:{reason}}) ────────────────────
export function interpretCycleCountError(error: unknown): CycleCountSubmitFeedback {
  const status = readErrorStatus(error);
  const reason = readErrorReason(error);

  // 422 invalid-status → contagem já concluída/cancelada.
  if (status === 422 || reason === "invalid-status" || reason === "invalid_status") {
    return {
      reason: reason ?? "invalid-status",
      message: "Esta contagem já foi concluída ou cancelada e não pode mais ser alterada. Recarregue a lista.",
    };
  }

  if (status === 403 || reason === "forbidden") {
    return { reason: reason ?? "forbidden", message: "Você não tem permissão para esta ação de contagem." };
  }

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: "Não foi possível concluir a ação da contagem. Tente novamente." };
}

// ── Helpers de leitura defensiva (locais — mesmo padrão do inventory.adapter) ─
function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): InventoryPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

function readErrorReason(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const direct = (error as { reason?: unknown }).reason;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const nested = readRecord((error as { error?: unknown }).error);
    const nestedReason = nested?.reason;
    if (typeof nestedReason === "string" && nestedReason.trim()) return nestedReason.trim();
  }
  return undefined;
}

function readErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
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

function readNullableString(input: Record<string, unknown>, keys: readonly string[]): string | null {
  return readString(input, keys) ?? null;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readNullableNumber(input: Record<string, unknown>, keys: readonly string[]): number | null {
  return readNumber(input, keys) ?? null;
}
