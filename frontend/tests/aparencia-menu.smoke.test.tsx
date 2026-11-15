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
  // B-SAN3-22 (E3b-04): as contagens derivam do registro — 3 opções e 1 "padrão" por tela registrada.
  // B-ASS-10b (T5): o menu do shell da organização (sem escopo) conta só as telas de escopo "tenant"; a de plataforma
  // (Cloud Billing) fica no menu do console da plataforma (T-APAR-1).
  const { appearanceScreensFor } = await import("../src/modules/appearance");
  const APPEARANCE_SCREENS = appearanceScreensFor("tenant");
  assert.doesNotMatch(html, /Cloud Billing/, "a tela de plataforma não entra no menu da organização");
  assert.equal((html.match(/role="menuitemradio"/g) ?? []).length, 3 * APPEARANCE_SCREENS.length);
  assert.match(html, /aria-checked="true"[^>]*>(?:(?!<\/button>).)*B · Analítica/s, "a B vem marcada (padrão de Pátios)");
  assert.equal((html.match(/>padrão</g) ?? []).length, APPEARANCE_SCREENS.length, "uma etiqueta de padrão por tela");
  const editor = /aria-labelledby="aparencia-checklist-editor"(?:(?!role="group").)*/s.exec(html)?.[0] ?? "";
  assert.match(editor, /Editor de modelo de checklist/, "o editor de checklist está no menu");
  assert.match(editor, /aria-checked="true"[^>]*>(?:(?!<\/button>).)*A · Padrão fiel(?:(?!<\/button>).)*>padrão</s, "a A vem marcada e é o padrão do editor de checklist");
  const visible = html.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /\btenant\b|localStorage|screenKey|patios\b/i, "texto visível sem termo técnico");
});

// B-APAR-OS (fundação da trilha B-APAR-3) — com as telas da trilha o painel passaria de ~1.200 px abrindo para cima a
// partir do rodapé; ele precisa de altura máxima relativa à janela e rolagem própria.
test("o painel de aparência tem altura máxima relativa à janela e rola por dentro (cabe com 9 telas)", async () => {
  const { APPEARANCE_PANEL_STYLE } = await import("../src/modules/appearance/AppearanceMenu");
  assert.equal(APPEARANCE_PANEL_STYLE.overflowY, "auto", "o painel rola por dentro");
  assert.match(String(APPEARANCE_PANEL_STYLE.maxHeight ?? ""), /vh/, "a altura máxima acompanha a altura da janela");
  // 9 grupos × (rótulo ~30 px + 3 opções × 36 px) ≈ 1.242 px: o teto em px fica bem abaixo disso.
  const cap = Number(/(\d+)px/.exec(String(APPEARANCE_PANEL_STYLE.maxHeight))?.[1] ?? Number.NaN);
  assert.ok(cap > 0 && cap < 9 * (30 + 3 * 36), `teto do painel em px: ${cap}`);
});
