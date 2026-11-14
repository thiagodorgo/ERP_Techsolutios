import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";

import { NO_WRITE_ACCESS } from "../src/modules/platform/cloud-billing/cloud-billing.access";
import { periodForMonth } from "../src/modules/platform/cloud-billing/cloud-billing.service";
import { buildCloudBillingView, INITIAL_UI, type CloudBillingView } from "../src/modules/platform/cloud-billing/cloud-billing.state";
import type { CloudBillingData } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { emptyCloudBilling } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { PlatformCloudBillingScreen } from "../src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage";
import type { CloudBillingViewProps } from "../src/modules/platform/cloud-billing/views/cloudBilling.shared";
import { COST_OK, CURRENT_MONTH, fixtureData, fixtureGroupDetails, fixtureSeries, globalJson, globalPayload, groupPayload, MONTH, NULL_ORIGINAL, tenantPayload, TODAY } from "./helpers/cloud-billing.fixture";

// B-ASS-10b (T5) · os estados da tela (plano v2 §6.5 e §7 do contrato), iguais nas 3 aparências — T-UI-3; a linguagem
// (T-UI-4: sem andaime, sem termo técnico, acentos certos). Cada estado com a sua fixture, na forma do servidor. O T-UI-3
// é também o substituto do T20 (A6): a série de 6 meses segue a regra da maquete (§6.5.1) — todo mês tem o seu botão,
// e o mês sem custo continua no gráfico com a barra de assinaturas e o custo tracejado.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = path.join(HERE, "../src/modules/platform/cloud-billing/views");
const LETTERS = ["A", "B", "C"].filter((letter) => existsSync(path.join(VIEWS_DIR, `CloudBillingView${letter}.tsx`)));
const VIEWS: Record<string, (props: CloudBillingViewProps) => React.ReactElement> = {};
for (const letter of LETTERS) {
  const module = (await import(pathToFileURL(path.join(VIEWS_DIR, `CloudBillingView${letter}.tsx`)).href)) as Record<string, (props: CloudBillingViewProps) => React.ReactElement>;
  VIEWS[letter] = module[`CloudBillingView${letter}`]!;
}
const noop = () => undefined;
const handlers = { onTarget: noop, onToggleRow: noop, onClearTarget: noop, onMode: noop, onSearch: noop, onMonth: noop, onAction: noop, onRetrySeries: noop };
const FULL = { importCosts: true, readImports: true, runAllocation: true, manageBilling: true };

/** O texto visível, sem o texto de escala dos eixos (`data-escala`, da biblioteca). */
function visible(html: string): string {
  return html.replace(/<text[^>]*data-escala[^>]*>[\s\S]*?<\/text>/g, " ").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function model(data: CloudBillingData, series = fixtureSeries()): CloudBillingView {
  return buildCloudBillingView({ data, series, groupDetails: fixtureGroupDetails(), ui: INITIAL_UI, currentMonth: CURRENT_MONTH, today: TODAY });
}

function screen(data: CloudBillingData, appearance: string, options: { readonly loading?: boolean; readonly series?: ReturnType<typeof fixtureSeries>; readonly access?: typeof FULL } = {}): string {
  return renderToString(<PlatformCloudBillingScreen data={data} loading={options.loading ?? false} month={MONTH} model={model(data, options.series)} access={options.access ?? FULL} appearance={appearance} handlers={handlers} onRetry={noop} />);
}

const NO_COST = (status: string, extra: Record<string, unknown> = {}) => ({ ...COST_OK, status, runId: status === "no_run" ? null : "run-out", fxRate: null, fxRateVersion: null, ...extra });
const NULL_COSTS = { tenantsCost: null, platformOwnCost: null, unallocatedOther: null, unallocatedByReason: [], roundingResidualCost: null, conversionResidualCost: null, totalCost: null, margin: null, marginPct: null, alert: "cost_missing", original: NULL_ORIGINAL };

function dataWithCost(cost: Record<string, unknown>, globalOver: Record<string, unknown> = NULL_COSTS): CloudBillingData {
  const lines = (tenantPayload().lines as Record<string, unknown>[]).map((line) => ({ ...line, allocatedCost: null, allocatedCostOriginal: null, margin: null, marginPct: null, alert: "cost_missing" }));
  return fixtureData({
    cost,
    tenant: tenantPayload(MONTH, cost, lines, { subscriptionAmount: "7770.00", allocatedCost: null, margin: null, marginPct: null }),
    group: groupPayload(MONTH, cost),
    global: globalPayload(MONTH, cost, globalJson(globalOver)),
  });
}

/** Um mês sem nenhuma organização com assinatura ou custo: o estado vazio. */
function emptyMonth(): CloudBillingData {
  const cost = NO_COST("no_run");
  const nullTotals = { subscriptionAmount: null, allocatedCost: null, margin: null, marginPct: null };
  return fixtureData({ cost, tenant: tenantPayload(MONTH, cost, [], nullTotals), group: { ...groupPayload(MONTH, cost), lines: [], totals: nullTotals }, global: globalPayload(MONTH, cost, globalJson({ ...NULL_COSTS, subscriptionTotal: null })) });
}

test("T-UI-3 os estados que tomam a tela: carregando, vazio, erro, acesso negado e os 3 erros 500 — nenhum R$", () => {
  assert.ok(LETTERS.includes("A"));
  const empty = emptyCloudBilling(MONTH, periodForMonth(MONTH), "api");
  for (const appearance of LETTERS) {
    const cases: { readonly html: string; readonly expect: RegExp; readonly name: string }[] = [
      { name: "carregando", html: screen(fixtureData(), appearance, { loading: true }), expect: /aria-busy="true"/ },
      { name: "vazio", html: screen(emptyMonth(), appearance), expect: /Nenhum custo nem assinatura em outubro de 2026/ },
      { name: "erro", html: screen({ ...empty, source: "fallback", failure: "unavailable" }, appearance), expect: /Não foi possível carregar o custo e a margem/ },
      { name: "acesso negado", html: screen({ ...empty, source: "fallback", forbidden: true }, appearance), expect: /Acesso não permitido/ },
      { name: "membership_integrity_violation", html: screen({ ...empty, source: "fallback", failure: "membership_integrity_violation" }, appearance), expect: /Uma organização aparece em dois grupos no mesmo dia/ },
      { name: "statement_integrity_violation", html: screen({ ...empty, source: "fallback", failure: "statement_integrity_violation" }, appearance), expect: /Não foi possível carregar o custo e a margem/ },
      { name: "overview_integrity_violation", html: screen({ ...empty, source: "fallback", failure: "overview_integrity_violation" }, appearance), expect: /Não foi possível carregar o custo e a margem/ },
    ];
    for (const item of cases) {
      assert.match(item.html, item.expect, `${appearance} ${item.name}`);
      assert.doesNotMatch(visible(item.html), /R\$/, `${appearance} ${item.name}: nenhum R$`);
    }
    assert.match(screen({ ...empty, source: "fallback", failure: "unavailable" }, appearance), /Tentar de novo/);
    // o rótulo do mês é o da TELA (o seletor); a organização e o mês do servidor ficam só no log dele: nenhum outro número
    assert.doesNotMatch(visible(screen({ ...empty, source: "fallback", failure: "membership_integrity_violation" }, appearance)).replace("outubro de 2026", ""), /\d/, `${appearance}: nenhum número no erro 500`);
  }
});

// Os 2 achados do aceite na base real (F11): numa base sem assinatura, o mês com arquivo e sem rateio cai no vazio — o
// vazio tem de deixar rodar o rateio (o cabeçalho inteiro, como o `cabecalhoVazio()` da maquete); e o "sem dólar" sem
// assinatura NÃO é vazio, porque o custo na moeda do arquivo existe (a tela mostra o aviso e os valores em dólar).
test("T-UI-3 (F11) o vazio tem o cabeçalho inteiro: o mês, o dólar e, com a permissão, rodar o rateio e importar", () => {
  for (const appearance of LETTERS) {
    const full = visible(screen(emptyMonth(), appearance));
    assert.match(full, /Nenhum custo nem assinatura em outubro de 2026/, appearance);
    assert.match(full, /Dólar do mês/, `${appearance}: o dólar do mês`);
    assert.match(full, /Rodar rateio do mês/, `${appearance}: rodar o rateio no vazio`);
    assert.match(full, /Importar arquivo de custo/, `${appearance}: importar no vazio`);
    // o painel já diz que o mês não tem rateio: o aviso não se repete
    assert.doesNotMatch(full, /ainda não tem rateio/, `${appearance}: sem aviso repetido`);
    const readOnly = visible(screen(emptyMonth(), appearance, { access: NO_WRITE_ACCESS }));
    assert.match(readOnly, /Nenhum custo nem assinatura em outubro de 2026/, `${appearance}: só leitura`);
    assert.doesNotMatch(readOnly, /Rodar rateio do mês|Importar arquivo de custo/, `${appearance}: sem a permissão, sem os botões`);
    // o rateio em processamento num mês ainda vazio: o aviso aparece (o vazio não o diz)
    const pending = { ...emptyMonth(), runs: fixtureData({ runs: [{ id: "run-p", status: "processing", periodStart: "2026-10-01T00:00:00.000Z", startedAt: "2026-11-04T12:13:00.000Z", createdAt: "2026-11-04T12:13:00.000Z" }] }).runs };
    const pendingHtml = visible(screen(pending, appearance));
    assert.match(pendingHtml, /Nenhum custo nem assinatura em outubro de 2026/, `${appearance}: processando e vazio`);
    assert.match(pendingHtml, /está em processamento desde 04\/11 09:13/, `${appearance}: o aviso do rateio em processamento`);
  }
});

test("T-UI-3 (F11) sem dólar e sem assinatura não é vazio: o aviso e o custo em dólar aparecem, nenhum real", () => {
  const cost = NO_COST("fx_missing", { currencyOriginal: "USD" });
  const lines = (tenantPayload().lines as Record<string, unknown>[]).map((line) => ({ ...line, groupId: null, groupName: null, subscriptionAmount: null, statementTotal: null, creditsApplied: null, subscriptionSource: "none", subscriptionSkipReason: "no_subscription", estimate: false, allocatedCost: null, margin: null, marginPct: null, alert: "no_subscription" }));
  const nullTotals = { subscriptionAmount: null, allocatedCost: null, margin: null, marginPct: null };
  const original = { currency: "USD", tenantsCost: "1101.000000", platformOwnCost: "386.400000", unallocatedOther: "41.250000", roundingResidualCost: "0.003812", totalImportedCost: "1528.653812" };
  const data = fixtureData({ cost, tenant: tenantPayload(MONTH, cost, lines, nullTotals), group: { ...groupPayload(MONTH, cost), lines: [], totals: nullTotals }, global: globalPayload(MONTH, cost, globalJson({ ...NULL_COSTS, subscriptionTotal: null, original })) });
  assert.equal(model(data).empty, false, "o modelo não é vazio");
  for (const appearance of LETTERS) {
    const html = visible(screen(data, appearance));
    assert.doesNotMatch(html, /Nenhum custo nem assinatura/, `${appearance}: não é o vazio`);
    assert.match(html, /Falta o dólar de outubro de 2026/, `${appearance}: o aviso`);
    assert.match(html, /US\$ 1\.528,65/, `${appearance}: o importado em dólar`);
    assert.doesNotMatch(html, /R\$ ?\d/, `${appearance}: nenhum valor em reais`);
  }
  // o controle: sem o original (o servidor manda tudo nulo fora de ok, legacy_unscoped e fx_missing), é o vazio
  const noOriginal = fixtureData({ cost: NO_COST("no_run"), tenant: tenantPayload(MONTH, NO_COST("no_run"), lines.map((line) => ({ ...line, allocatedCostOriginal: null })), nullTotals), group: { ...groupPayload(MONTH, NO_COST("no_run")), lines: [], totals: nullTotals }, global: globalPayload(MONTH, NO_COST("no_run"), globalJson({ ...NULL_COSTS, subscriptionTotal: null })) });
  assert.equal(model(noOriginal).empty, true, "sem original e sem assinatura, vazio");
});

test("T-UI-3 dados desatualizados: o aviso aparece e os últimos valores confirmados continuam", () => {
  for (const appearance of LETTERS) {
    const html = screen({ ...fixtureData(), stale: true }, appearance);
    assert.match(visible(html), /Dados desatualizados/);
    assert.match(visible(html), /R\$ 8\.258,91|R\$ 7\.770,11/);
  }
});

test("T-UI-3 o custo do mês: sem rateio, rateio vazio, rateio antigo, sem dólar, moeda desconhecida, dois arquivos e rateio em processamento", () => {
  const cases: { readonly name: string; readonly data: CloudBillingData; readonly expect: RegExp }[] = [
    { name: "no_run", data: dataWithCost(NO_COST("no_run")), expect: /Outubro de 2026 ainda não tem rateio/ },
    { name: "no_import", data: dataWithCost(NO_COST("no_import")), expect: /rodou sem arquivo de custo e ficou vazio/ },
    { name: "fx_missing", data: dataWithCost(NO_COST("fx_missing", { currencyOriginal: "USD" }), { ...NULL_COSTS, original: { currency: "USD", tenantsCost: "1101.000000", platformOwnCost: "386.400000", unallocatedOther: "41.250000", roundingResidualCost: "0.003812", totalImportedCost: "1528.653812" } }), expect: /Falta o dólar de outubro de 2026/ },
    { name: "currency_unknown", data: dataWithCost(NO_COST("currency_unknown")), expect: /não informa a moeda/ },
    { name: "legacy_unscoped", data: fixtureData({ cost: { ...COST_OK, status: "legacy_unscoped" } }), expect: /Rateio antigo/ },
    { name: "dois arquivos", data: fixtureData({ cost: { ...COST_OK, warnings: ["multiple_imports_in_month"] } }), expect: /tem mais de um arquivo de custo importado/ },
    { name: "run presa", data: fixtureData({ runs: [{ id: "run-p", status: "processing", periodStart: "2026-10-01T00:00:00.000Z", startedAt: "2026-11-04T12:13:00.000Z", createdAt: "2026-11-04T12:13:00.000Z" }] }), expect: /está em processamento desde 04\/11 09:13/ },
  ];
  for (const appearance of LETTERS) {
    for (const item of cases) {
      const html = visible(screen(item.data, appearance));
      assert.match(html, item.expect, `${appearance} ${item.name}`);
    }
    // rateio antigo mostra os valores (com o selo); sem dólar mostra o dólar original e nenhum custo em reais
    assert.match(visible(screen(cases[4]!.data, appearance)), /R\$ 8\.258,91/);
    const fxMissing = visible(screen(cases[2]!.data, appearance));
    assert.match(fxMissing, /US\$ 1\.528,65/);
    assert.doesNotMatch(fxMissing, /R\$ 8\.258,91|R\$ 5\.944/);
  }
});

test("T-UI-3 estimativa: o relógio âmbar na linha com estimate", () => {
  for (const appearance of LETTERS) {
    const html = screen(fixtureData(), appearance);
    assert.match(html, /aria-label="estimativa"/, appearance);
  }
});

test("T-UI-3 (substituto do T20, A6) a série: os 6 meses sempre têm o seu botão; mês sem custo fica no gráfico com a barra de assinaturas e o custo tracejado", () => {
  for (const appearance of LETTERS) {
    // o mês da tela sem rateio, com assinaturas
    const noRun = screen(dataWithCost(NO_COST("no_run")), appearance);
    const months = noRun.match(/data-mes="\d{4}-\d{2}"/g) ?? [];
    assert.ok(months.length >= 6, `${appearance}: os 6 meses têm botão (${months.length})`);
    for (const month of ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]) assert.match(noRun, new RegExp(`data-mes="${month}"`), `${appearance}: ${month}`);
    assert.match(noRun, /ui-month-series__dashed/, `${appearance}: o custo ausente é tracejado`);
    // um mês anterior que falhou: o botão continua, sem barras, e o aviso com "Tentar de novo"
    const failed = screen(fixtureData(), appearance, { series: fixtureSeries("ok", ["2026-07"]) });
    assert.match(failed, /data-mes="2026-07" data-estado="error"/);
    assert.match(visible(failed), /Não foi possível carregar jul\/26/);
    assert.match(visible(failed), /Tentar de novo/);
    // enquanto a série carrega
    const loading = screen(fixtureData(), appearance, { series: fixtureSeries("loading") });
    assert.match(loading, /data-mes="2026-06" data-estado="loading"/);
    assert.match(visible(loading), /Carregando os meses anteriores/);
  }
});

test("T-UI-4 nenhuma aparência tem andaime, termo técnico ou acento faltando", () => {
  const variants = [fixtureData(), dataWithCost(NO_COST("no_run")), fixtureData({ cost: { ...COST_OK, warnings: ["multiple_imports_in_month"] } })];
  for (const appearance of LETTERS) {
    for (const data of variants) {
      for (const ui of [INITIAL_UI, { ...INITIAL_UI, aberta: "t:t2" }, { ...INITIAL_UI, modo: "group" as const, aberta: "g:g1" }, { ...INITIAL_UI, modo: "global" as const, aberta: "p:nr:no_allocation_rule" }]) {
        const view = buildCloudBillingView({ data, series: fixtureSeries(), groupDetails: fixtureGroupDetails(), ui, currentMonth: CURRENT_MONTH, today: TODAY });
        const html = visible(renderToString(React.createElement(VIEWS[appearance]!, { model: view, access: FULL, ...handlers })));
        assert.doesNotMatch(html, /falta no backend|Tenant|tenant|B-ASS|B-SAN|PLANNED|TODO|WIP|\/api\/|\/platform\/|cost_missing|no_subscription|legacy_unscoped|groupBy|undefined|NaN|null/, `${appearance}: andaime ou termo técnico`);
        assert.doesNotMatch(html, /\b(Organizacao|Organizacoes|Situacao|Atencao|Critico|Nao rateado|Conversao|Visao|Comparacao|Historico|Importacoes|Dolar|mes)\b/, `${appearance}: acento faltando`);
      }
    }
  }
});

test("T-UI-4 a tela de acesso negado também não fala técnico", () => {
  const html = visible(renderToString(<PlatformCloudBillingScreen data={{ ...emptyCloudBilling(MONTH, periodForMonth(MONTH), "fallback"), forbidden: true }} loading={false} month={MONTH} model={model(fixtureData())} access={NO_WRITE_ACCESS} appearance="A" handlers={handlers} onRetry={noop} />));
  assert.doesNotMatch(html, /Tenant|permission|platform:|403/);
});
