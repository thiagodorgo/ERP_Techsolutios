import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ColumnBars, DayBars, type DayBar } from "../src/components/charts/DayBars";

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
  assert.match(source, /onClick=\{\(\) => onDay\?\.\(date\)\}/);
});

test("DayBars com a janela: todo dia vira coluna e o dia sem bucket fica sem valor nem barra", () => {
  const html = renderToStaticMarkup(<DayBars days={DAYS} rangeDates={["2026-10-27", "2026-10-28", "2026-10-29"]} today="2026-10-29" valueFormat={money} />);
  assert.equal((html.match(/<button/g) ?? []).length, 3);
  assert.match(html, /2 dias retornados pelo servidor/);
  assert.match(html, /28\/10: o servidor não retornou lançamentos neste dia/);
  assert.doesNotMatch(html, /28\/10: 0 lançamentos|R\$ 0\.00 — ver o extrato do dia/);
  const absent = html.slice(html.indexOf("28/10:"), html.indexOf("29/10:"));
  assert.doesNotMatch(absent, /ui-day-bars__bar--/, "dia sem dado não desenha barra");
  assert.match(absent, /ui-day-bars__count">—</);
  assert.match(html, /ui-day-bars__day--today/);
  assert.match(html, /ui-day-bars__weekday">hoje</);
});

test("DayBars com a janela e sem bucket nenhum continua mostrando os dias, sem R$ 0,00", () => {
  const html = renderToStaticMarkup(<DayBars days={[]} rangeDates={["2026-10-28", "2026-10-29"]} valueFormat={money} />);
  assert.equal((html.match(/<button/g) ?? []).length, 2);
  assert.doesNotMatch(html, /R\$/);
});

test("ColumnBars publica o número literal, o rótulo e a coluna pressionada; ausência vira —", () => {
  const html = renderToStaticMarkup(
    <ColumnBars
      ariaLabel="Idade"
      pressedKey="b"
      items={[
        { key: "a", label: "até 2 dias", value: 5, ariaLabel: "5 — filtrar", bars: [{ tone: "age-recent", value: 5 }] },
        { key: "b", label: "3 a 7 dias", value: null, ariaLabel: "indisponível", bars: [{ tone: "age-week", value: null }] },
      ]}
    />,
  );
  assert.match(html, /role="group" aria-label="Idade"/);
  assert.match(html, /ui-column-bars__value">5</);
  assert.match(html, /ui-column-bars__value">—</);
  assert.match(html, /aria-pressed="true" aria-label="indisponível"/);
  assert.equal((html.match(/ui-column-bars__bar--/g) ?? []).length, 1, "faixa sem contagem não desenha barra");
});

test("ColumnBars proporciona as barras pelo maior valor e não recalcula dinheiro", () => {
  const html = renderToStaticMarkup(
    <ColumnBars
      ariaLabel="Meses"
      height={96}
      barHeight={60}
      items={[{ key: "m", label: "out", ariaLabel: "outubro", bars: [{ tone: "inflow", value: 100 }, { tone: "outflow", value: 50 }] }]}
    />,
  );
  assert.match(html, /height:60px/);
  assert.match(html, /height:30px/);
  assert.doesNotMatch(html, /R\$/);
});

test("Gráficos acionáveis têm hover e foco visível na biblioteca", () => {
  const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const has = (selector: string) => css.includes(`${selector} {`) || css.includes(`${selector},`);
  for (const control of [".ui-day-bars__day", ".ui-column-bars__column", ".ui-reconcile-donut__item"]) {
    assert.ok(has(`${control}:hover`), `${control} sem hover`);
    assert.ok(has(`${control}:focus-visible`), `${control} sem foco visível`);
  }
  assert.ok(has('.ui-balance-bridge g[role="button"]:hover .ui-balance-bridge__hit'), "ponte sem hover");
  assert.ok(has('.ui-balance-bridge g[role="button"]:focus-visible .ui-balance-bridge__hit'), "ponte sem foco visível");
});

test("DayBars em 1280 px: o texto do dia encolhe em vez de cortar, como na referência", () => {
  const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 1340px\)[\s\S]*?\.ui-day-bars__count, \.ui-day-bars__pending \{ font-size: 8\.5px; \}/);
});
