import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Ω-VID PR-07 — deep-link ?dossie=<processId> no MOUNT abre o VehicleDossieModal (refresh / link compartilhado /
// botão-voltar não quebram a experiência). Testa a PatioDetailPage inteira sob os providers reais (padrão do
// patios-processos.smoke): a presença do param dirige a abertura do modal grande.

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
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null, hidden: false, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });

  return { clear: () => storage.clear(), localStorage };
}

const browser = installBrowserTestGlobals();
const TENANT_ID = "ten-industrial-01";
const PROCESS_ID = "550e8400-e29b-41d4-a716-446655440000";

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
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

async function renderPatioDetail(entry: string): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PatioDetailPage } = await import("../src/modules/patios/yards/pages/PatioDetailPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(["yard:read", "yard:update", "impound:read", "impound:allocate"]);

  return renderToString(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PatioDetailPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("mount COM ?dossie=<id> abre o modal grande do dossiê (deep-link / refresh / link compartilhado)", async () => {
  const html = await renderPatioDetail(`/patios/patios/yard-1?dossie=${PROCESS_ID}`);
  assert.match(html, /Dossiê do veículo/); // título do Modal size="lg"
  assert.match(html, /ui-modal--lg/); // é a variante grande (PR-06)
  // §allowlist: o processId do param NUNCA vira texto no DOM
  assert.doesNotMatch(html, new RegExp(PROCESS_ID));
});

test("mount SEM ?dossie= não abre o modal (a rota /patios/processos/:id segue como fallback direto)", async () => {
  const html = await renderPatioDetail("/patios/patios/yard-1");
  assert.doesNotMatch(html, /Dossiê do veículo/);
  assert.doesNotMatch(html, /ui-modal--lg/);
});
