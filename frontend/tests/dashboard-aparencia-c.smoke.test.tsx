import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { DashboardViewC } from "../src/modules/dashboard/views/DashboardViewC";
import { buildDashModel, detailRows, GESTOR, pressedButtons, rowKeys, section, SUPORTE, visibleText } from "./helpers/dashboard-aparencias.fixture";

// B-APAR-DASH — APARÊNCIA C "Central de prioridades" (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`,
// `renderC`/`railC`/`linhaFila`), em SSR com os dados e o relógio da referência. Prende (plano §2.4): a fila ÚNICA pela
// ordem de `buildCriticalQueue` (1 atrasada · 2 prioritária · 3 sem sinal · 4 aprovação), uma entrada por entidade (a OS
// que é atrasada E urgente aparece uma vez, como atrasada); os blocos que filtram; o universo dito (as OS críticas que o
// painel recebe); o Suporte (só `dashboard:read`) vê só atrasadas e prioritárias; a coluna "Resumo do dia" com o detalhe do
// número; os estados §7. O tipo "OS sem operador" (lista de OS da C) é a última fatia do bloco (Emenda 1 ao §2).

const render = (overrides = {}, permissions: readonly string[] = GESTOR) => renderToString(<DashboardViewC {...buildDashModel(overrides, permissions).model} />);
const fila = (html: string) => section(html, "Fila de prioridades");
const blocks = (html: string) => pressedButtons(html).filter((button) => / — filtrar a fila$/.test(button.label));

test("[DC1] a fila única segue a ordem de buildCriticalQueue, uma entrada por entidade, com o selo de tipo", () => {
  const html = render();
  assert.match(html, /^<div data-aparencia="C"/);
  assert.match(html, /pat-page-header__kicker">VISÃO GERAL · CENTRAL DE PRIORIDADES</);
  assert.deepEqual(rowKeys(fila(html)), [
    "fila:os_atrasada:OS-2026-0418",
    "fila:os_atrasada:OS-2026-0415",
    "fila:os_atrasada:OS-2026-0409",
    "fila:os_atrasada:OS-2026-0421",
    "fila:os_prioritaria:OS-2026-0427",
    "fila:os_prioritaria:OS-2026-0423",
    "fila:os_prioritaria:OS-2026-0425",
    "fila:os_prioritaria:OS-2026-0426",
    "fila:stale-l1",
    "fila:approval-ap1",
    "fila:approval-ap2",
  ]);
  const keys = rowKeys(fila(html)).map((key) => key.replace(/^fila:(os_[a-z]+:)?/, ""));
  assert.equal(new Set(keys).size, keys.length, "nenhuma entidade duas vezes (a 0418 é atrasada E urgente: entra uma vez)");
  const text = visibleText(fila(html));
  assert.match(text, /OS atrasada OS-2026-0418 · Seguradora Aliança Sul/);
  assert.match(text, /Urgente OS-2026-0427 · Construtora Horizonte/, "prioritária urgente leva o selo 'Urgente'");
  assert.match(text, /Prioridade alta OS-2026-0425/);
  assert.match(text, /Sem sinal Pedro Alves Sem sinal há 38 min · em OS-2026-0418/);
  assert.match(text, /Aprovação Aprovação de OS pendente Orçamento acima da alçada do atendimento\./);
  assert.match(text, /11 itens/);
});

test("[DC2] os blocos contam o que a fila tem e FILTRAM; o filtro aparece acima da lista e sai com um clique", () => {
  const html = render();
  assert.deepEqual(
    blocks(html).map((button) => button.label),
    [
      "Todas as prioridades: 11 — filtrar a fila",
      "Atrasadas: 4 — filtrar a fila",
      "Prioridade alta/urgente: 4 — filtrar a fila",
      "Sem sinal recente: 1 — filtrar a fila",
      "Pendentes de aprovação: 2 — filtrar a fila",
    ],
  );
  const filtered = render({ state: { bloco: "aprovacao_pendente" } });
  assert.deepEqual(rowKeys(fila(filtered)), ["fila:approval-ap1", "fila:approval-ap2"]);
  assert.match(fila(filtered), /Filtro: Pendentes de aprovação/);
  assert.match(fila(filtered), /aria-label="Limpar filtro"/);
  assert.match(visibleText(fila(filtered)), /2 de 11 itens/);
});

test("[DC3] o universo é dito: as OS atrasadas e prioritárias são as críticas que o painel recebe (não 'todas')", () => {
  assert.match(visibleText(render()), /OS atrasadas e prioritárias: entre as 8 OS críticas que o painel recebe\./);
});

test("[DC4] Suporte (só dashboard:read): a fila tem só atrasadas e prioritárias; sem blocos de sinal e aprovação; sem 'Abrir OS'", () => {
  const html = render({ state: { linha: "fila:os_atrasada:OS-2026-0418" } }, SUPORTE);
  assert.deepEqual(blocks(html).map((button) => button.label.split(":")[0]), ["Todas as prioridades", "Atrasadas", "Prioridade alta/urgente"]);
  const keys = rowKeys(fila(html));
  assert.equal(keys.length, 8);
  assert.ok(keys.every((key) => /^fila:os_(atrasada|prioritaria):/.test(key)), JSON.stringify(keys));
  const detail = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
  assert.doesNotMatch(detail, /Abrir OS/);
  assert.match(detail, /Seu perfil vê esta OS no painel, mas não abre ordens de serviço\./);
  assert.match(section(html, "Agora"), /data-state="forbidden"/);
  assert.match(section(html, "Volume · 14 dias"), /data-state="forbidden"/);
  // Defesa em profundidade: mesmo que o modelo traga aprovações e posições, sem o acesso a view não as mostra.
  const leaked = render({ approvals: { status: "ready", items: buildDashModel().model.approvals!.items }, locations: { status: "ready", items: buildDashModel().model.locations.items } }, SUPORTE);
  assert.ok(rowKeys(fila(leaked)).every((key) => /^fila:os_/.test(key)), JSON.stringify(rowKeys(fila(leaked))));
});

test("[DC5] coluna 'Resumo do dia': os 5 números abrem o detalhe; 'Atrasadas' filtra a fila pelo bloco e diz isso", () => {
  const html = render({ state: { cartao: "overdue", bloco: "os_atrasada" } });
  const tiles = pressedButtons(section(html, "Resumo do dia")).filter((button) => / — ver detalhes$/.test(button.label));
  assert.deepEqual(tiles.map((tile) => `${tile.label}${tile.pressed ? " *" : ""}`), [
    "OS abertas: 18 — ver detalhes",
    "Em andamento: 17 — ver detalhes",
    "Atrasadas: 4 — ver detalhes *",
    "OS hoje: 14 — ver detalhes",
    "Concluídas: 412 — ver detalhes",
  ]);
  assert.match(html, /class="apardash-panel apardash-panel--rail" aria-label="Detalhes de Atrasadas"/);
  assert.match(html, /A fila está filtrada por “Atrasadas”\./);
  assert.equal(rowKeys(fila(html)).length, 4);
  const open = render({ state: { cartao: "open" } });
  assert.doesNotMatch(open, /A fila está filtrada/, "na C só 'Atrasadas' filtra a fila");
  assert.equal(rowKeys(fila(open)).length, 11);
});

test("[DC6] a linha abre o detalhe do tipo, um por vez: OS (Abrir OS) · sem sinal (Abrir mapa) · aprovação (Ver aprovação)", () => {
  const os = render({ state: { linha: "fila:os_prioritaria:OS-2026-0423" } });
  assert.equal(detailRows(os), 1);
  assert.match(/class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(os)?.[0] ?? "", />Abrir OS</);
  const stale = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(render({ state: { linha: "fila:stale-l1" } }))?.[0] ?? "";
  assert.match(stale, />Abrir mapa</);
  assert.match(visibleText(stale), /Bateria ?: 41% na última posição/);
  const approval = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(render({ state: { linha: "fila:approval-ap2" } }))?.[0] ?? "";
  assert.match(approval, />Ver aprovação</);
  assert.match(visibleText(approval), /Entidade ?: Checklist/);
});

test("[DC7] estados §7: carregando sem número · vazio · erro com 'Tentar novamente' · acesso não permitido · desatualizado", () => {
  const loading = render({ summary: { status: "loading", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "api" } });
  assert.match(loading, /apardash-c-blocos" data-state="loading"/);
  assert.doesNotMatch(visibleText(fila(loading)), /\d/);
  const empty = render({ summary: { ...buildDashModel().model.summary, critical: [] }, locations: { status: "ready", items: [] }, approvals: { status: "ready", items: [] } });
  assert.match(visibleText(fila(empty)), /Nenhuma prioridade no momento/);
  const emptyFilter = render({ approvals: { status: "ready", items: [] }, state: { bloco: "campo_sem_sinal" }, locations: { status: "ready", items: buildDashModel().model.locations.items.filter((l) => !l.isStale) } });
  assert.match(fila(emptyFilter), /Filtro: Sem sinal recente/, "a fonte veio (zero é real): o bloco existe e filtra");
  assert.match(visibleText(fila(emptyFilter)), /Nada neste filtro Escolha outro bloco acima\./);
  const error = render({ summary: { status: "error", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  assert.match(visibleText(fila(error)), /Não foi possível carregar a fila de prioridades.*Tentar novamente/);
  assert.match(visibleText(error), /Indicadores indisponíveis no momento\./);
  const forbidden = render({ summary: { status: "forbidden", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  assert.match(forbidden, /Acesso não permitido/);
  assert.doesNotMatch(forbidden, /Fila de prioridades/);
  assert.match(render({ stale: true, lastUpdatedAt: "2026-10-14T12:31:00.000Z" }), /Dados desatualizados/i);
  const approvalsError = render({ approvals: { status: "error", items: [] } });
  assert.doesNotMatch(approvalsError, /Pendentes de aprovação: 0/, "fonte que falhou não vira zero: o bloco some");
});

test("[DC8] linguagem (§3, §11): nada técnico no texto visível; o id interno da OS não vai ao HTML", () => {
  const html = render({ state: { linha: "fila:approval-ap1" } });
  assert.doesNotMatch(visibleText(html), /\b(tenant|scope|rbac|permission|role|token|undefined|null|NaN|checklist_run|work_order)\b/i);
  assert.doesNotMatch(html, /wo-04\d\d/, "nenhum id de OS no HTML");
});
