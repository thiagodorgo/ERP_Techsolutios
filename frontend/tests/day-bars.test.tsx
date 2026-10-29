import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DayBars, type DayBar } from "../src/components/charts/DayBars";

const money = (value: number) => `R$ ${value.toFixed(2)}`;
const DAYS: DayBar[] = [
  { date: "2026-10-27", inflow: 120, outflow: 45, count: 3, pendingCount: 2 },
  { date: "2026-10-29", inflow: 0, outflow: 70, count: 1, pendingCount: 0 },
];

test("DayBars publica valores e contagens literais do agregado diário", () => {
  const html = renderToStaticMarkup(<DayBars days={DAYS} valueFormat={money} />);
  assert.match(html, /27\/10: 3 lançamentos, entradas R\$ 120\.00, saídas R\$ 45\.00, 2 a conciliar/);
  assert.match(html, /29\/10: 1 lançamentos, entradas R\$ 0\.00, saídas R\$ 70\.00, 0 a conciliar/);
});

test("DayBars não inventa o dia ausente nem completa a série com zero", () => {
  const html = renderToStaticMarkup(<DayBars days={DAYS} valueFormat={money} />);
  assert.match(html, /2 dias retornados pelo servidor/);
  assert.doesNotMatch(html, /2026-10-28|28\/10/);
});

test("DayBars mantém zero explícito como dado legítimo", () => {
  const html = renderToStaticMarkup(<DayBars days={[{ date: "2026-10-29", inflow: 0, outflow: 0, count: 0, pendingCount: 0 }]} valueFormat={money} />);
  assert.match(html, /entradas R\$ 0\.00, saídas R\$ 0\.00, 0 a conciliar/);
  assert.doesNotMatch(html, /indisponível/);
});

test("DayBars distingue agregado ausente de período vazio", () => {
  assert.match(renderToStaticMarkup(<DayBars days={null} valueFormat={money} />), /Movimento diário indisponível/);
  assert.match(renderToStaticMarkup(<DayBars days={[]} valueFormat={money} />), /Nenhum dia foi retornado/);
});

test("DayBars oferece filtro de dia acessível, pressionado e acionável", () => {
  const html = renderToStaticMarkup(<DayBars days={DAYS} pressedDate="2026-10-27" onDay={() => undefined} valueFormat={money} />);
  assert.match(html, /aria-pressed="true"/);
  assert.equal((html.match(/<button/g) ?? []).length, 2);
  const source = readFileSync(new URL("../src/components/charts/DayBars.tsx", import.meta.url), "utf8");
  assert.match(source, /onClick=\{\(\) => onDay\?\.\(day\.date\)\}/);
});
