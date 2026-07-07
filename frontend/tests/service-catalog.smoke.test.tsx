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

async function renderServicos(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ServicosPage } = await import("../src/modules/registry/service-catalog/pages/ServicosPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/servicos"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <ServicosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("servicos page renderiza cabecalho, acao de criar e estado vazio (D-007)", async () => {
  const html = await renderServicos(["service_catalog:read", "service_catalog:create", "service_catalog:update"]);

  assert.match(html, /Serviços/);
  assert.match(html, /Catálogo de Serviços/);
  assert.match(html, /Novo serviço/);
  assert.match(html, /Nenhum serviço cadastrado/);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /svc-1|Guincho leve até 20km/);
});

test("servicos page esconde 'Novo serviço' sem permissao de criacao", async () => {
  const html = await renderServicos(["service_catalog:read"]);

  assert.match(html, /Serviços/);
  assert.match(html, /Nenhum serviço cadastrado/);
  assert.doesNotMatch(html, /Novo serviço/);
});
