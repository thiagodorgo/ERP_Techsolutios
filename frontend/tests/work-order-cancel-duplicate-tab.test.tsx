import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { CancelWorkOrderModal } from "../src/modules/work-orders/components/CancelWorkOrderModal";
import { DuplicateWorkOrderModal } from "../src/modules/work-orders/components/DuplicateWorkOrderModal";
import { PrintWorkOrderModal } from "../src/modules/work-orders/components/PrintWorkOrderModal";
import {
  WorkOrderActionBar,
  canCancelWorkOrder,
  canDuplicateWorkOrder,
} from "../src/modules/work-orders/components/WorkOrderActionBar";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";

// Ω3F-6b — Cancelar (com decisão financeira) · Duplicar · Imprimir na barra de ações do hub.
// Guarda as duas invariantes de fidelidade da J-Ω3F-6A (C2):
//   1. rótulos PT-BR do vídeo; os valores técnicos keep/keep_unpaid/zero NUNCA chegam à tela (§3);
//   2. duplicar NÃO oferece copiar orçamento (preço congelado não se herda).

const ctx = { tenantId: "t1", token: "tok" };

const wo: WorkOrderDetail = {
  id: "wo-1",
  code: "OS-000101",
  title: "Reboque",
  status: "open",
  priority: "high",
  customerName: "Atlas Refrigeração",
  serviceAddress: "Rua A, 100",
  checklistId: null,
  createdAt: "2026-06-09T11:20:00.000Z",
  links: null,
};

function renderCancel() {
  return renderToString(
    <CancelWorkOrderModal workOrderId="wo-1" workOrderCode="OS-000101" context={ctx} onClose={() => {}} onCancelled={() => {}} />,
  );
}

function renderDuplicate() {
  return renderToString(
    <MemoryRouter>
      <DuplicateWorkOrderModal workOrderId="wo-1" workOrderCode="OS-000101" context={ctx} onClose={() => {}} />
    </MemoryRouter>,
  );
}

function renderBar(permissions: string[], workOrder: WorkOrderDetail = wo) {
  return renderToString(
    <MemoryRouter>
      <WorkOrderActionBar workOrder={workOrder} activeTab="informacoes-gerais" context={ctx} permissions={permissions} onRefresh={() => {}} />
    </MemoryRouter>,
  );
}

// --- CancelWorkOrderModal ---
test("CancelWorkOrderModal: título + as 3 decisões financeiras com os rótulos PT-BR do vídeo (C2)", () => {
  const html = renderCancel();
  assert.match(html, /Cancelar ordem de serviço/);
  assert.match(html, /Manter valores/);
  assert.match(html, /Manter sem remunerar o profissional/);
  assert.match(html, /Zerar itens/);
  // Cada decisão tem uma linha de ajuda explicando o efeito no dinheiro.
  assert.match(html, /o total vai a zero/);
});

test("CancelWorkOrderModal: valores técnicos keep/keep_unpaid/zero NÃO aparecem na UI (§3, C2)", () => {
  const html = renderCancel();
  assert.doesNotMatch(html, /keep_unpaid/);
  assert.doesNotMatch(html, /"keep"|>keep<|\bkeep\b/);
  assert.doesNotMatch(html, />zero<|"zero"/);
  assert.doesNotMatch(html, /financial_decision|work_orders:cancel|tenant/i);
});

test("CancelWorkOrderModal: decisão financeira SEM pré-seleção (a UI não escolhe pelo gestor)", () => {
  const html = renderCancel();
  // Nenhum radio nasce marcado: o backend recusa default silencioso (422 invalid_financial_decision).
  assert.doesNotMatch(html, /type="radio"[^>]*checked/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
});

test("CancelWorkOrderModal: motivo obrigatório + botões destrutivo/voltar", () => {
  const html = renderCancel();
  assert.match(html, /Motivo/);
  assert.match(html, /<textarea/);
  assert.match(html, /Cancelar OS/);
  assert.match(html, /Voltar/);
  assert.match(html, /ui-button--danger/);
});

// --- DuplicateWorkOrderModal ---
test("DuplicateWorkOrderModal: título + só 'Copiar comentários' e 'Copiar checklist', ambos desmarcados", () => {
  const html = renderDuplicate();
  assert.match(html, /Duplicar ordem de serviço/);
  assert.match(html, /Copiar comentários/);
  assert.match(html, /Copiar checklist/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /type="checkbox"[^>]*checked/);
});

test("DuplicateWorkOrderModal: NÃO oferece copiar orçamento/financeiro (invariante do preço congelado)", () => {
  const html = renderDuplicate();
  assert.doesNotMatch(html, /Copiar orçamento/i);
  assert.doesNotMatch(html, /Copiar valores|Copiar financeiro/i);
  // ...e avisa o gestor, em PT-BR de negócio, que a cópia nasce sem os valores da original.
  assert.match(html, /nasce sem os valores financeiros e sem o orçamento da original/);
  assert.doesNotMatch(html, /copy_comments|copy_checklist|client_action_id/);
});

// --- PrintWorkOrderModal ---
test("PrintWorkOrderModal: oferece só as seções visíveis e permitidas ao ator", () => {
  const html = renderToString(
    <PrintWorkOrderModal workOrder={wo} context={ctx} permissions={["work_orders:read"]} onClose={() => {}} />,
  );
  assert.match(html, /Imprimir ordem de serviço/);
  assert.match(html, /Informações gerais/);
  assert.match(html, /Comentários/);
  assert.match(html, /Arquivos/);
  // Sem as permissões das abas governadas, elas não viram seção imprimível.
  assert.doesNotMatch(html, /Financeiro/);
  assert.doesNotMatch(html, /Orçamento/);
  // Abas ainda ocultas no hub (C2) nunca são oferecidas.
  assert.doesNotMatch(html, /Estoque|Quilometragem|Logs/);
});

test("PrintWorkOrderModal: aba governada vira seção quando o ator tem a permissão", () => {
  const html = renderToString(
    <PrintWorkOrderModal workOrder={wo} context={ctx} permissions={["work_orders:read", "work_order_financials:read"]} onClose={() => {}} />,
  );
  assert.match(html, /Financeiro/);
});

// --- WorkOrderActionBar: gating (Ω3F-6b) ---
test("WorkOrderActionBar: Ω3F-6b acende Cancelar/Duplicar/Imprimir para quem pode", () => {
  const html = renderBar(["work_orders:cancel", "work_orders:create"]);
  assert.match(html, /Imprimir/);
  assert.match(html, /Copiar/);
  assert.match(html, /Mais ações/);
});

test("WorkOrderActionBar: Imprimir aparece para todo ator, mesmo sem permissão nenhuma", () => {
  const html = renderBar([]);
  assert.match(html, /Imprimir/);
});

test("gating: Cancelar só com work_orders:cancel", () => {
  assert.equal(canCancelWorkOrder(["work_orders:cancel"], "open"), true);
  assert.equal(canCancelWorkOrder(["work_orders:read", "work_orders:status"], "open"), false);
  assert.equal(canCancelWorkOrder([], "open"), false);
});

// coordenador J-Ω3F-6B: a UI NÃO pode ser mais permissiva que o backend. A tabela de transições
// (work-order.validators.ts) só aceita `cancelled` a partir de open/assigned/accepted/on_route/on_site/
// in_progress — em `paused`, `completed`, `rejected` e `cancelled` o backend responde 422. Oferecer
// "Cancelar" nesses casos fazia o gestor preencher decisão financeira + motivo para colher um erro.
test("gating: só as situações que o BACKEND aceita cancelar oferecem a ação (espelho da tabela de transições)", () => {
  for (const status of ["open", "assigned", "accepted", "on_route", "on_site", "in_progress"] as const) {
    assert.equal(canCancelWorkOrder(["work_orders:cancel"], status), true, `${status} deveria ser cancelável`);
  }
  // O backend recusa (422) — a UI não oferece.
  for (const status of ["paused", "completed", "cancelled", "rejected"] as const) {
    assert.equal(canCancelWorkOrder(["work_orders:cancel"], status), false, `${status} NÃO deveria oferecer Cancelar`);
  }
});

test("gating: Duplicar só com work_orders:create (a cópia é uma OS nova)", () => {
  assert.equal(canDuplicateWorkOrder(["work_orders:create"]), true);
  assert.equal(canDuplicateWorkOrder(["work_orders:read", "work_orders:update"]), false);
  assert.equal(canDuplicateWorkOrder([]), false);
});

test("WorkOrderActionBar: nenhuma ação restrita vaza no HTML de quem não tem permissão", () => {
  const semPermissao = renderBar([]);
  assert.doesNotMatch(semPermissao, /Cancelar ordem de serviço|Duplicar ordem de serviço/);
  assert.doesNotMatch(semPermissao, /Manter valores|Zerar itens/);
});

test("WorkOrderActionBar: decisão financeira gravada nunca é renderizada crua (§3)", () => {
  const cancelada: WorkOrderDetail = { ...wo, status: "cancelled", financialCancellationDecision: "zero" };
  const html = renderBar(["work_orders:cancel", "work_orders:create"], cancelada);
  assert.doesNotMatch(html, /keep_unpaid|>zero<|"zero"/);
});
