import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// WS-RBAC-GATING-CHECKLISTS — prova que as ações de ESCRITA de checklist só aparecem para quem tem a
// permissão (o backend já responde 403; a UI não deve oferecer o que o papel não pode). Renderiza o
// header (sempre presente, independente do carregamento) e verifica presença/ausência do botão.

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false, getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });
  return { localStorage, clear: () => storage.clear() };
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
      enabledModules: ["dashboard", "tenant_checklist"],
      scope: "branch",
    }),
  );
}

async function renderChecklists(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { TenantChecklistsPage } = await import("../src/modules/checklists/pages/TenantChecklistsPage");

  // gestor.web → perfil operacional: não herda tenant_checklists:* fora do contexto semeado.
  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/administrator/checklists"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <TenantChecklistsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("checklists (somente-leitura): NÃO expõe ações de escrita ('Novo checklist')", async () => {
  const html = await renderChecklists(["tenant_checklists:read"]);

  assert.match(html, /Checklists/); // a tela renderiza (título)
  assert.doesNotMatch(html, /Novo checklist/); // ação de criação escondida do papel de leitura
});

test("checklists (com create): expõe 'Novo checklist'", async () => {
  const html = await renderChecklists(["tenant_checklists:read", "tenant_checklists:create"]);

  assert.match(html, /Novo checklist/);
});
