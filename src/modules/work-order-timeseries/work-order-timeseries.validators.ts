import { deriveBusinessDate, parseBusinessDate } from "../../config/business-time.js";
import {
  DEFAULT_TIMESERIES_DAYS,
  MAX_TIMESERIES_DAYS,
  WorkOrderTimeseriesError,
  type WorkOrderTimeseriesWindow,
} from "./work-order-timeseries.types.js";

const MS_PER_DAY = 86_400_000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function invalidFilter(reason: string, message: string): WorkOrderTimeseriesError {
  return new WorkOrderTimeseriesError(400, "WORK_ORDER_TIMESERIES_FILTER_INVALID", reason, message);
}

// days: inteiro positivo 1..MAX. Ausente/vazio → undefined (o caller aplica o default).
export function parseDays(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    throw invalidFilter("invalid_days", "days must be a positive integer.");
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TIMESERIES_DAYS) {
    throw invalidFilter("invalid_days", `days must be between 1 and ${MAX_TIMESERIES_DAYS}.`);
  }
  return parsed;
}

// from/to: 'YYYY-MM-DD' civil de negócio. Valida o formato + o ROUND-TRIP no fuso de negócio (reusa
// parseBusinessDate → rejeita dia fora de range como 2026-02-30). Devolve a data civil normalizada.
export function parseBusinessCivilDate(value: unknown, field: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!DATE_ONLY_PATTERN.test(raw)) {
    throw invalidFilter(`invalid_${field}`, `${field} must be a valid YYYY-MM-DD date.`);
  }
  const anchored = parseBusinessDate(raw);
  if (Number.isNaN(anchored.getTime())) {
    throw invalidFilter(`invalid_${field}`, `${field} must be a valid calendar date.`);
  }
  return deriveBusinessDate(anchored);
}

// Desloca uma data civil ('YYYY-MM-DD') por N dias (aritmética de calendário PURA sobre âncora UTC).
function shiftCivilDays(civil: string, delta: number): string {
  return new Date(Date.parse(`${civil}T00:00:00Z`) + delta * MS_PER_DAY).toISOString().slice(0, 10);
}

// Nº de dias inclusivo entre duas datas civis (from<=to).
function inclusiveSpanDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY) + 1;
}

// Resolve a janela a partir da query:
//   - ?from=&to= (ambos obrigatórios juntos) → janela EXPLÍCITA (datas civis de negócio);
//   - senão ?days=N (default 30) → N dias terminando HOJE (data civil de negócio de `now`): from = hoje-(N-1).
// Valida from<=to e teto de MAX_TIMESERIES_DAYS.
export function resolveWindow(query: Record<string, unknown>, now: Date): WorkOrderTimeseriesWindow {
  const hasFrom = query.from !== undefined && query.from !== null && query.from !== "";
  const hasTo = query.to !== undefined && query.to !== null && query.to !== "";

  if (hasFrom || hasTo) {
    if (!hasFrom || !hasTo) {
      throw invalidFilter("incomplete_range", "from and to must be provided together.");
    }
    const from = parseBusinessCivilDate(query.from, "from");
    const to = parseBusinessCivilDate(query.to, "to");
    if (from > to) {
      throw invalidFilter("invalid_window", "from must be before or equal to to.");
    }
    if (inclusiveSpanDays(from, to) > MAX_TIMESERIES_DAYS) {
      throw invalidFilter("window_too_large", `the window must not exceed ${MAX_TIMESERIES_DAYS} days.`);
    }
    return { from, to };
  }

  const days = parseDays(query.days) ?? DEFAULT_TIMESERIES_DAYS;
  const to = deriveBusinessDate(now);
  const from = shiftCivilDays(to, -(days - 1));
  return { from, to };
}
