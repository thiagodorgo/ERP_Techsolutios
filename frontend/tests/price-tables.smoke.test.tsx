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

async function renderTabelasValores(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { TabelasValoresPage } = await import("../src/modules/registry/price-tables/pages/TabelasValoresPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/tabelas-valores"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <TabelasValoresPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("tabelas de valores renderiza cabecalho, filtros de publicacao, acao de criar e estado vazio (D-007)", async () => {
  const html = await renderTabelasValores(["price_tables:read", "price_tables:create", "price_tables:update"]);

  assert.match(html, /Tabela de Valores/);
  assert.match(html, /moeda, versão, vigência e status de publicação/);
  assert.match(html, /Nova tabela/);
  assert.match(html, /Nenhuma tabela de valores cadastrada/);
  // Filtros de publicação em PT-BR (token técnico nunca aparece cru).
  assert.match(html, /Rascunho/);
  assert.match(html, /Publicada/);
  assert.match(html, /Arquivada/);
  assert.doesNotMatch(html, /draft|published|archived/);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /pt-1|Tabela Padrão 2026/);
});

test("tabelas de valores esconde 'Nova tabela' sem permissao de criacao", async () => {
  const html = await renderTabelasValores(["price_tables:read"]);

  assert.match(html, /Tabela de Valores/);
  assert.match(html, /Nenhuma tabela de valores cadastrada/);
  assert.doesNotMatch(html, /Nova tabela/);
});
