import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<EventListener>>();

  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: (event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event) ?? new Set<EventListener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener: (event: string, listener: EventListener) => {
      listeners.get(event)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });

  return { clear: () => storage.clear(), localStorage };
}

const browser = installBrowserTestGlobals();

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

async function renderSeguros(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { SegurosPage } = await import("../src/modules/fleet/insurance/pages/SegurosPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/fleet/insurance"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <SegurosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("seguros page renderiza cabeçalho, ação de criar, tira de totais 'A vencer' e estado vazio (D-007)", async () => {
  const html = await renderSeguros(["insurance_policies:read", "insurance_policies:create", "insurance_policies:update"]);

  assert.match(html, /Seguros/);
  assert.match(html, /Nova apólice/);
  // Tira de totais e filtro "A vencer" sempre presentes (renderiza mesmo vazio).
  assert.match(html, /A vencer/);
  assert.match(html, /Vigentes/);
  assert.match(html, /Vencidas/);
  // Chips de situação PT-BR derivada.
  assert.match(html, /Vigente/);
  assert.match(html, /Cancelada/);
  assert.match(html, /Nenhuma apólice encontrada/);
  // D-007: modo mock não fabrica linhas.
  assert.doesNotMatch(html, /pol-1|veh-1/);
});

test("seguros page esconde 'Nova apólice' sem permissão de criação", async () => {
  const html = await renderSeguros(["insurance_policies:read"]);

  assert.match(html, /Seguros/);
  assert.match(html, /Nenhuma apólice encontrada/);
  assert.doesNotMatch(html, /Nova apólice/);
});
