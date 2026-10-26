import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import {
  WorkOrderInspectionView,
} from "../src/modules/work-orders/components/tabs/WorkOrderInspectionCard";
import { GeneralInfoTab } from "../src/modules/work-orders/components/tabs/GeneralInfoTab";
import {
  formatInspectionStatusLabel,
  formatInspectionValue,
  type WorkOrderInspectionData,
} from "../src/modules/work-orders/inspection.service";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";

const mockInspectionData: WorkOrderInspectionData = {
  runId: "run-uuid-1234",
  templateName: "Vistoria de guincho",
  status: "completed",
  statusLabel: "Concluída",
  completedAt: "2026-10-26T15:30:00.000Z",
  items: [
    {
      id: "ans-1",
      componentId: "comp-1",
      label: "Estado geral dos pneus",
      value: "Bons, sem rasgos",
      answeredAt: "2026-10-26T15:20:00.000Z",
    },
    {
      id: "ans-2",
      componentId: "comp-2",
      label: "Chave reserva entregue",
      value: "Sim",
      answeredAt: "2026-10-26T15:22:00.000Z",
    },
    {
      id: "ans-3",
      componentId: "comp-3",
      label: "Avarias visíveis no veículo",
      value: "Amassado na porta dianteira esquerda",
      answeredAt: "2026-10-26T15:25:00.000Z",
    },
  ],
};

const sampleWorkOrder: WorkOrderDetail = {
  id: "wo-1",
  code: "OS-0001",
  title: "Remoção de veículo – pane elétrica",
  status: "completed",
  priority: "high",
  assignedOperatorId: "tech-1",
  scheduledFor: "2026-10-26T14:00:00.000Z",
  createdAt: "2026-10-26T13:45:00.000Z",
  updatedAt: "2026-10-26T16:00:00.000Z",
  customerName: "Seguradora Exemplo",
  customerPhone: "(11) 98765-4321",
  serviceAddress: "Av. Paulista, 1000",
  serviceCity: "São Paulo",
  serviceState: "SP",
  serviceZipCode: "01310-100",
};

// ── Critério 1: A vistoria aparece ──────────────────────────────────────────

test("DEMO-F smoke: a vistoria aparece com as respostas preenchidas pelo técnico", () => {
  const html = renderToString(
    <WorkOrderInspectionView
      loading={false}
      error={null}
      forbidden={false}
      inspection={mockInspectionData}
    />,
  );

  assert.match(html, /Vistoria/);
  assert.match(html, /Concluída/);
  assert.match(html, /Estado geral dos pneus/);
  assert.match(html, /Bons, sem rasgos/);
  assert.match(html, /Chave reserva entregue/);
  assert.match(html, /Sim/);
  assert.match(html, /Avarias visíveis no veículo/);
  assert.match(html, /Amassado na porta dianteira esquerda/);
  // Horário formatado no padrão da casa (dd/mm/aaaa hh:mm)
  assert.match(html, /26\/10\/2026/);
});

// ── Critério 2: Estado vazio ────────────────────────────────────────────────

test("DEMO-F smoke: estado vazio mostra exatamente 'Sem vistoria nesta OS'", () => {
  const html = renderToString(
    <WorkOrderInspectionView
      loading={false}
      error={null}
      forbidden={false}
      inspection={null}
    />,
  );

  assert.match(html, /Vistoria/);
  assert.match(html, /Sem vistoria nesta OS/);
  assert.doesNotMatch(html, /Concluída/);
});

test("DEMO-F smoke: inspeção com lista de itens vazia também cai no estado vazio", () => {
  const emptyInspection: WorkOrderInspectionData = {
    ...mockInspectionData,
    items: [],
  };

  const html = renderToString(
    <WorkOrderInspectionView
      loading={false}
      error={null}
      forbidden={false}
      inspection={emptyInspection}
    />,
  );

  assert.match(html, /Sem vistoria nesta OS/);
});

// ── Critério 3: Estado de erro ──────────────────────────────────────────────

test("DEMO-F smoke: estado de erro exibe mensagem amigável e ação de retentativa", () => {
  const html = renderToString(
    <WorkOrderInspectionView
      loading={false}
      error="Não foi possível carregar a vistoria."
      forbidden={false}
      inspection={null}
      onRetry={() => {}}
    />,
  );

  assert.match(html, /Vistoria/);
  assert.match(html, /Não foi possível carregar a vistoria\./);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Sem vistoria nesta OS/);
});

// ── Critério 4: Acesso não permitido ────────────────────────────────────────

test("DEMO-F smoke: sem permissão exibe estado de acesso não permitido", () => {
  const html = renderToString(
    <WorkOrderInspectionView
      loading={false}
      error={null}
      forbidden={true}
      inspection={null}
    />,
  );

  assert.match(html, /Vistoria/);
  assert.match(html, /Você não tem permissão para visualizar a vistoria/);
  assert.doesNotMatch(html, /Sem vistoria nesta OS/);
  assert.doesNotMatch(html, /Tentar novamente/);
});

// ── Critério 5: Estado de carregamento ───────────────────────────────────────

test("DEMO-F smoke: estado de carregamento exibe mensagem de carregando", () => {
  const html = renderToString(
    <WorkOrderInspectionView
      loading={true}
      error={null}
      forbidden={false}
      inspection={null}
    />,
  );

  assert.match(html, /Vistoria/);
  assert.match(html, /Carregando vistoria…/);
  assert.doesNotMatch(html, /Sem vistoria nesta OS/);
});

// ── Critério 6: Sem termos técnicos na tela (§3) ────────────────────────────

test("DEMO-F smoke: tela não exibe termos técnicos, UUIDs ou identificadores internos", () => {
  const html = renderToString(
    <WorkOrderInspectionView
      loading={false}
      error={null}
      forbidden={false}
      inspection={mockInspectionData}
    />,
  );

  assert.doesNotMatch(html, /run-uuid-1234/);
  assert.doesNotMatch(html, /comp-1/);
  assert.doesNotMatch(html, /ans-1/);
  assert.doesNotMatch(html, /checklist_runs/);
  assert.doesNotMatch(html, /photo_upload/);
  assert.doesNotMatch(html, /undefined/);
  assert.doesNotMatch(html, /null/);
});

// ── Critério 7: Integração no GeneralInfoTab ────────────────────────────────

test("DEMO-F smoke: bloco Vistoria está integrado na aba Informações Gerais da OS", () => {
  const html = renderToString(
    <MemoryRouter>
      <GeneralInfoTab
        workOrder={sampleWorkOrder}
        timeline={[]}
        context={{ tenantId: "t1", permissions: ["checklist_runs:read"] }}
        canDecide={false}
        initialInspection={mockInspectionData}
      />
    </MemoryRouter>,
  );

  assert.match(html, /Vistoria/);
  assert.match(html, /Estado geral dos pneus/);
  assert.match(html, /Bons, sem rasgos/);
  // Garante que os demais blocos essenciais continuam vivos
  assert.match(html, /Status/);
  assert.match(html, /Cliente e endereço/);
  assert.match(html, /Histórico/);
  assert.match(html, /Aprovação operacional/);
});

// ── Helpers: Formatação de valores e status ─────────────────────────────────

test("DEMO-F unit: formatInspectionValue converte booleanos e strings honestamente", () => {
  assert.equal(formatInspectionValue(true), "Sim");
  assert.equal(formatInspectionValue(false), "Não");
  assert.equal(formatInspectionValue("true"), "Sim");
  assert.equal(formatInspectionValue("false"), "Não");
  assert.equal(formatInspectionValue(123), "123");
  assert.equal(formatInspectionValue(""), "—");
  assert.equal(formatInspectionValue(null), "—");
  assert.equal(formatInspectionValue(undefined), "—");
  assert.equal(formatInspectionValue(["Item A", "Item B"]), "Item A, Item B");
});

test("DEMO-F unit: formatInspectionStatusLabel traduz status técnicos para linguagem de negócio", () => {
  assert.equal(formatInspectionStatusLabel("completed"), "Concluída");
  assert.equal(formatInspectionStatusLabel("completed_with_divergence"), "Concluída com divergência");
  assert.equal(formatInspectionStatusLabel("pending_acknowledgement"), "Aguardando ciência");
  assert.equal(formatInspectionStatusLabel("in_progress"), "Em andamento");
  assert.equal(formatInspectionStatusLabel("cancelled"), "Cancelada");
});
