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

async function renderRemuneracoes(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { RemuneracoesPage } = await import("../src/modules/finance/commissions/pages/RemuneracoesPage");

  // gestor.web → perfil operacional (não-plataforma): não herda commissions:* fora do contexto.
  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/finance/commissions"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <RemuneracoesPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("remunerações (commissions:read): cabeçalho, período De/Até + Atualizar, totais e estado vazio (D-007)", async () => {
  const html = await renderRemuneracoes(["commissions:read"]);

  assert.match(html, /Remunerações/);
  // Controles de período (De/Até) e ação Atualizar.
  assert.match(html, /type="date"/);
  assert.match(html, /Atualizar/);
  // Tira de totais do extrato de todos os operadores.
  assert.match(html, /Total geral/);
  assert.match(html, /Operadores/);
  // Estado vazio orientado (sem fabricar linhas).
  assert.match(html, /Nenhuma comissão no período/);
  assert.doesNotMatch(html, /u1|payee_id/);
});

test("remunerações (só commissions:read_own): mostra 'Seu extrato' e NÃO a tabela de todos os operadores", async () => {
  const html = await renderRemuneracoes(["commissions:read_own"]);

  assert.match(html, /Remunerações/);
  assert.match(html, /Seu extrato de comissões/);
  assert.match(html, /Ver detalhamento por OS/);
  // Não expõe o extrato agregado de todos os operadores.
  assert.doesNotMatch(html, /Total geral/);
  assert.doesNotMatch(html, /Operadores/);
});

test("remunerações: sem commissions:read nem read_own → tela ausente (acesso não permitido)", async () => {
  const html = await renderRemuneracoes(["finance:read"]);

  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(html, /Seu extrato de comissões/);
  assert.doesNotMatch(html, /Total geral/);
  assert.doesNotMatch(html, /Extrato por operador/);
});
