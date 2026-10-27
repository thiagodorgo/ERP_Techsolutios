import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { DispatchesTable } from "../src/modules/operations/dispatches/components/DispatchesTable";
import { DispatchesFilters } from "../src/modules/operations/dispatches/components/DispatchesFilters";
import { DispatchDetailPanel } from "../src/modules/operations/dispatches/components/DispatchDetailPanel";
import { MobileTimeline } from "../src/modules/work-orders/components/tabs/MobileTab";
import { WorkOrdersTable } from "../src/modules/work-orders/components/WorkOrdersTable";
import type { DispatchListItem } from "../src/modules/operations/dispatches/dispatches.types";
import type { WorkOrderListItem } from "../src/modules/work-orders/work-orders.types";

// DEMO-E (AC-16 e AC-19) — Testes de fidelidade e conformidade de exibição
// AC-16: Nome do técnico na coluna "Operador" de Despachos e lista de OS
// AC-19: Linha do tempo na aba Mobile com as etapas do despacho

const dummyDispatch: DispatchListItem = {
  id: "disp-001",
  workOrderId: "wo-101",
  workOrderCode: "OS-101",
  workOrderTitle: "Remoção de veículo",
  operatorUserId: "usr-guincheiro-01",
  status: "in_service",
  priority: "high",
  createdAt: "2026-10-26T10:00:00.000Z",
  acceptedAt: "2026-10-26T10:05:00.000Z",
  onRouteAt: "2026-10-26T10:10:00.000Z",
  arrivedAt: "2026-10-26T10:25:00.000Z",
  inServiceAt: "2026-10-26T10:30:00.000Z",
  completedAt: "2026-10-26T11:00:00.000Z",
};

const dummyWorkOrder: WorkOrderListItem = {
  id: "wo-101",
  code: "OS-101",
  title: "Remoção de veículo",
  status: "in_progress",
  priority: "high",
  assignedOperatorId: "usr-guincheiro-01",
  createdAt: "2026-10-26T09:50:00.000Z",
};

// ── AC-16: Coluna Operador em Despachos ──────────────────────────────────────────

test("[AC-16] DispatchesTable: exibe o nome do operador quando resolvido por operatorNameById", () => {
  const operatorNames = new Map([["usr-guincheiro-01", "Roberto Carlos (Guincho 01)"]]);

  const html = renderToString(
    <DispatchesTable
      items={[dummyDispatch]}
      operatorNameById={operatorNames}
      canChangeStatus={false}
      canReassign={false}
      canCancel={false}
      onDetail={() => {}}
      onQuickStatus={() => {}}
      onReassign={() => {}}
    />,
  );

  assert.match(html, /Roberto Carlos \(Guincho 01\)/, "Deve exibir o nome resolvido do operador");
  assert.doesNotMatch(html, />usr-guincheiro-01</, "Não deve exibir o identificador técnico cru na célula");
});

test("[AC-16] DispatchesTable: degrada honestamente para o ID quando não resolvido no mapa", () => {
  const html = renderToString(
    <DispatchesTable
      items={[dummyDispatch]}
      operatorNameById={new Map()}
      canChangeStatus={false}
      canReassign={false}
      canCancel={false}
      onDetail={() => {}}
      onQuickStatus={() => {}}
      onReassign={() => {}}
    />,
  );

  assert.match(html, /usr-guincheiro-01/, "Degradação honesta para o identificador sem inventar nomes");
});

test("[AC-16] DispatchesFilters: opções do seletor exibem o nome do operador", () => {
  const operatorNames = new Map([["usr-guincheiro-01", "Roberto Carlos (Guincho 01)"]]);

  const html = renderToString(
    <DispatchesFilters
      filters={{ search: "", status: "all", priority: "all", operatorUserId: "" }}
      operatorOptions={["usr-guincheiro-01"]}
      operatorNameById={operatorNames}
      onChange={() => {}}
    />,
  );

  assert.match(html, /Roberto Carlos \(Guincho 01\)/, "Option do select de operador deve exibir o nome");
});

test("[AC-16] DispatchDetailPanel: exibe nome do operador se fornecido", () => {
  const html = renderToString(
    <DispatchDetailPanel
      dispatch={dummyDispatch}
      operatorName="Roberto Carlos (Guincho 01)"
    />,
  );

  assert.match(html, /Roberto Carlos \(Guincho 01\)/, "Painel de detalhes deve exibir o nome do operador");
});

// ── AC-16: Lista de OS ──────────────────────────────────────────────────────────

test("[AC-16] WorkOrdersTable: exibe o nome do operador na lista de OS quando atribuído", () => {
  const operatorNames = new Map([["usr-guincheiro-01", "Roberto Carlos (Guincho 01)"]]);

  const html = renderToString(
    <MemoryRouter>
      <WorkOrdersTable
        items={[dummyWorkOrder]}
        operatorNameById={operatorNames}
        canChangeStatus={false}
        onQuickStatus={() => {}}
      />
    </MemoryRouter>,
  );

  assert.match(html, /Roberto Carlos \(Guincho 01\)/, "A tabela de OS deve renderizar o nome do técnico atribuído");
});

test("[AC-16] WorkOrdersTable: OS sem operador exibe 'Nao atribuido'", () => {
  const unassignedWO: WorkOrderListItem = {
    ...dummyWorkOrder,
    assignedOperatorId: undefined,
    assignedUserId: undefined,
  };

  const html = renderToString(
    <MemoryRouter>
      <WorkOrdersTable
        items={[unassignedWO]}
        operatorNameById={new Map()}
        canChangeStatus={false}
        onQuickStatus={() => {}}
      />
    </MemoryRouter>,
  );

  assert.match(html, /Nao atribuido/, "OS sem operador exibe 'Nao atribuido'");
});

// ── AC-19: Aba Mobile e Linha do Tempo ──────────────────────────────────────────

test("[AC-19] MobileTimeline: exibe as 6 etapas na linha do tempo com datas formatadas", () => {
  const html = renderToString(<MobileTimeline dispatch={dummyDispatch} />);

  // As 6 etapas requeridas pelo roteiro e AC-19:
  assert.match(html, /Enviado ao app/);
  assert.match(html, /Aceito pelo técnico/);
  assert.match(html, /Em deslocamento/);
  assert.match(html, /Chegada à origem/);
  assert.match(html, /Em atendimento/);
  assert.match(html, /Concluído no destino/);

  // Status atual legível
  assert.match(html, /Em atendimento/);
});

test("[AC-19] MobileTimeline: etapas ainda não alcançadas exibem 'Aguardando'", () => {
  const partialDispatch: DispatchListItem = {
    ...dummyDispatch,
    status: "accepted",
    acceptedAt: "2026-10-26T10:05:00.000Z",
    onRouteAt: null,
    arrivedAt: null,
    inServiceAt: null,
    completedAt: null,
  };

  const html = renderToString(<MobileTimeline dispatch={partialDispatch} />);

  assert.match(html, /Aceito pelo técnico/);
  assert.match(html, /Aguardando/);
});
