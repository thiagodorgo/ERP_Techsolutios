import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { CustodyHistoryPanel } from "../src/modules/patios/processes/components/CustodyHistoryPanel";
import {
  VehicleDossieView,
  type VehicleDossieViewProps,
} from "../src/modules/patios/processes/components/VehicleDossieModal";
import { adaptCustodyHistoryResponse } from "../src/modules/patios/processes/processes.adapter";
import type { CustodyHistoryItem, ProcessDetail } from "../src/modules/patios/processes/processes.types";

// Ω-VID PR-09 — aba "Histórico de Custódias": as múltiplas passagens do MESMO veículo (identidade) pelo pátio.

// UUID REAL do processo — §allowlist: NUNCA pode aparecer como texto no DOM.
const CURRENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const PAST_ID = "660e8400-e29b-41d4-a716-446655440111";

const ITEMS: CustodyHistoryItem[] = [
  { id: CURRENT_ID, vehiclePlate: "ABC1D23", vehicleUnidentified: false, status: "ACTIVE_CUSTODY", enteredAt: "2026-07-01T10:00:00.000Z", yardName: "Pátio Norte", isCurrent: true },
  { id: PAST_ID, vehiclePlate: "ABC1D23", vehicleUnidentified: false, status: "RELEASED", enteredAt: "2026-05-01T10:00:00.000Z", yardName: "Pátio Central", isCurrent: false },
];

// ─────────────────────────────── Adapter ───────────────────────────────

test("adaptCustodyHistoryResponse: parseia {items}, tolera snake/camelCase, descarta sem id", () => {
  const items = adaptCustodyHistoryResponse({
    items: [
      { id: "a", vehicle_plate: "ABC1D23", vehicle_unidentified: false, status: "RELEASED", entered_at: "2026-05-01T10:00:00.000Z", yard_name: "Pátio Central", is_current: false },
      { id: "b", vehiclePlate: null, vehicleUnidentified: true, status: "ACTIVE_CUSTODY", enteredAt: null, yardName: null, isCurrent: true },
      { vehiclePlate: "SEM-ID" }, // sem id → descartado
    ],
  });
  assert.equal(items.length, 2);
  assert.equal(items[0].id, "a");
  assert.equal(items[0].yardName, "Pátio Central");
  assert.equal(items[1].isCurrent, true);
  assert.equal(items[1].vehicleUnidentified, true);
  assert.equal(items[1].vehiclePlate, null);
});

test("adaptCustodyHistoryResponse: payload vazio/inválido → [] (D-007)", () => {
  assert.deepEqual(adaptCustodyHistoryResponse(null), []);
  assert.deepEqual(adaptCustodyHistoryResponse({}), []);
  assert.deepEqual(adaptCustodyHistoryResponse({ items: [] }), []);
});

// ─────────────────────────────── Painel ───────────────────────────────

function renderPanel(overrides: Partial<React.ComponentProps<typeof CustodyHistoryPanel>> = {}): string {
  return renderToString(<CustodyHistoryPanel items={ITEMS} loading={false} error={null} onRetry={() => {}} {...overrides} />);
}

test("painel lista as custódias com placa/situação/entrada/pátio; marca a atual; §allowlist NÃO vaza id do processo", () => {
  const html = renderPanel();
  assert.match(html, /2 custódias registradas para este veículo/);
  assert.match(html, /ABC1D23/); // placa (rótulo público)
  assert.match(html, /Custódia ativa/); // status PT-BR do atual
  assert.match(html, /Liberado/); // status PT-BR da custódia passada
  assert.match(html, /Pátio Norte/);
  assert.match(html, /Pátio Central/);
  assert.match(html, /Custódia atual/); // marcador da linha atual
  // §allowlist: os UUIDs dos processos nunca aparecem como texto
  assert.doesNotMatch(html, new RegExp(CURRENT_ID));
  assert.doesNotMatch(html, new RegExp(PAST_ID));
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("painel — custódia única: rótulo no singular", () => {
  const html = renderPanel({ items: [ITEMS[0]] });
  assert.match(html, /Única custódia registrada para este veículo/);
});

test("painel — vazio (processo desatualizado) → EmptyState honesto; loading → skeleton; erro sem itens → alerta+retry", () => {
  assert.match(renderPanel({ items: [] }), /Sem histórico de custódias/);
  assert.match(renderPanel({ items: [], loading: true }), /aria-busy="true"/);
  const err = renderPanel({ items: [], error: "Falha de rede" });
  assert.match(err, /Não foi possível carregar o histórico/);
  assert.match(err, /Tentar novamente/);
});

test("painel — erro de auto-refresh COM itens carregados: mantém a tabela + aviso inline (não apaga)", () => {
  const html = renderPanel({ error: "Falha de rede" });
  assert.match(html, /<table/);
  assert.match(html, /Pátio Norte/);
  assert.match(html, /Atualização em segundo plano falhou/);
  assert.doesNotMatch(html, /Não foi possível carregar o histórico/);
});

// ─────────────────────────────── Integração no dossiê ───────────────────────────────

const PROCESS: ProcessDetail = {
  id: CURRENT_ID,
  vehiclePlate: "ABC1D23",
  vehicleUnidentified: false,
  yardId: "yard-1",
  profileId: "prof-1",
  status: "ACTIVE_CUSTODY",
  statusLabel: "Custódia ativa",
  enteredAt: "2026-07-01T10:00:00.000Z",
  frozenAt: null,
  originAuthority: "DETRAN-SP",
  custodySeqHead: 3,
  createdAt: "2026-07-01T10:00:00.000Z",
  custodyHashHead: "seal-head-01",
  updatedAt: "2026-07-01T12:00:00.000Z",
};

const baseProps: VehicleDossieViewProps = {
  canRead: true,
  loading: false,
  error: null,
  notFound: false,
  process: PROCESS,
  events: [],
  verify: null,
  inspection: null,
  yardName: "Pátio Norte",
  currentSpot: null,
  statement: null,
  statementLoading: false,
  statementError: null,
  statementDenied: false,
  canCreateCharge: false,
  canTransition: false,
  canReadChecklist: false,
  checklistRuns: [],
  checklistLoading: false,
  checklistError: null,
  checklistDenied: false,
  historyItems: ITEMS,
  historyLoading: false,
  historyError: null,
  context: {},
  activeTab: "history",
  onTabChange: () => {},
  onReload: () => {},
  onReloadStatement: () => {},
  onReloadChecklist: () => {},
  onReloadHistory: () => {},
  onReloadAll: () => {},
  onLaunchCharge: () => {},
};

test("aba 'Histórico de Custódias' está sempre presente (impound:read) e renderiza o painel com as custódias", () => {
  const html = renderToString(<VehicleDossieView {...baseProps} />);
  // presente mesmo sem checklist_runs:read (gate do dossiê já é impound:read)
  assert.match(html, /Histórico de Custódias/);
  assert.match(html, /2 custódias registradas/);
  assert.match(html, /Pátio Central/); // custódia passada
  assert.match(html, /role="tabpanel" aria-label="Histórico de Custódias"/);
});
