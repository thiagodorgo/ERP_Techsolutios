import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { PainelPatiosView } from "../src/modules/patios/dashboard/components/PainelPatiosView";
import type { PainelPatiosViewProps } from "../src/modules/patios/dashboard/components/PainelPatiosView";
import type { PatiosDashboardSummary } from "../src/modules/patios/dashboard/dashboard.types";

// Ω5P PR-20 — PainelPatiosPage (/patios/painel) era a ÚNICA das 13 telas de Pátios sem teste companheiro.
// PainelPatiosView é a presentational (props-driven, extraída de PainelPatiosPage — mesmo padrão de
// GuiaDebitos em patios-debitos.smoke.test.tsx), o que permite provar os 5 estados obrigatórios (§7) direto
// por props, sem depender de efeitos assíncronos que renderToString não executa.

const SUMMARY: PatiosDashboardSummary = {
  occupancy: [
    { yardId: "yard-1", yardName: "Pátio Central", totalSpots: 100, occupiedSpots: 62, freeSpots: 34, blockedSpots: 4 },
    { yardId: "yard-2", yardName: "Pátio Zona Sul", totalSpots: 50, occupiedSpots: 20, freeSpots: 30, blockedSpots: 0 },
  ],
  totalProcesses: 82,
  processesByPhase: { RECEPTION: 5, CUSTODY: 60, RELEASE: 10, AUCTION: 5, CLOSED: 2 },
  overdueNotifications: 7,
  releaseQueueDepth: 12,
  openLots: 3,
  auctionRevenue: {
    currentMonthTotal: "18500.00",
    grandTotal: "203400.50",
    byBeneficiary: [
      { beneficiaryKind: "REMOVAL_STORAGE", totalAmount: "9000.00" },
      { beneficiaryKind: "OWNER_BALANCE", totalAmount: "9500.00" },
    ],
  },
  deadlineAlerts: [
    { processId: "proc-1", kind: "OWNER_INITIAL", dueAt: "2026-06-01T12:00:00.000Z" }, // vencido
    { processId: "proc-2", kind: "AUCTION_EDICT", dueAt: "2027-01-15T12:00:00.000Z" },
  ],
};

function baseProps(overrides: Partial<PainelPatiosViewProps> = {}): PainelPatiosViewProps {
  return {
    summary: null,
    loading: false,
    error: null,
    denied: false,
    stale: false,
    updatedAt: null,
    onReload: () => {},
    ...overrides,
  };
}

function renderPainel(overrides: Partial<PainelPatiosViewProps> = {}): string {
  return renderToString(
    <MemoryRouter>
      <PainelPatiosView {...baseProps(overrides)} />
    </MemoryRouter>,
  );
}

test("cabeçalho + subtítulo (§11 page-header)", () => {
  const html = renderPainel();
  assert.match(html, /Painel gerencial/);
  assert.match(html, /Ocupação, processos por fase, fila de liberação, prazos e arrecadação de leilão/);
});

test("estado: loading/skeleton na 1ª carga (sem resumo ainda)", () => {
  const html = renderPainel({ loading: true, summary: null });
  assert.match(html, /ui-skeleton/);
  // no skeleton, nenhum indicador é fabricado — cards ficam ocultos, não com valores falsos.
  assert.doesNotMatch(html, /work-orders-kpi/);
});

test("estado: empty honesto (D-007) — sem resumo, sem carregar, sem erro", () => {
  const html = renderPainel();
  assert.match(html, /Sem indicadores para exibir/);
  assert.match(html, /Não há dados suficientes para compor o painel gerencial dos pátios agora/);
  // D-007: nunca fabrica número/indicador.
  assert.doesNotMatch(html, /work-orders-kpi/);
});

test("estado: error com retry", () => {
  const html = renderPainel({ error: "Não foi possível carregar o painel gerencial dos pátios." });
  assert.match(html, /Não foi possível carregar o painel/);
  assert.match(html, /Tentar novamente/);
});

test("estado: acesso não permitido (denied)", () => {
  const html = renderPainel({ denied: true });
  assert.match(html, /Acesso não permitido/);
  assert.match(html, /Seu perfil não possui permissão para visualizar o painel gerencial dos pátios/);
  // no gate de acesso negado, nenhum indicador nem tabela é exibido.
  assert.doesNotMatch(html, /work-orders-kpi/);
  assert.doesNotMatch(html, /Ocupação por pátio/);
});

test("estado: dados desatualizados (stale) — preserva o último resumo carregado", () => {
  const html = renderPainel({
    summary: SUMMARY,
    stale: true,
    updatedAt: new Date("2026-07-29T10:00:00.000Z"),
  });
  assert.match(html, /Dados podem estar desatualizados/);
  assert.match(html, /Exibindo os últimos indicadores carregados/);
  // continua mostrando os últimos indicadores carregados (não apaga a tela nem zera os cards).
  assert.match(html, /work-orders-kpi/);
  assert.match(html, /82/); // totalProcesses do último resumo
});

test("stale some quando há error simultâneo (o banner de erro tem prioridade)", () => {
  const html = renderPainel({ summary: SUMMARY, stale: true, error: "Falha de rede" });
  assert.match(html, /Não foi possível carregar o painel/);
  assert.doesNotMatch(html, /Dados podem estar desatualizados/);
});

test("gate de permissão: denied cobre tanto 403 quanto falta de impound:read (a UI só molda; backend é a autoridade)", () => {
  // O hook computa denied = denied(403) || !canRead — a view só recebe o booleano já resolvido.
  const html = renderPainel({ denied: true, summary: null, loading: false, error: null });
  assert.match(html, /Acesso não permitido/);
});

test("os 6 KPI cards renderizam com o resumo mockado (Ocupação/Processos/Fila/Prazos/Lotes/Arrecadação)", () => {
  const html = renderPainel({ summary: SUMMARY });

  assert.match(html, /Ocupação/);
  assert.match(html, /82 de 150 vagas/); // (62+20) ocupadas de (100+50) totais
  assert.match(html, /55%/); // Math.round(82/150*100)

  assert.match(html, /Processos ativos/);
  assert.match(html, />82</);

  assert.match(html, /Fila de liberação/);
  assert.match(html, />12</);

  assert.match(html, /Prazos vencidos/);
  assert.match(html, />7</);

  assert.match(html, /Lotes abertos/);
  assert.match(html, />3</);

  assert.match(html, /Arrecadação do mês/);
  assert.match(html, /18\.500,00/);
  assert.match(html, /203\.400,50/);
});

test("tabelas: ocupação por pátio, processos por fase, arrecadação por beneficiário e próximos prazos", () => {
  const html = renderPainel({ summary: SUMMARY });
  assert.match(html, /Ocupação por pátio/);
  assert.match(html, /Pátio Central/);
  assert.match(html, /62.*?\/.*?100.*?ocupadas/);
  assert.match(html, /4 bloqueada\(s\)/);

  assert.match(html, /Processos por fase/);
  assert.match(html, /Custódia/);

  assert.match(html, /Arrecadação de leilão por beneficiário/);
  assert.match(html, /Remoção e estada/);
  assert.match(html, /Saldo ao proprietário/);

  assert.match(html, /Próximos prazos/);
  assert.match(html, /Notificação inicial ao proprietário/);
  assert.match(html, / · vencido/);
});

test("D-007: tabelas mostram empty honesto quando as listas do resumo vêm vazias (não inventa linha)", () => {
  const html = renderPainel({
    summary: {
      ...SUMMARY,
      occupancy: [],
      totalProcesses: 0,
      processesByPhase: { RECEPTION: 0, CUSTODY: 0, RELEASE: 0, AUCTION: 0, CLOSED: 0 },
      auctionRevenue: { currentMonthTotal: "0.00", grandTotal: "0.00", byBeneficiary: [] },
      deadlineAlerts: [],
    },
  });
  assert.match(html, /Nenhum pátio cadastrado/);
  assert.match(html, /Nenhum processo em custódia/);
  assert.match(html, /Sem arrecadação registrada/);
  assert.match(html, /Nenhum prazo pendente/);
});

test("linguagem white-label — nunca 'tenant' nem 'polícia' (§3)", () => {
  const html = renderPainel({ summary: SUMMARY, stale: true, updatedAt: new Date() });
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("sem andaime de dev na UI (§11) — nenhum PLANNED/TODO/código de tela ou rota como texto", () => {
  const html = renderPainel({ summary: SUMMARY, stale: true, error: "Falha", denied: true, updatedAt: new Date() });
  assert.doesNotMatch(html, /\bPLANNED\b/);
  assert.doesNotMatch(html, /\bTODO\b/);
  assert.doesNotMatch(html, /\bWIP\b/);
  assert.doesNotMatch(html, /\/patios\/dashboard\/summary/);
  assert.doesNotMatch(html, /P\d{2,}/); // código de tela ao estilo "P04..."

  const denied = renderPainel({ denied: true });
  assert.doesNotMatch(denied, /\bPLANNED\b/);
  assert.doesNotMatch(denied, /\/patios\/dashboard\/summary/);
});
