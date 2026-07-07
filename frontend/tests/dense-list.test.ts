import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DENSE_LIST_FETCH_LIMIT,
  buildDenseListSearchParams,
  paginate,
  parseDenseListSearchParams,
  sortItems,
} from "../src/components/dense-list/logic";
import type { DenseColumn, DenseListConfig } from "../src/components/dense-list/types";

type Row = { readonly id: string; readonly name: string; readonly price: number | null };

const columns: DenseColumn<Row>[] = [
  { key: "name", header: "Nome", render: (r) => r.name, sortable: true, sortValue: (r) => r.name },
  { key: "price", header: "Preço", render: (r) => r.price, sortable: true, tabular: true, align: "right", sortValue: (r) => r.price },
  { key: "actions", header: "Ações", render: () => null },
];

const config: DenseListConfig = {
  sortableKeys: ["name", "price"],
  defaultSort: { key: "name", dir: "asc" },
  defaultPageSize: 20,
  pageSizeOptions: [20, 50, 100],
};

const rows: Row[] = [
  { id: "a", name: "Bravo", price: 30 },
  { id: "b", name: "alfa", price: null },
  { id: "c", name: "Charlie", price: 10 },
];

test("sortItems: nome asc via localeCompare pt-BR (case-insensitive)", () => {
  assert.deepEqual(
    sortItems(rows, columns, { key: "name", dir: "asc" }).map((r) => r.id),
    ["b", "a", "c"],
  );
});

test("sortItems: desc inverte a ordem", () => {
  assert.deepEqual(
    sortItems(rows, columns, { key: "name", dir: "desc" }).map((r) => r.id),
    ["c", "a", "b"],
  );
});

test("sortItems: numérico com valores vazios sempre ao fim (independe da direção)", () => {
  assert.deepEqual(sortItems(rows, columns, { key: "price", dir: "asc" }).map((r) => r.id), ["c", "a", "b"]);
  assert.deepEqual(sortItems(rows, columns, { key: "price", dir: "desc" }).map((r) => r.id), ["a", "c", "b"]);
});

test("sortItems: coluna não-sortable ou sort null → ordem original preservada", () => {
  assert.deepEqual(sortItems(rows, columns, { key: "actions", dir: "asc" }).map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(sortItems(rows, columns, null).map((r) => r.id), ["a", "b", "c"]);
});

test("paginate: fatia, totais, clamp e caso vazio", () => {
  const items = Array.from({ length: 45 }, (_, i) => i);
  const p1 = paginate(items, 1, 20);
  assert.equal(p1.slice.length, 20);
  assert.equal(p1.total, 45);
  assert.equal(p1.totalPages, 3);
  assert.equal(p1.pageStart, 1);
  assert.equal(p1.pageEnd, 20);

  const p3 = paginate(items, 3, 20);
  assert.equal(p3.slice.length, 5);
  assert.equal(p3.pageEnd, 45);

  assert.equal(paginate(items, 99, 20).page, 3); // clamp acima do total

  const empty = paginate([], 1, 20);
  assert.equal(empty.total, 0);
  assert.equal(empty.pageStart, 0);
  assert.equal(empty.totalPages, 1);
});

test("parseDenseListSearchParams: defaults quando URL vazia", () => {
  const s = parseDenseListSearchParams(new URLSearchParams(), config);
  assert.equal(s.search, "");
  assert.equal(s.status, "all");
  assert.deepEqual(s.sort, { key: "name", dir: "asc" });
  assert.equal(s.page, 1);
  assert.equal(s.pageSize, 20);
});

test("parseDenseListSearchParams: lê params válidos e ignora inválidos", () => {
  const ok = parseDenseListSearchParams(new URLSearchParams("q=abc&status=inactive&sort=price&dir=desc&page=2&size=50"), config);
  assert.equal(ok.search, "abc");
  assert.equal(ok.status, "inactive");
  assert.deepEqual(ok.sort, { key: "price", dir: "desc" });
  assert.equal(ok.page, 2);
  assert.equal(ok.pageSize, 50);

  const bad = parseDenseListSearchParams(new URLSearchParams("sort=nope&status=weird&size=7&page=0"), config);
  assert.deepEqual(bad.sort, config.defaultSort);
  assert.equal(bad.status, "all");
  assert.equal(bad.pageSize, 20);
  assert.equal(bad.page, 1);
});

test("buildDenseListSearchParams: grava só não-default e faz round-trip", () => {
  const def = buildDenseListSearchParams({ search: "", status: "all", sort: config.defaultSort, page: 1, pageSize: 20 }, config);
  assert.equal(def.toString(), "");

  const custom = buildDenseListSearchParams(
    { search: "joão", status: "inactive", sort: { key: "price", dir: "desc" }, page: 3, pageSize: 50 },
    config,
  );
  const round = parseDenseListSearchParams(custom, config);
  assert.equal(round.search, "joão");
  assert.equal(round.status, "inactive");
  assert.deepEqual(round.sort, { key: "price", dir: "desc" });
  assert.equal(round.page, 3);
  assert.equal(round.pageSize, 50);
});

test("DENSE_LIST_FETCH_LIMIT: janela de 100 (limite do backend existente)", () => {
  assert.equal(DENSE_LIST_FETCH_LIMIT, 100);
});
