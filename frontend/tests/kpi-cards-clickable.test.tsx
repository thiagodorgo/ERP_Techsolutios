import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { ClickableKpiCard, KpiDetailModal } from "../src/components/kpi";
import { buildDashboardKpiDetail, mapDashboardSource } from "../src/modules/dashboard/dashboard-kpi-detail";
import type { OperationalKpi } from "../src/modules/dashboard/types";
import { emptyTimeseries, type WorkOrderTimeseriesData } from "../src/modules/dashboard/work-order-timeseries.types";
import { buildWorkOrdersKpiDetails, pct } from "../src/modules/work-orders/work-orders-kpi-detail";
import { buildDispatchesKpiDetails } from "../src/modules/operations/dispatches/dispatches-kpi-detail";
import type { DispatchesSummary } from "../src/modules/operations/dispatches/dispatches.types";

// WS-CARDS-CHARTS-F2 (PR2a) — prova que os cards de KPI das 3 superfícies operacionais viraram alvos
// clicáveis reais (role="button" + aria-haspopup="dialog") e que o pop-up mostra SÓ dado já carregado:
// breakdown de "participação no total" e explicação honesta; gráfico só quando a série é usável (D-007).

function renderModal(detail: Parameters<typeof KpiDetailModal>[0]["detail"]): string {
  return renderToString(
    <MemoryRouter>
      <KpiDetailModal detail={detail} open onClose={() => undefined} />
    </MemoryRouter>,
  );
}

const USABLE_TS: WorkOrderTimeseriesData = {
  from: "2026-06-20",
  to: "2026-07-20",
  source: "api",
  forbidden: false,
  points: [
    { date: "2026-07-18", created: 4, completed: 2, cancelled: 0 },
    { date: "2026-07-19", created: 6, completed: 5, cancelled: 1 },
  ],
};

// Predicados de permissão para os pop-ups: `canAll` libera todas as rotas; `canNone` bloqueia tudo.
const canAll = () => true;
const canNone = () => false;

test("ClickableKpiCard envolve o card e vira alvo clicável (role=button + aria-haspopup, teclado a11y)", () => {
  const html = renderToString(
    <MemoryRouter>
      <ClickableKpiCard detail={{ title: "Total", value: "10", body: { kind: "explain", text: "corpo" } }}>
        <div>conteúdo original do card</div>
      </ClickableKpiCard>
    </MemoryRouter>,
  );
  assert.match(html, /role="button"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /tabindex="0"/);
  // O visual original é preservado (envolvido, não reescrito).
  assert.match(html, /conteúdo original do card/);
});

test("mapDashboardSource: mock→mock, error→fallback, api→api", () => {
  assert.equal(mapDashboardSource("mock"), "mock");
  assert.equal(mapDashboardSource("error"), "fallback");
  assert.equal(mapDashboardSource("api"), "api");
});

test("Dashboard 'Concluídas' com série usável → corpo gráfico (source api) com a tendência real", () => {
  const kpi: OperationalKpi = { id: "completed", label: "Concluídas", value: "42", delta: "no total", tone: "success" };
  const detail = buildDashboardKpiDetail(kpi, "api", USABLE_TS, canAll);
  assert.equal(detail.body.kind, "chart");
  assert.equal(detail.source, "api"); // regra: body=chart ⇒ source api
  assert.equal(detail.value, "42");
  const html = renderModal(detail);
  assert.match(html, /Concluídas por dia · últimos 30 dias/);
  assert.match(html, /<path/); // série plotada
});

test("Dashboard 'Concluídas' com 403 (forbidden) → degrada para explicação honesta, sem gráfico", () => {
  const kpi: OperationalKpi = { id: "completed", label: "Concluídas", value: "42", delta: "no total", tone: "success" };
  const forbidden: WorkOrderTimeseriesData = { ...emptyTimeseries("fallback"), forbidden: true };
  const detail = buildDashboardKpiDetail(kpi, "api", forbidden, canAll);
  assert.equal(detail.body.kind, "explain");
  const html = renderModal(detail);
  assert.match(html, /A série diária fica indisponível/);
  // Sem gráfico: o TrendChart renderiza role="img"; o corpo degradado não.
  assert.doesNotMatch(html, /role="img"/);
});

test("Dashboard 'Clientes' → explicação + cta para a rota confirmada /cadastros/clientes", () => {
  const kpi: OperationalKpi = { id: "customers", label: "Clientes", value: "128", delta: "no cadastro", tone: "default" };
  const detail = buildDashboardKpiDetail(kpi, "api", emptyTimeseries("api"), canAll);
  assert.equal(detail.body.kind, "explain");
  assert.equal(detail.cta?.to, "/cadastros/clientes");
  const html = renderModal(detail);
  assert.match(html, /Total de clientes ativos no cadastro/);
  assert.match(html, /Ver clientes/);
});

test("CORREÇÃO 2 — CTA de OS OMITIDA quando o papel não tem work_orders:read (não oferece rota bloqueada)", () => {
  // Com permissão: os cards de OS têm o CTA para /work-orders.
  const openCta = buildDashboardKpiDetail(
    { id: "open", label: "OS abertas", value: "5", delta: "", tone: "info" },
    "api",
    emptyTimeseries("api"),
    canAll,
  ).cta;
  assert.equal(openCta?.to, "/work-orders");

  // Sem work_orders:read (finance/inventory/support): CTA omitida em todos os cards de OS.
  for (const id of ["open", "in_progress", "completed", "overdue", "created_today"] as const) {
    const detail = buildDashboardKpiDetail(
      { id, label: id, value: "5", delta: "", tone: "info" },
      "api",
      emptyTimeseries("api"), // sem série usável → mesmo caminho explain dos cards de série
      canNone,
    );
    assert.equal(detail.cta, undefined, `card ${id} não deve oferecer CTA sem work_orders:read`);
    // O pop-up continua útil (explain), só sem botão de navegação.
    const html = renderModal(detail);
    assert.doesNotMatch(html, /Ver ordens de serviço|Ver fila/);
  }
});

test("CORREÇÃO 2 — CTA de cadastro OMITIDA sem a permissão da rota; serviços usa service_catalog:read", () => {
  const cases: { id: OperationalKpi["id"]; permission: string; to: string }[] = [
    { id: "customers", permission: "customers:read", to: "/cadastros/clientes" },
    { id: "vehicles", permission: "vehicles:read", to: "/cadastros/viaturas" },
    { id: "teams", permission: "teams:read", to: "/cadastros/equipes" },
    { id: "services", permission: "service_catalog:read", to: "/cadastros/servicos" },
  ];

  for (const { id, permission, to } of cases) {
    const kpi: OperationalKpi = { id, label: id, value: "10", delta: "", tone: "default" };
    // Só a permissão EXATA daquela rota habilita o CTA (services depende de service_catalog:read, não services:read).
    const allowed = buildDashboardKpiDetail(kpi, "api", emptyTimeseries("api"), (p) => p === permission);
    assert.equal(allowed.cta?.to, to, `${id} deve ter CTA com ${permission}`);

    const denied = buildDashboardKpiDetail(kpi, "api", emptyTimeseries("api"), canNone);
    assert.equal(denied.cta, undefined, `${id} não deve ter CTA sem ${permission}`);
  }

  // `services` NÃO é habilitado por uma permissão "services:read" inexistente.
  const servicesWrongPerm = buildDashboardKpiDetail(
    { id: "services", label: "Serviços", value: "10", delta: "", tone: "default" },
    "api",
    emptyTimeseries("api"),
    (p) => p === "services:read",
  );
  assert.equal(servicesWrongPerm.cta, undefined);
});

test("pct: razão inteira de contagens já carregadas; total 0 → 0%", () => {
  assert.equal(pct(3, 10), "30%");
  assert.equal(pct(1, 3), "33%");
  assert.equal(pct(5, 0), "0%");
});

test("WorkOrders: pop-up de 'OS abertas' = participação no total (mesmos números, D-007)", () => {
  const details = buildWorkOrdersKpiDetails({ abertas: 3, andamento: 1, urgentes: 2, concluidas: 4, total: 10 }, "api");
  const detail = details.abertas;
  assert.equal(detail.body.kind, "breakdown");
  const html = renderModal(detail);
  assert.match(html, /3 \(30%\)/);
  assert.match(html, /Total de OS/);
  assert.match(html, />10</);
});

test("Dispatches: 'Total' compõe por situação com remainder 'Rascunho' (identidade aritmética)", () => {
  const summary: DispatchesSummary = { total: 10, assigned: 2, inRoute: 1, inService: 1, completed: 3, cancelled: 1, urgent: 2 };
  const details = buildDispatchesKpiDetails(summary, "api");
  const total = details.total;
  assert.equal(total.body.kind, "breakdown");
  const html = renderModal(total);
  assert.match(html, /Rascunho/);
  // 10 - (2+1+1+3+1) = 2 rascunhos
  assert.match(html, /Atribuídos/);
  assert.match(html, /ainda não enviados/);
  // urgentes NÃO entram na composição do Total (recorte de prioridade)
  const urgent = details.urgent;
  const urgentHtml = renderModal(urgent);
  assert.match(urgentHtml, /2 \(20%\)/);
  assert.match(urgentHtml, /recorte de prioridade/);
});

test("Dispatches: remainder 'Rascunho' nunca negativo (Math.max 0)", () => {
  const summary: DispatchesSummary = { total: 4, assigned: 2, inRoute: 1, inService: 1, completed: 3, cancelled: 1, urgent: 0 };
  const details = buildDispatchesKpiDetails(summary, "api");
  const body = details.total.body;
  assert.equal(body.kind, "breakdown");
  if (body.kind === "breakdown") {
    const draft = body.parts.find((p) => p.label === "Rascunho");
    assert.equal(draft?.value, "0");
  }
});
