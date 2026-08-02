import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { ChecklistRunsPanel } from "../src/modules/patios/processes/components/ChecklistRunsPanel";
import {
  VehicleDossieView,
  type VehicleDossieViewProps,
} from "../src/modules/patios/processes/components/VehicleDossieModal";
import {
  adaptChecklistRunsResponse,
  getChecklistRunStatusLabel,
  getChecklistRunStatusTone,
} from "../src/modules/patios/processes/processes.adapter";
import type { ChecklistRunSummaryItem, ProcessDetail } from "../src/modules/patios/processes/processes.types";

// Ω-VID PR-08 — aba "Checklist do Guincho" do dossiê: leitura dos checklists preenchidos em campo pelo guincheiro
// (consome o AUTO-link do PR-05 via GET /impound-processes/:id/checklist-runs, gate DUPLO impound:read+checklist_runs:read).

// UUID REAL do template — §allowlist: NUNCA pode aparecer como texto no DOM (o resumo é estreito por desenho).
const TEMPLATE_ID = "11111111-2222-4333-8444-555555555555";
const RELATED_ID = "99999999-8888-4777-8666-555555555555";

const RUNS: ChecklistRunSummaryItem[] = [
  {
    id: "run-antigo",
    templateId: TEMPLATE_ID,
    templateName: "Vistoria de recolhimento",
    templateVersion: 2,
    status: "completed",
    relatedEntityType: "work_order",
    relatedEntityId: RELATED_ID,
    startedAt: "2026-07-20T09:00:00.000Z",
    completedAt: "2026-07-20T09:40:00.000Z",
  },
  {
    id: "run-novo",
    templateId: TEMPLATE_ID,
    templateName: "Checklist de avarias",
    templateVersion: 3,
    status: "completed_with_divergence",
    relatedEntityType: "work_order",
    relatedEntityId: RELATED_ID,
    startedAt: "2026-07-25T14:00:00.000Z",
    completedAt: null,
  },
];

// ─────────────────────────────── Adapter ───────────────────────────────

test("adaptChecklistRunsResponse: parseia {items}, tolera snake/camelCase e ordena por startedAt DESC", () => {
  const runs = adaptChecklistRunsResponse({
    items: [
      { id: "a", template_id: TEMPLATE_ID, template_name: "Vistoria de recolhimento", template_version: 1, status: "in_progress", started_at: "2026-07-01T10:00:00.000Z", completed_at: null },
      { id: "b", templateId: TEMPLATE_ID, templateName: "Checklist de avarias", templateVersion: 2, status: "completed", startedAt: "2026-07-10T10:00:00.000Z", completedAt: "2026-07-10T11:00:00.000Z" },
    ],
  });
  assert.equal(runs.length, 2);
  assert.equal(runs[0].id, "b", "mais recente (startedAt desc) primeiro");
  assert.equal(runs[1].id, "a");
  assert.equal(runs[0].templateVersion, 2);
  assert.equal(runs[0].templateName, "Checklist de avarias", "nome do template (camelCase)");
  assert.equal(runs[1].templateName, "Vistoria de recolhimento", "nome do template (snake_case)");
  assert.equal(runs[1].status, "in_progress");
});

test("adaptChecklistRunsResponse: status desconhecido cai em 'in_progress'; item sem id/template/startedAt é descartado", () => {
  const runs = adaptChecklistRunsResponse({
    items: [
      { id: "x", templateId: TEMPLATE_ID, templateVersion: 1, status: "banana", startedAt: "2026-07-01T10:00:00.000Z" },
      { templateId: TEMPLATE_ID, status: "completed", startedAt: "2026-07-02T10:00:00.000Z" }, // sem id → descartado
      { id: "y", status: "completed", startedAt: "2026-07-03T10:00:00.000Z" }, // sem templateId → descartado
    ],
  });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "in_progress");
});

test("adaptChecklistRunsResponse: payload vazio/inválido → [] (D-007, sem fabricar)", () => {
  assert.deepEqual(adaptChecklistRunsResponse(null), []);
  assert.deepEqual(adaptChecklistRunsResponse({}), []);
  assert.deepEqual(adaptChecklistRunsResponse({ items: [] }), []);
});

test("rótulos/tons PT-BR do estado da run (acentuados, semânticos)", () => {
  assert.equal(getChecklistRunStatusLabel("completed"), "Concluído");
  assert.equal(getChecklistRunStatusLabel("completed_with_divergence"), "Concluído com avarias");
  assert.equal(getChecklistRunStatusLabel("pending_acknowledgement"), "Aguardando ciência");
  assert.equal(getChecklistRunStatusLabel("in_progress"), "Em preenchimento");
  assert.equal(getChecklistRunStatusLabel("cancelled"), "Cancelado");
  assert.equal(getChecklistRunStatusTone("completed"), "success");
  assert.equal(getChecklistRunStatusTone("completed_with_divergence"), "warning");
});

// ─────────────────────────────── Painel (componente puro) ───────────────────────────────

function renderPanel(overrides: Partial<React.ComponentProps<typeof ChecklistRunsPanel>> = {}): string {
  return renderToString(
    <ChecklistRunsPanel runs={RUNS} loading={false} error={null} denied={false} onRetry={() => {}} {...overrides} />,
  );
}

test("painel lista as runs pelo NOME do formulário (identidade real) + situação PT-BR e datas; §allowlist NÃO vaza UUID", () => {
  const html = renderPanel();
  // identidade da linha = NOME do template (não mais o rótulo genérico repetido)
  assert.match(html, /Vistoria de recolhimento/);
  assert.match(html, /Checklist de avarias/);
  assert.match(html, /Concluído/); // status da run antiga
  assert.match(html, /Concluído com avarias/); // status da run nova
  assert.match(html, /Formulário v2/);
  assert.match(html, /Formulário v3/);
  // §allowlist: os UUIDs do resumo estreito nunca aparecem como texto
  assert.doesNotMatch(html, new RegExp(TEMPLATE_ID));
  assert.doesNotMatch(html, new RegExp(RELATED_ID));
  // sem termo técnico na UI
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /work_order/);
});

test("painel — sem nome de template (backend não resolveu) cai no rótulo genérico honesto", () => {
  const html = renderPanel({
    runs: [{ id: "r", templateId: TEMPLATE_ID, templateName: null, templateVersion: 1, status: "in_progress", relatedEntityType: null, relatedEntityId: null, startedAt: "2026-07-20T09:00:00.000Z", completedAt: null }],
  });
  assert.match(html, /Checklist do guincho/);
  assert.match(html, /Em preenchimento/);
});

test("painel — estado vazio honesto (nenhum vínculo): aponta o AUTO-link do despacho, sem fabricar", () => {
  const html = renderPanel({ runs: [] });
  assert.match(html, /Nenhum checklist do guincho vinculado/);
  assert.match(html, /aplicativo/); // guincheiro preenche no app; a web só acompanha
});

test("painel — acesso-negado (checklist_runs:read ausente) → EmptyState honesto, sem tabela", () => {
  const html = renderPanel({ denied: true });
  assert.match(html, /Sem acesso aos checklists do guincho/);
  assert.doesNotMatch(html, /<table/);
});

test("painel — loading (sem runs ainda) → skeleton; erro SEM runs → alerta + 'Tentar novamente'", () => {
  assert.match(renderPanel({ runs: [], loading: true }), /aria-busy="true"/);
  const err = renderPanel({ runs: [], error: "Falha de rede" });
  assert.match(err, /Não foi possível carregar os checklists/);
  assert.match(err, /Tentar novamente/);
});

test("painel (junta BAIXA) — erro de auto-refresh COM runs já carregadas: mantém a tabela + aviso inline (não apaga dados)", () => {
  const html = renderPanel({ error: "Falha de rede" });
  // a tabela e os dados seguem visíveis
  assert.match(html, /<table/);
  assert.match(html, /Vistoria de recolhimento/);
  // aviso inline não-destrutivo (não o alerta de tela cheia "Não foi possível carregar os checklists")
  assert.match(html, /Atualização em segundo plano falhou/);
  assert.doesNotMatch(html, /Não foi possível carregar os checklists/);
});

// ─────────────────────────────── Integração na aba do dossiê ───────────────────────────────

const PROCESS: ProcessDetail = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  vehiclePlate: "ABC1D23",
  vehicleUnidentified: false,
  yardId: "yard-1",
  profileId: "prof-1",
  status: "ACTIVE_CUSTODY",
  statusLabel: "Custódia ativa",
  enteredAt: "2026-07-20T10:00:00.000Z",
  frozenAt: null,
  originAuthority: "DETRAN-SP",
  custodySeqHead: 3,
  createdAt: "2026-07-20T10:00:00.000Z",
  custodyHashHead: "seal-head-01",
  updatedAt: "2026-07-20T12:00:00.000Z",
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
  yardName: "Pátio Central",
  currentSpot: null,
  statement: null,
  statementLoading: false,
  statementError: null,
  statementDenied: false,
  canCreateCharge: false,
  canTransition: false,
  canReadChecklist: true,
  checklistRuns: RUNS,
  checklistLoading: false,
  checklistError: null,
  checklistDenied: false,
  historyItems: [],
  historyLoading: false,
  historyError: null,
  context: {},
  activeTab: "checklist",
  onTabChange: () => {},
  onReload: () => {},
  onReloadStatement: () => {},
  onReloadChecklist: () => {},
  onReloadHistory: () => {},
  onReloadAll: () => {},
  onLaunchCharge: () => {},
};

test("aba 'Checklist do Guincho' ativa renderiza o painel com as runs pelo nome (integração no VehicleDossieView)", () => {
  const html = renderToString(<VehicleDossieView {...baseProps} />);
  assert.match(html, /Vistoria de recolhimento/);
  assert.match(html, /Concluído com avarias/);
  // a aba está marcada como ativa
  assert.match(html, /aria-selected="true"[^>]*>Checklist do Guincho|Checklist do Guincho/);
});

test("AUTO-CURA (junta MÉDIA): activeTab='checklist' mas permissão caiu → degrada para a Visão Geral, NÃO painel branco", () => {
  const html = renderToString(<VehicleDossieView {...baseProps} canReadChecklist={false} />);
  // sem a permissão a aba nem existe (6 abas) e o corpo NÃO mostra o painel de checklist...
  assert.doesNotMatch(html, /Checklist do guincho/);
  assert.doesNotMatch(html, /Vistoria de recolhimento/);
  // ...mas também NÃO fica em branco: o effectiveTab cai na Visão Geral (identidade do veículo visível)
  assert.match(html, /Identificação e origem/);
  // o tabpanel mantém um aria-label válido (nunca undefined/vazio)
  assert.match(html, /role="tabpanel" aria-label="Visão Geral"/);
});
