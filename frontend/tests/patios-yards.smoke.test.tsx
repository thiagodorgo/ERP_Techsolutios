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

async function renderPatios(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PatiosPage } = await import("../src/modules/patios/yards/pages/PatiosPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

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

test("pátios renderiza cabeçalho, tabs de situação, ação de criar e estado vazio honesto (D-007)", async () => {
  const html = await renderPatios(["yard:read", "yard:create", "yard:update"]);

  assert.match(html, /Pátios/);
  assert.match(html, /Pátios de recolhimento da organização/);
  assert.match(html, /Novo pátio/);
  assert.match(html, /Nenhum pátio cadastrado/);
  // Situação em PT-BR de negócio (linguagem white-label).
  assert.match(html, /Ativos/);
  assert.match(html, /Inativos/);
  // D-007: modo mock não fabrica linhas.
  assert.doesNotMatch(html, /Pátio Central|yard-1/);
});

test("pátios esconde 'Novo pátio' sem a permissão yard:create", async () => {
  const html = await renderPatios(["yard:read"]);

  assert.match(html, /Pátios/);
  assert.match(html, /Nenhum pátio cadastrado/);
  assert.doesNotMatch(html, /Novo pátio/);
});

test("pátios: linguagem white-label — nunca 'tenant' nem 'polícia'; §allowlist não vaza tenant_id/branchId", async () => {
  const html = await renderPatios(["yard:read", "yard:create", "yard:update"]);

  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
  // §2.8 allowlist: o identificador técnico do tenant/filial nunca é renderizado como dado.
  assert.doesNotMatch(html, new RegExp(TENANT_ID));
  assert.doesNotMatch(html, new RegExp(BRANCH_ID));
});

test("modal de novo pátio traz o fuso horário padrão America/Sao_Paulo", async () => {
  const { YardFormModal } = await import("../src/modules/patios/yards/components/YardFormModal");
  const html = renderToString(<YardFormModal yard={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Novo pátio/);
  assert.match(html, /America\/Sao_Paulo/);
  assert.match(html, /Fuso horário/);
  assert.doesNotMatch(html, /\btenant\b/i);
});
