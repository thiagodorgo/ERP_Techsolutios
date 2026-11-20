import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { APPEARANCE_SCREENS } from "../src/modules/appearance/appearance.registry";
import { NO_BILLING_OPS_ACCESS, type BillingOpsAccess } from "../src/modules/platform/billing-operations/billing-ops.access";
import { INITIAL_UI, selectTarget, toggleRow, type BillingOpsUi } from "../src/modules/platform/billing-operations/billing-ops.state";
import { PlatformBillingOpsScreen, type BillingOpsScreenProps } from "../src/modules/platform/billing-operations/pages/PlatformBillingOpsPage";
import type { BillingOpsData } from "../src/modules/platform/billing-operations/billing-ops.types";
import * as fixture from "./helpers/billing-ops.fixture";

// B-ASS-10c-OPERACAO — a tela renderizada: R-ESTADOS (§7), R-BLOCOS (blocos clicáveis, linha de uma linha sem botão,
// detalhe logo abaixo, um por vez), R-PARCIAL (organização que não carregou não entra como zero), R-APAR (as 3 aparências
// sobre o MESMO modelo) e R-LING (nenhum termo técnico nem código no HTML das 3 aparências, com a fixture rica).

const FULL: BillingOpsAccess = { read: true, readTenants: true, settle: true, manageProviders: true };
const noop = () => undefined;

function render(options: { readonly appearance?: string; readonly ui?: BillingOpsUi; readonly access?: BillingOpsAccess; readonly data?: BillingOpsData; readonly fixtureOptions?: fixture.FixtureOptions; readonly details?: BillingOpsScreenProps["details"] } = {}): string {
  const ui = options.ui ?? INITIAL_UI;
  const data = options.data ?? fixture.fixtureData(options.fixtureOptions);
  const model = fixture.fixtureModel(ui, options.fixtureOptions);
  const props: BillingOpsScreenProps = {
    data,
    model,
    access: options.access ?? FULL,
    appearance: options.appearance ?? "A",
    details: options.details ?? {},
    channelPanel: React.createElement("section", { "data-painel-canal": "" }, "painel do canal"),
    handlers: { onTarget: noop, onToggleRow: noop, onClearTarget: noop, onSearch: noop, onMonth: noop, onRefresh: noop, onRetryDetail: noop, onDialog: noop, onOpenOrg: noop },
  };
  return renderToString(React.createElement(MemoryRouter, null, React.createElement(PlatformBillingOpsScreen, props)));
}
const visible = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ");

// ---- R-ESTADOS ----------------------------------------------------------------------------------------------------------
test("T-EST-1 carregando: esqueleto, sem número", () => {
  const html = render({ data: { ...fixture.fixtureData(), listState: "loading" } });
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(visible(html), /R\$/);
});

test("T-EST-2 acesso não permitido: sem a leitura (ou 403 da lista), o painel diz, sem número", () => {
  for (const html of [render({ access: NO_BILLING_OPS_ACCESS }), render({ data: { ...fixture.fixtureData(), listState: "forbidden" } })]) {
    assert.match(visible(html), /Acesso não permitido/);
    assert.doesNotMatch(visible(html), /R\$/);
  }
});

test("T-EST-3 erro: a lista de organizações falhou → erro de tela inteira com 'Tentar de novo'", () => {
  const html = visible(render({ data: { ...fixture.fixtureData(), listState: "failed" } }));
  assert.match(html, /Não foi possível carregar a cobrança/);
  assert.match(html, /Tentar de novo/);
  assert.doesNotMatch(html, /R\$/);
});

test("T-EST-4 vazio: nenhum demonstrativo no mês → 'Nenhum demonstrativo em outubro de 2026'", () => {
  for (const appearance of ["A", "B", "C"]) {
    const html = visible(render({ appearance, fixtureOptions: { empty: true } }));
    assert.match(html, /Nenhum demonstrativo em outubro de 2026/, appearance);
  }
});

test("T-EST-5 dados desatualizados: a releitura falhou e os últimos dados ficam, com o aviso", () => {
  const html = visible(render({ fixtureOptions: { stale: true } }));
  assert.match(html, /Dados desatualizados/);
  assert.match(html, /nada foi alterado/);
  assert.match(html, /Guinchos Litoral Norte/, "os dados de antes continuam");
});

test("T-EST-6 sem a chave do canal: o bloco diz 'Sem permissão para ver os provedores' e o resto segue", () => {
  const html = visible(render({ fixtureOptions: { providers: { state: "forbidden" } } }));
  assert.match(html, /Sem permissão para ver os provedores/);
  assert.match(html, /Demonstrativos de outubro de 2026/);
  assert.doesNotMatch(html, /Canal de cobrança desligado/, "sem ler o canal, a tela não afirma que ele está desligado");
});

// ---- R-PARCIAL -------------------------------------------------------------------------------------------------------------
test("T-PAR-2 organização que não carregou: indicador '—' e 'N de M organizações', nunca o número parcial", () => {
  const model = fixture.fixtureModel(INITIAL_UI, { failedOrgs: ["org-patio"] });
  assert.equal(model.kpis.todos.value, "—");
  assert.equal(model.kpis.todos.count, null);
  assert.equal(model.kpis.pagos.value, "—");
  assert.match(model.kpis.todos.hint, /2 de 3 organizações carregaram/);
  assert.equal(model.months.every((bar) => bar.total === null), true, "o gráfico também não conta parcial");
  const complete = fixture.fixtureModel();
  assert.equal(complete.kpis.todos.value, "3", "controle: com as 3 organizações, conta");
});

test("T-PAR-3 a organização que não carregou aparece na faixa e na lista, com 'Tentar de novo'", () => {
  const html = visible(render({ fixtureOptions: { failedOrgs: ["org-patio"] } }));
  assert.match(html, /1 de 3 organizações não carregou/);
  assert.match(html, /Pátio Central Guarulhos não carregou/);
  assert.match(html, /nada é contado como zero/);
});

// ---- R-BLOCOS --------------------------------------------------------------------------------------------------------------
test("T-BLO-1 os indicadores contam (nunca somam reais) e cada um filtra a lista", () => {
  const model = fixture.fixtureModel();
  assert.deepEqual(
    Object.fromEntries(Object.entries(model.kpis).map(([key, kpi]) => [key, kpi.value])),
    { todos: "3", acobrar: "0", emitidas: "1", pagos: "1", atraso: "1", revisao: "1", falha: "1", notas: "1", perfil: "1" },
  );
  for (const kpi of Object.values(model.kpis)) assert.doesNotMatch(kpi.value, /R\$/);
  const filtered = fixture.fixtureModel({ ...INITIAL_UI, alvo: "atraso" });
  assert.deepEqual(filtered.rows.map((row) => row.org.name), ["Auto Socorro Vale do Paraíba"]);
});

test("T-BLO-2 o filtro aparece acima da lista e sai com um clique (o bloco 'todos' e o mesmo bloco limpam)", () => {
  const html = visible(render({ ui: { ...INITIAL_UI, alvo: "pagos" } }));
  assert.match(html, /Filtro: Pagos/);
  assert.equal(selectTarget({ ...INITIAL_UI, alvo: "pagos" }, "pagos").alvo, null);
  assert.equal(selectTarget({ ...INITIAL_UI, alvo: "pagos" }, "todos").alvo, null);
  assert.equal(selectTarget(INITIAL_UI, "canal").canal, true, "o canal abre o painel, não filtra");
  assert.equal(selectTarget(INITIAL_UI, "canal").alvo, null);
});

test("T-BLO-3 a linha da lista não tem botão e tem o texto inteiro no título", () => {
  const html = render();
  const rows = [...html.matchAll(/<tr[^>]*class="pat-ab-row[^"]*"[\s\S]*?<\/tr>/g)].map((match) => match[0]);
  assert.ok(rows.length >= 3, `linhas: ${rows.length}`);
  for (const row of rows) assert.doesNotMatch(row, /<button/, "linha sem botão de ação");
  assert.match(html, /title="Guinchos Litoral Norte · outubro de 2026 · saldo R\$ 1\.890,00 · fila com falha"/);
});

test("T-BLO-4 abrir uma linha mostra o detalhe logo abaixo dela; abrir outra fecha a primeira", () => {
  const model = fixture.fixtureModel();
  const first = model.rows[0]!.key;
  const second = model.rows[1]!.key;
  const open = toggleRow(INITIAL_UI, first);
  assert.equal(toggleRow(open, second).aberta, second, "um aberto por vez");
  assert.equal(toggleRow(open, first).aberta, null, "o mesmo clique fecha");
  const html = render({ ui: open });
  assert.equal((html.match(/data-detalhe="/g) ?? []).length, 1);
  assert.match(visible(html), /Composição · outubro de 2026/);
});

test("T-BLO-5 a ordem da lista põe primeiro o que pede ação (fila, atraso), e o 'Emitir cobrança' fica travado com o motivo", () => {
  const model = fixture.fixtureModel();
  assert.deepEqual(model.rows.map((row) => row.org.id), ["org-vale", "org-litoral", "org-patio"], "as duas com fila primeiro (por nome), o pago por último");
  const litoral = model.rows.find((row) => row.org.id === "org-litoral")!;
  const html = render({ ui: toggleRow(INITIAL_UI, litoral.key) });
  assert.match(html, /aria-disabled="true" title="Resolva a linha da fila antes"/);
});

test("T-PERM-1 (tela) sem settle, o detalhe não desenha botão de escrita: 'Seu perfil só consulta a cobrança'", () => {
  const model = fixture.fixtureModel();
  const ui = toggleRow(INITIAL_UI, model.rows[0]!.key);
  const control = visible(render({ ui }));
  assert.match(control, /Emitir cobrança…/, "controle: com settle, o botão aparece");
  const html = visible(render({ ui, access: { ...FULL, settle: false } }));
  assert.match(html, /Seu perfil só consulta a cobrança/);
  for (const label of [/Emitir cobrança/, /Registrar baixa/, /Reprocessar/, /Cancelar cobrança/]) assert.doesNotMatch(html, label);
});

// ---- R-APAR ----------------------------------------------------------------------------------------------------------------
test("T-APA-1 A, B e C desenham o MESMO modelo: os mesmos números de indicador e a mesma lista", () => {
  const balances: Record<string, string[]> = {};
  for (const appearance of ["A", "B", "C"]) {
    const html = render({ appearance });
    assert.match(html, new RegExp(`data-aparencia="${appearance}"`));
    const text = visible(html);
    for (const org of fixture.ORGS) assert.match(text, new RegExp(org.name), `${appearance}: ${org.name}`);
    balances[appearance] = (text.match(/R\$ [\d.]+,\d{2}/g) ?? []).filter((value) => ["R$ 1.890,00", "R$ 980,00", "R$ 0,00"].includes(value)).sort();
    assert.ok(balances[appearance]!.length >= 3, `${appearance}: os saldos do servidor`);
  }
  assert.deepEqual(new Set(balances.A), new Set(balances.C), "A e C mostram os mesmos saldos");
  assert.deepEqual(new Set(balances.A), new Set(balances.B), "A e B mostram os mesmos saldos");
});

test("T-APA-2 a aparência desconhecida cai na A (nunca tela vazia)", () => {
  assert.match(render({ appearance: "Z" }), /data-aparencia="A"/);
});

test("T-APA-3 a entrada platform-billing do registro tem as 3 opções, no escopo da plataforma", () => {
  const entry = APPEARANCE_SCREENS.find((screen) => screen.key === "platform-billing");
  assert.ok(entry);
  assert.equal(entry.scope, "platform");
  assert.deepEqual(entry.options.map((option) => option.value), ["A", "B", "C"]);
  assert.deepEqual(entry.options.map((option) => option.label), ["Fiel ao console", "Mesa de revisão", "Por organização"]);
});

// ---- R-LING e R-ERRO (HTML) -------------------------------------------------------------------------------------------------
const FORBIDDEN = /Tenant|tenant|outbox|webhook|NEEDS_REVIEW|FAILED|provider|permission|\/api\/|NAO-MOSTRAR|_/;

test("T-LIN-1 / T-ERR-2 nenhum termo técnico, código snake_case nem tenantId no texto das 3 aparências (com detalhe aberto e o canal)", () => {
  const model = fixture.fixtureModel();
  for (const appearance of ["A", "B", "C"]) {
    for (const row of model.rows) {
      const html = render({
        appearance,
        ui: { ...toggleRow(INITIAL_UI, row.key), canal: true },
        details: {
          [row.statement.id]: {
            state: "ok",
            detail: { ...row.statement, payments: [{ id: "pg", source: "manual", amount: null, reversedAmount: null, reversed: false, paidAt: "2026-11-15", method: "credit_card", note: null }], credits: [{ id: "cr", amount: null, reason: "overpayment", status: "open" }] },
            charges: { charges: [{ id: "c", status: "pending", payUrl: null, dueDate: "2026-11-25", createdAt: null, cancelledAt: null }], fullAmountChargeOpen: true },
          },
        },
      });
      const text = visible(html);
      const hit = FORBIDDEN.exec(text);
      assert.equal(hit, null, `${appearance}/${row.org.name}: "${hit?.[0]}" em …${hit ? text.slice(Math.max(0, hit.index - 60), hit.index + 30) : ""}`);
    }
  }
});

test("T-LIN-1 vermelho-controle: o mesmo detector acusa um código cru no texto", () => {
  assert.notEqual(FORBIDDEN.exec(visible("<p>amount_exceeds_balance</p>")), null);
  assert.notEqual(FORBIDDEN.exec(visible("<p>fila NEEDS_REVIEW</p>")), null);
});
