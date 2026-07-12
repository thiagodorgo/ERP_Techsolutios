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

async function renderProfissionais(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { ProfissionaisPage } = await import("../src/modules/registry/operator-profiles/pages/ProfissionaisPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/cadastros/profissionais"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <ProfissionaisPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("profissionais renderiza cabecalho, filtros de situacao e rastreamento, acao de criar e estado vazio (D-007)", async () => {
  const html = await renderProfissionais(["operator_profiles:read", "operator_profiles:create", "operator_profiles:update"]);

  assert.match(html, /Profissionais/);
  assert.match(html, /consentimento de rastreamento/);
  assert.match(html, /Novo profissional/);
  assert.match(html, /Nenhum profissional cadastrado/);
  // Situação MASCULINO + filtro de rastreamento (linguagem de negócio PT-BR; nunca "tenant").
  assert.match(html, /Ativos/);
  assert.match(html, /Inativos/);
  assert.match(html, /Rastreamento/);
  assert.match(html, /Consentiram/);
  assert.doesNotMatch(html, /\btenant\b/i);
  // D-007: modo mock nao fabrica linhas.
  assert.doesNotMatch(html, /op-1|João da Silva/);
});

test("profissionais esconde 'Novo profissional' sem permissao de criacao", async () => {
  const html = await renderProfissionais(["operator_profiles:read"]);

  assert.match(html, /Profissionais/);
  assert.match(html, /Nenhum profissional cadastrado/);
  assert.doesNotMatch(html, /Novo profissional/);
});

// Ω2-c — na EDIÇÃO o `userId` é imutável (chave natural 1-1): o input fica desabilitado com dica,
// e sai do payload PATCH. O toggle de situação existe na edição.
test("modal de edicao desabilita o campo Usuario (fixo apos a criacao) e mostra o toggle de situacao", async () => {
  const { OperatorProfileFormModal } = await import("../src/modules/registry/operator-profiles/components/OperatorProfileFormModal");
  const profile = {
    id: "op-1",
    userId: "550e8400-e29b-41d4-a716-446655440000",
    fullName: "João da Silva",
    cnhNumber: "01234567890",
    cnhCategory: "D",
    cnhExpiresAt: "2027-12-31T00:00:00.000Z",
    trackingConsent: true,
    trackingConsentAt: "2026-06-01T10:00:00.000Z",
    phone: "(11) 99999-0000",
    notes: null,
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const html = renderToString(<OperatorProfileFormModal profile={profile} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Editar profissional/);
  // Só o campo Usuário sai desabilitado no HTML.
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 1);
  assert.match(html, /Fixo após a criação/);
  // Toggle de situação existe na edição (desativar/reativar pelo modal).
  assert.match(html, /Profissional ativo/);
  // Nunca vaza o termo técnico "tenant" na UI.
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("modal de criacao mantem o campo Usuario editavel, exibe o consentimento LGPD e nao mostra toggle de situacao", async () => {
  const { OperatorProfileFormModal } = await import("../src/modules/registry/operator-profiles/components/OperatorProfileFormModal");
  const html = renderToString(<OperatorProfileFormModal profile={null} context={{}} onClose={() => undefined} onSaved={() => undefined} />);

  assert.match(html, /Novo profissional/);
  // Nenhum input desabilitado na criação (userId é editável).
  const disabledInputs = (html.match(/<input[^>]*disabled[^>]*>/g) ?? []).length;
  assert.equal(disabledInputs, 0);
  assert.match(html, /ID do usuário na organização/);
  assert.match(html, /Número da CNH/);
  assert.match(html, /Categoria da CNH/);
  assert.match(html, /Validade da CNH/);
  // Consentimento LGPD explícito (registro do próprio operador).
  assert.match(html, /Operador consentiu com o rastreamento de localização/);
  // Criação nasce ativa no backend — o toggle de situação só existe na edição.
  assert.doesNotMatch(html, /Profissional ativo/);
  assert.doesNotMatch(html, /\btenant\b/i);
});
