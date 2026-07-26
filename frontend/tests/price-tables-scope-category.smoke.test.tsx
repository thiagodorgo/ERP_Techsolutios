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
    <MemoryRouter initialEntries={["/patios/tarifas"]}>
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

test("modal de tabela de valores renderiza os 2 Selects (Escopo/Categoria) com o curinga 'Todos/Todas' e labels PT-BR", async () => {
  const { PriceTableFormModal } = await import("../src/modules/registry/price-tables/components/PriceTableFormModal");
  const html = renderToString(<PriceTableFormModal priceTable={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  // Escopo público/privado — mesmo enum do perfil normativo, rótulo PT-BR de negócio.
  assert.match(html, /Escopo/);
  assert.match(html, /Todos \(público e privado\)/);
  assert.match(html, /Convênio público/);
  assert.match(html, /Contrato privado/);
  // Categoria de veículo — Select curado; "Todas" = NULL curinga.
  assert.match(html, /Categoria de veículo/);
  assert.match(html, /Todas as categorias/);
  assert.match(html, /Motocicleta/);
  assert.match(html, /Automóvel/);
  assert.match(html, /Caminhão \/ Pesado/);
  // White-label + §allowlist: nunca "tenant", nunca o enum técnico cru como texto visível fora de <option value>.
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("tela de tabela de valores expõe os filtros de Escopo e Categoria (com o curinga) sem regressão do estado vazio (D-007)", async () => {
  const html = await renderTabelasValores(["price_tables:read", "price_tables:create", "price_tables:update"]);

  assert.match(html, /Tabela de Valores/);
  // C2 (§11) — cabeçalho sensível à rota: entrando por /patios/tarifas o breadcrumb é "Pátios", não "Cadastros".
  assert.match(html, /Pátios/);
  assert.doesNotMatch(html, /Cadastros/);
  // Filtros novos de escopo/categoria na lista.
  assert.match(html, /Escopo/);
  assert.match(html, /Categoria/);
  assert.match(html, /Convênio público/);
  assert.match(html, /Contrato privado/);
  // Zero regressão: estado vazio honesto permanece; tokens técnicos de status nunca vazam.
  assert.match(html, /Nenhuma tabela de valores cadastrada/);
  assert.doesNotMatch(html, /draft|published|archived/);
  assert.doesNotMatch(html, /\btenant\b/i);
});
