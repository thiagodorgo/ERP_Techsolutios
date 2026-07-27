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

async function renderLiberacoes(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { LiberacoesPage } = await import("../src/modules/patios/release/pages/LiberacoesPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/patios/liberacoes"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <LiberacoesPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("liberações: cabeçalho + subtítulo + busca + toggle de elegíveis (§11 page-header)", async () => {
  const html = await renderLiberacoes(["impound:read"]);
  assert.match(html, /Liberações/);
  assert.match(html, /Restituições e saídas para reparo em andamento/);
  assert.match(html, /Buscar por placa ou autoridade/);
  assert.match(html, /Incluir processos elegíveis \(custódia ativa\)/);
});

test("liberações: estado vazio honesto (D-007) — modo mock não fabrica liberações", async () => {
  const html = await renderLiberacoes(["impound:read"]);
  assert.match(html, /Nenhuma liberação em andamento/);
  // D-007: nunca fabrica linhas de liberação.
  assert.doesNotMatch(html, /ABC-?1234|proc-1|rel-1/);
});

test("liberações: white-label — nunca 'tenant' nem 'polícia'; §allowlist não vaza tenant_id/branchId", async () => {
  const html = await renderLiberacoes(["impound:read"]);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});
