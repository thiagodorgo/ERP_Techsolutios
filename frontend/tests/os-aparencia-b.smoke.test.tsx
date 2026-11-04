import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { CategoryDonut } from "../src/components/charts";
import { WorkOrdersViewB } from "../src/modules/work-orders/pages/views/WorkOrdersViewB";
import { buildOsModel, detailRows, headers, kpiValues, pressedButtons, rowKeys, visibleText } from "./helpers/os-aparencias.fixture";

// B-APAR-OS — APARÊNCIA B "Analítica" (referência aprovada `screen-refs/ordens-de-servico-3opcoes.reference.html`,
// `montarB`/`analiticoB`), SSR com as 24 OS e o relógio da referência. Os números esperados foram contados À MÃO a partir
// da tabela `RAW` da referência (não pela função da tela): SLA vencido = 102, 109, 114; vencem em até 1 h = 101, 107, 108,
// 113, 119, 122, 123; agenda: 6 atrasadas · 7 nas próximas 2 h · 1 ainda hoje · 2 amanhã em diante · 1 sem agenda;
// abertas por prioridade: 4 urgente · 4 alta · 7 média · 2 baixa; sem técnico 5; sem cliente (abertas) 2.

const render = (overrides = {}) => renderToString(<WorkOrdersViewB {...buildOsModel(overrides).model} />);
const filterButtons = (html: string) => pressedButtons(html).filter((button) => / — filtrar a lista$/.test(button.label));
const labelOf = (html: string, prefix: string) => filterButtons(html).find((button) => button.label.startsWith(prefix))?.label ?? "";

test("[B1] estrutura: raiz data-aparencia=B, cabeçalho OPERAÇÃO · VISÃO ANALÍTICA, 5 indicadores, colunas com PRIORIDADE e SLA", () => {
  const html = render();
  assert.match(html, /data-aparencia="B"/);
  assert.match(html, /pat-page-header__kicker">OPERAÇÃO · VISÃO ANALÍTICA</);
  assert.deepEqual(kpiValues(html), ["17", "7", "6", "3", "5"], "abertas · em andamento · atrasadas · SLA vencido · concluídas");
  assert.deepEqual(headers(html), ["CÓDIGO", "CLIENTE / SERVIÇO", "PRIORIDADE", "SLA", "AGENDA", "SITUAÇÃO"]);
  assert.match(html, />7 vencem em 1 h</);
  assert.match(visibleText(html), /Situação das OS[\s\S]*Agenda das OS na fila[\s\S]*Prioridade das OS abertas/);
});

test("[B2] SLA: só conta OS com prazo; OS sem prazo é 'Sem prazo', nunca 'no prazo'", () => {
  const html = render();
  const row104 = /data-row-key="os-104"[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
  assert.match(row104, />Sem prazo</, "104 está em atendimento e não tem política de SLA");
  assert.doesNotMatch(row104, /no prazo|Vence em/i);
  const row109 = /data-row-key="os-109"[\s\S]*?<\/tr>/.exec(render({ state: { tab: "todas", target: "sla-vencido", q: "", openId: null } }))?.[0] ?? "";
  assert.match(row109, />Vencido há 30 min</);
  assert.deepEqual(rowKeys(render({ state: { tab: "todas", target: "sla-vencido", q: "", openId: null } })).sort(), ["os-102", "os-109", "os-114"]);
  const finished = /data-row-key="os-105"[\s\S]*?<\/tr>/.exec(render({ state: { tab: "concluidas", target: null, q: "", openId: null } }))?.[0] ?? "";
  assert.match(finished, /color:#94A3B8;font-weight:700;font-size:12px">—</, "finalizada não tem prazo a vencer");
});

test("[B3] faixa analítica: barras, colunas e rosca contam a lista INTEIRA, e cada uma filtra a mesma quantidade de linhas", () => {
  const whole = render();
  assert.equal(labelOf(whole, "Aberta:"), "Aberta: 5 — filtrar a lista");
  assert.equal(labelOf(whole, "Atrasadas: 6"), "Atrasadas: 6 — filtrar a lista");
  assert.equal(labelOf(whole, "Próximas 2 h:"), "Próximas 2 h: 7 — filtrar a lista");
  assert.equal(labelOf(whole, "Ainda hoje:"), "Ainda hoje: 1 — filtrar a lista");
  assert.equal(labelOf(whole, "Amanhã em diante:"), "Amanhã em diante: 2 — filtrar a lista");
  assert.equal(labelOf(whole, "Sem agenda:"), "Sem agenda: 1 — filtrar a lista");
  assert.equal(labelOf(whole, "Prioridade Urgente"), "Prioridade Urgente (abertas): 4 — filtrar a lista");
  assert.equal(labelOf(whole, "Prioridade Média"), "Prioridade Média (abertas): 7 — filtrar a lista");
  assert.equal(labelOf(whole, "OS sem técnico:"), "OS sem técnico: 5 — filtrar a lista");
  assert.equal(labelOf(whole, "Sem cliente vinculado:"), "Sem cliente vinculado: 2 — filtrar a lista");
  // o número da barra é o número de linhas que ela filtra
  const cases: readonly [string, number][] = [["st-open", 5], ["ag-prox2h", 7], ["ag-depois", 2], ["pr-urgent", 4], ["sem-cliente", 2]];
  for (const [target, n] of cases) {
    assert.equal(rowKeys(render({ state: { tab: "todas", target, q: "", openId: null } })).length, n, `alvo ${target}`);
  }
  // com um filtro aplicado, os gráficos continuam sobre a lista inteira (não sobre as linhas filtradas)
  const filtered = render({ state: { tab: "todas", target: "atrasadas", q: "", openId: null } });
  assert.equal(labelOf(filtered, "Aberta:"), "Aberta: 5 — filtrar a lista");
  assert.equal(filterButtons(filtered).filter((button) => button.pressed).map((button) => button.label).join(), "Atrasadas: 6 — filtrar a lista");
});

test("[B4] o resumo traz o prazo de SLA; um resumo por vez", () => {
  const html = render({ expandedId: "os-114" });
  assert.equal(detailRows(html), 1);
  assert.match(visibleText(html), /Prazo de SLA\s*:\s*Vencido há 15 min/);
});

test("[B5] honestidade: com mais OS no servidor, a faixa e os indicadores dizem o universo", () => {
  const html = render({ partial: true, loaded: 24, serverTotal: 90 });
  assert.match(visibleText(html), /Contagens nas 24 carregadas · 90 no servidor/);
  assert.match(html, /aria-label="Aberta: 5 \(nas 24 carregadas · 90 no servidor\) — filtrar a lista"/);
  assert.match(html, /<small>nas 24 carregadas · 90 no servidor<\/small>/);
});

test("[B6] estados §7: erro/sem permissão sem faixa analítica e com '—'; carregando sem dígito; desatualizado mantém a faixa", () => {
  const error = render({ status: "error", items: [], loaded: 0, serverTotal: 0, error: "Falhou." });
  assert.deepEqual(kpiValues(error), ["—", "—", "—", "—", "—"]);
  assert.doesNotMatch(error, /Situação das OS/);
  assert.match(error, /data-state="error"/);
  const forbidden = render({ status: "forbidden", items: [], loaded: 0, serverTotal: 0 });
  assert.match(forbidden, /data-state="forbidden"/);
  assert.equal(filterButtons(forbidden).length, 0);
  const loading = render({ loading: true, status: "loading", items: [], loaded: 0, serverTotal: 0 });
  assert.equal(kpiValues(loading).length, 0);
  assert.doesNotMatch(loading, /Situação das OS/);
  const stale = render({ stale: true, lastUpdatedAt: new Date(2026, 9, 14, 9, 41).toISOString() });
  assert.match(stale, /data-state="stale"/);
  assert.match(stale, /Situação das OS/);
  const empty = render({ status: "empty", items: [], loaded: 0, serverTotal: 0 });
  assert.match(empty, /data-state="empty"/);
  assert.doesNotMatch(empty, /Situação das OS/, "sem OS não há faixa (referência: `if (!arr.length) return ''`)");
});

test("[B7] CategoryDonut: contagem inválida vira 'indisponível', nunca zero; segmento filtra com aria-pressed", () => {
  const ok = renderToString(
    <CategoryDonut ariaLabel="x" centerValue={3} centerLabel="abertas" pressedKey="b" segments={[{ key: "a", label: "Alta", count: 1, color: "#f00" }, { key: "b", label: "Baixa", count: 2, color: "#0f0" }]} />,
  );
  assert.match(ok, /aria-pressed="true" aria-label="Baixa: 2 — filtrar a lista"/);
  assert.match(ok, /aria-pressed="false" aria-label="Alta: 1 — filtrar a lista"/);
  assert.equal((ok.match(/<circle/g) ?? []).length, 3, "trilho + 2 segmentos");
  const bad = renderToString(<CategoryDonut ariaLabel="x" centerValue={null} centerLabel="abertas" segments={[{ key: "a", label: "Alta", count: null, color: "#f00" }]} />);
  assert.match(bad, /Contagem indisponível/);
  assert.doesNotMatch(bad, />0</);
  const many = renderToString(<CategoryDonut ariaLabel="x" centerValue={1} centerLabel="" segments={Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, label: `c${i}`, count: 1, color: "#000" }))} />);
  assert.match(many, /Contagem indisponível/, "mais de 5 categorias não é desenhado");
});
