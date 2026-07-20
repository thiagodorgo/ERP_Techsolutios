import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { ClickableKpiCard, KpiDetailModal } from "../src/components/kpi";
import type { KpiDetail } from "../src/components/kpi";
import { buildInventoryKpiDetails } from "../src/modules/inventory/inventory-kpi-detail";
import { buildCommissionsKpiDetails } from "../src/modules/finance/commissions/commissions-kpi-detail";
import { buildFinesKpiDetails } from "../src/modules/fleet/fines/fines-kpi-detail";
import { buildFuelKpiDetails } from "../src/modules/fleet/fuel/fuel-kpi-detail";
import { buildInsuranceKpiDetails } from "../src/modules/fleet/insurance/insurance-kpi-detail";
import { buildDamagesKpiDetails } from "../src/modules/fleet/damages/damages-kpi-detail";

// WS-CARDS-CHARTS-F2 (PR2b) — prova que os cards das 6 telas instrumentadas (Estoque, Remunerações e as 4 de
// Frota) viraram alvos clicáveis reais (role="button" + aria-haspopup="dialog") e que o pop-up mostra SÓ dado
// já carregado: breakdown/explain honestos, source vivo do hook e NUNCA gráfico (nenhuma série real fora do
// Dashboard). Telas mock → o modal supõe o selo "Dados de exemplo" e não renderiza chart (D-007).

const canAll = () => true;
const canNone = () => false;

function renderModal(detail: KpiDetail): string {
  return renderToString(
    <MemoryRouter>
      <KpiDetailModal detail={detail} open onClose={() => undefined} />
    </MemoryRouter>,
  );
}

// TrendChart renderiza role="img"; breakdown/explain nunca. Guardião anti-chart desta superfície.
function assertNoChart(html: string) {
  assert.doesNotMatch(html, /role="img"/);
}

// ── Envolver, não reescrever ──────────────────────────────────────────────────────────
test("ClickableKpiCard envolve o card e vira alvo clicável (role=button + aria-haspopup + teclado)", () => {
  const html = renderToString(
    <MemoryRouter>
      <ClickableKpiCard detail={{ title: "Itens ativos", value: "12", body: { kind: "explain", text: "x" } }}>
        <div className="work-orders-kpi">conteúdo original do card</div>
      </ClickableKpiCard>
    </MemoryRouter>,
  );
  assert.match(html, /role="button"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /conteúdo original do card/);
});

// ── Estoque ───────────────────────────────────────────────────────────────────────────
const INV_TOTALS = { activeItems: 40, belowMinItems: 5, needsReorderItems: 3, movementsCount: 18 };

test("Estoque: 4 cards com breakdown/explain honesto; nenhum chart; source vivo (api)", () => {
  const d = buildInventoryKpiDetails(INV_TOTALS, 42, 120, "api", "api", canAll);
  assert.equal(d.activeItems.body.kind, "breakdown");
  assert.equal(d.belowMin.body.kind, "explain");
  assert.equal(d.needsReorder.body.kind, "explain");
  assert.equal(d.movements.body.kind, "explain");

  const activeHtml = renderModal(d.activeItems);
  assert.match(activeHtml, /Abaixo do mínimo/);
  assert.match(activeHtml, /itens carregados/);
  assertNoChart(activeHtml);

  // Card de Movimentações usa movementsSource e mostra "N de M no servidor".
  assert.equal(d.movements.value, "18");
  assert.match(d.movements.caption ?? "", /18 de 120 no servidor/);
  assertNoChart(renderModal(d.movements));
});

test("Estoque: cta 'Precisam repor'→/purchase-orders SÓ com purchase_orders:read", () => {
  const allowed = buildInventoryKpiDetails(INV_TOTALS, 42, 120, "api", "api", (p) => p === "purchase_orders:read");
  assert.equal(allowed.needsReorder.cta?.to, "/purchase-orders");

  const denied = buildInventoryKpiDetails(INV_TOTALS, 42, 120, "api", "api", canNone);
  assert.equal(denied.needsReorder.cta, undefined);
  // Sem cta cross-route, o pop-up segue útil (explain), sem oferecer rota bloqueada.
  const html = renderModal(denied.needsReorder);
  assert.doesNotMatch(html, /Ver pedidos de compra/);
});

test("Estoque: source mock/fallback é passthrough → modal mostra selo honesto, sem chart", () => {
  const mock = buildInventoryKpiDetails(INV_TOTALS, 42, 120, "mock", "mock", canAll);
  const html = renderModal(mock.activeItems);
  assert.match(html, /Dados de exemplo/);
  assertNoChart(html);

  const fb = buildInventoryKpiDetails(INV_TOTALS, 42, 120, "fallback", "fallback", canAll);
  assert.match(renderModal(fb.belowMin), /último dado local/);
});

// ── Remunerações ──────────────────────────────────────────────────────────────────────
test("Remunerações: 3 cards explain reusando operatorCount/commissionCount; source vivo; sem chart", () => {
  const summary = { total: 12345.6, from: "2026-07-01", to: "2026-07-31" };
  const d = buildCommissionsKpiDetails(summary, 4, 9, "api");
  assert.equal(d.total.body.kind, "explain");
  assert.equal(d.operators.value, "4");
  assert.equal(d.commissions.value, "9");
  const html = renderModal(d.total);
  assert.match(html, /Soma dos valores de comissão/);
  assertNoChart(html);
  // mock → selo honesto
  assert.match(renderModal(buildCommissionsKpiDetails(summary, 4, 9, "mock").operators), /Dados de exemplo/);
});

// ── Multas ────────────────────────────────────────────────────────────────────────────
test("Multas: 3 cards explain; valores da janela; source vivo; sem chart; sem cta", () => {
  const d = buildFinesKpiDetails({ count: 7, totalValor: 2500, dueSoonCount: 2 }, "api");
  assert.equal(d.total.value, "7");
  assert.equal(d.dueSoon.body.kind, "explain");
  assert.equal(d.total.cta, undefined);
  const html = renderModal(d.dueSoon);
  assert.match(html, /até 7 dias/);
  assertNoChart(html);
});

// ── Abastecimento ─────────────────────────────────────────────────────────────────────
test("Abastecimento: 4 cards explain; km/L com base derivada; source vivo; sem chart", () => {
  const d = buildFuelKpiDetails(
    { count: 10, totalLiters: 500, totalValue: 3000, fleetKmPerL: 8.5, vehiclesWithEfficiency: 2 },
    "api",
  );
  assert.equal(d.kmL.body.kind, "explain");
  assert.match(d.kmL.caption ?? "", /2 viatura\(s\) com consumo derivado/);
  const html = renderModal(d.kmL);
  assert.match(html, /base é menor que o total de lançamentos/);
  assertNoChart(html);
});

// ── Seguros ───────────────────────────────────────────────────────────────────────────
test("Seguros: 'Total' = breakdown com hint 'subconjunto das vigentes' (não é partição)", () => {
  const d = buildInsuranceKpiDetails({ count: 20, vigenteCount: 15, expiringSoonCount: 4, vencidaCount: 5 }, "api");
  assert.equal(d.total.body.kind, "breakdown");
  const html = renderModal(d.total);
  assert.match(html, /subconjunto das vigentes/); // impede sugerir soma falsa
  assertNoChart(html);
  assert.equal(d.vigentes.body.kind, "explain");
});

// ── Danos ─────────────────────────────────────────────────────────────────────────────
test("Danos: 'Total' = breakdown com partição limpa por situação; sem chart", () => {
  const d = buildDamagesKpiDetails({ count: 9, registradoCount: 3, emTratativaCount: 4, resolvidoCount: 2 }, "api");
  assert.equal(d.total.body.kind, "breakdown");
  const html = renderModal(d.total);
  assert.match(html, /Registrados/);
  assert.match(html, /Em tratativa/);
  assert.match(html, /Resolvidos/);
  assertNoChart(html);
});
