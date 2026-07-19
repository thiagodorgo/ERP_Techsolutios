import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { TenantSettingItem } from "../src/modules/settings/tenant-settings.types";

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
      enabledModules: ["dashboard", "tenant-admin"],
      scope: "tenant",
    }),
  );
}

async function renderSettingsPage(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { TenantSettingsPage } = await import("../src/modules/settings/pages/TenantSettingsPage");

  setStoredAuthSession(mockSessionForEmail("admin@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/administrator/settings"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <TenantSettingsPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const FIXTURE_ITEMS: TenantSettingItem[] = [
  { key: "organization.business_name", value: "Techsolutions Industrial", category: "organization", description: null, updatedAt: "2026-07-10T12:00:00.000Z" },
  { key: "organization.theme", value: "tech_dark", category: "organization", description: "Tema visual padrão da organização", updatedAt: null },
  { key: "flags.beta_enabled", value: "true", category: null, description: null, updatedAt: null },
];

async function renderGroups(canUpdate: boolean): Promise<string> {
  const { TenantSettingsGroups } = await import("../src/modules/settings/components/TenantSettingsGroups");
  return renderToString(
    <TenantSettingsGroups items={FIXTURE_ITEMS} canUpdate={canUpdate} context={{}} onSaved={() => undefined} />,
  );
}

test("configuracoes: pagina renderiza cabecalho e estado vazio honesto (D-007) em modo mock", async () => {
  const html = await renderSettingsPage(["tenant_settings:read", "tenant_settings:update"]);

  assert.match(html, /Configurações/);
  assert.match(html, /Parâmetros da organização/);
  // D-007: modo mock não fabrica parâmetros → estado vazio.
  assert.match(html, /Nenhum parâmetro configurado/);
  // Linguagem de negócio: nunca o termo técnico "Tenant/Tenants" no texto visível.
  assert.doesNotMatch(html, /\bTenants?\b/);
});

test("configuracoes: leitor (só read) vê selo 'Somente leitura' e o estado vazio, sem quebrar", async () => {
  const html = await renderSettingsPage(["tenant_settings:read"]);

  assert.match(html, /Configurações/);
  assert.match(html, /Somente leitura/);
  assert.match(html, /Nenhum parâmetro configurado/);
});

test("configuracoes: parâmetros agrupados por categoria com rótulo derivado e editor por chave", async () => {
  const html = await renderGroups(true);

  // Grupos por category (título vem do mapa de apresentação; null → 'Outros parâmetros').
  assert.match(html, /Organização/);
  assert.match(html, /Outros parâmetros/);
  // Rótulos PT-BR derivados da key.
  assert.match(html, /Razão social/);
  assert.match(html, /Tema visual/);
  // organization.theme vira um <select> com as opções de tema.
  assert.match(html, /<select/);
  assert.match(html, /Enterprise Blue/);
  // Chave sem categoria e sem rótulo curado é humanizada.
  assert.match(html, /Beta enabled/);
  // Com permissão de update, o botão Salvar aparece por parâmetro.
  assert.match(html, /Salvar/);
});

test("configuracoes: sem permissão de update, o botão Salvar some e os campos ficam somente leitura", async () => {
  const html = await renderGroups(false);

  // Parâmetros continuam visíveis (leitura).
  assert.match(html, /Razão social/);
  assert.match(html, /Tema visual/);
  // Botão Salvar ausente.
  assert.doesNotMatch(html, /Salvar/);
  // Campos desabilitados (somente leitura).
  assert.match(html, /disabled/);
});
