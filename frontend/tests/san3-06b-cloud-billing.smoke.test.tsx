import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { mapGroupOverview, mapTenantOverview } from "../src/modules/platform/cloud-billing/cloud-billing.adapter";
import { NO_WRITE_ACCESS } from "../src/modules/platform/cloud-billing/cloud-billing.access";
import { currentBillingMonth, getCloudBilling, monthsEndingAt, periodForMonth } from "../src/modules/platform/cloud-billing/cloud-billing.service";
import { buildCloudBillingView, INITIAL_UI, nextCloudBillingState } from "../src/modules/platform/cloud-billing/cloud-billing.state";
import type { CloudBillingData } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { emptyCloudBilling } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { PlatformCloudBillingScreen } from "../src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage";
import { CloudBillingViewA } from "../src/modules/platform/cloud-billing/views/CloudBillingViewA";
import { FX_PAYLOAD, globalJson, globalPayload, groupPayload, GROUPS_PAYLOAD, IMPORTS_PAYLOAD, RUNS_PAYLOAD, tenantPayload } from "./helpers/cloud-billing.fixture";

// B-SAN3-06b E8 — Cloud Billing, adaptado ao B-ASS-10b (T5; plano v2 §8.2). Ficam com a MESMA propriedade, sobre a tela
// nova: T11, T12 (estendido pelo T-DIN-2), T13, T14, T16, T17, T18, T19, T46, T47, T48 (A1) e T49. Saíram, com substituto
// nomeado: T10 → T-USO-1 (`ass-10b-uso-medido.smoke.test.tsx`, F10: o uso medido foi para o detalhe da organização); T15 → T-DIN-1
// (`ass-10b-dinheiro.smoke.test.tsx`); T20 → o caso da série no T-UI-3 (`ass-10b-estados.smoke.test.tsx`, F8); T45 → T-UI-1
// (`ass-10b-aparencias.smoke.test.tsx`). Fixtures com a forma dos DTOs do B-ASS-09; `fetch` é o único dublê.

const SEPTEMBER = "2026-09";
const PERIOD = periodForMonth(SEPTEMBER);
const AUGUST = "2026-08";
const AUGUST_PERIOD = periodForMonth(AUGUST);
const noop = () => undefined;

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    dispatchEvent: () => true,
  },
});

function visibleText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s/g, " ");
}

function Screen({ data, month, onMonth = noop }: { readonly data: CloudBillingData; readonly month: string; readonly onMonth?: (month: string) => void }) {
  const model = buildCloudBillingView({ data, series: { months: monthsEndingAt(data.month, 6), global: {}, tenant: {} }, groupDetails: {}, ui: INITIAL_UI, currentMonth: "2026-11", today: "2026-11-14" });
  const handlers = { onTarget: noop, onToggleRow: noop, onClearTarget: noop, onMode: noop, onSearch: noop, onMonth, onAction: noop, onRetrySeries: noop };
  return <PlatformCloudBillingScreen data={data} loading={false} month={month} model={model} access={NO_WRITE_ACCESS} appearance="A" handlers={handlers} onRetry={noop} />;
}

function screen(data: CloudBillingData, month = SEPTEMBER): string {
  return renderToString(<Screen data={data} month={month} />);
}

/** A resposta do servidor para cada leitura do mês (a forma dos DTOs do B-ASS-09). */
function payloadFor(url: string, overrides: { readonly totalCost?: string } = {}): unknown {
  const parsed = new URL(url, "http://localhost");
  const month = parsed.searchParams.get("period") ?? SEPTEMBER;
  if (parsed.pathname.endsWith("/platform/billing/overview")) {
    const groupBy = parsed.searchParams.get("groupBy");
    if (groupBy === "group") return groupPayload(month);
    if (groupBy === "global") return globalPayload(month, undefined, globalJson(overrides.totalCost ? { totalCost: overrides.totalCost } : {}));
    return tenantPayload(month);
  }
  if (parsed.pathname.endsWith("/platform/billing/fx-rates")) return FX_PAYLOAD;
  if (parsed.pathname.endsWith("/platform/billing/economic-groups")) return GROUPS_PAYLOAD;
  const periodMonth = (parsed.searchParams.get("periodStart") ?? `${SEPTEMBER}-01`).slice(0, 7);
  if (parsed.pathname.endsWith("/platform/cloud-costs/imports")) return IMPORTS_PAYLOAD.map((item) => ({ ...item, periodStart: `${periodMonth}-01T00:00:00.000Z` }));
  if (parsed.pathname.endsWith("/platform/cloud-cost-allocations/runs")) return RUNS_PAYLOAD.map((item) => ({ ...item, periodStart: `${periodMonth}-01T00:00:00.000Z` }));
  return {};
}

function json(data: unknown, status = 200, reason?: string): Response {
  const body = status >= 400 ? { error: { code: "ERRO", reason: reason ?? "erro", message: "falha" } } : { data };
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function withFetch<T>(handler: (url: string, init?: RequestInit) => Promise<Response> | Response, run: () => Promise<T>): Promise<T> {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
}

// T10 (adapter de uso) migrou para o T-USO-1 (`ass-10b-uso-medido.smoke.test.tsx`, B-ASS-10b F10): o uso medido saiu da
// tela de custos e foi para o detalhe da organização.

test("T11 adapter da visão descarta linha de organização sem identidade e guarda a linha 'Sem grupo'", () => {
  const tenant = mapTenantOverview(tenantPayload(SEPTEMBER, undefined, [...(tenantPayload().lines as Record<string, unknown>[]), { tenantName: "sem id", allocatedCost: "9.99" }]));
  assert.equal(tenant.lines.length, 5);
  assert.equal(tenant.lines.some((line) => line.tenantName === "sem id"), false);
  const group = mapGroupOverview(groupPayload(SEPTEMBER));
  assert.equal(group.lines.length, 2);
  assert.equal(group.lines[1]!.groupId, null);
});

test("T12 adapter não converte dinheiro: string decimal fica literal; número, vazio e lixo viram ausência, nunca zero", () => {
  const lines = [
    { tenantId: "t1", tenantName: "Org Um", allocatedCost: "12.00", margin: "1.50", marginPct: "11.11", subscriptionAmount: "13.50", alert: "none" },
    { tenantId: "t2", tenantName: "Org Dois", allocatedCost: 12, margin: "", marginPct: "abc", subscriptionAmount: 0, alert: "none" },
  ];
  const tenant = mapTenantOverview(tenantPayload(SEPTEMBER, undefined, lines));
  assert.equal(tenant.lines[0]!.allocatedCost, "12.00");
  assert.equal(tenant.lines[0]!.margin, "1.50");
  assert.equal(tenant.lines[1]!.allocatedCost, null);
  assert.equal(tenant.lines[1]!.margin, null);
  assert.equal(tenant.lines[1]!.marginPct, null);
  assert.equal(tenant.lines[1]!.subscriptionAmount, null);
});

test("T13 tela não contém cobrança por markup", async () => {
  const data = await withFetch((url) => json(payloadFor(url)), () => getCloudBilling(SEPTEMBER));
  const html = visibleText(screen(data));
  assert.match(html, /Cloud Billing/);
  assert.match(html, /Margem global/, "controle: a tela de verdade foi desenhada");
  assert.doesNotMatch(html, /Valor cobrável|Organizações com cobrança|Cobrança por organização|markup/i);
});

test("T14 serviço envia o mesmo mês às 7 leituras, todas GET, e respeita ano bissexto", async () => {
  const calls: { url: string; method: string }[] = [];
  const result = await withFetch(
    (url, init) => {
      calls.push({ url, method: init?.method ?? "GET" });
      return json(payloadFor(url));
    },
    () => getCloudBilling(SEPTEMBER),
  );
  assert.equal(result.source, "api");
  assert.equal(calls.length, 7);
  for (const call of calls) assert.equal(call.method, "GET", call.url);
  const overview = calls.filter((call) => call.url.includes("/platform/billing/overview"));
  assert.deepEqual(overview.map((call) => new URL(call.url, "http://x").searchParams.get("groupBy")).sort(), ["global", "group", "tenant"]);
  for (const call of overview) assert.match(call.url, /period=2026-09/);
  assert.match(calls.find((call) => call.url.includes("fx-rates"))!.url, /from=2026-04&to=2026-09/);
  for (const call of calls.filter((item) => /cloud-costs\/imports|cloud-cost-allocations\/runs/.test(item.url))) assert.match(call.url, /periodStart=2026-09-01&periodEnd=2026-09-30/);
  assert.deepEqual(periodForMonth("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
});

test("T16 um 403 em qualquer leitura fecha a tela por permissão", async () => {
  let count = 0;
  const result = await withFetch((url) => (++count === 3 ? json(null, 403) : json(payloadFor(url))), () => getCloudBilling(SEPTEMBER));
  assert.equal(result.forbidden, true);
  assert.equal(result.source, "fallback");
  const html = screen(result);
  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(visibleText(html), /R\$|Custo total/);
});

test("T17 erro de leitura devolve falha sem zero apresentado como fato", async () => {
  const result = await withFetch((url) => (url.includes("groupBy=global") ? json(null, 500, "overview_integrity_violation") : json(payloadFor(url))), () => getCloudBilling(SEPTEMBER));
  assert.equal(result.source, "fallback");
  assert.equal(result.failure, "overview_integrity_violation");
  assert.equal(result.global, null);
  const html = screen(result);
  assert.match(html, /Não foi possível carregar o custo e a margem/);
  assert.doesNotMatch(visibleText(html), /R\$|\d/);
});

test("T18 respostas vazias preservam o estado vazio", async () => {
  const emptyGlobal = globalJson({ subscriptionTotal: null, tenantsCost: null, platformOwnCost: null, unallocatedOther: null, unallocatedByReason: [], roundingResidualCost: null, conversionResidualCost: null, totalCost: null, margin: null, marginPct: null, alert: "cost_missing" });
  const noRun = { status: "no_run", coverage: "none", runId: null, importId: null, currencyOriginal: null, fxRate: null, fxRateVersion: null, warnings: [], sources: { runs: 0, importIds: [], usedImportId: null } };
  const result = await withFetch(
    (url) => {
      if (url.includes("groupBy=global")) return json(globalPayload(SEPTEMBER, noRun, emptyGlobal));
      if (url.includes("groupBy=group")) return json({ ...groupPayload(SEPTEMBER, noRun), lines: [], totals: { subscriptionAmount: null, allocatedCost: null, margin: null, marginPct: null } });
      if (url.includes("/overview")) return json(tenantPayload(SEPTEMBER, noRun, [], { subscriptionAmount: null, allocatedCost: null, margin: null, marginPct: null }));
      return json([]);
    },
    () => getCloudBilling(SEPTEMBER),
  );
  assert.equal(result.source, "api");
  assert.equal(result.imports?.length, 0);
  const html = screen(result);
  assert.match(html, /Nenhum custo nem assinatura em setembro de 2026/);
  assert.doesNotMatch(visibleText(html), /R\$/);
});

test("T19 modo demonstração é vazio e o fixture antigo não existe", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const result = await getCloudBilling(SEPTEMBER);
    assert.equal(result.source, "mock");
    assert.equal(result.imports, null);
    assert.equal(result.global, null);
    assert.equal(existsSync(new URL("../src/modules/platform/cloud-billing/cloud-billing.mock.ts", import.meta.url)), false);
    const html = screen(result);
    assert.match(html, /Nenhum custo nem assinatura em/);
    assert.doesNotMatch(visibleText(html), /R\$|Techsolutions Industrial/);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

// A1 da revisão do PR 411 — o dinheiro exibido é sempre do período rotulado. Agosto tem um custo total que setembro não
// tem (9.999,99 × 8.258,91): se ele aparecer sob "setembro de 2026", a tela mentiu sobre dinheiro.
async function augustData(): Promise<CloudBillingData> {
  return withFetch((url) => json(payloadFor(url, { totalCost: "9999.99" })), () => getCloudBilling(AUGUST));
}

test("T46 dado de outro mês nunca aparece sob o rótulo do mês selecionado (A1)", async () => {
  const august = await augustData();
  const otherMonth = [august, emptyCloudBilling(AUGUST, AUGUST_PERIOD, "api"), emptyCloudBilling(AUGUST, AUGUST_PERIOD, "fallback"), { ...emptyCloudBilling(AUGUST, AUGUST_PERIOD, "fallback"), forbidden: true }];
  for (const data of otherMonth) {
    const html = screen(data, SEPTEMBER);
    assert.match(html, /aria-busy="true"/);
    assert.doesNotMatch(visibleText(html), /R\$|9\.999|Nenhum custo|Acesso não permitido|Não foi possível/);
  }
  // Controle: o mesmo dado sob o rótulo do PRÓPRIO mês aparece — a guarda não esconde dinheiro do período certo.
  const own = visibleText(screen(august, AUGUST));
  assert.match(own, /agosto de 2026/);
  assert.match(own, /R\$ 9\.999,99/);
});

test("T47 resposta atrasada do mês anterior é descartada e o mês novo não herda o anterior (A1)", async () => {
  let releaseAugust: () => void = () => undefined;
  const augustGate = new Promise<void>((resolve) => {
    releaseAugust = resolve;
  });
  await withFetch(
    async (url) => {
      const isAugust = /period=2026-08|periodStart=2026-08-01|to=2026-08/.test(url);
      if (!isAugust) return json(payloadFor(url));
      await augustGate;
      return json(payloadFor(url, { totalCost: "9999.99" }));
    },
    async () => {
      // O usuário abre agosto (resposta lenta) e troca para setembro antes de ela chegar — serviço e regra reais.
      let state = emptyCloudBilling(AUGUST, AUGUST_PERIOD, "api");
      const augustRequest = getCloudBilling(AUGUST);
      const september = await getCloudBilling(SEPTEMBER);
      state = nextCloudBillingState(state, september, false, PERIOD);
      releaseAugust();
      const august = await augustRequest;
      assert.equal(august.global?.global.totalCost, "9999.99"); // controle: a resposta atrasada é real e diferente
      state = nextCloudBillingState(state, august, false, PERIOD);
      state = nextCloudBillingState(state, august, true, PERIOD);
      assert.deepEqual(state.period, PERIOD);
      assert.equal(state.global?.global.totalCost, "8258.91");
      const text = visibleText(screen(state, SEPTEMBER));
      assert.match(text, /setembro de 2026/);
      assert.match(text, /R\$ 8\.258,91/);
      assert.doesNotMatch(text, /9\.999/);

      // Agosto na tela e a 1ª resposta de setembro é uma falha em 2º plano: a tela mostra a falha de setembro, não
      // agosto marcado como "desatualizado".
      const failed = { ...emptyCloudBilling(SEPTEMBER, PERIOD, "fallback"), failure: "unavailable" as const };
      const afterFailure = nextCloudBillingState(august, failed, true, PERIOD);
      assert.deepEqual(afterFailure.period, PERIOD);
      assert.equal(afterFailure.global, null);
      assert.equal(afterFailure.stale, false);
      const failureText = visibleText(screen(afterFailure, SEPTEMBER));
      assert.match(failureText, /Não foi possível carregar o custo e a margem/);
      assert.doesNotMatch(failureText, /R\$|9\.999/);

      // Dentro do mesmo período a regra do E1b continua: falha em 2º plano preserva setembro com o aviso.
      const kept = nextCloudBillingState(state, failed, true, PERIOD);
      assert.equal(kept.stale, true);
      assert.equal(kept.global?.global.totalCost, "8258.91");
      assert.match(visibleText(screen(kept, SEPTEMBER)), /Dados desatualizados/);
    },
  );
});

// Fiação do hook (guarda de forma, declarada como tal): o hook descarta a resposta pelo período selecionado AGORA e aplica
// a regra de T47, não a genérica `nextRefreshState`.
test("T48 o hook de Cloud Billing descarta resposta de outro período e usa a regra de T47 (A1)", () => {
  const hook = readFileSync(new URL("../src/modules/platform/cloud-billing/useCloudBilling.ts", import.meta.url), "utf8");
  assert.match(hook, /selected\.current = period;/);
  assert.match(hook, /if \(!isSamePeriod\(next\.period, selected\.current\)\)/);
  assert.match(hook, /setData\(\(current\) => nextCloudBillingState\(current, next, background, selected\.current\)\)/);
  assert.doesNotMatch(hook, /nextRefreshState/);
});

// A2 da revisão do PR 411 — o vazio diz "Escolha outro mês": o seletor tem de estar lá e de trocar o mês.
function findElement(node: unknown, predicate: (element: React.ReactElement) => boolean): React.ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  if (typeof node.type === "function") {
    try {
      return findElement((node.type as (props: unknown) => unknown)(node.props), predicate);
    } catch {
      // componente com hooks fica fora do alcance sem DOM; segue pelos filhos
    }
  }
  return findElement((node.props as { children?: unknown }).children, predicate);
}

test("T49 estado vazio oferece o seletor de mês que o texto promete (A2)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const month = currentBillingMonth();
    const states = [emptyCloudBilling(month, periodForMonth(month), "mock"), await getCloudBilling(month)];
    for (const data of states) {
      const html = renderToString(<Screen data={data} month={month} />);
      assert.match(html, /Nenhum custo nem assinatura em/);
      assert.match(html, /Escolha outro mês/);
      assert.match(html, /<select[^>]*aria-label="Mês de referência"/);
      assert.equal(html.match(/<option /g)?.length, 12);
      const chosen: string[] = [];
      const tree = Screen({ data, month, onMonth: (next) => chosen.push(next) });
      const select = findElement(tree, (element) => element.type === "select");
      assert.ok(select, "o estado vazio não tem <select>");
      (select.props as { onChange: (event: { target: { value: string } }) => void }).onChange({ target: { value: "2026-08" } });
      assert.deepEqual(chosen, ["2026-08"]);
    }
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T13 (controle) a aparência A rende sem dado do mês e marca a raiz com a letra", () => {
  const model = buildCloudBillingView({ data: emptyCloudBilling(SEPTEMBER, PERIOD, "api"), series: { months: monthsEndingAt(SEPTEMBER, 6), global: {}, tenant: {} }, groupDetails: {}, ui: INITIAL_UI, currentMonth: "2026-11", today: "2026-11-14" });
  const html = renderToString(<CloudBillingViewA model={model} access={NO_WRITE_ACCESS} onTarget={noop} onToggleRow={noop} onClearTarget={noop} onMode={noop} onSearch={noop} onMonth={noop} onAction={noop} onRetrySeries={noop} />);
  assert.match(html, /data-aparencia="A"/);
});
