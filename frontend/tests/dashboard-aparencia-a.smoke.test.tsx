import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { buildDashboardKpiDetail, mapDashboardSource } from "../src/modules/dashboard/dashboard-kpi-detail";
import { seriesAsTimeseries } from "../src/modules/dashboard/views/dashboard.shared";
import { DashboardViewA } from "../src/modules/dashboard/views/DashboardViewA";
import { buildDashModel, detailRows, GESTOR, pressedButtons, rowKeys, section, SUPORTE, visibleText } from "./helpers/dashboard-aparencias.fixture";

// B-APAR-DASH — APARÊNCIA A "Padrão fiel" (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`, `renderA`),
// em SSR com os dados e o relógio da referência (14/10/2026 09:40). Prende (plano §2.4): os 5 cartões acionáveis
// (`aria-pressed`) que abrem o detalhe do cartão num PAINEL (o texto de `buildDashboardKpiDetail`) e filtram a fila nas OS
// críticas; a fila com as 8 que o servidor manda (não 4), em linha de uma altura sem botão; "Abrir OS" só com
// `work_orders:read`; o 403 de despachos DENTRO do bloco; os 5 estados §7; a honestidade (erro nunca vira número; o filtro
// diz o universo) e a linguagem (§3, §11).

const render = (overrides = {}, permissions: readonly string[] = GESTOR) => renderToString(<DashboardViewA {...buildDashModel(overrides, permissions).model} />);
const cards = (html: string) => pressedButtons(html).filter((button) => / — ver detalhes$/.test(button.label) && !/^(Clientes|Viaturas|Equipes|Serviços):/.test(button.label));

test("[DA1] estrutura: raiz A, cabeçalho VISÃO GERAL com as ações à direita, 5 cartões acionáveis com os números da referência e a faixa CADASTROS", () => {
  const html = render();
  assert.match(html, /^<div data-aparencia="A"/);
  assert.match(html, /pat-page-header__kicker">VISÃO GERAL</);
  assert.match(html, /<h1 class="pat-page-header__title">Bom dia, Mariana<\/h1>/);
  assert.match(html, /Operação, SLA e cadastros · Guincho Exemplo Ltda · quarta, 14 de outubro/);
  assert.match(html, /pat-page-header__actions[\s\S]*Mapa operacional[\s\S]*Nova OS/);
  assert.deepEqual(
    cards(html).map((card) => card.label),
    ["OS abertas: 18 — ver detalhes", "Em andamento: 17 — ver detalhes", "Atrasadas: 4 — ver detalhes", "OS hoje: 14 — ver detalhes", "Concluídas: 412 — ver detalhes"],
  );
  assert.ok(cards(html).every((card) => card.pressed === false), "nada pressionado sem escolha");
  assert.match(html, /style="border-color:#FCA5A5" aria-label="Atrasadas: 4/, "Atrasadas com a borda de risco");
  assert.match(html, /pat-kpi__tag" style="background:#FEE2E2;color:#B91C1C">agir agora</);
  assert.match(html, /pat-kpi__tag" style="background:#F1F5F9;color:#475569">em fila</, "OS abertas fica com o selo neutro (o agregado não conta 'sem técnico')");
  assert.match(html, /CADASTROS/);
  for (const label of ["Clientes: 186", "Viaturas: 23", "Equipes: 7", "Serviços: 34"]) assert.match(html, new RegExp(`aria-pressed="false" aria-label="${label} — ver detalhes"`));
  assert.match(html, />Gerenciar cadastros</);
});

test("[DA2] o cartão abre o detalhe num PAINEL (o texto de buildDashboardKpiDetail) e filtra a fila nas OS críticas, dizendo o universo", () => {
  const { model } = buildDashModel({ state: { cartao: "open" } });
  const html = renderToString(<DashboardViewA {...model} />);
  assert.deepEqual(cards(html).filter((card) => card.pressed).map((card) => card.label), ["OS abertas: 18 — ver detalhes"]);
  const kpi = model.summary.kpis.find((entry) => entry.id === "open")!;
  const detail = buildDashboardKpiDetail(kpi, mapDashboardSource(model.summary.source), seriesAsTimeseries(model), model.access.can);
  assert.equal(detail.body.kind, "explain");
  assert.match(html, /<section class="apardash-panel" aria-label="Detalhes de OS abertas" data-cartao="open">/);
  assert.ok(html.includes(detail.body.kind === "explain" ? detail.body.text : "§"), "o texto do painel é o de buildDashboardKpiDetail");
  assert.doesNotMatch(html, /role="dialog"/, "o detalhe do cartão não é pop-up");
  assert.match(html, /A fila “Exige ação agora” está filtrada por este indicador \(nas 8 OS críticas\)\./);
  assert.match(html, /Filtro: OS abertas/);
  assert.deepEqual(rowKeys(section(html, "Exige ação agora")), ["crit:OS-2026-0418", "crit:OS-2026-0409", "crit:OS-2026-0421", "crit:OS-2026-0423", "crit:OS-2026-0425", "crit:OS-2026-0426"]);
  assert.match(visibleText(html), /Fila crítica por prioridade e agenda · 6 de 8 OS críticas/);
});

test("[DA3] a fila 'Exige ação agora' tem as 8 OS críticas do servidor (não 4), pela agenda, em linha de uma altura SEM botão", () => {
  const html = render();
  const fila = section(html, "Exige ação agora");
  assert.deepEqual(rowKeys(fila), [
    "crit:OS-2026-0418",
    "crit:OS-2026-0415",
    "crit:OS-2026-0409",
    "crit:OS-2026-0421",
    "crit:OS-2026-0423",
    "crit:OS-2026-0425",
    "crit:OS-2026-0426",
    "crit:OS-2026-0427",
  ]);
  for (const row of fila.match(/<tr class="pat-ab-row"[\s\S]*?<\/tr>/g) ?? []) assert.doesNotMatch(row, /<button/, "a linha não tem botão (D-PADRAO-BLOCOS-CLICAVEIS)");
  assert.equal(detailRows(html), 0, "nada aberto sem escolha");
  assert.doesNotMatch(html, /wo-0418/, "o id interno da OS nunca vai ao HTML (a chave é o código)");
});

test("[DA4] a linha abre o detalhe embaixo, um por vez; 'Abrir OS' só com work_orders:read (Suporte vê a nota, sem botão morto)", () => {
  const gestor = render({ state: { linha: "crit:OS-2026-0418" } });
  assert.equal(detailRows(gestor), 1, "um detalhe por vez");
  assert.match(gestor, /aria-expanded="true" data-row-key="crit:OS-2026-0418"/);
  const detail = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(gestor)?.[0] ?? "";
  assert.match(detail, />Abrir OS</);
  assert.match(detail, />Abrir mapa</);
  assert.match(detail, /14\/10 07:30 · vencida há 2 h/);
  const suporte = render({ state: { linha: "crit:OS-2026-0418" } }, SUPORTE);
  const detailSup = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(suporte)?.[0] ?? "";
  assert.doesNotMatch(detailSup, /Abrir OS/);
  assert.match(detailSup, /Seu perfil vê esta OS no painel, mas não abre ordens de serviço\./);
  assert.doesNotMatch(suporte, />Ver todas</, "sem work_orders:read nada leva à lista de OS");
  assert.doesNotMatch(suporte, />Nova OS</);
});

test("[DA5] o 403 de despachos e o de localização viram 'Acesso não permitido' DENTRO do bloco (não a faixa genérica de hoje)", () => {
  const html = render({}, ["dashboard:read", "work_orders:read"]);
  assert.match(section(html, "Despachos ativos"), /data-state="forbidden"[\s\S]*Acesso não permitido\.[\s\S]*Seu perfil não acompanha despachos\./);
  assert.match(section(html, "Status de campo"), /data-state="forbidden"[\s\S]*Acesso não permitido\.[\s\S]*Seu perfil não vê a localização dos operadores\./);
  assert.doesNotMatch(html, /pat-banner--warning/);
  assert.doesNotMatch(html, /Alguns dados de campo estão indisponíveis/);
  assert.doesNotMatch(section(html, "Despachos ativos"), />Ver despachos</);
  assert.doesNotMatch(html, />Mapa operacional</, "sem localização, sem atalho para o mapa");
});

test("[DA6] estados §7: carregando sem número · vazio com e sem filtro · erro com 'Tentar novamente' · acesso não permitido · desatualizado com a hora", () => {
  const loading = render({ summary: { status: "loading", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "api" } });
  const kpiArea = /<div class="pat-dash-kpis"[^>]*data-state="loading">[\s\S]*?<div class="pat-dash-cads|<div class="pat-dash-kpis"[^>]*data-state="loading">[\s\S]*?<div class="pat-dash-charts/.exec(loading)?.[0] ?? "";
  assert.ok(kpiArea, "esqueleto dos cartões");
  assert.doesNotMatch(visibleText(kpiArea), /\d/, "carregando não mostra número");
  assert.match(section(loading, "Exige ação agora"), /data-state="loading"/);

  const empty = render({ summary: { ...buildDashModel().model.summary, critical: [] } });
  assert.match(section(empty, "Exige ação agora"), /data-state="empty">Nenhuma OS crítica no momento\./);
  const emptyFilter = render({ summary: { ...buildDashModel().model.summary, critical: buildDashModel().model.summary.critical.filter((order) => order.status === "in_progress") }, state: { cartao: "overdue" } });
  assert.match(section(emptyFilter, "Exige ação agora"), /Nenhuma OS crítica neste filtro\./);

  const error = render({ summary: { status: "error", reason: "O resumo do painel veio incompleto (1 campo sem número válido).", kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  assert.match(error, /role="alert" class="pat-banner pat-banner--error" data-state="error"><span>O resumo do painel veio incompleto/);
  assert.match(error, />Tentar novamente</);
  assert.match(error, /Indicadores indisponíveis no momento\./);
  assert.match(section(error, "Exige ação agora"), /Não foi possível carregar a fila crítica\./);

  const forbidden = render({ summary: { status: "forbidden", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  assert.match(forbidden, /data-state="forbidden" role="alert"[\s\S]*Acesso não permitido/);
  assert.doesNotMatch(forbidden, /pat-kpi/, "sem cartão nenhum");

  const stale = render({ stale: true, lastUpdatedAt: "2026-10-14T12:31:00.000Z" });
  assert.match(stale, /Dados desatualizados/i);
  assert.match(stale, /\d{2}:\d{2}/);
  assert.match(stale, /OS abertas: 18/, "o último dado bom continua na tela");
});

test("[DA7] honestidade (D-007): resumo com erro não mostra número algum; série com erro mostra o aviso, nunca barras de zero", () => {
  const error = render({ summary: { status: "error", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  for (const n of ["18", "17", "412", "186"]) assert.doesNotMatch(visibleText(error), new RegExp(`\\b${n}\\b`));
  const seriesError = render({ series: { status: "error", items: [], source: "fallback" } });
  assert.match(section(seriesError, "Volume de ordens de serviço"), /data-state="error"[^>]*>Não foi possível carregar o gráfico/);
  assert.doesNotMatch(section(seriesError, "Volume de ordens de serviço"), /pat-dash-bars__day/);
});

test("[DA8] linguagem (§3, §11): nada técnico no texto visível; acentos de negócio", () => {
  for (const permissions of [GESTOR, SUPORTE]) {
    const text = visibleText(render({ state: { cartao: "overdue", linha: "crit:OS-2026-0415" } }, permissions));
    assert.doesNotMatch(text, /\b(tenant|scope|rbac|permission|role|token|undefined|null|NaN)\b/i);
    assert.doesNotMatch(text, /wo-\d|\/api\/|\/work-orders/);
    assert.match(text, /Últimos eventos/);
  }
});
