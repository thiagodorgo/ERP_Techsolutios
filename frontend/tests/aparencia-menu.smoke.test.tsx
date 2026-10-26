import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// B-APARENCIA-USUARIO — a escolha fica no MENU DO USUÁRIO (D-APARENCIA-RESPOSTAS (c)), aberta a TODO papel:
// é preferência pessoal, não configuração da organização (crítica, ajuste 2: "todo papel vê o item").

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    setInterval: () => 0,
    clearInterval: () => undefined,
  },
});
Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: () => null, hidden: false } });

// Todos os rótulos de papel do front (UserRole em src/modules/auth/types.ts).
const ROLES = ["Super Admin", "Administrador", "Gestor Operacional", "Operador Logistico", "Operação de Campo", "Supervisor", "Financeiro", "Estoque", "Auditor"] as const;

async function renderShellAs(role: (typeof ROLES)[number]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  storage.clear();
  const { mockSession } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { AppShell } = await import("../src/layouts/AppShell");

  // Sem permissão nenhuma: o item não depende de permissão.
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: [role], permissions: [] } });
  storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: "org-1", tenantName: "Organização", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role, permissions: [], enabledModules: [], scope: "tenant" }),
  );

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

test("todo papel vê o item 'Aparência' no menu do usuário, mesmo sem permissão nenhuma", async () => {
  for (const role of ROLES) {
    const html = await renderShellAs(role);
    assert.match(html, /aria-label="Aparência das telas"/, `o papel ${role} não vê o item de aparência`);
    assert.match(html, /aria-haspopup="menu"/);
  }
});

test("o conteúdo do menu: Pátios com A · Padrão, B · Analítica e C · Mesa de pátio; a B marcada como padrão; sem termo técnico", async () => {
  storage.clear();
  process.env.VITE_USE_MOCKS = "true";
  const { mockSession } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { AppearanceChoices } = await import("../src/modules/appearance");
  setStoredAuthSession(mockSession);
  storage.set("erp-techsolutions.active-context", JSON.stringify({ tenantId: "org-1", tenantName: "Organização", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Administrador", permissions: [], enabledModules: [], scope: "tenant" }));

  const html = renderToString(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <AppearanceChoices onChosen={() => undefined} />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  assert.match(html, /Pátios/);
  assert.match(html, /A · Padrão/);
  assert.match(html, /B · Analítica/);
  assert.match(html, /C · Mesa de pátio/);
  assert.equal((html.match(/role="menuitemradio"/g) ?? []).length, 3);
  assert.match(html, /aria-checked="true"[^>]*>(?:(?!<\/button>).)*B · Analítica/s, "a B vem marcada (padrão de Pátios)");
  assert.equal((html.match(/>padrão</g) ?? []).length, 1, "só a B leva a etiqueta de padrão");
  const visible = html.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /\btenant\b|localStorage|screenKey|patios\b/i, "texto visível sem termo técnico");
});
