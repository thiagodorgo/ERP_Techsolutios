import assert from "node:assert/strict";
import test from "node:test";

import { buildCsv } from "../src/lib/csv";
import { filterWorkOrders } from "../src/modules/work-orders/work-orders.adapter";
import {
  exportAvailability,
  formatAgendaForExport,
  neutralizeCsvFormula,
  workOrdersCsvFilename,
  workOrdersCsvRows,
  WORK_ORDERS_CSV_HEADER,
} from "../src/modules/work-orders/work-orders-export";
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

test("[EX1] cabeçalho CSV tem exatamente as oito colunas visíveis", () => {
  assert.deepEqual(WORK_ORDERS_CSV_HEADER, [
    "Código",
    "Prioridade",
    "Cliente",
    "Serviço",
    "Técnico",
    "Agenda",
    "Atrasada",
    "Situação",
  ]);
});

test("[EX2] linhas CSV traduzem os quatro cenários sem expor ids técnicos", () => {
  const now = new Date(2026, 9, 7, 12, 0).getTime();
  const agenda = new Date(2026, 9, 7, 9, 5).toISOString();
  const items = [
    order(new Date(2026, 9, 1), {
      code: "OS-1",
      priority: "medium",
      customerName: "Atlas",
      assignedOperatorId: "operador-secreto",
      scheduledFor: agenda,
    }),
    order(new Date(2026, 9, 2), {
      code: "OS-2",
      priority: "low",
      customerName: null,
      assignedOperatorId: null,
      scheduledFor: null,
    }),
    order(new Date(2026, 9, 3), {
      code: "OS-3",
      status: "completed",
      scheduledFor: agenda,
    }),
    order(new Date(2026, 9, 4), {
      code: "OS-4",
      status: "assigned",
      scheduledFor: new Date(2026, 9, 8, 9, 5).toISOString(),
    }),
  ];

  assert.deepEqual(workOrdersCsvRows(items, now), [
    ["OS-1", "Média", "Atlas", "Reboque", "Atribuído", "07/10/2026 09:05", "Sim", "Aberta"],
    ["OS-2", "Baixa", "Sem cliente vinculado", "Reboque", "Sem técnico", "Sem agenda", "Não", "Aberta"],
    ["OS-3", "Alta", "Sem cliente vinculado", "Reboque", "Sem técnico", "07/10/2026 09:05", "Não", "Concluída"],
    ["OS-4", "Alta", "Sem cliente vinculado", "Reboque", "Sem técnico", "08/10/2026 09:05", "Não", "Atribuída"],
  ]);
});

test("[EX3] allowlist CSV exclui ids, localização, endereço e telefone", () => {
  const item = order(new Date(2026, 9, 7), {
    id: "11111111-1111-4111-8111-111111111111",
    assignedOperatorId: "22222222-2222-4222-8222-222222222222",
    assignedUserId: "33333333-3333-4333-8333-333333333333",
    vehicleId: "44444444-4444-4444-8444-444444444444",
    serviceAddress: "Rua Segredo 123",
    serviceLatitude: -19.91,
    serviceLongitude: -43.94,
    customerPhone: "+5531999999999",
  });
  const csv = buildCsv(WORK_ORDERS_CSV_HEADER, workOrdersCsvRows([item], Date.now()));
  for (const forbidden of [
    item.id,
    item.assignedOperatorId ?? "",
    item.assignedUserId ?? "",
    item.vehicleId ?? "",
    item.serviceAddress ?? "",
    String(item.serviceLatitude),
    String(item.serviceLongitude),
    item.customerPhone ?? "",
  ]) {
    assert.ok(forbidden);
    assert.doesNotMatch(csv, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const cell of workOrdersCsvRows([item], Date.now())[0]) {
    assert.doesNotMatch(cell, /^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  }
});

test("[EX4] fórmula CSV é neutralizada em toda célula de dado livre", () => {
  for (const risky of ["=1+1", "+55319999", "-x", "@SUM", "\tx", "\rx"]) {
    assert.equal(neutralizeCsvFormula(risky), `'${risky}`);
  }
  for (const safe of ["Cliente", "", "a=b"]) assert.equal(neutralizeCsvFormula(safe), safe);

  const [rowWithFormula] = workOrdersCsvRows([
    order(new Date(2026, 9, 7), { customerName: '=HYPERLINK("x")' }),
  ], Date.now());
  assert.match(rowWithFormula[2], /^'/);
});

test("[EX5] agenda do CSV é absoluta, local e tem zeros à esquerda", () => {
  assert.equal(formatAgendaForExport(null), "Sem agenda");
  assert.equal(formatAgendaForExport("lixo"), "—");
  assert.equal(formatAgendaForExport(new Date(2026, 9, 7, 9, 5).toISOString()), "07/10/2026 09:05");
});

test("[EX6] disponibilidade do Exportar respeita prioridade e dicas exatas", () => {
  const base = { loading: false, failure: false, total: 2, stale: false, demo: false, loaded: 2, serverTotal: 2 };
  assert.deepEqual(exportAvailability({ ...base, loading: true }), { enabled: false, hint: "Aguarde: a lista ainda está carregando." });
  assert.deepEqual(exportAvailability({ ...base, failure: true }), { enabled: false, hint: "Nada para exportar: a lista não carregou." });
  assert.deepEqual(exportAvailability({ ...base, total: 0 }), { enabled: false, hint: "Nenhuma ordem na lista para exportar." });
  assert.deepEqual(exportAvailability({ ...base, total: 1 }), { enabled: true, hint: "Baixar a ordem da lista em planilha (CSV)." });
  assert.deepEqual(exportAvailability(base), { enabled: true, hint: "Baixar as 2 ordens da lista em planilha (CSV)." });
  assert.deepEqual(exportAvailability({ ...base, loaded: 2, serverTotal: 25 }), {
    enabled: true,
    hint: "Baixar as 2 ordens da lista em planilha (CSV). A tela mostra as 2 ordens mais recentes de 25; o arquivo leva só as da tela.",
  });
  assert.deepEqual(exportAvailability({ ...base, stale: true, demo: true }), {
    enabled: true,
    hint: "Baixar as 2 ordens da lista em planilha (CSV). Atenção: a última atualização falhou; os dados podem estar desatualizados. Dados demonstrativos.",
  });
});

test("[EX7] nome do arquivo distingue dados demonstrativos", () => {
  assert.equal(workOrdersCsvFilename("api"), "ordens-de-servico.csv");
  assert.equal(workOrdersCsvFilename("fallback"), "ordens-de-servico.csv");
  assert.equal(workOrdersCsvFilename("mock"), "ordens-de-servico-demonstrativo.csv");
});

test("[EX8] lista vazia não fabrica linha de CSV", () => {
  assert.deepEqual(workOrdersCsvRows([], Date.now()), []);
});
