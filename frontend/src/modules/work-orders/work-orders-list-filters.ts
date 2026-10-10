import type { WorkOrderPriority, WorkOrdersFilters } from "./work-orders.types";

export type WorkOrdersListFilterState = {
  readonly priority: WorkOrderPriority | "all";
  readonly from: string;
  readonly to: string;
};

export const EMPTY_LIST_FILTERS: WorkOrdersListFilterState = Object.freeze({
  priority: "all",
  from: "",
  to: "",
});

export const PRIORITY_FILTER_ORDER: readonly WorkOrderPriority[] = Object.freeze([
  "urgent",
  "high",
  "medium",
  "low",
]);

export type OpeningPeriodKey = "all" | "today" | "7d" | "30d" | "custom";

export const OPENING_PERIOD_OPTIONS: readonly {
  readonly key: Exclude<OpeningPeriodKey, "custom">;
  readonly label: string;
}[] = Object.freeze([
  { key: "all", label: "Qualquer data" },
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
]);

export const CUSTOM_PERIOD_LABEL = "Período personalizado";

const padDatePart = (value: number) => String(value).padStart(2, "0");

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function openingPeriodRange(
  key: Exclude<OpeningPeriodKey, "custom">,
  now: Date,
): { readonly from: string; readonly to: string } {
  if (key === "all") return { from: "", to: "" };

  const today = localDateString(now);
  if (key === "today") return { from: today, to: today };

  const elapsedDays = key === "7d" ? 6 : 29;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - elapsedDays);
  return { from: localDateString(from), to: "" };
}

export function deriveOpeningPeriod(state: WorkOrdersListFilterState, now: Date): OpeningPeriodKey {
  for (const option of OPENING_PERIOD_OPTIONS) {
    const range = openingPeriodRange(option.key, now);
    if (state.from === range.from && state.to === range.to) return option.key;
  }
  return "custom";
}

export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function toApiFilters(state: WorkOrdersListFilterState): WorkOrdersFilters {
  const from = parseLocalDate(state.from);
  const to = parseLocalDate(state.to);
  return {
    search: "",
    status: "all",
    priority: state.priority,
    assignedOperatorId: "",
    from: from ? new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).toISOString() : "",
    to: to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).toISOString() : "",
  };
}

export function countActiveFilters(state: WorkOrdersListFilterState): number {
  const priorityCount = state.priority === "all" ? 0 : 1;
  const periodCount = parseLocalDate(state.from) || parseLocalDate(state.to) ? 1 : 0;
  return priorityCount + periodCount;
}

export function isRangeInverted(state: WorkOrdersListFilterState): boolean {
  const from = parseLocalDate(state.from);
  const to = parseLocalDate(state.to);
  return Boolean(from && to && from.getTime() > to.getTime());
}
