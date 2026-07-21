import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptPlatformOverview } from "../src/modules/platform/platform-overview.adapter";
import { getPlatformOverview } from "../src/modules/platform/platform-overview.service";
import type { PlatformOverviewData } from "../src/modules/platform/platform-overview.types";

// PR-SCALE-5a — a tela "Visão Geral da Plataforma" agora consome GET /api/v1/platform/overview (gate
// backend `platform:tenants:read`) em vez de FABRICAR números (violava D-007). Este teste prova: (a) o
// adapter defensivo (contagem inválida→0, organização sem id descartada, e MRR/uptime/plano NUNCA vazam
// para o view §2.8/D-007); (b) o service — modo mock → visão vazia honesta (source "mock"), 403 →
// forbidden, api → source "api"; (c) o render — em modo mock mostra o estado honesto e a composição rica
// com dado real mostra as contagens REAIS + a tabela de organizações, SEM os fabricados antigos
// ("R$ 312k" / "99,98%" / gráfico de MRR / feed de "Atividade da plataforma").

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
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
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

// ── (a) adapter defensivo ──────────────────────────────────────────────────────────────────────────
test("adaptPlatformOverview: contagem inválida→0, organização sem id/name descartada, sem campo fabricado", () => {
  const result = adaptPlatformOverview({
    activeOrgs: "not-a-number", // não-número → 0
    totalOrgs: 4.9, // truncado → 4
    totalUsers: -10, // negativo → 0
    orgs: [
      { id: "org-1", name: "Alpha", slug: "alpha", status: "active", moduleCount: "7", userCount: 12, createdAt: "2026-01-01T00:00:00Z", mrr: 9999, uptime: "99,9%", plan: "enterprise" },
      { name: "Sem id", status: "active" }, // sem id → descartada
      { id: "org-3" }, // sem name → descartada
      "lixo",
      null,
    ],
  });

  assert.equal(result.activeOrgs, 0); // "not-a-number" → 0 (nunca chuta valor)
  assert.equal(result.totalOrgs, 4); // 4.9 truncado
  assert.equal(result.totalUsers, 0); // negativo → 0
  assert.equal(result.orgs.length, 1); // só a organização honesta sobra

  const [only] = result.orgs;
  assert.equal(only.id, "org-1");
  assert.equal(only.name, "Alpha");
  assert.equal(only.moduleCount, 0); // "7" é string → 0 (defensivo, nunca converte às cegas)
  assert.equal(only.userCount, 12);

  // D-007/§2.8: MRR / uptime / plano NÃO existem no view e não vazam em nenhuma serialização.
  assert.equal("mrr" in only, false);
  assert.equal("uptime" in only, false);
  assert.equal("plan" in only, false);
  assert.doesNotMatch(JSON.stringify(result), /9999|99,9%|enterprise/);
});

// ── (b) service ────────────────────────────────────────────────────────────────────────────────────
test("getPlatformOverview em modo mock: source 'mock', visão vazia (não fabrica organização)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const data = await getPlatformOverview({});
    assert.equal(data.source, "mock");
    assert.equal(data.orgs.length, 0);
    assert.equal(data.activeOrgs, 0);
    assert.equal(data.totalUsers, 0);
    assert.equal(data.forbidden, false);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("getPlatformOverview com 403: forbidden=true, source 'fallback' (gate platform:tenants:read)", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const data = await getPlatformOverview({});
    assert.equal(data.forbidden, true);
    assert.equal(data.source, "fallback");
    assert.equal(data.orgs.length, 0);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("getPlatformOverview api: source 'api', adapta o payload real e não vaza MRR", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: {
          activeOrgs: 2,
          totalOrgs: 3,
          totalUsers: 900,
          orgs: [
            { id: "o1", name: "Org Um", status: "active", moduleCount: 5, userCount: 40, createdAt: "2026-02-01T00:00:00Z", mrr: 12345 },
            { name: "sem id" }, // descartada
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;
  try {
    const data = await getPlatformOverview({});
    assert.equal(data.source, "api");
    assert.equal(data.forbidden, false);
    assert.equal(data.activeOrgs, 2);
    assert.equal(data.totalUsers, 900);
    assert.equal(data.orgs.length, 1); // "sem id" descartada
    assert.equal(data.orgs[0].name, "Org Um");
    assert.doesNotMatch(JSON.stringify(data), /12345/); // MRR não vaza
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (c) render ──────────────────────────────────────────────────────────────────────────────────────
async function renderPlatformOverviewPage(email = "platform.web@techsolutions.example"): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { PlatformOverviewPage } = await import("../src/modules/platform/pages/PlatformOverviewPage");

  setStoredAuthSession(mockSessionForEmail(email));

  return renderToString(
    <MemoryRouter initialEntries={["/platform/overview"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <PlatformOverviewPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function renderPlatformOverviewView(data: PlatformOverviewData): Promise<string> {
  const { PlatformOverviewView } = await import("../src/modules/platform/pages/PlatformOverviewPage");
  return renderToString(
    <MemoryRouter initialEntries={["/platform/overview"]}>
      <PlatformOverviewView data={data} />
    </MemoryRouter>,
  );
}

test("visão geral da plataforma: em modo mock mostra o estado honesto e NÃO fabrica números", async () => {
  const html = await renderPlatformOverviewPage();

  // cabeçalho honesto presente
  assert.match(html, /Visão Geral da Plataforma/);
  // estado vazio honesto (modo demonstração não tem dado real de plataforma)
  assert.match(html, /Nenhuma organização/);

  // AUSÊNCIA dos fabricados antigos (KPIs, gráfico e feed inventados)
  assert.doesNotMatch(html, /R\$ 312k/);
  assert.doesNotMatch(html, /99,98%/);
  assert.doesNotMatch(html, /MRR/);
  assert.doesNotMatch(html, /Atividade da plataforma/);
  assert.doesNotMatch(html, /2\.184/);
  assert.doesNotMatch(html, /habilitou o módulo/);
  assert.doesNotMatch(html, /Tenant/);
  process.env.VITE_USE_MOCKS = "";
});

test("visão geral da plataforma: com dado REAL mostra contagens reais + tabela de organizações, sem fabricados", async () => {
  const realData: PlatformOverviewData = {
    activeOrgs: 3,
    totalOrgs: 4,
    totalUsers: 1500,
    orgs: [
      { id: "org-alpha", name: "Alpha Field Services", slug: "alpha", status: "active", moduleCount: 7, userCount: 120, createdAt: "2026-01-15T00:00:00Z" },
      { id: "org-beta", name: "Beta Reboque", slug: "beta", status: "suspended", moduleCount: 4, userCount: 33, createdAt: "2026-03-02T00:00:00Z" },
    ],
    source: "api",
    forbidden: false,
  };

  const html = await renderPlatformOverviewView(realData);

  // KPIs REAIS (rótulos + valores derivados só do endpoint)
  assert.match(html, /Organizações ativas/);
  assert.match(html, /Usuários totais/);
  assert.match(html, /1\.500/); // totalUsers formatado pt-BR
  // tabela REAL de organizações (colunas + linhas + status PT-BR)
  assert.match(html, /Alpha Field Services/);
  assert.match(html, /Beta Reboque/);
  assert.match(html, /MÓDULOS/);
  assert.match(html, /CRIADA EM/);
  assert.match(html, /Ativa/);
  assert.match(html, /Suspensa/);
  // selo honesto de omissão (sem número fabricado no lugar de receita/uptime)
  assert.match(html, /Receita e disponibilidade/);

  // AUSÊNCIA dos fabricados antigos, mesmo na composição rica
  assert.doesNotMatch(html, /R\$ 312k/);
  assert.doesNotMatch(html, /99,98%/);
  assert.doesNotMatch(html, /MRR/);
  assert.doesNotMatch(html, /Atividade da plataforma/);
  assert.doesNotMatch(html, /Tenant/);
});
