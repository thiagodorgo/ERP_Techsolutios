import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// PR-SCALE-2 — a tela "Faturas" (NF-e) é uma PARADA FISCAL declarada (certificado + SEFAZ, pós-ativação
// cloud). Por CLAUDE.md §2.8 / D-007 ela NÃO pode fabricar notas fiscais, valores nem contadores.
// Este teste prova o estado honesto e a AUSÊNCIA dos dados fabricados que existiam antes (empresas,
// valores "R$ 24.800", contadores "128"/"121"). Também prova o gating do atalho para Cobranças.

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
      role: "Financeiro",
      permissions,
      enabledModules: ["dashboard", "finance"],
      scope: "branch",
    }),
  );
}

async function renderInvoices(permissions: readonly string[], email = "gestor.web@techsolutions.example"): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { InvoicesPage } = await import("../src/modules/finance/pages/InvoicesPage");

  setStoredAuthSession(mockSessionForEmail(email));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/finance/invoices"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <InvoicesPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("faturas: mostra a PARADA fiscal honesta e NÃO fabrica NF-e", async () => {
  const html = await renderInvoices(["financial_titles:read"]);

  // estado honesto presente
  assert.match(html, /Integração fiscal necessária/);
  assert.match(html, /SEFAZ/);
  // ação de emissão desabilitada (parada externa)
  assert.match(html, /disabled/);

  // AUSÊNCIA dos dados fabricados antigos (empresas, valores e contadores inventados)
  assert.doesNotMatch(html, /Indústria Alfa|Beta Comércio|Delta Tech|Gama Serviços/);
  assert.doesNotMatch(html, /R\$ 24\.800|R\$ 12\.300|R\$ 18\.900/);
  assert.doesNotMatch(html, /Autorizada|Rejeitada/); // chips de status fabricados
});

test("faturas: atalho para Cobranças só com financial_titles:read", async () => {
  const withPerm = await renderInvoices(["financial_titles:read"]);
  assert.match(withPerm, /Ver cobranças/);

  // perfil auditor (mock) NÃO tem financial_titles:read na sessão; contexto mínimo → can() = false
  const withoutPerm = await renderInvoices(["dashboard:read"], "auditor.web@techsolutions.example");
  assert.doesNotMatch(withoutPerm, /Ver cobranças/);
});
