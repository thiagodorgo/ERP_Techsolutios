import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { MileageTab } from "../src/modules/work-orders/components/tabs/MileageTab";
import { MobileTab, MobileTimeline } from "../src/modules/work-orders/components/tabs/MobileTab";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";
import type { DispatchListItem } from "../src/modules/operations/dispatches/dispatches.types";

// Ω3F-7b — abas Mobile e Quilometragem (front). §7 (loading/vazio/erro do submit), gating por
// permissão (correção só com work_orders:mileage_correct) e PT-BR sem termo técnico cru (§11).

const ctx = { tenantId: "t1", token: "tok" };

function makeWorkOrder(overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail {
  return {
    id: "wo-1",
    code: "OS-000101",
    title: "Reboque",
    status: "in_progress",
    priority: "high",
    checklistId: null,
    createdAt: "2026-07-10T11:20:00.000Z",
    links: null,
    ...overrides,
  };
}

// --- MileageTab: exibição ---
test("MileageTab: km inicial/final, distância e origem 'Preenchido pelo app' (SSR)", () => {
  const html = renderToString(
    <MileageTab
      workOrder={makeWorkOrder({ mileageStart: 1000, mileageEnd: 1200, mileageSource: "app" })}
      context={ctx}
      permissions={["work_orders:read"]}
    />,
  );
  assert.match(html, /Km inicial/);
  assert.match(html, /Km final/);
  assert.match(html, /Distância/);
  assert.match(html, /1\.000 km/);
  assert.match(html, /1\.200 km/);
  assert.match(html, /200 km/); // distância = final − inicial
  assert.match(html, /Preenchido pelo app/);
});

test("MileageTab: origem 'Corrigido pela base' + data da correção", () => {
  const html = renderToString(
    <MileageTab
      workOrder={makeWorkOrder({ mileageStart: 800, mileageEnd: 950, mileageSource: "base", mileageCorrectedAt: "2026-07-12T09:30:00.000Z" })}
      context={ctx}
      permissions={["work_orders:read"]}
    />,
  );
  assert.match(html, /Corrigido pela base/);
  assert.match(html, /Corrigido em/);
});

test("MileageTab: estado vazio honesto quando sem km (§7)", () => {
  const html = renderToString(
    <MileageTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.match(html, /Quilometragem ainda não informada/);
});

// --- MileageTab: gating do form de correção (provado nos dois sentidos) ---
test("MileageTab: form de correção só com work_orders:mileage_correct", () => {
  const withPerm = renderToString(
    <MileageTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read", "work_orders:mileage_correct"]} />,
  );
  assert.match(withPerm, /Corrigir quilometragem/);
  assert.match(withPerm, /Salvar correção/);

  const withoutPerm = renderToString(
    <MileageTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.doesNotMatch(withoutPerm, /Corrigir quilometragem/);
  assert.doesNotMatch(withoutPerm, /Salvar correção/);
});

test("MileageTab: sem termo técnico cru na UI (§11)", () => {
  const html = renderToString(
    <MileageTab workOrder={makeWorkOrder({ mileageStart: 1000, mileageEnd: 1200, mileageSource: "app" })} context={ctx} permissions={["work_orders:read", "work_orders:mileage_correct"]} />,
  );
  assert.doesNotMatch(html, /tenant|Tenant|mileage_correct|mileage_source/);
});

// --- MobileTab: timeline (loading), checklist e mapa diferido ---
test("MobileTab: seção de etapas em carregamento (SSR §7) e SEM andaime de mapa (§11.2)", () => {
  const html = renderToString(
    <MobileTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.match(html, /Acompanhamento no app/);
  assert.match(html, /Carregando etapas do despacho/);
  // §11.2: o mapa de posição por etapa é diferido (falta a fonte de dados, P-Ω3F7B-MAPA-ETAPA) — a seção
  // NÃO existe na tela; nada de "em preparação"/"em breve".
  assert.doesNotMatch(html, /Posição por etapa|em preparação|em breve/i);
});

test("MobileTab: preview do checklist congelado renderiza itens legíveis", () => {
  const html = renderToString(
    <MobileTab
      workOrder={makeWorkOrder({
        checklistSnapshot: {
          name: "Vistoria do veículo",
          items: [
            { label: "Pneus calibrados", value: true },
            { label: "Nível de óleo", value: "Normal" },
          ],
        },
      })}
      context={ctx}
      permissions={["work_orders:read"]}
    />,
  );
  assert.match(html, /Vistoria do veículo/);
  assert.match(html, /Pneus calibrados/);
  assert.match(html, /Sim/); // boolean → Sim/Não
  assert.match(html, /Nível de óleo/);
  assert.match(html, /Normal/);
});

test("MobileTab: sem checklist → mensagem honesta", () => {
  const html = renderToString(
    <MobileTab workOrder={makeWorkOrder({ checklistSnapshot: null })} context={ctx} permissions={["work_orders:read"]} />,
  );
  assert.match(html, /Nenhum checklist preenchido no app/);
});

// --- MobileTimeline: etapas com data-hora ---
const dispatch: DispatchListItem = {
  id: "dispatch-1",
  workOrderId: "wo-1",
  operatorUserId: "usr-ops-1",
  status: "in_service",
  priority: "high",
  acceptedAt: "2026-07-10T11:30:00.000Z",
  onRouteAt: "2026-07-10T11:40:00.000Z",
  arrivedAt: "2026-07-10T12:00:00.000Z",
  createdAt: "2026-07-10T11:20:00.000Z",
};

test("MobileTimeline: etapas enviado→aceito→origem com data-hora; futuras 'Aguardando'", () => {
  const html = renderToString(<MobileTimeline dispatch={dispatch} />);
  assert.match(html, /Enviado ao app/);
  assert.match(html, /Aceito pelo técnico/);
  assert.match(html, /Chegada à origem/);
  assert.match(html, /Concluído no destino/);
  assert.match(html, /Aguardando/); // etapa "Concluído no destino" ainda não alcançada
  assert.match(html, /Em atendimento/); // rótulo da situação atual (PT-BR)
});

test("MobileTimeline: despacho cancelado ganha etapa terminal", () => {
  const html = renderToString(
    <MobileTimeline dispatch={{ ...dispatch, status: "cancelled", cancelledAt: "2026-07-10T12:30:00.000Z" }} />,
  );
  assert.match(html, /Cancelado/);
});
