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

async function renderTags(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { TagsPage } = await import("../src/modules/registry/tags/pages/TagsPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/tags"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <TagsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("tags renderiza cabecalho, tabs de situacao (feminino), acao de criar e estado vazio (D-007)", async () => {
  const html = await renderTags(["tags:read", "tags:create", "tags:update"]);

  assert.match(html, /Tags/);
  assert.match(html, /nome, cor, descrição e situação/);
  assert.match(html, /Nova etiqueta/);
  assert.match(html, /Nenhuma etiqueta cadastrada/);
  // Situação em PT-BR FEMININO nas tabs (linguagem de negócio; nunca "tenant").
  assert.match(html, /Ativas/);
  assert.match(html, /Inativas/);
  assert.doesNotMatch(html, /\btenant\b/i);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /tag-1|Prioritário/);
});

test("tags esconde 'Nova etiqueta' sem permissao de criacao", async () => {
  const html = await renderTags(["tags:read"]);

  assert.match(html, /Tags/);
  assert.match(html, /Nenhuma etiqueta cadastrada/);
  assert.doesNotMatch(html, /Nova etiqueta/);
});

// Diferente do `code` de Filiais, o NOME da etiqueta é chave natural do 409 mas o backend aceita
// renomear — na edição TODOS os campos permanecem editáveis (nenhum input desabilitado).
test("modal de edicao mantem o nome (e todos os campos) editaveis e exibe o toggle de situacao", async () => {
  const { TagFormModal } = await import("../src/modules/registry/tags/components/TagFormModal");
  const tag = {
    id: "tag-1",
    name: "Prioritário",
    color: "#3b82f6",
    description: "SLA reduzido",
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const html = renderToString(<TagFormModal tag={tag} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Editar etiqueta/);
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 0);
  // Toggle de situação existe na edição (desativar/reativar pelo modal).
  assert.match(html, /Etiqueta ativa/);
});

test("modal de criacao exibe os campos do contrato e nao mostra toggle de situacao", async () => {
  const { TagFormModal } = await import("../src/modules/registry/tags/components/TagFormModal");
  const html = renderToString(<TagFormModal tag={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Nova etiqueta/);
  assert.match(html, /Cor/);
  assert.match(html, /Descrição/);
  // Seletor nativo de cor presente (input type=color).
  assert.match(html, /type="color"/);
  // Criação nasce ativa no backend — o toggle de situação só existe na edição.
  assert.doesNotMatch(html, /Etiqueta ativa/);
});
