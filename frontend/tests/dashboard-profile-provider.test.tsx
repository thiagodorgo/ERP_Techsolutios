import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// -----------------------------------------------------------------------------------------------
// B-DASH-PERFIL, ciclo 2 (plano §2.5 A). Prende por COMPORTAMENTO a propriedade central do bloco:
// o que a SESSÃO traz é o que a tela libera; o contexto ativo NÃO libera nada. Por isso a sessão e
// o contexto são semeados com listas DIFERENTES (no ciclo 1 todo setup gravava a mesma lista nos
// dois lugares, e "só a sessão" ficava indistinguível de "sessão + contexto").
// Mutações que estes casos deixam vermelhos: M1/M1b (T1, T2), M7 (T3), M1a (T4).
// -----------------------------------------------------------------------------------------------

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

type FetchCall = {
  readonly url: string;
  readonly init: RequestInit;
};

function installFetchJson(payload: unknown, status = 200) {
  const calls: FetchCall[] = [];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(payload), {
        status,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  return calls;
}

// Contexto ativo semeado com uma lista PRÓPRIA, distinta da lista da sessão.
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
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

type ProbeSnapshot = {
  readonly permissions: string[];
  readonly can: Record<string, boolean>;
  readonly hasAnyDashboard: boolean;
};

const PROBED_PERMISSIONS = [
  "financial_entries:read",
  "work_orders:create",
  "work_orders:read",
  "dashboard:read",
  "dashboard:view",
] as const;

const DASHBOARD_GUARD_PERMISSIONS = ["dashboard:read", "dashboard:view"];

async function renderWithSessionAndContext(
  sessionPermissions: readonly string[],
  contextPermissions: readonly string[],
): Promise<{ html: string; probe: ProbeSnapshot }> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredSessionPermissions } = await import("./helpers/session-permissions");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider, usePermissions } = await import("../src/providers/PermissionProvider");
  const { PermissionGuard } = await import("../src/guards/PermissionGuard");

  setStoredSessionPermissions(mockSessionForEmail("financeiro.web@techsolutions.example"), sessionPermissions);
  seedContext(contextPermissions);

  function Probe() {
    const { permissions, can, hasAny } = usePermissions();
    const snapshot: ProbeSnapshot = {
      permissions,
      can: Object.fromEntries(PROBED_PERMISSIONS.map((permission) => [permission, can(permission)])),
      hasAnyDashboard: hasAny(DASHBOARD_GUARD_PERMISSIONS),
    };

    return <pre id="probe">{JSON.stringify(snapshot)}</pre>;
  }

  const html = renderToString(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Probe />
            <PermissionGuard permissions={DASHBOARD_GUARD_PERMISSIONS}>
              <div>PAINEL-DO-TESTE</div>
            </PermissionGuard>
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  const match = /<pre id="probe">([\s\S]*?)<\/pre>/.exec(html);
  assert.ok(match, "o Probe precisa renderizar o retrato de usePermissions()");
  const probe = JSON.parse(decodeHtmlEntities(match[1])) as ProbeSnapshot;

  return { html, probe };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

test("contexto ativo mais largo que a sessão não libera nada", async () => {
  const { probe } = await renderWithSessionAndContext(
    ["financial_entries:read"],
    ["financial_entries:read", "work_orders:create", "work_orders:read"],
  );

  assert.deepEqual(probe.permissions, ["financial_entries:read"]);
  assert.equal(probe.can["work_orders:create"], false);
  assert.equal(probe.can["work_orders:read"], false);
  assert.equal(probe.can["financial_entries:read"], true);
});

test("Financeiro com dashboard:view só no contexto não entra no painel", async () => {
  const { html, probe } = await renderWithSessionAndContext(["financial_entries:read"], ["dashboard:view"]);

  assert.match(html, /Acesso nao autorizado/);
  assert.doesNotMatch(html, /PAINEL-DO-TESTE/);
  assert.equal(probe.hasAnyDashboard, false);
});

test("controle positivo: sessão com dashboard:read entra no painel", async () => {
  const { html, probe } = await renderWithSessionAndContext(["dashboard:read"], []);

  assert.match(html, /PAINEL-DO-TESTE/);
  assert.doesNotMatch(html, /Acesso nao autorizado/);
  assert.equal(probe.can["dashboard:read"], true);
});

test("a troca de organização substitui as permissões da sessão, não une", async () => {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { getStoredAuthSession, setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { resolveFrontendPermissionsFromBackend } = await import("../src/modules/auth/auth.adapter");
  const { switchTenantContext } = await import("../src/modules/context/repository");

  const base = mockSessionForEmail("financeiro.web@techsolutions.example");
  setStoredAuthSession({
    ...base,
    accessToken: "tok-antigo",
    user: { ...base.user, permissions: ["work_orders:create", "dashboard:read"] },
  });

  const calls = installFetchJson({
    data: {
      accessToken: "tok-novo",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "r2",
      refreshExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      sessionId: "s2",
      tenant: { id: "ten-2", name: "Org 2" },
      user: { id: "u1", name: "Fernanda Dias", email: "financeiro.web@techsolutions.example" },
      roles: ["finance"],
      permissions: ["financial_entries:read"],
    },
  });

  await switchTenantContext("ten-2");

  const stored = getStoredAuthSession();
  assert.ok(stored, "a troca grava a nova sessão");
  assert.deepEqual(stored.user.permissions, resolveFrontendPermissionsFromBackend(["financial_entries:read"]));
  assert.equal(stored.user.permissions.includes("work_orders:create"), false);
  assert.equal(stored.user.permissions.includes("dashboard:read"), false);

  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call.url.endsWith("/auth/active-tenant"), `url inesperada: ${call.url}`);
  assert.equal(call.init.method, "POST");
  assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer tok-antigo");
  assert.equal(call.init.body, JSON.stringify({ tenantId: "ten-2" }));
});
