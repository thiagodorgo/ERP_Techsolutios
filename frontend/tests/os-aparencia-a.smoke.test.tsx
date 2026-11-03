import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { WorkOrdersViewA } from "../src/modules/work-orders/pages/views/WorkOrdersViewA";
import { buildOsModel, detailRows, GESTOR, headers, kpiValues, OS_FIXTURE, pressedButtons, rowKeys, rowsHtml, visibleText } from "./helpers/os-aparencias.fixture";

// B-APAR-OS — APARÊNCIA A "Padrão fiel" (referência aprovada `screen-refs/ordens-de-servico-3opcoes.reference.html`,
// `montarA`/`renderA`), renderizada em SSR com as 24 OS da referência e o relógio dela (14/10/2026 10:00). Prende: a
// estrutura (cabeçalho OPERAÇÃO, 4 indicadores que FILTRAM, 5 colunas, linha de uma altura SEM botão), os números
// (contados à mão das 24 OS, não pela mesma função da tela), o resumo com os 5 alvos sob os gates de hoje, os 5 estados
// §7, a honestidade (erro nunca vira número; contagem parcial diz o universo) e a linguagem (§3, §11).

const render = (overrides = {}, permissions?: readonly string[]) => renderToString(<WorkOrdersViewA {...buildOsModel(overrides, permissions).model} />);

test("[A1] estrutura: raiz data-aparencia=A, cabeçalho OPERAÇÃO, 4 indicadores acionáveis, as 5 colunas da referência na ordem", () => {
  const html = render();
  assert.match(html, /data-aparencia="A"/);
  assert.match(html, /pat-page-header__kicker">OPERAÇÃO</);
  assert.match(html, /<h1 class="pat-page-header__title">Ordens de Serviço<\/h1>/);
  assert.deepEqual(headers(html), ["CÓDIGO", "CLIENTE / SERVIÇO", "TÉCNICO", "AGENDA", "SITUAÇÃO"]);
  assert.match(html, /<th scope="col" aria-label="Abrir resumo"><\/th>/, "a coluna do chevron tem nome acessível");
  const kpis = pressedButtons(html).filter((button) => / — filtrar a lista$/.test(button.label));
  assert.equal(kpis.length, 4, "os 4 indicadores são botões com aria-pressed");
});

test("[A2] números: contados à mão das 24 OS da referência — 17 abertas · 7 em andamento · 6 atrasadas · 5 concluídas", () => {
  const html = render();
  assert.deepEqual(kpiValues(html), ["17", "7", "6", "5"]);
  assert.match(html, /5 sem técnico/, "selo de OS abertas: 102, 107, 111, 118, 123");
  assert.match(html, />há atrasos</, "5 em campo com agenda vencida (104, 108, 109, 114, 122)");
  assert.match(html, />agir agora</);
});

test("[A3] linha de uma altura e SEM botão; 20 por página (TablePager), contagem '24 ordens'", () => {
  const html = render();
  const rows = rowsHtml(html);
  assert.equal(rows.length, 20);
  for (const row of rows) assert.doesNotMatch(row, /<button/, "a linha não tem botão (D-PADRAO-BLOCOS-CLICAVEIS)");
  assert.match(html, /pat-os-count">24 ordens</);
  assert.match(html, /1–20 de 24/);
  assert.match(html, /<tr class="pat-ab-row" tabindex="0" aria-expanded="false" data-row-key="os-101"/, "linha focável com aria-expanded");
  assert.equal(detailRows(html), 0, "nada aberto sem escolha");
});

test("[A4] o indicador FILTRA: 'Atrasadas' pressionado mostra o chip e só as 6 atrasadas", () => {
  const html = render({ state: { tab: "todas", target: "atrasadas", q: "", openId: null } });
  const pressed = pressedButtons(html).filter((button) => button.pressed && / — filtrar a lista$/.test(button.label)).map((button) => button.label);
  assert.deepEqual(pressed, ["Atrasadas: 6 — filtrar a lista"]);
  assert.match(html, /Filtro: Atrasadas/);
  assert.match(html, /aria-label="Limpar filtro"/);
  assert.deepEqual(rowKeys(html).sort(), ["os-102", "os-104", "os-108", "os-109", "os-114", "os-122"]);
});

test("[A5] o resumo de uma OS aberta sem técnico nem cliente: Abrir OS · Atribuir técnico · Vincular cliente; sem andamento nem revogar", () => {
  const html = render({ expandedId: "os-102" });
  assert.equal(detailRows(html), 1, "um resumo por vez");
  assert.match(html, /data-row-key="os-102"[^>]*>|aria-expanded="true" data-row-key="os-102"/);
  const detail = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
  assert.match(detail, />Abrir OS</);
  assert.match(detail, /aria-label="Atribuir técnico à OS OS-000102"/);
  assert.match(detail, />Vincular cliente</);
  assert.doesNotMatch(detail, /Dar andamento/, "aberta não tem avanço de 1 clique (precisa de técnico)");
  assert.doesNotMatch(detail, /Revogar envio/, "aberta não tem envio");
  assert.match(detail, /Sem cliente vinculado/);
  assert.match(detail, /Rod\. Presidente Dutra, km 210 · Guarulhos\/SP/);
  assert.match(detail, /14\/10\/2026 09:15[\s\S]*· atrasada/);
});

test("[A6] gates de hoje no resumo: avançar (work_orders:status), revogar (field_dispatch:cancel + read), atribuir (field_dispatch:create)", () => {
  const withAll = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(render({ expandedId: "os-103" }))?.[0] ?? "";
  assert.match(withAll, /aria-label="Dar andamento → Aceita"/);
  assert.match(withAll, />Revogar envio</);
  assert.doesNotMatch(withAll, /Atribuir técnico/, "já atribuída");
  const readOnly = ["work_orders:read"];
  const none = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(render({ expandedId: "os-103" }, readOnly))?.[0] ?? "";
  assert.match(none, />Abrir OS</, "Abrir OS é para todos que leem");
  assert.doesNotMatch(none, /Dar andamento|Revogar envio|Atribuir técnico/);
  const unassignedNoDispatch = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(render({ expandedId: "os-102" }, readOnly))?.[0] ?? "";
  assert.doesNotMatch(unassignedNoDispatch, /Atribuir técnico/, "sem field_dispatch:create não oferece atribuir");
});

test("[A7] estados §7 — erro e sem permissão: indicadores com '—', sem ação, painel do estado (erro com 'Tentar novamente')", () => {
  for (const status of ["error", "forbidden"] as const) {
    const html = render({ status, error: "A consulta às ordens de serviço falhou. Tente novamente em instantes.", items: [], loaded: 0, serverTotal: 0 });
    assert.deepEqual(kpiValues(html), ["—", "—", "—", "—"], `${status}: erro nunca vira número`);
    assert.equal(pressedButtons(html).filter((button) => / — filtrar a lista$/.test(button.label)).length, 0, `${status}: indicador degradado não filtra`);
    assert.match(html, new RegExp(`data-state="${status}"`));
    assert.equal(rowKeys(html).length, 0);
    if (status === "error") assert.match(html, /role="alert"[\s\S]*Tentar novamente/);
    else assert.doesNotMatch(html, /role="alert"/);
  }
});

test("[A8] estados §7 — carregando (esqueleto, nenhum dígito), vazio com e sem filtro, desatualizado com a hora", () => {
  const loading = render({ loading: true, status: "loading", items: [], loaded: 0, serverTotal: 0 });
  assert.equal(kpiValues(loading).length, 0, "nenhum valor enquanto carrega");
  assert.equal((loading.match(/<tr class="pat-ab-row" aria-hidden="true"/g) ?? []).length, 4, "4 linhas-esqueleto");
  assert.doesNotMatch(visibleText(loading), /\d+ ordens/);

  const empty = render({ status: "empty", items: [], loaded: 0, serverTotal: 0 });
  assert.match(empty, /data-state="empty"/);
  assert.match(empty, /Nenhuma ordem de serviço/);
  assert.match(empty, />Nova OS</, "CTA com work_orders:create");
  const emptyNoCreate = render({ status: "empty", items: [], loaded: 0, serverTotal: 0 }, ["work_orders:read"]);
  assert.doesNotMatch(emptyNoCreate, />Nova OS</);
  const filtered = render({ state: { tab: "todas", target: null, q: "nada-casa-com-isto", openId: null } });
  assert.match(filtered, /Nenhuma OS para os filtros atuais/);
  assert.doesNotMatch(filtered, />Nova OS</, "vazio por filtro não duplica Nova OS");

  const stale = render({ stale: true, lastUpdatedAt: new Date(2026, 9, 14, 9, 41).toISOString() });
  assert.match(stale, /data-state="stale"/);
  assert.match(visibleText(stale), /Dados desatualizados — última atualização às 09:41/);
  assert.equal(rowKeys(stale).length, 20, "a lista fica na tela");
});

test("[A9] honestidade: contagem parcial diz o universo (nas N carregadas · T no servidor), nunca finge ser o total", () => {
  const html = render({ partial: true, loaded: 24, serverTotal: 412 });
  assert.match(visibleText(html), /Contagens nas 24 carregadas · 412 no servidor/);
  assert.match(html, /aria-label="OS abertas: 17 \(nas 24 carregadas · 412 no servidor\) — filtrar a lista"/);
  const whole = render();
  assert.doesNotMatch(visibleText(whole), /carregadas/, "sem parcial, sem nota");
});

test("[A10] linguagem: nada de termo técnico, rota, id ou valor cru de situação no texto visível", () => {
  const html = render({ expandedId: "os-116" });
  const visible = visibleText(html);
  assert.doesNotMatch(visible, /\b(tenant|scope|rbac|permission|role|on_route|in_progress|keep_unpaid|zero)\b/i);
  assert.doesNotMatch(visible, /\/work-orders|\/api\/|operador-\d+|modelo-\d+/);
  assert.match(visible, /Decisão financeira\s*:\s*Zerar itens/, "a decisão do cancelamento aparece em português");
  for (const order of OS_FIXTURE) assert.doesNotMatch(visible, new RegExp(`\\b${order.id}\\b`), `id técnico ${order.id} não aparece`);
});

test("[A11] técnico: 'Atribuído' sem nome inventado; 'Sem técnico' em âmbar só para não finalizadas", () => {
  const html = render();
  assert.match(html, /class="aparos-tec"[\s\S]*?Atribuído/);
  assert.match(html, /class="aparos-semtec">Sem técnico</);
  assert.doesNotMatch(visibleText(html), /Carlos Mendes|Rafael Souza|Mariana Costa/, "nenhum nome de técnico da maquete");
  assert.ok(GESTOR.length > 0);
});
