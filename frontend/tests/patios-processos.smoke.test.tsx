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

const TENANT_ID = "ten-industrial-01";
const BRANCH_ID = "fil-sp-01";

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: BRANCH_ID,
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

async function renderProcessos(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ProcessosPage } = await import("../src/modules/patios/processes/pages/ProcessosPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/processos"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <ProcessosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("processos renderiza cabeçalho, subtítulo, filtros e estado vazio honesto (D-007)", async () => {
  const html = await renderProcessos(["impound:read", "impound:create"]);

  assert.match(html, /Processos de custódia/);
  assert.match(html, /Veículos sob custódia da organização/);
  // Filtros: Situação + Pátio (page-header com ações à direita; §11).
  assert.match(html, /Situação/);
  assert.match(html, /Pátio/);
  assert.match(html, /Buscar por placa ou autoridade/);
  // D-007: modo mock não fabrica linhas.
  assert.match(html, /Nenhum processo de custódia/);
  assert.doesNotMatch(html, /ABC-?1234|proc-1/);
});

test("processos mostra 'Novo processo' com impound:create", async () => {
  const html = await renderProcessos(["impound:read", "impound:create"]);
  assert.match(html, /Novo processo/);
});

test("processos esconde 'Novo processo' sem impound:create (a UI só molda; backend é a autoridade)", async () => {
  const html = await renderProcessos(["impound:read"]);
  assert.match(html, /Processos de custódia/);
  assert.match(html, /Nenhum processo de custódia/);
  assert.doesNotMatch(html, /Novo processo/);
});

test("processos: linguagem white-label — nunca 'tenant' nem 'polícia'; §allowlist não vaza tenant_id/branchId", async () => {
  const html = await renderProcessos(["impound:read", "impound:create"]);

  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});
