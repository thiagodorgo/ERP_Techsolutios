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
      role: "Administrador",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "tenant",
    }),
  );
}

async function renderUsers(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { UsersPage } = await import("../src/modules/users/pages/UsersPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/users"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <UsersPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("users page renderiza cabeçalho, KPIs reais, ação de criar e estado vazio (D-007)", async () => {
  const html = await renderUsers(["users.read", "users.manage", "audit.read"]);

  assert.match(html, /Usuários/);
  assert.match(html, /Novo usuário/);
  // KPIs reais (rótulos sempre presentes; valores vêm dos dados, não fixos).
  assert.match(html, /Ativos/);
  assert.match(html, /Total/);
  assert.match(html, /Papéis/);
  // "Criado em" substitui "último acesso" — este campo não existe no contrato e nunca aparece.
  assert.doesNotMatch(html, /[úu]ltimo acesso/i);
  // Estado vazio real (modo mock não fabrica linhas).
  assert.match(html, /Nenhum usu[áa]rio encontrado/);
  // D-007: nenhum dado fabricado do shell antigo pode aparecer.
  assert.doesNotMatch(html, /Rafael Souza/);
  assert.doesNotMatch(html, /Beatriz Lima/);
  assert.doesNotMatch(html, /"138"|>138</);
});

test("users page esconde 'Novo usuário' sem permissão de gestão", async () => {
  const html = await renderUsers(["users.read"]);

  assert.match(html, /Usuários/);
  assert.match(html, /Nenhum usu[áa]rio encontrado/);
  assert.doesNotMatch(html, /Novo usuário/);
});
