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

async function renderEstoque(permissions: readonly string[], path = "/inventory"): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { EstoquePage } = await import("../src/modules/inventory/pages/EstoquePage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <EstoquePage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("estoque page renderiza cabeçalho, abas Itens|Movimentações, ações gated, totais reais e vazio (D-007)", async () => {
  const html = await renderEstoque([
    "inventory_items:read",
    "inventory_items:create",
    "inventory_items:update",
    "stock_movements:read",
    "stock_movements:create",
  ]);

  assert.match(html, /Estoque/);
  // Abas do F7a — Contagem é F7b e NÃO pode aparecer (aba morta = veto).
  assert.match(html, /Itens</);
  assert.match(html, /Movimentações</);
  assert.doesNotMatch(html, /Contagem/);
  // Ações do cabeçalho (gated por criação).
  assert.match(html, /Novo item/);
  assert.match(html, /Movimento</);
  assert.match(html, /Atualizar/);
  // Tira de totais reais sempre presente (renderiza mesmo vazio).
  assert.match(html, /Itens ativos/);
  assert.match(html, /Abaixo do mínimo/);
  assert.match(html, /Movimentações no período/);
  // Estado vazio da aba Itens (modo demonstração não fabrica linhas).
  assert.match(html, /Nenhum item encontrado/);
  // D-007: NENHUM dado fabricado da casca estática antiga.
  assert.doesNotMatch(html, /NF-e 4471/);
  assert.doesNotMatch(html, /Indústria Alfa/);
  assert.doesNotMatch(html, /Fornecedor Beta/);
  assert.doesNotMatch(html, /Resistor 10k/);
  assert.doesNotMatch(html, /Cabo USB-C/);
  assert.doesNotMatch(html, /1\.284/);
});

test("estoque page esconde 'Novo item' e 'Movimento' sem permissão de criação", async () => {
  const html = await renderEstoque(["inventory_items:read", "stock_movements:read"]);

  assert.match(html, /Estoque/);
  assert.match(html, /Itens</);
  assert.match(html, /Movimentações</);
  assert.match(html, /Nenhum item encontrado/);
  // Sem inventory_items:create / stock_movements:create → botões de criação ausentes.
  assert.doesNotMatch(html, /Novo item/);
  assert.doesNotMatch(html, /Movimento</);
});

test("estoque page aba Movimentações via URL: filtros PT-BR, vazio real e nada fabricado", async () => {
  const html = await renderEstoque(
    ["inventory_items:read", "stock_movements:read", "stock_movements:create"],
    "/inventory?tab=movimentacoes",
  );

  // Filtros da aba (item/tipo) com vocabulário PT-BR do domínio.
  assert.match(html, /Todos os tipos/);
  assert.match(html, /Entrada/);
  assert.match(html, /Saída/);
  assert.match(html, /Consumo/);
  assert.match(html, /Ajuste/);
  // Estado vazio da aba Movimentações.
  assert.match(html, /Nenhuma movimentação encontrada/);
  // Imutabilidade comunicada; sem linhas fabricadas.
  assert.match(html, /definitivas/);
  assert.doesNotMatch(html, /NF-e 4471|Indústria Alfa|Fornecedor Beta/);
});
