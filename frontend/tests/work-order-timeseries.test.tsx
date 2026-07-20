import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { TrendChart } from "../src/components/charts";
import { normalizeTimeseriesPoints } from "../src/modules/dashboard/work-order-timeseries.adapter";
import { getWorkOrderTimeseries } from "../src/modules/dashboard/work-order-timeseries.service";

// WS-CARDS-CHARTS-F2 — gráfico temporal de volume de OS no Dashboard consumindo
// GET /operations/work-orders-timeseries (#245). Prova: normalização defensiva (D-007), modo mock honesto,
// gate RBAC 403 → forbidden, e o render multi-série do TrendChart com a legenda de negócio.

// Shim NÃO-destrutivo de window.localStorage: o client lê getStoredToken() no caminho real de API.
const g = globalThis as unknown as { window?: { localStorage?: unknown; dispatchEvent?: unknown } };
g.window ??= {};
g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
g.window.dispatchEvent ??= () => true;

test("normalizeTimeseriesPoints: descarta item sem date; número inválido/negativo/NaN → 0 (D-007, não fabrica)", () => {
  const points = normalizeTimeseriesPoints([
    { date: "2026-07-01", created: 3, completed: 2, cancelled: 1 },
    { created: 9, completed: 9, cancelled: 9 }, // sem `date` → descartado
    { date: "2026-07-02", created: "x", completed: -4, cancelled: Number.NaN }, // inválidos → 0
    "lixo", // não-objeto → descartado
  ]);

  assert.equal(points.length, 2);
  assert.deepEqual(points[0], { date: "2026-07-01", created: 3, completed: 2, cancelled: 1 });
  assert.deepEqual(points[1], { date: "2026-07-02", created: 0, completed: 0, cancelled: 0 });
});

test("normalizeTimeseriesPoints: entrada não-array → série vazia (nunca quebra)", () => {
  assert.deepEqual(normalizeTimeseriesPoints(undefined), []);
  assert.deepEqual(normalizeTimeseriesPoints(null), []);
  assert.deepEqual(normalizeTimeseriesPoints({}), []);
});

test("getWorkOrderTimeseries em modo mock: source 'mock', série vazia (não fabrica)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const data = await getWorkOrderTimeseries({});
    assert.equal(data.source, "mock");
    assert.equal(data.points.length, 0);
    assert.equal(data.forbidden, false);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("getWorkOrderTimeseries com 403: forbidden=true, source 'fallback' (gate work_orders:read)", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const data = await getWorkOrderTimeseries({});
    assert.equal(data.forbidden, true);
    assert.equal(data.source, "fallback");
    assert.equal(data.points.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("TrendChart 3 séries (Abertas/Concluídas/Canceladas): 1 <path> por série + legenda de negócio", () => {
  const html = renderToString(
    <TrendChart
      showLegend
      labels={["01/07", "02/07", "03/07"]}
      series={[
        { id: "created", label: "Abertas", tone: "info", values: [3, 5, 2] },
        { id: "completed", label: "Concluídas", tone: "success", values: [1, 4, 3] },
        { id: "cancelled", label: "Canceladas", tone: "danger", values: [0, 1, 0] },
      ]}
    />,
  );

  const paths = html.match(/<path/g) ?? [];
  assert.equal(paths.length, 3, "3 séries de linha = 3 <path>");
  assert.match(html, /Abertas/);
  assert.match(html, /Concluídas/);
  assert.match(html, /Canceladas/);
  assert.match(html, /role="img"/);
});
