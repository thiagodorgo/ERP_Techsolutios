import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { WorkOrdersViewC } from "../src/modules/work-orders/pages/views/WorkOrdersViewC";
import { buildOsModel, detailRows, headers, pressedButtons, rowKeys, visibleText } from "./helpers/os-aparencias.fixture";

// B-APAR-OS — APARÊNCIA C "Fila por agenda" (referência aprovada `screen-refs/ordens-de-servico-3opcoes.reference.html`,
// `montarC`/`renderC`/`linhasAgrupadasC`/`ciclo`), SSR com as 24 OS e o relógio da referência (14/10/2026 10:00). Contado
// à mão de `RAW`: na fila 17 · atrasadas 6 · próximas 2 h 7 (até 12:00) · ainda hoje 1 · amanhã em diante 2 · sem agenda
// 1 · finalizadas 7. Os passos do ciclo de vida sem horário na OS (Atribuída, Aceita, Em atendimento) ficam "sem hora".

const render = (overrides = {}) => renderToString(<WorkOrdersViewC {...buildOsModel(overrides).model} />);
const blocks = (html: string) => pressedButtons(html).filter((button) => / — filtrar a lista$/.test(button.label)).map((button) => button.label.replace(" — filtrar a lista", ""));
const groupOrder = (html: string) => [...html.matchAll(/<tr class="aparos-grupo-row"><td colSpan="7" style="color:[^"]+">([^<]+)<span[^>]*>(\d+)</gi)].map((m) => `${m[1]} ${m[2]}`);

test("[C1] estrutura: raiz data-aparencia=C, OPERAÇÃO · FILA DO DIA, os 7 blocos na ordem e com as contagens da referência", () => {
  const html = render();
  assert.match(html, /data-aparencia="C"/);
  assert.match(html, /pat-page-header__kicker">OPERAÇÃO · FILA DO DIA</);
  assert.deepEqual(blocks(html), ["Na fila: 17", "Atrasadas: 6", "Próximas 2 h: 7", "Ainda hoje: 1", "Amanhã em diante: 2", "Sem agenda: 1", "Finalizadas: 7"]);
  assert.match(visibleText(html), /Próximas 2 h 7? ?até 12:00|até 12:00/);
  assert.deepEqual(headers(html), ["HORA", "CÓDIGO", "CLIENTE / SERVIÇO", "CIDADE", "TÉCNICO", "SITUAÇÃO"]);
  assert.doesNotMatch(html, /pat-os-tabs/, "a C não tem abas (referência)");
  assert.doesNotMatch(html, /pat-pager/, "sem paginação dentro da fila");
});

test("[C2] lista agrupada por faixa da agenda, na ordem da referência, cada grupo em ordem de horário", () => {
  const html = render();
  assert.deepEqual(groupOrder(html), ["Atrasadas 6", "Próximas 2 horas 7", "Ainda hoje 1", "Amanhã em diante 2", "Sem agenda 1", "Finalizadas 7"]);
  const keys = rowKeys(html);
  assert.equal(keys.length, 24);
  assert.deepEqual(keys.slice(0, 6), ["os-104", "os-109", "os-114", "os-102", "os-122", "os-108"], "atrasadas da mais antiga para a mais nova");
  assert.deepEqual(keys.slice(6, 13), ["os-101", "os-107", "os-113", "os-103", "os-119", "os-123", "os-106"], "próximas 2 h por horário");
  assert.match(/data-row-key="os-112"[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "", /aparos-hora[^>]*>15\/10 09:30</, "outro dia mostra dd/mm HH:MM");
});

test("[C3] o bloco filtra e o recorte de ?aba= aparece como chip (a C não tem abas)", () => {
  const html = render({ state: { tab: "todas", target: "ag-prox2h", q: "", openId: null } });
  assert.deepEqual(rowKeys(html).length, 7);
  assert.match(html, /aria-pressed="true" aria-label="Próximas 2 h: 7 — filtrar a lista"/);
  assert.match(html, /Filtro: Agenda: próximas 2 horas/);
  const tab = render({ state: { tab: "sem-tecnico", target: null, q: "", openId: null } });
  assert.match(tab, /Recorte: Sem técnico/);
  assert.deepEqual(rowKeys(tab).sort(), ["os-102", "os-107", "os-111", "os-118", "os-123"]);
});

test("[C4] ciclo de vida no resumo: horários que a OS tem; Atribuída e Aceita 'sem hora' (nunca uma hora emprestada)", () => {
  const html = render({ expandedId: "os-113" });
  assert.equal(detailRows(html), 1);
  const cycle = /aria-label="Ciclo de vida da OS"[\s\S]*?<\/div><\/div>(?=<div class="pat-ab-detail-grid")/.exec(html)?.[0] ?? "";
  const steps = [...cycle.matchAll(/<b>([^<]+)<\/b><small>([^<]+)<\/small>/g)].map((m) => `${m[1]}=${m[2]}`);
  assert.deepEqual(steps, ["Aberta=09:25", "Atribuída=sem hora", "Aceita=sem hora", "Em rota=09:30", "No local=—", "Em atendimento=—", "Concluída=—"]);
  const paused = render({ expandedId: "os-109" });
  assert.match(paused, /<b>Em atendimento · pausada<\/b><small>sem hora<\/small>/);
  const cancelled = render({ expandedId: "os-116" });
  assert.match(cancelled, /is-desvio[\s\S]*?<b>Cancelada<\/b><small>00:40<\/small>/);
});

test("[C5] estados §7: erro/sem permissão = blocos com '—' e 'dados indisponíveis', sem ação; carregando = esqueleto sem dígito", () => {
  const error = render({ status: "error", items: [], loaded: 0, serverTotal: 0, error: "Falhou." });
  assert.equal(blocks(error).length, 0);
  assert.equal((error.match(/dados indisponíveis/g) ?? []).length, 7);
  assert.match(error, /data-state="error"/);
  const forbidden = render({ status: "forbidden", items: [], loaded: 0, serverTotal: 0 });
  assert.match(forbidden, /data-state="forbidden"/);
  const loading = render({ loading: true, status: "loading", items: [], loaded: 0, serverTotal: 0 });
  assert.equal((loading.match(/class="aparos-bloco-c" aria-hidden="true"/g) ?? []).length, 7);
  assert.doesNotMatch(visibleText(loading).replace(/OPERAÇÃO[^.]*\./, ""), /\d/);
  const stale = render({ stale: true, lastUpdatedAt: new Date(2026, 9, 14, 9, 41).toISOString() });
  assert.match(stale, /data-state="stale"/);
  assert.equal(rowKeys(stale).length, 24);
});

test("[C6] Emenda 1 (A1): a C diz o total que o servidor informa e oferece 'ver todas' só quando a fila está recortada", () => {
  const partial = render({ partial: true, loaded: 24, serverTotal: 412 });
  assert.match(visibleText(partial), /24 ordens · 412 no servidor/);
  assert.doesNotMatch(partial, />ver todas</, "sem recorte não há o que mostrar a mais: nada de botão morto");
  const narrowed = render({ partial: true, loaded: 24, serverTotal: 412, state: { tab: "todas", target: "ag-prox2h", q: "", openId: null } });
  assert.match(visibleText(narrowed), /7 ordens · 412 no servidor · ver todas/);
  const whole = render();
  assert.doesNotMatch(visibleText(whole), /no servidor/, "sem mais OS no servidor, só a contagem");
});
