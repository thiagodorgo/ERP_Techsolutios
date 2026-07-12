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

async function renderFiliais(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { FiliaisPage } = await import("../src/modules/registry/branches/pages/FiliaisPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/filiais"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <FiliaisPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("filiais renderiza cabecalho, tabs de situacao, acao de criar e estado vazio (D-007)", async () => {
  const html = await renderFiliais(["branches:read", "branches:create", "branches:update"]);

  assert.match(html, /Filiais/);
  assert.match(html, /nome, código e situação de cada unidade operacional/);
  assert.match(html, /Nova filial/);
  assert.match(html, /Nenhuma filial cadastrada/);
  // Situação em PT-BR FEMININO nas tabs (linguagem de negócio; nunca "tenant").
  assert.match(html, /Ativas/);
  assert.match(html, /Inativas/);
  assert.doesNotMatch(html, /\btenant\b/i);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /br-1|SP-01/);
});

test("filiais esconde 'Nova filial' sem permissao de criacao", async () => {
  const html = await renderFiliais(["branches:read"]);

  assert.match(html, /Filiais/);
  assert.match(html, /Nenhuma filial cadastrada/);
  assert.doesNotMatch(html, /Nova filial/);
});

// Lição do veto B2 (Ω2-a.2) aplicada às Filiais: o CÓDIGO é chave natural imutável no
// backend — na edição o campo sai desabilitado com dica, para nunca dar falso sucesso.
test("modal de edicao desabilita o campo de codigo (chave natural imutavel)", async () => {
  const { BranchFormModal } = await import("../src/modules/registry/branches/components/BranchFormModal");
  const branch = {
    id: "br-1",
    name: "São Paulo — Zona Sul",
    code: "SP-01",
    status: "active" as const,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const html = renderToString(<BranchFormModal branch={branch} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Editar filial/);
  // Só o input de código sai desabilitado (checkbox "Filial ativa" permanece habilitado).
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 1);
  assert.match(html, /Fixo após a criação/);
  assert.match(html, /Filial ativa/);
});

test("modal de criacao mantem o campo de codigo habilitado e sem checkbox de situacao", async () => {
  const { BranchFormModal } = await import("../src/modules/registry/branches/components/BranchFormModal");
  const html = renderToString(<BranchFormModal branch={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Nova filial/);
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 0);
  // Criação nasce ativa no backend — o toggle de situação só existe na edição.
  assert.doesNotMatch(html, /Filial ativa/);
});
