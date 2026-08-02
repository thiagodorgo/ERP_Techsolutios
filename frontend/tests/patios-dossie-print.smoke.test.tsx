import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { DossiePrintDocument } from "../src/modules/patios/processes/components/DossiePrintDocument";
import { VehicleDossieView, type VehicleDossieViewProps } from "../src/modules/patios/processes/components/VehicleDossieModal";
import type { ChecklistRunSummaryItem, CustodyHistoryItem, ProcessDetail } from "../src/modules/patios/processes/processes.types";

// Ω-VID PR-10 — Imprimir/Salvar o dossiê: window.print() (o diálogo do navegador cobre imprimir E "Salvar como PDF").
// O DossiePrintDocument EMPILHA todas as seções read-only num único documento; o @media print esconde o app e mostra
// só ele. E-mail/WhatsApp ficam FORA de escopo (decisão do dono).

const PROCESS_ID = "550e8400-e29b-41d4-a716-446655440000";

const PROCESS: ProcessDetail = {
  id: PROCESS_ID,
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
  legalBasis: "Art. 271 CTB",
};

const CHECKLIST: ChecklistRunSummaryItem[] = [
  { id: "run-1", templateId: "tpl-1", templateName: "Vistoria de recolhimento", templateVersion: 2, status: "completed", relatedEntityType: "work_order", relatedEntityId: "wo-1", startedAt: "2026-07-20T10:00:00.000Z", completedAt: "2026-07-20T10:30:00.000Z" },
];

const HISTORY: CustodyHistoryItem[] = [
  { id: PROCESS_ID, vehiclePlate: "ABC1D23", vehicleUnidentified: false, status: "ACTIVE_CUSTODY", enteredAt: "2026-07-20T10:00:00.000Z", yardName: "Pátio Central", isCurrent: true },
];

function renderDoc(overrides: Partial<React.ComponentProps<typeof DossiePrintDocument>> = {}): string {
  return renderToString(
    <DossiePrintDocument
      process={PROCESS}
      issuedAt="2026-07-25T14:30:00.000Z"
      orgName="Pátio TechSolutions"
      yardName="Pátio Central"
      currentSpot={{ code: "A-01" }}
      inspection={null}
      verify={null}
      events={[]}
      statement={null}
      canReadChecklist
      checklistRuns={CHECKLIST}
      historyItems={HISTORY}
      {...overrides}
    />,
  );
}

test("documento de impressão empilha TODAS as seções read-only do dossiê (documento completo por veículo)", () => {
  const html = renderDoc();
  // cabeçalho do documento: placa + local
  assert.match(html, /Dossiê do veículo · ABC1D23/);
  assert.match(html, /DETRAN-SP/);
  assert.match(html, /Pátio Central/);
  assert.match(html, /Vaga A-01/);
  // seções empilhadas (não abas): identificação, vistoria, integridade, linha do tempo, checklist, histórico, débitos
  assert.match(html, /Identificação e origem/);
  assert.match(html, /Vistoria de recepção/);
  assert.match(html, /Integridade do registro/);
  assert.match(html, /Linha do tempo da custódia/);
  assert.match(html, /Checklist do guincho/);
  assert.match(html, /Vistoria de recolhimento/); // nome do template (PR-08)
  assert.match(html, /Histórico de custódias/);
  assert.match(html, /Guia de débitos/);
  // documento oficial: organização emissora + carimbo de emissão (o dossiê é temporal)
  assert.match(html, /Pátio TechSolutions/);
  assert.match(html, /Emitido em 25\/07\/2026/);
  assert.match(html, /não substitui os comprovantes/);
  // §allowlist: o id do processo nunca aparece como texto
  assert.doesNotMatch(html, new RegExp(PROCESS_ID));
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("documento de impressão: sem organização no contexto, omite a linha da org (sem quebrar)", () => {
  const html = renderDoc({ orgName: null });
  assert.doesNotMatch(html, /Pátio TechSolutions/);
  assert.match(html, /Emitido em 25\/07\/2026/); // o carimbo de emissão segue
});

test("documento de impressão: sem checklist_runs:read a seção de checklist NÃO entra (mas as demais sim)", () => {
  const html = renderDoc({ canReadChecklist: false });
  assert.doesNotMatch(html, /Checklist do guincho/);
  assert.match(html, /Histórico de custódias/);
  assert.match(html, /Identificação e origem/);
});

test("documento de impressão: NÃO carrega ações (sem 'Lançar encargo' — é documento, não tela de operação)", () => {
  const html = renderDoc({ statement: null });
  // GuiaDebitos com canCreate=false → sem botão de lançar encargo
  assert.doesNotMatch(html, /Lançar encargo/);
});

// ── botão Imprimir / Salvar no dossiê ──────────────────────────────────────────

const baseView: VehicleDossieViewProps = {
  canRead: true,
  loading: false,
  error: null,
  notFound: false,
  process: PROCESS,
  events: [],
  verify: null,
  inspection: null,
  yardName: "Pátio Central",
  currentSpot: { code: "A-01" },
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
  historyItems: HISTORY,
  historyLoading: false,
  historyError: null,
  context: {},
  activeTab: "overview",
  onTabChange: () => {},
  onReload: () => {},
  onReloadStatement: () => {},
  onReloadChecklist: () => {},
  onReloadHistory: () => {},
  onReloadAll: () => {},
  onLaunchCharge: () => {},
  onPrint: () => {},
  printReady: true,
};

test("o dossiê tem o botão 'Imprimir / Salvar' no cabeçalho, escondido na impressão (dossie-print__hide)", () => {
  const html = renderToString(<VehicleDossieView {...baseView} />);
  assert.match(html, /Imprimir \/ Salvar/);
  assert.match(html, /aria-label="Imprimir ou salvar o dossiê"/);
  // o botão fica dentro do wrapper escondido na impressão
  assert.match(html, /dossie-print__hide/);
});

test("o botão fica DESABILITADO ('Preparando…') enquanto os dados do documento não terminaram de carregar (junta MÉDIA)", () => {
  const html = renderToString(<VehicleDossieView {...baseView} printReady={false} />);
  assert.match(html, /Preparando…/);
  assert.match(html, /disabled/);
  assert.doesNotMatch(html, /Imprimir \/ Salvar/);
});
