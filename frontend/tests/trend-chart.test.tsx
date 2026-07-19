import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { TrendChart } from "../src/components/charts";
import { ClickableKpiCard, KpiDetailModal, type KpiDetail } from "../src/components/kpi";

// WS-UI-CARDS+CHARTS — o <TrendChart> SVG zero-dep e o pop-up de KPI. Testes de estrutura (renderToString).

test("TrendChart barra multi-série: 1 <rect> por ponto por série + role=img + aria", () => {
  const html = renderToString(
    <TrendChart
      type="bar"
      labels={["jan", "fev", "mar"]}
      series={[
        { id: "in", label: "Entradas", values: [10, 20, 30] },
        { id: "out", label: "Saídas", values: [5, 15, 25] },
      ]}
    />,
  );
  const rects = html.match(/<rect/g) ?? [];
  assert.equal(rects.length, 6, "2 séries × 3 pontos = 6 barras");
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="[^"]*tend[êe]ncia/i);
  assert.match(html, /Entradas/); // legenda
});

test("TrendChart linha: usa <path> com non-scaling-stroke (responsivo sem lib)", () => {
  const html = renderToString(<TrendChart type="line" data={[1, 4, 2, 8]} />);
  assert.match(html, /<path/);
  assert.match(html, /non-scaling-stroke/);
});

test("TrendChart série vazia: estado honesto (não fabrica), sem SVG", () => {
  const html = renderToString(<TrendChart data={[]} emptyLabel="Sem lançamentos." />);
  assert.match(html, /Sem lançamentos\./);
  assert.doesNotMatch(html, /<svg/);
});

test("TrendChart valores iguais: não quebra (span guardado) e ainda renderiza", () => {
  const html = renderToString(<TrendChart type="area" data={[5, 5, 5]} />);
  assert.match(html, /<path/); // linha reta, sem divisão por zero
});

test("TrendChart barra com valores NEGATIVOS renderiza (não colapsa) — série com sinal", () => {
  // fluxo líquido: barras acima e abaixo da base zero. height>0 nos dois sentidos (fix da junta).
  const html = renderToString(<TrendChart type="bar" data={[-30, 20, -10]} />);
  const heights = [...html.matchAll(/height="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(heights.every((h) => h >= 0), "sem altura negativa");
  assert.ok(heights.some((h) => h > 0), "as barras negativas têm altura visível (não colapsam a 0)");
});

test("ClickableKpiCard: card vira role=button com aria-haspopup=dialog; modal fechado não aparece", () => {
  const detail: KpiDetail = { title: "A receber", value: "R$ 10", body: { kind: "explain", text: "x" } };
  const html = renderToString(
    <MemoryRouter>
      <ClickableKpiCard detail={detail}>
        <div>conteúdo do card</div>
      </ClickableKpiCard>
    </MemoryRouter>,
  );
  assert.match(html, /role="button"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /conteúdo do card/);
  assert.doesNotMatch(html, /role="dialog"/); // fechado por default
});

test("KpiDetailModal breakdown: role=dialog + aria-modal + partes reais (sem fabricar série)", () => {
  const detail: KpiDetail = {
    title: "A receber (aberto)",
    value: "R$ 100,00",
    source: "api",
    body: { kind: "breakdown", parts: [{ label: "Vencido", value: "R$ 40,00", tone: "danger" }, { label: "Em aberto", value: "R$ 60,00" }] },
    cta: { label: "Ver cobranças", to: "/finance/charges" },
  };
  const html = renderToString(
    <MemoryRouter>
      <KpiDetailModal detail={detail} open onClose={() => {}} />
    </MemoryRouter>,
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Vencido/);
  assert.match(html, /Ver cobranças/);
});

test("KpiDetailModal fonte mock: suprime gráfico e mostra selo de honestidade", () => {
  const detail: KpiDetail = {
    title: "OS por dia",
    value: "12",
    source: "mock",
    body: { kind: "chart", series: [{ id: "s", label: "OS", values: [1, 2, 3] }] },
  };
  const html = renderToString(
    <MemoryRouter>
      <KpiDetailModal detail={detail} open onClose={() => {}} />
    </MemoryRouter>,
  );
  assert.match(html, /Dados de exemplo/); // selo
  // gráfico suprimido em fonte não-confiável: o viewBox do TrendChart não aparece (o <svg> do ícone X, sim).
  assert.doesNotMatch(html, /viewBox="0 0 100 40"/);
  assert.match(html, /indispon[íi]vel/i);
});
