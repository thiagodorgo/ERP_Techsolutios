import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { OccupancyMap } from "../src/modules/patios/processes/components/OccupancyMap";
import { DOSSIE_TABS, VehicleDossieView, type VehicleDossieViewProps } from "../src/modules/patios/processes/components/VehicleDossieModal";
import { clearDossieParam, setDossieParam } from "../src/modules/patios/processes/dossieDeepLink";
import type { CustodyEventItem, ProcessDetail, VerifyResult } from "../src/modules/patios/processes/processes.types";
import type { YardSpotItem } from "../src/modules/patios/yards/yards.types";

// Ω-VID PR-07 — VehicleDossieModal: dossiê num modal GRANDE com ABAS (reaproveita os componentes/lógica da
// ProcessoDossiePage), aberto pela vaga ocupada, com deep-link ?dossie=. Testes SSR (renderToString), padrão do repo.

// UUID REAL do processo — §allowlist: NUNCA pode aparecer como texto no DOM (só via query string / handler).
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
  vehicleChassis: "9BWZZZ377VT004251",
  vehicleRenavam: "12345678900",
  vehicleBrand: "VW",
  vehicleModel: "Gol",
  vehicleColor: "Prata",
  vehicleYear: 2018,
  unidentifiedReason: null,
  originAgentName: "Agente Silva",
  authorityCaseNumber: "PROC-2026-001",
  incidentReportNumber: "BO-9988",
  legalBasis: "Art. 271 CTB",
  serviceOrderId: null,
  custodyHashHead: "seal-head-01",
  updatedAt: "2026-07-20T12:00:00.000Z",
};

const EVENTS: CustodyEventItem[] = [
  {
    id: "ev-1",
    seq: 1,
    type: "RECEPTION",
    typeLabel: "Recepção",
    payload: null,
    occurredAt: "2026-07-20T10:00:00.000Z",
    actorId: "user-1",
    prevHash: null,
    hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdAt: "2026-07-20T10:00:00.000Z",
  },
];

const VERIFY: VerifyResult = { processId: PROCESS_ID, valid: true, eventCount: 1, headHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", brokenAt: null, checkedAt: "2026-07-20T12:00:00.000Z" };

const baseProps: VehicleDossieViewProps = {
  canRead: true,
  loading: false,
  error: null,
  notFound: false,
  process: PROCESS,
  events: EVENTS,
  verify: VERIFY,
  inspection: null,
  yardName: "Pátio Central",
  currentSpot: { code: "A-01" },
  statement: null,
  statementLoading: false,
  statementError: null,
  statementDenied: false,
  canCreateCharge: false,
  canTransition: false,
  context: {},
  activeTab: "overview",
  onTabChange: () => {},
  onReload: () => {},
  onReloadStatement: () => {},
  onReloadAll: () => {},
  onLaunchCharge: () => {},
};

function renderView(overrides: Partial<VehicleDossieViewProps> = {}): string {
  return renderToString(<VehicleDossieView {...baseProps} {...overrides} />);
}

// ─────────────────────────────── Estrutura de abas ───────────────────────────────

test("dossiê renderiza EXATAMENTE as 6 abas (Checklist/Histórico ficam para PR-08/09)", () => {
  const html = renderView();
  for (const label of ["Visão Geral", "Vistoria de Recepção", "Linha do Tempo", "Débitos", "Liberação", "Leilão/Liquidação"]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /role="tablist"/);
  const tabCount = (html.match(/role="tab"/g) ?? []).length;
  assert.equal(tabCount, 6, "exatamente 6 botões de aba");
  // as duas abas futuras ainda NÃO entram (a estrutura só está pronta para recebê-las)
  assert.doesNotMatch(html, /Checklist do Guincho/);
  assert.doesNotMatch(html, /Histórico de Custódias/);
  // a11y: a aba ativa marca aria-selected
  assert.match(html, /aria-selected="true"/);
  assert.equal(DOSSIE_TABS.length, 6);
});

test("cabeçalho do modal: placa (getVehicleLabel) + chip de status; §allowlist não vaza id do processo nem 'tenant'", () => {
  const html = renderView({ activeTab: "overview" });
  assert.match(html, /ABC1D23/); // placa
  assert.match(html, /Custódia ativa/); // chip de status (statusLabel do backend)
  assert.doesNotMatch(html, new RegExp(PROCESS_ID)); // id do processo NUNCA como texto
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

// ─────────────────────────────── Troca de aba ───────────────────────────────

test("troca de aba: Visão Geral mostra identificação/local; Linha do Tempo mostra timeline+selo (e não vice-versa)", () => {
  const overview = renderView({ activeTab: "overview" });
  assert.match(overview, /Identificação e origem/);
  assert.match(overview, /Local de guarda/);
  assert.match(overview, /Pátio Central/);
  assert.match(overview, /Vaga A-01/);
  assert.doesNotMatch(overview, /Linha do tempo da custódia/);

  const timeline = renderView({ activeTab: "timeline" });
  assert.match(timeline, /Integridade do registro/);
  assert.match(timeline, /Linha do tempo da custódia/);
  assert.match(timeline, /Cadeia íntegra/);
  assert.doesNotMatch(timeline, /Identificação e origem/);
});

test("aba Visão Geral inclui a Transição de estado (impound:transition) — a vaga do mapa abre o modal, a ação de custódia vive aqui", () => {
  // com permissão: a aresta habilitada a partir de ACTIVE_CUSTODY (→ bloqueio judicial) é oferecida
  const comPermissao = renderView({ activeTab: "overview", canTransition: true });
  assert.match(comPermissao, /Transição de estado/);
  assert.match(comPermissao, /Registrar bloqueio judicial/);
  assert.doesNotMatch(comPermissao, /Somente leitura/);
  // sem permissão: o mesmo card aparece em modo somente-leitura honesto (paridade com a página)
  const semPermissao = renderView({ activeTab: "overview", canTransition: false });
  assert.match(semPermissao, /Transição de estado/);
  assert.match(semPermissao, /Somente leitura/);
  assert.doesNotMatch(semPermissao, /Registrar bloqueio judicial/);
  // a transição NÃO polui as outras abas
  assert.doesNotMatch(renderView({ activeTab: "charges", canTransition: true }), /Transição de estado/);
});

test("aba Vistoria de Recepção reusa InspectionSection (vazia → EmptyState honesto)", () => {
  const html = renderView({ activeTab: "inspection", inspection: null });
  assert.match(html, /Vistoria de recepção ainda não registrada/);
});

test("aba Débitos reusa GuiaDebitos (sem encargos → EmptyState honesto)", () => {
  const html = renderView({ activeTab: "charges", statement: null });
  assert.match(html, /Guia de débitos/);
  assert.match(html, /Nenhum encargo registrado/);
});

// ─────────────────────────────── Estados obrigatórios (§7) ───────────────────────────────

test("estado loading: skeleton enquanto o processo não chega", () => {
  const html = renderView({ loading: true, process: null });
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /role="tablist"/);
});

test("estado erro: alerta + 'Tentar novamente'", () => {
  const html = renderView({ error: "Falha de rede", process: null });
  assert.match(html, /Não foi possível carregar o dossiê/);
  assert.match(html, /Tentar novamente/);
});

test("estado acesso-negado: sem impound:read → EmptyState honesto, sem abas", () => {
  const html = renderView({ canRead: false });
  assert.match(html, /Sem acesso ao dossiê/);
  assert.doesNotMatch(html, /role="tablist"/);
});

test("estado não-encontrado: processo inexistente/desatualizado → EmptyState", () => {
  const html = renderView({ notFound: true, process: null });
  assert.match(html, /Processo não encontrado/);
});

// ─────────────────────────────── Deep-link ?dossie= (helpers puros) ───────────────────────────────

test("setDossieParam seta ?dossie=<processId> e preserva os demais params (abrir)", () => {
  const result = setDossieParam(new URLSearchParams("aba=vagas&x=1"), "proc-abc");
  assert.equal(result.get("dossie"), "proc-abc");
  assert.equal(result.get("aba"), "vagas");
  assert.equal(result.get("x"), "1");
});

test("clearDossieParam remove ?dossie= e preserva os demais params (fechar)", () => {
  const result = clearDossieParam(new URLSearchParams("dossie=proc-abc&aba=vagas"));
  assert.equal(result.has("dossie"), false);
  assert.equal(result.get("aba"), "vagas");
});

test("setDossieParam/clearDossieParam não mutam o URLSearchParams original (cópia)", () => {
  const original = new URLSearchParams("aba=vagas");
  setDossieParam(original, "p1");
  assert.equal(original.has("dossie"), false);
  const withDossie = new URLSearchParams("dossie=p1");
  clearDossieParam(withDossie);
  assert.equal(withDossie.get("dossie"), "p1");
});

// ─────────────────────────────── OccupancyMap: vaga ocupada → abre modal (não navega) ───────────────────────────────

const OCCUPIED_SPOT: YardSpotItem = {
  id: "spot-1",
  areaId: "area-1",
  code: "A-01",
  covered: false,
  vehicleClass: "AUTOMOVEL" as YardSpotItem["vehicleClass"],
  vehicleClassLabel: "Automóvel",
  status: "OCCUPIED",
  statusLabel: "Ocupada",
  currentProcessId: PROCESS_ID,
};

const PROCESS_SUMMARY = { id: PROCESS_ID, vehiclePlate: "ABC1D23", vehicleUnidentified: false, statusLabel: "Custódia ativa" };

test("OccupancyMap: vaga ocupada vira BOTÃO que abre o dossiê — NÃO um link de navegação", () => {
  const html = renderToString(
    <MemoryRouter>
      <OccupancyMap spots={[OCCUPIED_SPOT]} resolveProcess={() => PROCESS_SUMMARY} canAllocate={false} onOpenDossie={() => {}} />
    </MemoryRouter>,
  );
  // é um <button> com aria-label do dossiê (dispara onOpenDossie), não um <a href> que navegaria
  assert.match(html, /<button[^>]*aria-label="Abrir o dossiê do veículo desta vaga"/);
  assert.doesNotMatch(html, /href="\/patios\/processos\//);
  assert.doesNotMatch(html, /<a /); // nenhuma âncora de navegação na vaga
  // placa exibida (join client-side); §allowlist: currentProcessId NUNCA como texto
  assert.match(html, /ABC1D23/);
  assert.doesNotMatch(html, new RegExp(PROCESS_ID));
});

test("OccupancyMap: sem onOpenDossie, a vaga ocupada NÃO vira trigger morto (span, sem button nem link)", () => {
  const html = renderToString(
    <MemoryRouter>
      <OccupancyMap spots={[OCCUPIED_SPOT]} resolveProcess={() => PROCESS_SUMMARY} canAllocate={false} />
    </MemoryRouter>,
  );
  assert.doesNotMatch(html, /aria-label="Abrir o dossiê do veículo desta vaga"/);
  assert.doesNotMatch(html, /href="\/patios\/processos\//);
  assert.match(html, /ABC1D23/);
});
