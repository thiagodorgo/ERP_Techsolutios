import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptFieldOperators, summarizeFieldOperatorStatuses } from "../src/modules/dispatch/field-operators.adapter";
import type { FieldLocationItem, FieldLocationStatus } from "../src/modules/operations/map/operations-map.types";

// PR-SCALE-4 — a tela "Operadores de Campo" agora consome a MESMA fonte real do Mapa
// (getLatestFieldLocations) em vez de FABRICAR operadores (violava D-007). Este teste prova: (a) o
// adapter mapeia location→row reusando os helpers do Mapa, currentOs="—" sem OS, e — LGPD §12 — a linha
// NUNCA carrega latitude/longitude mesmo que o location tenha coordenada; (b) o render da página em modo
// mock mostra o estado honesto — SEM os dados fabricados antigos (Carla Mendes / "há 2 min" / OS-2891 /
// "8 em campo"); (c) os KPIs são contagens derivadas só da lista, por categoria real do enum.

const NOW = new Date("2026-07-20T12:00:00Z");

function makeLocation(overrides: Partial<FieldLocationItem> & { status: FieldLocationStatus }): FieldLocationItem {
  return {
    id: `loc-${overrides.status}`,
    operatorId: `op-${overrides.status}`,
    displayName: "Operador Real",
    status: overrides.status,
    latitude: -23.55052,
    longitude: -46.63331,
    capturedAt: new Date(NOW.getTime() - 2 * 60_000).toISOString(),
    isStale: false,
    ...overrides,
  };
}

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });
  return { localStorage, clear: () => storage.clear() };
}

const browser = installBrowserTestGlobals();

// ── (a) adapter: mapeia, "—" sem OS, e NUNCA vaza coordenada (LGPD §12) ────────────────────────────
test("adaptFieldOperators: mapeia location→row via helpers do Mapa; ordena disponível antes de engajado", () => {
  const rows = adaptFieldOperators(
    [
      makeLocation({ status: "in_service", displayName: "Ana Engajada", teamName: "Guincho SP", currentWorkOrder: { id: "wo-1", code: "OS-2891", title: "Reboque", status: "in_progress", priority: "high" } }),
      makeLocation({ status: "available", displayName: "Bruno Livre", teamName: null }),
    ],
    NOW,
  );

  assert.equal(rows.length, 2);
  // ordem operacional: disponível (available) antes de engajado (in_service).
  assert.equal(rows[0].statusLabel, "Disponível");
  assert.equal(rows[0].team, "Sem equipe"); // teamName null → rótulo honesto
  assert.equal(rows[0].currentOs, "—"); // sem OS vinculada → "—"

  const engaged = rows.find((row) => row.name === "Ana Engajada");
  assert.ok(engaged);
  assert.equal(engaged.currentOs, "OS-2891"); // código humano da OS vinculada
  assert.equal(engaged.team, "Guincho SP");
  assert.equal(engaged.statusLabel, "Em atendimento");
  assert.equal(engaged.statusTone, "pending");
  assert.equal(engaged.lastSeen, "há 2 min"); // frescor via formatLastSeen (nunca a coordenada)
});

test("adaptFieldOperators: LGPD §12 — a linha NUNCA inclui latitude/longitude, mesmo com coordenada no location", () => {
  const rows = adaptFieldOperators([makeLocation({ status: "on_route", latitude: -23.55052, longitude: -46.63331 })], NOW);
  const serialized = JSON.stringify(rows);

  assert.doesNotMatch(serialized, /latitude|longitude|"lat"|"lng"/i);
  assert.doesNotMatch(serialized, /-23\.55052|-46\.63331/); // os valores das coordenadas também não vazam
  // sanidade: a chave de coordenada não existe no objeto da linha
  assert.equal("latitude" in rows[0], false);
  assert.equal("longitude" in rows[0], false);
});

// ── (c) KPIs: contagem por categoria REAL do enum, derivada só da lista ─────────────────────────────
test("summarizeFieldOperatorStatuses: contagens honestas por categoria real (nada fabricado)", () => {
  const statuses: FieldLocationStatus[] = ["available", "available", "on_route", "on_site", "in_service", "paused", "offline", "blocked", "unknown"];
  const summary = summarizeFieldOperatorStatuses(statuses.map((status) => ({ status })));

  assert.equal(summary.total, 9);
  assert.equal(summary.available, 2); // available
  assert.equal(summary.engaged, 3); // on_route + on_site + in_service
  assert.equal(summary.paused, 1); // paused
  assert.equal(summary.offDuty, 3); // offline + blocked + unknown
});

// ── (b) render da página em modo mock: estado honesto, sem dados fabricados ─────────────────────────
async function renderFieldOperators(email = "dispatcher.web@techsolutions.example"): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { FieldOperatorsPage } = await import("../src/modules/dispatch/pages/FieldOperatorsPage");

  setStoredAuthSession(mockSessionForEmail(email));
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Operador Logistico",
      permissions: ["field_dispatch:read", "field_location:read"],
      enabledModules: ["logistics"],
      scope: "branch",
    }),
  );

  return renderToString(
    <MemoryRouter initialEntries={["/field-operators"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <FieldOperatorsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("operadores de campo: em modo mock mostra o estado honesto e NÃO fabrica operadores", async () => {
  const html = await renderFieldOperators();

  // cabeçalho honesto presente
  assert.match(html, /Operadores de Campo/);
  // estado vazio honesto (modo demonstração não tem posição real da equipe)
  assert.match(html, /Sem operadores em campo/);

  // AUSÊNCIA dos dados fabricados antigos (nomes, OS e frescor inventados)
  assert.doesNotMatch(html, /Carla Mendes|João Reis|Pedro Anhaia|Marcos Vieira/);
  assert.doesNotMatch(html, /OS-2891|OS-2892|OS-2884/);
  assert.doesNotMatch(html, /há 2 min|há 5 min|há 12 min/);
  process.env.VITE_USE_MOCKS = "";
});
