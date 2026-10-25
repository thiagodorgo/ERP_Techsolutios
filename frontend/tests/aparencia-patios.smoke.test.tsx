import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// B-APARENCIA-USUARIO — Pátios sai com as 3 aparências aprovadas (D-TELAS-SAEM-COM-TRES), e a guardada pelo usuário
// é a que abre. Os estados obrigatórios (§7) seguem presentes em cada aparência. A interação (KPI que filtra, linha
// que abre o detalhe, troca pelo menu) está no aparencia-patios-live.

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
  },
});
Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: () => null } });

const TENANT_ID = "ten-industrial-01";

async function renderPatiosWith(stored: string | null): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  storage.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredSessionPermissions } = await import("./helpers/session-permissions");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PatiosPage } = await import("../src/modules/patios/yards/pages/PatiosPage");

  const session = mockSessionForEmail("gestor.web@techsolutions.example");
  const permissions = ["yard:read", "yard:create", "yard:update"];
  setStoredSessionPermissions(session, permissions);
  storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: TENANT_ID, tenantName: "Techsolutions Industrial", tenantStatus: "active", branchId: "fil-sp-01", branchName: "Matriz", role: "Gestor Operacional", permissions, enabledModules: [], scope: "branch" }),
  );
  if (stored !== null) storage.set(`techsol.aparencia.${TENANT_ID}.${session.user.id}`, stored);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/patios"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PatiosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const aparencia = (html: string) => /data-aparencia="([ABC])"/.exec(html)?.[1];

test("sem nada guardado, Pátios abre na B (padrão da tela) — asserção explícita do padrão (crítica, ajuste 3)", async () => {
  const html = await renderPatiosWith(null);
  assert.equal(aparencia(html), "B");
  assert.match(html, /VISÃO ANALÍTICA/);
});

test("a aparência guardada é a que abre: A, B e C", async () => {
  assert.equal(aparencia(await renderPatiosWith(JSON.stringify({ patios: "A" }))), "A");
  assert.equal(aparencia(await renderPatiosWith(JSON.stringify({ patios: "B" }))), "B");
  const c = await renderPatiosWith(JSON.stringify({ patios: "C" }));
  assert.equal(aparencia(c), "C");
  assert.match(c, /MESA DE PÁTIO/);
  assert.match(c, /Escolha um pátio na lista/, "o quadro de vagas sem pátio escolhido diz o que fazer");
});

test("valor inválido guardado cai na B (padrão de Pátios), nunca quebra a tela", async () => {
  assert.equal(aparencia(await renderPatiosWith(JSON.stringify({ patios: "Z" }))), "B");
  assert.equal(aparencia(await renderPatiosWith("{corrompido")), "B");
});

test("A é a tela de antes: grade padronizada, abas Todos/Ativos/Inativos e a degradação honesta sem o resumo", async () => {
  const html = await renderPatiosWith(JSON.stringify({ patios: "A" }));
  assert.match(html, /pat-patios-grid/);
  assert.match(html, /Locais de guarda da organização — endereço, capacidade, custódia e situação de cada pátio\./);
  assert.match(html, /CAPACIDADE PREVISTA/);
  assert.match(html, /sem acesso à custódia/);
  assert.match(html, /Nenhum pátio encontrado/);
});

test("B e C sem o resumo de custódia não desenham gráfico nem número inventado (D-007)", async () => {
  const b = await renderPatiosWith(JSON.stringify({ patios: "B" }));
  assert.doesNotMatch(b, /Ocupação da rede|Processos por fase/);
  assert.match(b, /Capacidade prevista/);
  const c = await renderPatiosWith(JSON.stringify({ patios: "C" }));
  assert.match(c, /Nenhum pátio encontrado/);
});

test("as 3 aparências: linguagem de negócio — nunca 'tenant', nem o identificador da organização", async () => {
  for (const value of ["A", "B", "C"]) {
    const html = await renderPatiosWith(JSON.stringify({ patios: value }));
    assert.doesNotMatch(html, /\btenant\b/i, `aparência ${value}`);
    assert.doesNotMatch(html, new RegExp(TENANT_ID), `aparência ${value}`);
  }
});

test("as funções puras da tela seguem exportadas por PatiosPage (crítica, ajuste 6)", async () => {
  const page = await import("../src/modules/patios/yards/pages/PatiosPage");
  assert.equal(typeof page.computeYardKpis, "function");
  assert.equal(typeof page.shouldShowInvite, "function");
  assert.equal(typeof page.occupancyTone, "function");
});

test("faixas e totais da B saem do resumo REAL por pátio", async () => {
  const { buildYardRows, networkTotals, timezoneLabel } = await import("../src/modules/patios/yards/components/aparencias/patiosAparencias.shared");
  const yards = [
    { id: "a", name: "A", address: "", capacityHint: null, timezone: "America/Sao_Paulo", active: true, createdAt: "", updatedAt: "" },
    { id: "b", name: "B", address: "", capacityHint: null, timezone: "America/Manaus", active: true, createdAt: "", updatedAt: "" },
    { id: "c", name: "C", address: "", capacityHint: 10, timezone: "Europe/Lisbon", active: true, createdAt: "", updatedAt: "" },
    { id: "d", name: "D", address: "", capacityHint: null, timezone: "America/Sao_Paulo", active: false, createdAt: "", updatedAt: "" },
  ];
  const summary = {
    occupancy: [
      { yardId: "a", yardName: "A", totalSpots: 100, occupiedSpots: 86, freeSpots: 10, blockedSpots: 4 },
      { yardId: "b", yardName: "B", totalSpots: 10, occupiedSpots: 6, freeSpots: 4, blockedSpots: 0 },
    ],
    totalProcesses: 0,
    processesByPhase: { RECEPTION: 0, CUSTODY: 0, RELEASE: 0, AUCTION: 0, CLOSED: 0 },
    overdueNotifications: 0,
    releaseQueueDepth: 0,
    openLots: 0,
    auctionRevenue: { currentMonthTotal: "0.00", grandTotal: "0.00", byBeneficiary: [] },
    deadlineAlerts: [],
  };
  const rows = buildYardRows(yards, summary);
  assert.deepEqual(rows.map((row) => [row.yard.id, row.pct, row.band]), [
    ["a", 86, "critica"],
    ["b", 60, "atencao"],
    ["c", null, "sem-vagas"],
    ["d", null, "inativo"],
  ]);
  assert.deepEqual(networkTotals(summary), { total: 110, occupied: 92, free: 14, blocked: 4, pct: 84 });
  assert.equal(networkTotals(null).pct, null, "sem resumo não há porcentagem");
  assert.equal(timezoneLabel("America/Sao_Paulo"), "Brasília (UTC−3)");
  assert.equal(timezoneLabel("Europe/Lisbon"), "Europe/Lisbon", "fuso desconhecido aparece como veio, sem nome inventado");
});
