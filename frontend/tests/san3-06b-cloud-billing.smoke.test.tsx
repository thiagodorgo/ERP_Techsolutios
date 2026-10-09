import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import {
  mapAllocationSummary,
  mapChargeSummary,
  mapCostSummary,
  mapUsageSummary,
} from "../src/modules/platform/cloud-billing/cloud-billing.adapter";
import {
  currentBillingMonth,
  getCloudBilling,
  getCloudCostSummary,
  periodForMonth,
} from "../src/modules/platform/cloud-billing/cloud-billing.service";
import { nextCloudBillingState } from "../src/modules/platform/cloud-billing/cloud-billing.state";
import type { CloudBillingData } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { emptyCloudBilling } from "../src/modules/platform/cloud-billing/cloud-billing.types";
import { PlatformCloudBillingScreen, PlatformCloudBillingView } from "../src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage";

// B-SAN3-06b E8 — Cloud Billing (T10–T20, T45). Fixtures com a forma dos DTOs do backend (§4.1); a `Screen` recebe o
// resultado REAL do serviço (`fetch` é o único dublê) e escolhe o estado §7; a `View` recebe o estado controlado.

const PERIOD = { start: "2026-09-01", end: "2026-09-30" } as const;

function screen(data: CloudBillingData): string {
  return renderToString(<PlatformCloudBillingScreen data={data} loading={false} month="2026-09" />);
}

function visibleText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
}

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

function realData(overrides: Partial<CloudBillingData> = {}): CloudBillingData {
  return {
    period: PERIOD,
    usage: { periodStart: PERIOD.start, periodEnd: PERIOD.end, metrics: [{ metricKey: "api_requests_count", quantity: 4, unit: "count" }], generatedAt: "2026-09-30T12:00:00Z" },
    costs: { provider: "aws", periodStart: PERIOD.start, periodEnd: PERIOD.end, totalUnblendedCost: 12.75, totalUnblendedCostExact: "12.750000", lineItemCount: 2, currencies: ["BRL"], services: [{ serviceCode: "AmazonEC2", unblendedCost: 12.75, currency: "BRL" }], generatedAt: "2026-09-30T12:00:00Z" },
    allocation: { periodStart: PERIOD.start, periodEnd: PERIOD.end, currency: "BRL", totalImportedCost: 12.75, totalAllocatedCost: 12, totalUnallocatedCost: 0.75, tenants: [{ tenantId: "t1", tenantName: "Org Um", allocatedCost: 12, allocationRatio: 0.94 }], services: [], generatedAt: "2026-09-30T12:00:00Z" },
    charges: { periodStart: PERIOD.start, periodEnd: PERIOD.end, currency: "BRL", totalAllocatedCost: 12, totalChargeAmount: 18, totalMarginAmount: 6, totalDiscountAmount: 0, totalMarginPercentage: 33.33, tenants: [{ tenantId: "t1", tenantName: "Org Um", allocatedCost: 12, finalChargeAmount: 18, marginAmount: 6, marginPercentage: 33.33, status: "ready" }], generatedAt: "2026-09-30T12:00:00Z" },
    imports: [{ id: "i1", provider: "aws", status: "completed", importedAt: "2026-09-30T12:00:00Z", rowCount: 2, currency: "BRL" }],
    source: "api",
    forbidden: false,
    stale: false,
    ...overrides,
  };
}

function responseFor(url: string, status = 200): Response {
  let data: unknown = {};
  if (url.includes("cloud-usage/summary")) data = realData().usage;
  else if (url.includes("cloud-costs/summary")) data = realData().costs;
  else if (url.includes("cloud-cost-allocations/summary")) data = realData().allocation;
  else if (url.includes("cloud-charges/summary")) data = realData().charges;
  else if (url.includes("cloud-costs/imports")) data = realData().imports;
  return new Response(JSON.stringify({ data }), { status, headers: { "Content-Type": "application/json" } });
}

test("T10 adapter de uso espelha métricas reais", () => {
  const result = mapUsageSummary({ periodStart: PERIOD.start, periodEnd: PERIOD.end, metrics: [{ metricKey: "api_requests_count", quantity: 4, unit: "count" }], generatedAt: "agora" });
  assert.equal(result.metrics.length, 1);
  assert.equal(result.metrics[0].quantity, 4);
  assert.equal("totalComputeHours" in result, false);
});

test("T11 adapter de custos descarta serviço sem identidade", () => {
  const result = mapCostSummary({ provider: "aws", periodStart: PERIOD.start, periodEnd: PERIOD.end, totalUnblendedCost: 12.75, totalUnblendedCostExact: "12.750000", lineItemCount: 2, currencies: ["BRL"], services: [{ serviceCode: "AmazonEC2", unblendedCost: 12.75, currency: "BRL" }, { unblendedCost: 9 }] });
  assert.equal(result.totalUnblendedCost, 12.75);
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].serviceCode, "AmazonEC2");
  assert.equal("tenants" in result, false);
});

test("T12 adapter de rateio não converte string em dinheiro", () => {
  const result = mapAllocationSummary({ periodStart: PERIOD.start, periodEnd: PERIOD.end, totalAllocatedCost: 12, totalUnallocatedCost: 0, tenants: [{ tenantId: "t1", tenantName: "Org Um", allocatedCost: 12, allocationRatio: 1 }, { tenantId: "t2", allocatedCost: "12", allocationRatio: 0 }] });
  assert.equal(result.totalAllocatedCost, 12);
  assert.equal(result.totalUnallocatedCost, 0);
  assert.equal(result.tenants[0].allocatedCost, 12);
  assert.equal(result.tenants[1].allocatedCost, 0);
});

test("T13 adapter de cobrança preserva status cru e valores do DTO", () => {
  const result = mapChargeSummary({ periodStart: PERIOD.start, periodEnd: PERIOD.end, totalChargeAmount: 18, totalMarginAmount: 6, tenants: [{ tenantId: "t1", allocatedCost: 12, finalChargeAmount: 18, marginAmount: 6, status: "ready" }, { tenantId: "t2", status: "custom" }] });
  assert.equal(result.totalChargeAmount, 18);
  assert.equal(result.totalMarginAmount, 6);
  assert.equal(result.tenants[0].finalChargeAmount, 18);
  assert.equal(result.tenants[1].status, "custom");
  const current = realData();
  const html = renderToString(<PlatformCloudBillingView data={realData({ charges: current.charges ? { ...current.charges, tenants: [{ ...current.charges.tenants[0], status: "custom" }] } : null })} month="2026-09" />);
  assert.match(html, /Indefinida/);
  assert.doesNotMatch(visibleText(html), /custom/);
});

test("T14 serviço envia o mesmo período aos cinco GETs e respeita ano bissexto", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    urls.push(url);
    return responseFor(url);
  }) as typeof fetch;
  try {
    const result = await getCloudBilling(PERIOD);
    assert.equal(result.source, "api");
    assert.equal(urls.length, 5);
    for (const url of urls) assert.match(url, /periodStart=2026-09-01&periodEnd=2026-09-30/);
    assert.deepEqual(periodForMonth("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T15 visão de Cloud Billing mostra apenas valores e rótulos do payload", () => {
  const html = renderToString(<PlatformCloudBillingView data={realData()} month="2026-09" />);
  for (const label of ["Custo importado", "Linhas de custo", "Custo rateado", "Não rateado", "Valor cobrável", "Margem", "Organizações com cobrança", "Última importação"]) assert.match(html, new RegExp(label));
  assert.match(html, /AmazonEC2/);
  assert.match(html, /Org Um/);
  assert.match(html, /Requisições da API/);
  assert.match(html, /Pronta/);
  const text = visibleText(html);
  // Valores do fixture formatados em pt-BR (Intl separa "R$" do número com espaço não separável, coberto por \s).
  assert.match(text, /R\$\s12,75/); // custo importado = totalUnblendedCost
  assert.match(text, /R\$\s12,00/); // custo rateado = totalAllocatedCost
  assert.match(text, /R\$\s0,75/); // não rateado = totalUnallocatedCost
  assert.match(text, /R\$\s18,00/); // valor cobrável = totalChargeAmount
  assert.match(text, /R\$\s6,00 · 33,33%/); // margem + percentual do DTO
  assert.match(text, /4 unid\./); // uso medido
  assert.doesNotMatch(html, /O que mudou|Junho 2026|há 4 min|48,2k|Produção|IA/);
});

test("T16 um 403 em qualquer leitura fecha a tela por permissão", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = (async (input) => responseFor(String(input), ++count === 3 ? 403 : 200)) as typeof fetch;
  try {
    const result = await getCloudBilling(PERIOD);
    assert.equal(result.forbidden, true);
    assert.equal(result.source, "fallback");
    const html = screen(result);
    assert.match(html, /Acesso não permitido/);
    assert.doesNotMatch(visibleText(html), /R\$|Custo importado/);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T17 erro de leitura devolve falha sem zero apresentado como fato", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  globalThis.fetch = (async (input) => responseFor(String(input), String(input).includes("cloud-usage") ? 500 : 200)) as typeof fetch;
  try {
    const result = await getCloudBilling(PERIOD);
    assert.equal(result.source, "fallback");
    assert.equal(result.costs, null);
    const html = screen(result);
    assert.match(html, /Não foi possível carregar Cloud Billing/);
    assert.doesNotMatch(visibleText(html), /R\$|\d/);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T18 cinco respostas vazias preservam o estado vazio", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    const payload = url.includes("imports") ? [] : {};
    return new Response(JSON.stringify({ data: payload }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await getCloudBilling(PERIOD);
    assert.equal(result.source, "api");
    assert.equal(result.imports.length, 0);
    assert.equal(result.costs?.lineItemCount, 0);
    const html = screen(result);
    assert.match(html, /Nenhum custo importado no período/);
    assert.doesNotMatch(visibleText(html), /R\$/);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T19 modo demonstração é vazio e o fixture antigo não existe", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const result = await getCloudBilling(PERIOD);
    const summary = await getCloudCostSummary(PERIOD);
    assert.equal(result.source, "mock");
    assert.equal(result.imports.length, 0);
    assert.equal(summary.data, null);
    assert.equal(existsSync(new URL("../src/modules/platform/cloud-billing/cloud-billing.mock.ts", import.meta.url)), false);
    const html = screen(result);
    assert.match(html, /Nenhum custo importado no período/);
    assert.doesNotMatch(visibleText(html), /R\$|Techsolutions Industrial/);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T20 lacuna de série diária aparece como selo, sem projeção inventada", () => {
  const html = renderToString(<PlatformCloudBillingView data={realData()} month="2026-09" />);
  assert.match(html, /Série diária e projeção/);
  assert.match(html, /não há uma série temporal nem projeção/);
});

test("T45 margem sem percentual do DTO não ganha percentual calculado", () => {
  const current = realData();
  const withoutPercentage = realData({
    charges: current.charges ? { ...current.charges, totalMarginPercentage: undefined, tenants: current.charges.tenants.map((tenant) => ({ ...tenant, marginPercentage: undefined })) } : null,
  });
  const html = renderToString(<PlatformCloudBillingView data={withoutPercentage} month="2026-09" />);
  const visibleText = html.replace(/<[^>]+>/g, " ");
  assert.match(visibleText, /percentual não informado/);
  assert.doesNotMatch(visibleText, /%/);
});

// A1 da revisão do PR 411 — o dinheiro exibido é sempre do período rotulado. Agosto tem um "Valor cobrável" que
// setembro não tem (999,99 × 18,00): se ele aparecer sob "setembro de 2026", a tela mentiu sobre dinheiro.
const AUGUST = periodForMonth("2026-08");

function augustData(): CloudBillingData {
  const base = realData();
  return { ...base, period: AUGUST, charges: base.charges ? { ...base.charges, periodStart: AUGUST.start, periodEnd: AUGUST.end, totalChargeAmount: 999.99 } : null };
}

test("T46 dado de outro mês nunca aparece sob o rótulo do mês selecionado (A1)", () => {
  const otherMonth = [augustData(), emptyCloudBilling(AUGUST, "api"), emptyCloudBilling(AUGUST, "fallback"), { ...emptyCloudBilling(AUGUST, "fallback"), forbidden: true }];
  for (const data of otherMonth) {
    const html = screen(data);
    assert.match(html, /aria-busy="true"/);
    assert.doesNotMatch(visibleText(html), /R\$|999|Nenhum custo importado|Acesso não permitido|Não foi possível/);
  }
  // Controle: o mesmo dado sob o rótulo do PRÓPRIO mês aparece — a guarda não esconde dinheiro do período certo.
  const own = visibleText(renderToString(<PlatformCloudBillingScreen data={augustData()} loading={false} month="2026-08" />));
  assert.match(own, /agosto de 2026/);
  assert.match(own, /R\$\s999,99/);
});

test("T47 resposta atrasada do mês anterior é descartada e o mês novo não herda o anterior (A1)", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  let releaseAugust: () => void = () => undefined;
  const augustGate = new Promise<void>((resolve) => { releaseAugust = resolve; });
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (!url.includes(`periodStart=${AUGUST.start}`)) return responseFor(url);
    await augustGate;
    const charges = url.includes("cloud-charges/summary") ? { ...realData().charges, totalChargeAmount: 999.99 } : null;
    return charges ? new Response(JSON.stringify({ data: charges }), { status: 200, headers: { "Content-Type": "application/json" } }) : responseFor(url);
  }) as typeof fetch;
  try {
    // O usuário abre agosto (resposta lenta) e troca para setembro antes de ela chegar — serviço e regra reais.
    let state = emptyCloudBilling(AUGUST, "api");
    const augustRequest = getCloudBilling(AUGUST);
    const september = await getCloudBilling(PERIOD);
    state = nextCloudBillingState(state, september, false, PERIOD);
    releaseAugust();
    const august = await augustRequest;
    assert.equal(august.charges?.totalChargeAmount, 999.99); // controle: a resposta atrasada é real e diferente
    state = nextCloudBillingState(state, august, false, PERIOD);
    state = nextCloudBillingState(state, august, true, PERIOD);
    assert.deepEqual(state.period, PERIOD);
    assert.equal(state.charges?.totalChargeAmount, 18);
    const text = visibleText(renderToString(<PlatformCloudBillingScreen data={state} loading={false} month="2026-09" />));
    assert.match(text, /setembro de 2026/);
    assert.match(text, /R\$\s18,00/);
    assert.doesNotMatch(text, /999/);

    // Agosto na tela e a 1ª resposta de setembro é uma falha em 2º plano: a tela mostra a falha de setembro, não
    // agosto marcado como "desatualizado".
    const failed = emptyCloudBilling(PERIOD, "fallback");
    const afterFailure = nextCloudBillingState(august, failed, true, PERIOD);
    assert.deepEqual(afterFailure.period, PERIOD);
    assert.equal(afterFailure.charges, null);
    assert.equal(afterFailure.stale, false);
    const failureText = visibleText(renderToString(<PlatformCloudBillingScreen data={afterFailure} loading={false} month="2026-09" />));
    assert.match(failureText, /Não foi possível carregar Cloud Billing/);
    assert.doesNotMatch(failureText, /R\$|999/);

    // Dentro do mesmo período a regra do E1b continua: falha em 2º plano preserva setembro com o aviso.
    const kept = nextCloudBillingState(state, failed, true, PERIOD);
    assert.equal(kept.stale, true);
    assert.equal(kept.charges?.totalChargeAmount, 18);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// Fiação do hook (sem biblioteca de DOM no repo, como T2/T8 — guarda de forma, declarada como tal): o hook descarta a
// resposta pelo período selecionado AGORA e aplica a regra de T47, não a genérica `nextRefreshState`.
test("T48 o hook de Cloud Billing descarta resposta de outro período e usa a regra de T47 (A1)", () => {
  const hook = readFileSync(new URL("../src/modules/platform/cloud-billing/useCloudBilling.ts", import.meta.url), "utf8");
  assert.match(hook, /selected\.current = period;/);
  assert.match(hook, /if \(!isSamePeriod\(next\.period, selected\.current\)\)/);
  assert.match(hook, /setData\(\(current\) => nextCloudBillingState\(current, next, background, selected\.current\)\)/);
  assert.doesNotMatch(hook, /nextRefreshState/);
});
