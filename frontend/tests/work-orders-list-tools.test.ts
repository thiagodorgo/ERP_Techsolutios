import assert from "node:assert/strict";
import test from "node:test";

import { filterWorkOrders } from "../src/modules/work-orders/work-orders.adapter";
import {
  countActiveFilters,
  deriveOpeningPeriod,
  EMPTY_LIST_FILTERS,
  isRangeInverted,
  localDateString,
  openingPeriodRange,
  parseLocalDate,
  toApiFilters,
  type WorkOrdersListFilterState,
} from "../src/modules/work-orders/work-orders-list-filters";
import {
  workOrderServiceLine,
  WORK_ORDER_PRIORITY_LABEL,
} from "../src/modules/work-orders/work-orders-row.logic";
import type { WorkOrderListItem } from "../src/modules/work-orders/work-orders.types";

const listFilters = (
  overrides: Partial<WorkOrdersListFilterState> = {},
): WorkOrdersListFilterState => ({ ...EMPTY_LIST_FILTERS, ...overrides });

const order = (createdAt: Date, overrides: Partial<WorkOrderListItem> = {}): WorkOrderListItem => ({
  id: `wo-${createdAt.getTime()}`,
  code: `OS-${createdAt.getTime()}`,
  title: "Reboque",
  status: "open",
  priority: "high",
  createdAt: createdAt.toISOString(),
  ...overrides,
});

test("[LT1] parseLocalDate aceita calendário local válido e rejeita entradas inválidas", () => {
  const date = parseLocalDate("2026-10-07");
  assert.ok(date);
  assert.deepEqual(
    [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()],
    [2026, 9, 7, 0],
  );
  for (const invalid of ["", "07/10/2026", "2026-10-7", "2026-02-31", "2026-13-01"]) {
    assert.equal(parseLocalDate(invalid), null, invalid);
  }
});

test("[LT2] toApiFilters produz contrato vazio e limites ISO do dia local", () => {
  assert.deepEqual(toApiFilters(EMPTY_LIST_FILTERS), {
    search: "",
    status: "all",
    priority: "all",
    assignedOperatorId: "",
    from: "",
    to: "",
  });

  const filters = toApiFilters(listFilters({ priority: "high", from: "2026-10-01", to: "2026-10-07" }));
  assert.equal(filters.priority, "high");
  assert.equal(filters.from, new Date(2026, 9, 1, 0, 0, 0, 0).toISOString());
  assert.equal(filters.to, new Date(2026, 9, 7, 23, 59, 59, 999).toISOString());
});

test("[LT3] limites ISO preservam todo o período ao filtrar as ordens", () => {
  const filters = toApiFilters(listFilters({ from: "2026-10-01", to: "2026-10-07" }));
  const items = [
    order(new Date(2026, 9, 7, 18, 0)),
    order(new Date(2026, 9, 1, 0, 0)),
    order(new Date(2026, 9, 8, 0, 0, 0, 1)),
    order(new Date(2026, 8, 30, 23, 59)),
  ];
  assert.deepEqual(filterWorkOrders(items, filters).map((item) => item.createdAt), [items[0].createdAt, items[1].createdAt]);
});

test("[LT4] countActiveFilters conta prioridade e período como duas dimensões", () => {
  assert.equal(countActiveFilters(EMPTY_LIST_FILTERS), 0);
  assert.equal(countActiveFilters(listFilters({ priority: "urgent" })), 1);
  assert.equal(countActiveFilters(listFilters({ from: "2026-10-01" })), 1);
  assert.equal(countActiveFilters(listFilters({ to: "2026-10-07" })), 1);
  assert.equal(countActiveFilters(listFilters({ from: "2026-10-01", to: "2026-10-07" })), 1);
  assert.equal(countActiveFilters(listFilters({ priority: "high", from: "2026-10-01", to: "2026-10-07" })), 2);
  assert.equal(countActiveFilters(listFilters({ from: "2026-13-01" })), 0);
});

test("[LT5] atalhos usam aritmética de calendário e são derivados de volta", () => {
  const now = new Date(2026, 2, 31, 10);
  const expected = {
    all: { from: "", to: "" },
    today: { from: "2026-03-31", to: "2026-03-31" },
    "7d": { from: "2026-03-25", to: "" },
    "30d": { from: "2026-03-02", to: "" },
  } as const;
  for (const key of ["all", "today", "7d", "30d"] as const) {
    assert.deepEqual(openingPeriodRange(key, now), expected[key]);
    assert.equal(deriveOpeningPeriod(listFilters(expected[key]), now), key);
  }
  assert.equal(deriveOpeningPeriod(listFilters({ from: "2026-03-01" }), now), "custom");
  assert.equal(localDateString(now), "2026-03-31");
});

test("[LT6] isRangeInverted só marca datas válidas em ordem invertida", () => {
  assert.equal(isRangeInverted(listFilters({ from: "2026-10-08", to: "2026-10-01" })), true);
  assert.equal(isRangeInverted(listFilters({ from: "2026-10-08", to: "2026-10-08" })), false);
  assert.equal(isRangeInverted(listFilters({ from: "2026-10-08" })), false);
});

test("[RL1] rótulos de prioridade e composição do serviço preservam a UI", () => {
  assert.deepEqual(WORK_ORDER_PRIORITY_LABEL, {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  });
  assert.equal(workOrderServiceLine(order(new Date(), { title: "Título", serviceCity: "Cidade", serviceState: "UF" })), "Título · Cidade/UF");
  assert.equal(workOrderServiceLine(order(new Date(), { title: "Título", serviceCity: "Cidade" })), "Título · Cidade");
  assert.equal(workOrderServiceLine(order(new Date(), { title: "Título" })), "Título");
});
