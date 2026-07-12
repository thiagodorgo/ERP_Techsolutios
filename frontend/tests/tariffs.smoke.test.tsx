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

async function renderTarifas(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { TarifasPage } = await import("../src/modules/registry/tariffs/pages/TarifasPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/tarifas"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <TarifasPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("tarifas renderiza cabecalho, filtro por Tabela de Valores, acao de criar e estado vazio (D-007)", async () => {
  const html = await renderTarifas(["tariffs:read", "tariffs:create", "tariffs:update"]);

  assert.match(html, /Tarifas/);
  assert.match(html, /serviço, cliente, valor unitário, origem e vigência/);
  assert.match(html, /Nova tarifa/);
  assert.match(html, /Nenhuma tarifa cadastrada/);
  // Filtro por Tabela de Valores (linguagem de negócio PT-BR; nunca "tenant").
  assert.match(html, /Tabela de Valores/);
  assert.match(html, /Todas as tabelas/);
  assert.doesNotMatch(html, /\btenant\b/i);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /tf-1|Guincho 0/);
});

test("tarifas esconde 'Nova tarifa' sem permissao de criacao", async () => {
  const html = await renderTarifas(["tariffs:read"]);

  assert.match(html, /Tarifas/);
  assert.match(html, /Nenhuma tarifa cadastrada/);
  assert.doesNotMatch(html, /Nova tarifa/);
});

// Veto junta Ω2-a.2 (B2) — na EDIÇÃO as referências (tabela/serviço/cliente) são imutáveis no
// backend; os selects ficam desabilitados com dica, para nunca dar falso sucesso.
test("modal de edicao desabilita os selects de referencia (imutaveis)", async () => {
  const { TariffFormModal } = await import("../src/modules/registry/tariffs/components/TariffFormModal");
  const tariff = {
    id: "t1",
    name: "Guincho leve",
    priceTableId: "pt1",
    serviceCatalogId: "sc1",
    customerId: null,
    unitPrice: 150.5,
    currency: "BRL",
    origin: "tabela base",
    rule: null,
    validFrom: null,
    validTo: null,
    status: "active",
    isActive: true,
    createdAt: "2026-07-01T00:00:00.000Z",
  };
  const html = renderToString(
    <TariffFormModal
      tariff={tariff}
      context={{}}
      priceTables={[{ id: "pt1", label: "Tabela Padrão" }]}
      services={[{ id: "sc1", label: "Guincho" }]}
      customers={[]}
      onClose={() => undefined}
      onSaved={() => undefined}
    />,
  );
  assert.match(html, /Editar tarifa/);
  // Os 3 selects de referência saem desabilitados no HTML.
  const disabledSelects = (html.match(/<select[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledSelects, 3);
  assert.match(html, /Fixa após a criação|Fixo após a criação/);
});

test("modal de criacao mantem os selects de referencia habilitados", async () => {
  const { TariffFormModal } = await import("../src/modules/registry/tariffs/components/TariffFormModal");
  const html = renderToString(
    <TariffFormModal
      tariff={null}
      context={{}}
      priceTables={[{ id: "pt1", label: "Tabela Padrão" }]}
      services={[]}
      customers={[]}
      onClose={() => undefined}
      onSaved={() => undefined}
    />,
  );
  assert.match(html, /Nova tarifa/);
  const disabledSelects = (html.match(/<select[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledSelects, 0);
});
