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

async function renderPois(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PontosInteressePage } = await import("../src/modules/registry/pois/pages/PontosInteressePage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/pontos-interesse"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PontosInteressePage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("pois renderiza cabecalho, tabs de situacao (masculino), acao de criar e estado vazio (D-007)", async () => {
  const html = await renderPois(["pois:read", "pois:create", "pois:update"]);

  assert.match(html, /Pontos de Interesse/);
  assert.match(html, /categoria, coordenada, endereço e situação/);
  assert.match(html, /Novo ponto/);
  assert.match(html, /Nenhum ponto de interesse cadastrado/);
  // Situação em PT-BR MASCULINO nas tabs (linguagem de negócio; nunca "tenant").
  assert.match(html, /Ativos/);
  assert.match(html, /Inativos/);
  assert.doesNotMatch(html, /\btenant\b/i);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /poi-1|Base Central/);
});

test("pois esconde 'Novo ponto' sem permissao de criacao", async () => {
  const html = await renderPois(["pois:read"]);

  assert.match(html, /Pontos de Interesse/);
  assert.match(html, /Nenhum ponto de interesse cadastrado/);
  assert.doesNotMatch(html, /Novo ponto/);
});

// O NOME do ponto é chave natural do 409 mas o backend aceita renomear — na edição TODOS os
// campos permanecem editáveis (nenhum input desabilitado).
test("modal de edicao mantem o nome (e todos os campos) editaveis e exibe o toggle de situacao", async () => {
  const { PoiFormModal } = await import("../src/modules/registry/pois/components/PoiFormModal");
  const poi = {
    id: "poi-1",
    name: "Base Central",
    category: "Base",
    latitude: -23.55052,
    longitude: -46.63331,
    address: "Av. Paulista, 1000",
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const html = renderToString(<PoiFormModal poi={poi} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Editar ponto de interesse/);
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 0);
  // Toggle de situação existe na edição (desativar/reativar pelo modal).
  assert.match(html, /Ponto ativo/);
});

test("modal de criacao exibe latitude/longitude obrigatorias com hint de faixa e nao mostra toggle de situacao", async () => {
  const { PoiFormModal } = await import("../src/modules/registry/pois/components/PoiFormModal");
  const html = renderToString(<PoiFormModal poi={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Novo ponto de interesse/);
  assert.match(html, /Latitude \*/);
  assert.match(html, /Longitude \*/);
  assert.match(html, /Entre -90 e 90/);
  assert.match(html, /Entre -180 e 180/);
  assert.match(html, /Categoria/);
  assert.match(html, /Endereço/);
  // Criação nasce ativa no backend — o toggle de situação só existe na edição.
  assert.doesNotMatch(html, /Ponto ativo/);
});
