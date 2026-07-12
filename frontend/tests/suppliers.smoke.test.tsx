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

async function renderFornecedores(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { FornecedoresPage } = await import("../src/modules/registry/suppliers/pages/FornecedoresPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/fornecedores"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <FornecedoresPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("fornecedores renderiza cabecalho, tabs de situacao, acao de criar e estado vazio (D-007)", async () => {
  const html = await renderFornecedores(["suppliers:read", "suppliers:create", "suppliers:update"]);

  assert.match(html, /Fornecedores/);
  assert.match(html, /documento, contato, categoria e situação/);
  assert.match(html, /Novo fornecedor/);
  assert.match(html, /Nenhum fornecedor cadastrado/);
  // Situação em PT-BR MASCULINO nas tabs (linguagem de negócio; nunca "tenant").
  // A coluna "CNPJ/CPF" é coberta no teste do modal — com dataset vazio a tabela não renderiza (D-007).
  assert.match(html, /Ativos/);
  assert.match(html, /Inativos/);
  assert.doesNotMatch(html, /\btenant\b/i);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /sup-1|Auto Peças Silva/);
});

test("fornecedores esconde 'Novo fornecedor' sem permissao de criacao", async () => {
  const html = await renderFornecedores(["suppliers:read"]);

  assert.match(html, /Fornecedores/);
  assert.match(html, /Nenhum fornecedor cadastrado/);
  assert.doesNotMatch(html, /Novo fornecedor/);
});

// Diferente do `code` de Filiais, o NOME do fornecedor é chave natural do 409 mas o backend
// aceita renomear — na edição TODOS os campos permanecem editáveis (nenhum input desabilitado).
test("modal de edicao mantem o nome (e todos os campos) editaveis", async () => {
  const { SupplierFormModal } = await import("../src/modules/registry/suppliers/components/SupplierFormModal");
  const supplier = {
    id: "sup-1",
    name: "Auto Peças Silva",
    document: "12.345.678/0001-90",
    email: "contato@silva.example",
    phone: "(11) 99999-0000",
    address: "Rua das Oficinas, 100",
    category: "Peças",
    notes: null,
    status: "active",
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const html = renderToString(<SupplierFormModal supplier={supplier} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Editar fornecedor/);
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 0);
  // Toggle de situação existe na edição (desativar/reativar pelo modal).
  assert.match(html, /Fornecedor ativo/);
});

test("modal de criacao exibe os campos do contrato e nao mostra toggle de situacao", async () => {
  const { SupplierFormModal } = await import("../src/modules/registry/suppliers/components/SupplierFormModal");
  const html = renderToString(<SupplierFormModal supplier={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Novo fornecedor/);
  assert.match(html, /CNPJ\/CPF/);
  assert.match(html, /Categoria/);
  assert.match(html, /E-mail/);
  assert.match(html, /Telefone/);
  assert.match(html, /Endereço/);
  assert.match(html, /Observações/);
  // Criação nasce ativa no backend — o toggle de situação só existe na edição.
  assert.doesNotMatch(html, /Fornecedor ativo/);
});
