import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8");
const b = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
const c = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewC.tsx", import.meta.url), "utf8");

test("13A: B/C têm grades escopadas e colapso nas três larguras-alvo", () => {
  for (const width of [1280, 1366, 1440]) assert.ok(width >= 1100, `viewport ${width} mantém a grade larga`);
  assert.match(css, /\.financeiro-b__analytics\{display:grid;grid-template-columns:minmax\(0,1\.2fr\) minmax\(320px,\.8fr\)/);
  assert.match(css, /\.financeiro-c__grid\{display:grid;grid-template-columns:minmax\(0,1\.5fr\) minmax\(280px,\.5fr\)/);
  assert.match(css, /@media\(max-width:1100px\)\{\.financeiro-c__grid\{grid-template-columns:1fr\}\}/);
});

test("13A: linhas continuam em uma altura e dinheiro é tabular", () => {
  assert.match(css, /\.pat-ab-row \{ height: 40px;/);
  assert.match(css, /\.pat-ab-row td \{[^}]*height: 40px;[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/);
  assert.match(css, /\.dense-col-tabular[^}]*font-variant-numeric: tabular-nums/);
  assert.match(b, /dense-col-tabular/);
  assert.match(c, /dense-col-tabular/);
});

test("13A: gráficos e filtros mantêm rótulos acessíveis sem depender só de cor", () => {
  assert.match(b, /aria-label={`Conta em foco:/);
  assert.match(c, /aria-label="Etapas da conferência"/);
  assert.match(c, /aria-label="Conferência individual"/);
  assert.match(c, /DayBars days=\{days\}/);
});
