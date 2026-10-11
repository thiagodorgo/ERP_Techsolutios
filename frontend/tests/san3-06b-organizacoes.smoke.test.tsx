import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { getPlatformOverview } from "../src/modules/platform/platform-overview.service";
import type { PlatformOverviewData } from "../src/modules/platform/platform-overview.types";
import { PlatformOverviewView } from "../src/modules/platform/pages/PlatformOverviewPage";
import { PlatformTenantsScreen, PlatformTenantsView } from "../src/modules/platform/pages/PlatformTenantsPage";
import { nextRefreshState } from "../src/modules/platform/refresh-state";

// B-SAN3-06b E8 — Organizações (T1–T9). Render por `renderToString` (§8 do plano): a `Screen` recebe o resultado REAL do
// serviço (`fetch` é o único dublê) e escolhe o estado §7; a `View` recebe o estado controlado. Nenhuma asserção lê o
// texto-fonte de componente, exceto as duas fiações que só um DOM executaria (navegação por clique e o auto-refresh
// desligado no 403), declaradas como tais.

const ROOT = new URL("../", import.meta.url);

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
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  },
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: { hidden: false, getElementById: () => null },
});

function data(overrides: Partial<PlatformOverviewData> = {}): PlatformOverviewData {
  return {
    activeOrgs: 1,
    totalOrgs: 2,
    totalUsers: 15,
    orgs: [
      { id: "org-alpha", name: "Alpha Serviços", slug: "alpha", status: "active", moduleCount: 3, userCount: 10, createdAt: "2026-09-01T12:00:00Z" },
      { id: "org-beta", name: "Beta Reboques", slug: "beta", status: "suspended", moduleCount: 2, userCount: 5, createdAt: "2026-09-02T12:00:00Z" },
    ],
    source: "api",
    forbidden: false,
    stale: false,
    ...overrides,
  };
}

function render(viewData: PlatformOverviewData, props: { query?: string; statusFilter?: "all" | "active" | "suspended" | "pending" } = {}) {
  return renderToString(
    <MemoryRouter>
      <PlatformTenantsView data={viewData} {...props} />
    </MemoryRouter>,
  );
}

function renderScreen(viewData: PlatformOverviewData, loading = false) {
  return renderToString(
    <MemoryRouter>
      <PlatformTenantsScreen data={viewData} loading={loading} />
    </MemoryRouter>,
  );
}

function visibleText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
}

async function withFetch<T>(handler: typeof fetch, run: () => Promise<T>): Promise<T> {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
}

test("T1 organizações exibem somente o payload real em português", async () => {
  let called = "";
  await withFetch((async (input: RequestInfo | URL) => {
    called = String(input);
    return new Response(JSON.stringify({ data: data() }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch, async () => {
    const result = await getPlatformOverview({});
    const html = renderScreen(result);
    assert.equal(called, "/api/v1/platform/overview");
    assert.match(html, /Alpha Serviços/);
    assert.match(html, /Beta Reboques/);
    assert.match(html, /Ativa/);
    assert.match(html, /Suspensa/);
    assert.match(html, /01\/09\/2026/);
    assert.doesNotMatch(html, /ten-sp|R\$ 312k|AgroMax|Tenant/);
  });
});

test("T2 resposta 403 produz estado de acesso não permitido e desliga o auto-refresh", async () => {
  await withFetch((async () => new Response("", { status: 403 })) as typeof fetch, async () => {
    const result = await getPlatformOverview({});
    assert.equal(result.forbidden, true);
    const html = renderScreen(result);
    assert.match(html, /Acesso não permitido/);
    assert.doesNotMatch(html, /Organizações ativas|Usuários totais/);
  });
  // Fiação do não-re-polling (sem DOM no harness, conferida pelo texto do hook): o auto-refresh só roda sem 403.
  const hook = readFileSync(new URL("src/modules/platform/usePlatformOverview.ts", ROOT), "utf8");
  assert.match(hook, /useAutoRefresh\(refresh, \{ enabled: !data\.forbidden \}\)/);
});

test("T3 falha do backend não fabrica contagens", async () => {
  await withFetch((async () => new Response("", { status: 500 })) as typeof fetch, async () => {
    const result = await getPlatformOverview({});
    assert.equal(result.source, "fallback");
    const html = renderScreen(result);
    assert.match(html, /Não foi possível carregar as organizações/);
    assert.doesNotMatch(html, /Organizações ativas|Usuários totais/);
    assert.doesNotMatch(visibleText(html), /\d/);
  });
});

test("T4 payload vazio mantém o estado vazio honesto", async () => {
  await withFetch((async () => new Response(JSON.stringify({ data: data({ activeOrgs: 0, totalOrgs: 0, totalUsers: 0, orgs: [] }) }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch, async () => {
    const result = await getPlatformOverview({});
    assert.equal(result.source, "api");
    const html = renderScreen(result);
    assert.match(html, /Nenhuma organização/);
    assert.match(html, /Ainda não há organizações cadastradas/);
    assert.doesNotMatch(html, /Organizações ativas/);
  });
});

test("T5 modo demonstração devolve vazio sem organização fabricada", async () => {
  process.env.VITE_USE_MOCKS = "true";
  storage.clear();
  try {
    const result = await getPlatformOverview({});
    assert.equal(result.source, "mock");
    assert.equal(result.orgs.length, 0);
    const { mockSessionForEmail } = await import("../src/mocks/auth/context");
    const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
    const { AuthProvider } = await import("../src/providers/AuthProvider");
    const { TenantProvider } = await import("../src/providers/TenantProvider");
    const { PermissionProvider } = await import("../src/providers/PermissionProvider");
    const { PlatformTenantsPage } = await import("../src/modules/platform/pages/PlatformTenantsPage");
    setStoredAuthSession(mockSessionForEmail("platform.web@techsolutions.example"));
    const html = renderToString(
      <MemoryRouter initialEntries={["/platform/tenants"]}>
        <AuthProvider>
          <TenantProvider>
            <PermissionProvider>
              <PlatformTenantsPage />
            </PermissionProvider>
          </TenantProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    assert.match(html, /Organizações/);
    assert.match(html, /Nenhuma organização/);
    assert.doesNotMatch(html, /Techsolutions Industrial|AgroMax|Tenant/);
  } finally {
    process.env.VITE_USE_MOCKS = "";
    storage.clear();
  }
});

test("T6 dado anterior desatualizado permanece visível com aviso", async () => {
  const first = data();
  const failed = await withFetch((async () => new Response("", { status: 500 })) as typeof fetch, () => getPlatformOverview({}));
  const kept = nextRefreshState(first, failed, true);
  assert.equal(kept.stale, true);
  assert.deepEqual(kept.orgs, first.orgs);
  const html = render(kept);
  assert.match(html, /Dados desatualizados/);
  assert.match(html, /Alpha Serviços/);
  const overview = renderToString(<MemoryRouter><PlatformOverviewView data={kept} /></MemoryRouter>);
  assert.match(overview, /Dados desatualizados/);
  assert.match(overview, /Alpha Serviços/);
  // Controles: a 1ª carga que falha não vira "desatualizada" e o 403 em segundo plano tira o dado da tela.
  assert.equal(nextRefreshState(first, failed, false).orgs.length, 0);
  const denied = nextRefreshState(first, { ...failed, forbidden: true }, true);
  assert.equal(denied.forbidden, true);
  assert.equal(denied.orgs.length, 0);
});

test("T7 busca e filtros derivam suas contagens do payload", () => {
  const three = data({
    activeOrgs: 2,
    totalOrgs: 3,
    orgs: [...data().orgs, { id: "org-gama", name: "Gama Campo", slug: "gama", status: "active", moduleCount: 1, userCount: 1, createdAt: "2026-09-03T12:00:00Z" }],
  });
  const all = visibleText(render(three));
  const suspended = render(three, { statusFilter: "suspended" });
  const searched = render(three, { query: "beta" });
  assert.match(all, /Todas \(3\)/);
  assert.match(all, /Suspensas \(1\)/);
  assert.match(all, /Ativas \(2\)/);
  assert.match(suspended, /Beta Reboques/);
  assert.doesNotMatch(suspended, /Alpha Serviços|Gama Campo/);
  assert.match(searched, /Beta Reboques/);
  assert.doesNotMatch(searched, /Gama Campo|Alpha Serviços/);
});

test("T8 linhas de cliente são acessíveis e navegam com o id do payload", () => {
  const withSystem = data({
    activeOrgs: 2,
    totalOrgs: 3,
    orgs: [{ id: "sys", name: "Plataforma", slug: "platform", status: "active", moduleCount: 0, userCount: 1, createdAt: "2026-09-01T00:00:00Z" }, ...data().orgs],
  });
  const html = render(withSystem);
  assert.equal((html.match(/role="button"/g) ?? []).length, 2);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 2);
  // Fiação do clique (sem DOM no harness): o destino é montado com o id do payload, nunca com id literal.
  const source = readFileSync(new URL("src/modules/platform/pages/PlatformTenantsPage.tsx", ROOT), "utf8");
  assert.match(source, /navigate\(`\/platform\/tenants\/\$\{org\.id\}`\)/);
  assert.doesNotMatch(source, /ten-sp|ten-agromax/);
});

test("T9 tela não oferece ações ou termos técnicos sem backend", () => {
  const html = render(data());
  assert.doesNotMatch(html, /Nova Organização|Exportar|Filtrar|Tenant|P0\d|\/platform\//);
});
