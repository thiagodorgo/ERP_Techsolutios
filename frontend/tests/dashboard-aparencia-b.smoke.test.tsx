import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { DashboardViewB } from "../src/modules/dashboard/views/DashboardViewB";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";
import { buildDashModel, detailRows, GESTOR, pressedButtons, rowKeys, section, SUPORTE, visibleText } from "./helpers/dashboard-aparencias.fixture";

// B-APAR-DASH — APARÊNCIA B "Analítica" (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`, `renderB`), em
// SSR com os dados e o relógio da referência. Prende (plano §2.4): a "Carteira ativa por etapa" com as 10 situações do
// agregado (`byStatus`), cada uma filtrando a lista, e a contagem da etapa vinda do AGREGADO (não da lista filtrada); o
// mini-gráfico só nos cartões que têm série real; a lista "OS que exigem atenção" com abas e o detalhe da linha (endereço e
// técnico por GET /work-orders/:id, guardado no modelo); o "Campo agora" que filtra o "Status de campo"; os estados §7.

const render = (overrides = {}, permissions: readonly string[] = GESTOR) => renderToString(<DashboardViewB {...buildDashModel(overrides, permissions).model} />);
const etapas = (html: string) => pressedButtons(html).filter((button) => / OS — filtrar a lista$/.test(button.label));

test("[DB1] carteira por etapa: as 10 situações do agregado, com a contagem do agregado e o total em aberto", () => {
  const html = render();
  assert.match(html, /^<div data-aparencia="B"/);
  assert.match(html, /pat-page-header__kicker">VISÃO GERAL · ANALÍTICA</);
  assert.deepEqual(
    etapas(html).map((button) => button.label),
    [
      "Aberta: 9 OS — filtrar a lista",
      "Atribuída: 6 OS — filtrar a lista",
      "Aceita: 3 OS — filtrar a lista",
      "Em rota: 5 OS — filtrar a lista",
      "No local: 3 OS — filtrar a lista",
      "Em atendimento: 7 OS — filtrar a lista",
      "Pausada: 2 OS — filtrar a lista",
      "Concluída: 412 OS — filtrar a lista",
      "Cancelada: 21 OS — filtrar a lista",
      "Recusada: 4 OS — filtrar a lista",
    ],
  );
  assert.match(visibleText(section(html, "Carteira ativa por etapa")), /35 OS em aberto na organização · clique filtra a lista/);
});

test("[DB2] a etapa filtra a lista (chip removível) e a contagem dela continua a do agregado, não a da lista filtrada", () => {
  const html = render({ state: { etapa: "open" } });
  const lista = section(html, "OS que exigem atenção");
  assert.deepEqual(rowKeys(lista), ["crit:OS-2026-0409", "crit:OS-2026-0423", "crit:OS-2026-0426"]);
  assert.match(lista, /Filtro: Etapa Aberta/);
  assert.match(visibleText(lista), /3 de 8 OS críticas/);
  assert.deepEqual(etapas(html).filter((button) => button.pressed).map((button) => button.label), ["Aberta: 9 OS — filtrar a lista"], "a etapa diz 9 (o agregado), e a lista mostra 3 (as críticas)");
});

test("[DB3] mini-gráfico SÓ nos cartões com série real (OS hoje e Concluídas); sem série (Suporte), nenhum", () => {
  const html = render();
  const sparks = html.match(/<span class="apardash-spark">/g) ?? [];
  assert.equal(sparks.length, 2);
  const wraps = [...html.matchAll(/<div class="apardash-kpi-spark">[\s\S]*?aria-label="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(wraps, ["OS hoje: 14 — ver detalhes", "Concluídas: 412 — ver detalhes"]);
  assert.equal((render({}, SUPORTE).match(/apardash-spark/g) ?? []).length, 0);
});

test("[DB4] abas da lista: 'Atrasadas' mostra as 4 vencidas e o contador diz o universo", () => {
  const html = render({ state: { aba: "atrasadas" } });
  const lista = section(html, "OS que exigem atenção");
  assert.deepEqual(rowKeys(lista), ["crit:OS-2026-0418", "crit:OS-2026-0415", "crit:OS-2026-0409", "crit:OS-2026-0421"]);
  assert.match(visibleText(lista), /4 de 8 OS críticas/);
  assert.match(lista, /aria-pressed="true">Atrasadas</);
});

test("[DB5] detalhe da linha: endereço e técnico vêm do GET /work-orders/:id guardado (carregando · pronto · erro); a atividade é a do agregado", () => {
  const loading = render({ state: { linha: "crit:OS-2026-0418" }, rowDetail: { "wo-0418": { status: "loading" } } });
  assert.equal(detailRows(loading), 1);
  assert.match(/class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(loading)?.[0] ?? "", /data-state="loading"/);
  const workOrder = { id: "wo-0418", serviceAddress: "Av. Industrial, 1.240", serviceCity: "Santo André", serviceState: "SP", assignedOperatorId: "u-pedro" } as unknown as WorkOrderDetail;
  const ready = render({ state: { linha: "crit:OS-2026-0418" }, rowDetail: { "wo-0418": { status: "ready", workOrder } } });
  const detail = /class="pat-ab-detail-row"[\s\S]*?<\/tr>/.exec(ready)?.[0] ?? "";
  assert.match(detail, /Av\. Industrial, 1\.240 — Santo André\/SP/);
  assert.match(visibleText(detail), /Técnico ?: Atribuído /, "sem nome inventado: a OS não traz o nome (P-WO-LIST-TECH-NAME)");
  assert.match(detail, /Atividade recente desta OS/);
  assert.match(visibleText(detail), /OS atribuída — Ordem de servico atribuida\./);
  assert.match(detail, />Abrir OS</);
  const unassigned = render({ state: { linha: "crit:OS-2026-0418" }, rowDetail: { "wo-0418": { status: "ready", workOrder: { ...workOrder, assignedOperatorId: null } as unknown as WorkOrderDetail } } });
  assert.match(unassigned, /A atribuir/);
  const error = render({ state: { linha: "crit:OS-2026-0418" }, rowDetail: { "wo-0418": { status: "error" } } });
  assert.match(error, /data-state="error">Não foi possível carregar/);
});

test("[DB6] 'Campo agora' (5 situações) filtra o 'Status de campo'; sem localização, o bloco diz 'Acesso não permitido'", () => {
  const html = render();
  assert.match(visibleText(section(html, "Campo agora")), /5 operadores/);
  const filtered = render({ state: { campo: "Sem sinal recente" } });
  const field = section(filtered, "Status de campo");
  assert.match(field, /Filtro: Sem sinal recente/);
  assert.deepEqual(rowKeys(field), ["loc:l1"]);
  assert.match(section(render({}, ["dashboard:read", "work_orders:read"]), "Campo agora"), /data-state="forbidden"/);
});

test("[DB7] estados §7: carregando sem número · vazio · erro com 'Tentar novamente' · acesso não permitido · desatualizado", () => {
  const loading = render({ summary: { status: "loading", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "api" } });
  assert.match(loading, /data-state="loading"/);
  assert.doesNotMatch(loading, /Carteira ativa por etapa/, "a faixa analítica espera o resumo");
  const empty = render({ summary: { ...buildDashModel().model.summary, critical: [] } });
  assert.match(visibleText(section(empty, "OS que exigem atenção")), /Nenhuma OS crítica no momento/);
  const emptyFilter = render({ state: { aba: "campo", etapa: "open" } });
  assert.match(visibleText(section(emptyFilter, "OS que exigem atenção")), /Nenhuma OS crítica neste filtro/);
  const error = render({ summary: { status: "error", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  assert.match(visibleText(section(error, "OS que exigem atenção")), /Não foi possível carregar a fila crítica.*Tentar novamente/);
  assert.doesNotMatch(visibleText(error), /\b(412|186)\b/);
  const forbidden = render({ summary: { status: "forbidden", reason: null, kpis: [], byStatus: null, critical: [], events: [], source: "error" } });
  assert.match(forbidden, /Acesso não permitido/);
  assert.doesNotMatch(forbidden, /OS que exigem atenção/);
  assert.match(render({ stale: true, lastUpdatedAt: "2026-10-14T12:31:00.000Z" }), /Dados desatualizados/i);
});

test("[DB8] linguagem (§3, §11): nada técnico no texto visível", () => {
  const text = visibleText(render({ state: { linha: "crit:OS-2026-0415", etapa: "on_route" } }));
  assert.doesNotMatch(text, /\b(tenant|scope|rbac|permission|role|token|undefined|null|NaN)\b/i);
  assert.doesNotMatch(text, /wo-\d|\/api\//);
});
