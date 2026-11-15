import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";

import { NO_WRITE_ACCESS } from "../src/modules/platform/cloud-billing/cloud-billing.access";
import { asMoney, formatBRL } from "../src/modules/platform/cloud-billing/cloud-billing.money";
import { periodForMonth } from "../src/modules/platform/cloud-billing/cloud-billing.service";
import { buildCloudBillingView, INITIAL_UI, type CloudBillingView } from "../src/modules/platform/cloud-billing/cloud-billing.state";
import type { CloudBillingData } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { emptyCloudBilling } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { PlatformCloudBillingScreen } from "../src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage";
import type { CloudBillingViewProps } from "../src/modules/platform/cloud-billing/views/cloudBilling.shared";
import { COST_OK, CURRENT_MONTH, fixtureData, fixtureGroupDetails, fixtureSeries, globalJson, globalPayload, groupPayload, MONTH, NULL_ORIGINAL, SENTINEL_COST, tenantPayload, TODAY } from "./helpers/cloud-billing.fixture";

/** O texto sem os espaços inquebráveis que o `Intl` põe entre "R$" e o número. */
const plain = (text: string) => text.replace(/\u00a0|\u202f/g, " ");

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

function model(data: CloudBillingData, series = fixtureSeries(), ui = INITIAL_UI): CloudBillingView {
  return buildCloudBillingView({ data, series, groupDetails: fixtureGroupDetails(), ui, currentMonth: CURRENT_MONTH, today: TODAY });
}

function screen(data: CloudBillingData, appearance: string, options: { readonly loading?: boolean; readonly series?: ReturnType<typeof fixtureSeries>; readonly access?: typeof FULL; readonly ui?: typeof INITIAL_UI } = {}): string {
  return renderToString(<PlatformCloudBillingScreen data={data} loading={options.loading ?? false} month={MONTH} model={model(data, options.series, options.ui)} access={options.access ?? FULL} appearance={appearance} handlers={handlers} onRetry={noop} />);
}

/** O detalhe aberto de uma linha (`data-detalhe`), só o texto visível dele. */
function detailOf(html: string, rowId: string): string {
  const start = html.indexOf(`data-detalhe="${rowId}"`);
  assert.ok(start >= 0, `o detalhe ${rowId} está aberto`);
  const end = html.indexOf("pat-ab-detail-actions", start);
  return visible(html.slice(start, html.indexOf("</div></div>", end) + 12));
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
    // o rateio em processamento num mês ainda vazio: o aviso aparece (o vazio não o diz). Emenda 1.1 (PR567-4): o painel
    // vazio cede ao rateio em processamento — esta asserção, que exigia o painel, passou a exigir a ausência dele
    const pending = { ...emptyMonth(), runs: fixtureData({ runs: [{ id: "run-p", status: "processing", periodStart: "2026-10-01T00:00:00.000Z", startedAt: "2026-11-04T12:13:00.000Z", createdAt: "2026-11-04T12:13:00.000Z" }] }).runs };
    const pendingHtml = visible(screen(pending, appearance));
    assert.doesNotMatch(pendingHtml, /Nenhum custo nem assinatura em outubro de 2026/, `${appearance}: processando, sem o painel vazio`);
    assert.match(pendingHtml, /está em processamento desde 04\/11 09:13/, `${appearance}: o aviso do rateio em processamento`);
  }
});

test("T-UI-3 (Emenda 1.1, PR567-4) o vazio cede ao rateio em processamento; o vazio de 'importe o arquivo' só sem importação do mês", () => {
  const RUN_PENDING = { id: "run-p", status: "pending", periodStart: "2026-10-01T00:00:00.000Z", startedAt: null, createdAt: "2026-11-14T23:35:00.000Z" };
  const count = (text: string, label: RegExp) => (text.match(new RegExp(label.source, "g")) ?? []).length;
  for (const appearance of LETTERS) {
    // arquivo do mês importado e o rateio `pending` (a base real sem worker, ou o rateio preso): só o aviso do rateio
    const pending = visible(screen({ ...emptyMonth(), runs: fixtureData({ runs: [RUN_PENDING] }).runs }, appearance));
    assert.match(pending, /O rateio de outubro de 2026 está em processamento desde/, `${appearance}: o aviso do rateio`);
    assert.doesNotMatch(pending, /importe o arquivo de custo deste mês/, `${appearance}: sem "importe o arquivo"`);
    assert.doesNotMatch(pending, /Nenhum custo nem assinatura/, `${appearance}: sem o painel vazio`);
    assert.equal(count(pending, /Importar arquivo de custo/), 1, `${appearance}: "Importar arquivo de custo" só no cabeçalho, não no painel`);
    // o vazio de verdade (sem importação e sem rateio): o texto e o botão do painel continuam
    const empty = visible(screen({ ...emptyMonth(), imports: [], runs: [] }, appearance));
    assert.match(empty, /Nenhum custo nem assinatura em outubro de 2026/, `${appearance}: o vazio de verdade`);
    assert.match(empty, /importe o arquivo de custo deste mês/, `${appearance}: o vazio de verdade manda importar`);
    assert.equal(count(empty, /Importar arquivo de custo/), 2, `${appearance}: o botão do painel e o do cabeçalho`);
    // arquivo importado e nenhum rateio (nem em processamento): o vazio não manda importar de novo, manda rodar
    const imported = visible(screen({ ...emptyMonth(), runs: [] }, appearance));
    assert.doesNotMatch(imported, /importe o arquivo de custo deste mês/, `${appearance}: com importação, sem "importe o arquivo"`);
    assert.match(imported, /já foi importado/, `${appearance}: diz que o arquivo já entrou`);
    assert.equal(count(imported, /Rodar rateio do mês/), 2, `${appearance}: rodar no painel e no cabeçalho`);
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
    const raw = screen(data, appearance);
    const html = visible(raw);
    assert.doesNotMatch(html, /Nenhum custo nem assinatura/, `${appearance}: não é o vazio`);
    assert.match(html, /Falta o dólar de outubro de 2026/, `${appearance}: o aviso`);
    assert.match(html, /US\$ 1\.528,65/, `${appearance}: o importado em dólar`);
    // F6 (Dev-B): a margem mês a mês da C escreve, em cada coluna, a margem em reais DAQUELE mês (os meses anteriores têm
    // dólar). O "nenhum real" vale para o mês da tela: as colunas dos outros meses saem da conta, e só elas.
    const ownMonth = appearance === "C" ? visible(raw.replace(new RegExp(`<button[^>]*data-mes="(?!${MONTH}")[^"]*"[\\s\\S]*?</button>`, "g"), " ")) : html;
    if (appearance === "C") assert.match(html, /R\$ ?\d/, "C: controle — as colunas dos outros meses mostram o real delas");
    assert.doesNotMatch(ownMonth, /R\$ ?\d/, `${appearance}: nenhum valor em reais`);
  }
  // o controle: sem o original (o servidor manda tudo nulo fora de ok, legacy_unscoped e fx_missing), é o vazio
  const noOriginal = fixtureData({ cost: NO_COST("no_run"), tenant: tenantPayload(MONTH, NO_COST("no_run"), lines.map((line) => ({ ...line, allocatedCostOriginal: null })), nullTotals), group: { ...groupPayload(MONTH, NO_COST("no_run")), lines: [], totals: nullTotals }, global: globalPayload(MONTH, NO_COST("no_run"), globalJson({ ...NULL_COSTS, subscriptionTotal: null })) });
  assert.equal(model(noOriginal).empty, true, "sem original e sem assinatura, vazio");
});

test("T-UI-3 (F11) mês com custo e sem assinatura: a margem mês a mês não diz 'sem custo' nem traceja o custo", () => {
  // achado do aceite na base real: sem assinatura, a margem falta porque falta ASSINATURA; o custo existe
  const lines = (tenantPayload().lines as Record<string, unknown>[]).map((line) => ({ ...line, subscriptionAmount: null, statementTotal: null, creditsApplied: null, subscriptionSource: "none", subscriptionSkipReason: "no_subscription", estimate: false, margin: null, marginPct: null, alert: "no_subscription" }));
  const data = fixtureData({ tenant: tenantPayload(MONTH, COST_OK, lines, { subscriptionAmount: null, allocatedCost: "5944.07", margin: null, marginPct: null }), global: globalPayload(MONTH, COST_OK, globalJson({ subscriptionTotal: null, margin: null, marginPct: null, alert: "no_subscription" })) });
  const own = (html: string) => /<button[^>]*data-mes="2026-10"[^>]*>[\s\S]*?<\/button>/.exec(html)?.[0] ?? "";
  for (const appearance of LETTERS.filter((letter) => letter === "C")) {
    const column = own(screen(data, appearance));
    assert.ok(column, "C: a coluna do mês da tela existe");
    assert.doesNotMatch(visible(column), /sem custo/, "C: não diz 'sem custo' com custo");
    assert.match(visible(column), /sem assinatura/, "C: diz o que falta");
    assert.doesNotMatch(column, /ui-month-series__dashed/, "C: sem o tracejado do custo ausente");
    assert.match(column, /aria-label="[^"]*custo R\$[^"]*sem assinatura/, "C: o texto acessível diz o custo e a falta da assinatura");
    // o controle: sem custo (sem rateio) e com assinatura, o tracejado e o "sem custo" continuam
    const noRun = own(screen(dataWithCost(NO_COST("no_run")), appearance));
    assert.match(noRun, /ui-month-series__dashed/, "C: controle — sem custo, tracejado");
    assert.match(visible(noRun), /sem custo/, "C: controle — sem custo");
  }
});

// J-567 (C3-05): o detalhe de um MEMBRO DE GRUPO sem assinatura segue o motivo real. Com "plano sem preço" não é filial
// e a matriz não assina por ele; com "sem assinatura" (o controle) é a filial do grupo.
test("T-UI-3 (J-567, C3-05) membro de grupo com plano sem preço: o detalhe não diz 'filial' nem 'a matriz assina'", () => {
  const withReason = (reason: string) => {
    const lines = (tenantPayload().lines as Record<string, unknown>[]).map((line) => (line.tenantId === "t3" ? { ...line, subscriptionSkipReason: reason } : line));
    return fixtureData({ tenant: tenantPayload(MONTH, COST_OK, lines) });
  };
  const ui = { ...INITIAL_UI, modo: "tenant" as const, aberta: "t:t3" };
  for (const appearance of LETTERS) {
    const sem = detailOf(screen(withReason("plan_without_price"), appearance, { ui }), "t:t3");
    assert.match(sem, /plano sem preço cadastrado/, `${appearance}: o motivo real`);
    assert.doesNotMatch(sem, /filial/, `${appearance}: não é filial`);
    assert.doesNotMatch(sem, /A matriz assina pelo grupo/, `${appearance}: a matriz não assina por ele`);
    assert.match(sem, /Grupo Vale/, `${appearance}: o grupo continua dito`);
    // o controle: sem assinatura própria, no grupo, é a filial e a matriz assina
    const filial = detailOf(screen(withReason("no_subscription"), appearance, { ui }), "t:t3");
    assert.match(filial, /filial; quem assina: Frota Vale Transportes/, `${appearance}: controle, a filial`);
    assert.match(filial, /A matriz assina pelo grupo/, `${appearance}: controle, a matriz assina`);
  }
});

test("T-UI-3 dados desatualizados: o aviso aparece e os últimos valores confirmados continuam", () => {
  for (const appearance of LETTERS) {
    const html = screen({ ...fixtureData(), stale: true }, appearance);
    assert.match(visible(html), /Dados desatualizados/);
    assert.match(visible(html), /R\$ 8\.258,91|R\$ 7\.770,11/);
    // J-567 (CV-13): o mês em minúscula no meio da frase
    assert.match(visible(html), /Os últimos dados confirmados de outubro de 2026 continuam/, `${appearance}: o mês em minúscula`);
  }
});

// J-567: a fidelidade que o texto e as classes mostram (os desvios visuais medidos pela cognição visual)
test("T-UI-3 (J-567, CV-7, CV-10, CV-12) a margem com o % menor, o contador das abas do sistema e o aviso de rateio em processamento", () => {
  const processing = { id: "run-p", status: "processing", periodStart: "2026-10-01T00:00:00.000Z", startedAt: "2026-11-14T14:40:00.000Z", createdAt: "2026-11-14T14:40:00.000Z" };
  const completed = { id: "run-out", status: "completed", periodStart: "2026-10-01T00:00:00.000Z", startedAt: "2026-11-04T12:13:00.000Z", completedAt: "2026-11-04T12:13:30.000Z", createdAt: "2026-11-04T12:13:00.000Z", metadata: { importResolution: "latest_completed" } };
  for (const appearance of LETTERS) {
    const html = screen(fixtureData(), appearance);
    // CV-10: o contador das abas é o do sistema, sem paleta nova
    assert.match(html, /class="financeiro-bc__tab-count"/, `${appearance}: o contador das abas do sistema`);
    assert.doesNotMatch(html, /cb-tab-count/, `${appearance}: sem a classe nova do contador`);
    // CV-12: com um rateio concluído e outro em processamento, custo e margem aparecem — o aviso não diz "em branco"
    const withValues = visible(screen(fixtureData({ runs: [processing, completed] }), appearance));
    assert.match(withValues, /está em processamento desde/, `${appearance}: o aviso`);
    assert.match(withValues, /Custo e margem são os do último rateio concluído até este terminar/, `${appearance}: o aviso diz que os valores são do rateio anterior`);
    assert.doesNotMatch(withValues, /ficam em branco até um rateio concluir/, `${appearance}: não diz "em branco" com valores na tela`);
    // o controle: sem custo válido (sem rateio concluído), o aviso diz "em branco"
    const blank = visible(screen({ ...dataWithCost(NO_COST("no_run")), runs: fixtureData({ runs: [processing] }).runs }, appearance));
    assert.match(blank, /ficam em branco até um rateio concluir/, `${appearance}: controle, "em branco" sem custo`);
  }
  // CV-7: a margem global com o % menor ao lado (A e B, onde o indicador grande mostra a margem)
  for (const appearance of LETTERS.filter((letter) => letter !== "C")) {
    assert.match(screen(fixtureData(), appearance), /<div class="pat-kpi__value">[^<]*488,80<small>[^<]*6,3 %<\/small><\/div>/, `${appearance}: a margem com o % em <small>`);
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

const SIX_MONTHS = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

/** Os meses (`data-mes`) na ordem em que a tela os desenha. */
const monthOrder = (html: string) => [...html.matchAll(/data-mes="(\d{4}-\d{2})"/g)].map((match) => match[1]!);

/** O elemento do mês na série (o `<g>` das linhas e barras, ou o `<button>` da margem mês a mês), com o conteúdo. */
function monthElements(html: string, month: string): string[] {
  return [...html.matchAll(new RegExp(`<(g|button)[^>]*data-mes="${month}"[^>]*>[\\s\\S]*?</\\1>`, "g"))].map((match) => match[0]);
}

/** Quantos pontos tem o caminho da série (as linhas da A): cada "M" ou "L" do `d`. */
const pathPoints = (html: string, color: string) => {
  const path = new RegExp(`<path d="([^"]*)" fill="none" stroke="${color}"`).exec(html);
  return path ? (path[1]!.match(/[ML]/g) ?? []).length : -1;
};

// J-567 (C3-01): a série de 6 meses vem do mais VELHO ao mais NOVO, nas 3 aparências (cada gráfico com os 6 meses na ordem).
test("T-UI-3 (J-567, C3-01) a ordem da série de 6 meses: do mais velho ao mais novo", () => {
  for (const appearance of LETTERS) {
    const order = monthOrder(screen(fixtureData(), appearance));
    assert.ok(order.length >= 6 && order.length % 6 === 0, `${appearance}: cada gráfico tem os 6 meses (${order.length})`);
    for (let start = 0; start < order.length; start += 6) assert.deepEqual(order.slice(start, start + 6), SIX_MONTHS, `${appearance}: o gráfico ${start / 6 + 1} na ordem`);
  }
});

// J-567 (C3-02): o mês SEM DADO NENHUM (§6.5.1, linha 3) continua na série, sem barra nem ponto, com "—" e o texto acessível
// "sem dados" — nunca desenhado como zero.
test("T-UI-3 (J-567, C3-02) o mês sem dado nenhum: sem barra nem ponto, '—' e 'sem dados', nunca zero", () => {
  const series = fixtureSeries("ok", [], { empty: ["2026-06"] });
  for (const appearance of LETTERS) {
    const html = screen(fixtureData(), appearance, { series });
    const elements = monthElements(html, "2026-06");
    assert.ok(elements.length >= 1, `${appearance}: o mês vazio continua na série`);
    for (const element of elements) {
      assert.match(element, /data-estado="empty"/, `${appearance}: o mês vazio é "empty"`);
      assert.match(element, /aria-label="[^"]*sem dados"/, `${appearance}: o texto acessível diz "sem dados"`);
      assert.doesNotMatch(element, /R\$/, `${appearance}: nenhum valor em reais no mês vazio`);
      assert.doesNotMatch(element, /fill="#2563eb"|fill="#f87171"/, `${appearance}: sem barra de assinatura nem de custo`);
      assert.doesNotMatch(element, /height:\s*[1-9]/, `${appearance}: sem coluna desenhada`);
    }
    if (appearance === "A") {
      // as linhas: o mês vazio não é ponto (5 dos 6 meses têm valor)
      assert.equal(pathPoints(html, "#2563eb"), 5, "A: a linha das assinaturas pula o mês vazio");
      assert.equal(pathPoints(html, "#ef4444"), 5, "A: a linha do custo pula o mês vazio");
    }
    // o controle: com os 6 meses com valor, a linha tem 6 pontos (o contador não é vácuo)
    if (appearance === "A") assert.equal(pathPoints(screen(fixtureData(), appearance), "#2563eb"), 6, "A: controle, 6 pontos");
  }
});

// J-567 (C1-02 = C3-03): a série da organização no detalhe aberto. No mês SEM CUSTO VÁLIDO o custo é "—" mesmo que a
// linha traga um valor (P13; as sentinelas `7xx.11` do fixture), e o mês SEM DADO NENHUM é buraco na linha, nunca zero.
test("T-UI-3 (J-567, C1-02/C3-03) a série da organização: P13 no custo e o mês vazio nunca vira zero", () => {
  const series = fixtureSeries("ok", [], { empty: ["2026-06"], invalidWithCost: ["2026-08"] });
  const ui = { ...INITIAL_UI, modo: "tenant" as const, aberta: "t:t1" };
  for (const appearance of LETTERS) {
    const html = screen(fixtureData(), appearance, { series, ui });
    const trend = /<svg class="ui-month-trend"[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/svg>/.exec(html);
    assert.ok(trend, `${appearance}: a linha de tendência da organização está no detalhe`);
    const aria = trend[1]!.replace(/&nbsp;|\u00a0/g, " ");
    const points = (serie: "a" | "b") => ((new RegExp(`<path d="([^"]*)"[^>]*data-serie="${serie}"`).exec(trend[2]!)?.[1] ?? "").match(/[ML]/g) ?? []).length;
    // P13: nenhuma sentinela do mês sem custo válido, nem no texto acessível nem no desenho
    for (let line = 0; line < 5; line += 1) assert.ok(!aria.includes(plain(formatBRL(asMoney(SENTINEL_COST(line))))), `${appearance}: sem o custo do mês sem custo válido (${SENTINEL_COST(line)})`);
    assert.match(aria, /ago\/26: assinatura R\$ 1\.990,00, custo —/, `${appearance}: agosto sem custo válido diz "—"`);
    assert.equal(points("b"), 1, `${appearance}: o custo só tem ponto no mês com custo válido (outubro)`);
    // o mês vazio: "sem dados", e buraco na linha (5 dos 6 meses têm assinatura)
    assert.match(aria, /jun\/26: sem dados/, `${appearance}: junho sem dados`);
    assert.equal(points("a"), 5, `${appearance}: a assinatura pula o mês vazio`);
    // sem texto no desenho (a `spark` da referência) e nenhum R$ de outra organização
    assert.doesNotMatch(trend[2]!, /<text/, `${appearance}: a linha de tendência não tem texto`);
  }
  // o controle: com a série normal, o custo de outubro e a assinatura dos 6 meses aparecem
  const control = /<svg class="ui-month-trend"[^>]*aria-label="([^"]*)"/.exec(screen(fixtureData(), "A", { ui }));
  assert.match(control?.[1] ?? "", /out\/26: assinatura R\$ 1\.990,00, custo R\$ 2\.180,62/, "controle: outubro com assinatura e custo");
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
