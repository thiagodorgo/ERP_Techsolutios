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

function seedContext(role: string, permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role,
      permissions,
      enabledModules: ["dashboard", "work-orders", "notifications"],
      scope: "branch",
    }),
  );
}

async function renderNotifications(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { NotificationsPage } = await import("../src/modules/notifications/pages/NotificationsPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext("Gestor Operacional", permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/notifications"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <NotificationsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("central de notificações: chips de categoria PT-BR presentes e 'Gerar alertas' com notifications:update", async () => {
  const html = await renderNotifications(["notifications:read", "notifications:update"]);

  assert.match(html, /Notificações/);
  // Chips de categoria (rótulos PT-BR, nunca token cru).
  assert.match(html, /Manutenção/);
  assert.match(html, /Multas/);
  assert.match(html, /Seguros/);
  assert.match(html, /Estoque/);
  assert.match(html, /Outros/);
  // Situação (tabs) + ação de produtores.
  assert.match(html, /Não lidas/);
  assert.match(html, /Arquivadas/);
  assert.match(html, /Gerar alertas/);
});

test("central de notificações: 'Gerar alertas' escondido sem notifications:update", async () => {
  const html = await renderNotifications(["notifications:read"]);

  assert.match(html, /Notificações/);
  assert.match(html, /Manutenção/);
  assert.doesNotMatch(html, /Gerar alertas/);
});

async function renderShell(): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { AppShell } = await import("../src/layouts/AppShell");

  // Papel de administração: era o item de menu com badge estático "4" (P-011).
  setStoredAuthSession(mockSessionForEmail("alice.admin@techsolutions.example"));
  seedContext("Administrador", ["dashboard:view", "notifications:read"]);

  return renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <AppShell />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("sidebar: badge de Notificações reflete não lidas reais (0 no SSR), sem o '4' fixo (mata P-011)", async () => {
  const html = await renderShell();

  // O item de navegação continua renderizando.
  assert.match(html, /Notificações/);
  // Sem contagem hardcoded: o antigo badge estático "4" não aparece mais (unread real = 0 no SSR).
  assert.doesNotMatch(html, />4</);
});
