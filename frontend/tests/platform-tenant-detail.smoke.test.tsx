import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.adapter";
import { getPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.service";
import type { PlatformTenantDetailData, PlatformTenantDetailInfo } from "../src/modules/platform/platform-tenant-detail.types";

// PR-SCALE-5c — a tela "Detalhe da Organização" agora consome GET /api/v1/platform/tenants/:tenantId/detail
// (gate backend `platform:tenants:read`) lendo o :tenantId REAL da rota, em vez de FABRICAR o mesmo mock
// "Techsolutions BH" para qualquer org (violava D-007). Este teste prova: (a) o adapter defensivo (usuário
// sem e-mail descartado, org sem id → null, e MRR/uptime/saúde NUNCA vazam para o view §2.8/D-007); (b) o
// service — modo mock → detalhe vazio honesto (source "mock"), 404 → notFound; (c) o render com dado REAL
// mostra nome/usuários/módulos reais SEM os fabricados antigos ("Techsolutions BH" / "Saúde do sistema" /
// MRR / STATS chumbados); (d) o estado 404 mostra "Organização não encontrada".

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

installBrowserTestGlobals();

// ── (a) adapter defensivo ──────────────────────────────────────────────────────────────────────────
test("adaptPlatformTenantDetail: usuário sem e-mail descartado, org sem id → null, sem campo fabricado", () => {
  // org sem id → null (sem identidade honesta não há tela a montar)
  assert.equal(adaptPlatformTenantDetail({ name: "Sem id" }), null);
  assert.equal(adaptPlatformTenantDetail({ id: "o1" }), null); // sem name → null
  assert.equal(adaptPlatformTenantDetail("lixo"), null);

  const detail = adaptPlatformTenantDetail({
    id: "org-1",
    name: "Alpha Field",
    slug: "alpha",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    moduleCount: 2,
    mrr: 9999, // campo fabricado do backend → NÃO vaza
    uptime: "99,9%",
    health: "healthy",
    modules: [
      { key: "inventory", label: "Estoque", enabled: true },
      { key: "finance", label: "Financeiro", enabled: false },
      { key: "bad", label: "Sem flag", enabled: "sim" }, // enabled não-boolean → descartado
      { label: "Sem key", enabled: true }, // sem key → descartado
    ],
    users: [
      { name: "Marina Costa", email: "marina@org.com", roleLabel: "Administradora", status: "active" },
      { name: "Sem e-mail", status: "active" }, // sem e-mail → descartado
      { email: "sem-nome@org.com", status: "active" }, // sem nome → descartado
      "lixo",
    ],
  });

  assert.ok(detail);
  assert.equal(detail.id, "org-1");
  assert.equal(detail.name, "Alpha Field");
  assert.equal(detail.moduleCount, 2);
  assert.equal(detail.modules.length, 2); // "sem flag" e "sem key" descartados
  assert.equal(detail.users.length, 1); // só a usuária honesta sobra
  assert.equal(detail.users[0].name, "Marina Costa");

  // D-007/§2.8: MRR / uptime / saúde NÃO existem no view e não vazam em nenhuma serialização.
  assert.equal("mrr" in detail, false);
  assert.equal("uptime" in detail, false);
  assert.equal("health" in detail, false);
  assert.doesNotMatch(JSON.stringify(detail), /9999|99,9%|healthy/);
});

// ── (b) service ────────────────────────────────────────────────────────────────────────────────────
test("getPlatformTenantDetail em modo mock: source 'mock', detalhe vazio (não fabrica organização)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const data = await getPlatformTenantDetail("org-1", {});
    assert.equal(data.source, "mock");
    assert.equal(data.detail, null);
    assert.equal(data.forbidden, false);
    assert.equal(data.notFound, false);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("getPlatformTenantDetail com 404: notFound=true (organização inexistente), sem detalhe", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("not found", { status: 404 })) as typeof fetch;
  try {
    const data = await getPlatformTenantDetail("org-inexistente", {});
    assert.equal(data.notFound, true);
    assert.equal(data.forbidden, false);
    assert.equal(data.detail, null);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("getPlatformTenantDetail com 403: forbidden=true (gate platform:tenants:read), sem detalhe", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("forbidden", { status: 403 })) as typeof fetch;
  try {
    const data = await getPlatformTenantDetail("org-1", {});
    assert.equal(data.forbidden, true);
    assert.equal(data.notFound, false);
    assert.equal(data.detail, null);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("getPlatformTenantDetail api: source 'api', adapta o payload real e não vaza MRR", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: {
          id: "org-9",
          name: "Beta Reboque",
          status: "active",
          createdAt: "2026-02-01T00:00:00Z",
          moduleCount: 1,
          mrr: 12345,
          modules: [{ key: "work-orders", label: "Ordens de Serviço", enabled: true }],
          users: [{ name: "Rafael Lima", email: "rafael@beta.com", status: "active" }],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;
  try {
    const data = await getPlatformTenantDetail("org-9", {});
    assert.equal(data.source, "api");
    assert.equal(data.forbidden, false);
    assert.equal(data.notFound, false);
    assert.ok(data.detail);
    assert.equal(data.detail.name, "Beta Reboque");
    assert.equal(data.detail.users.length, 1);
    assert.doesNotMatch(JSON.stringify(data), /12345/); // MRR não vaza
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (c) render com DADO REAL ─────────────────────────────────────────────────────────────────────────
async function renderTenantDetailView(detail: PlatformTenantDetailInfo): Promise<string> {
  const { PlatformTenantDetailView } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
  return renderToString(
    <MemoryRouter initialEntries={["/platform/tenants/org-alpha"]}>
      <PlatformTenantDetailView detail={detail} />
    </MemoryRouter>,
  );
}

async function renderTenantDetailContent(data: PlatformTenantDetailData): Promise<string> {
  const { PlatformTenantDetailContent } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
  return renderToString(
    <MemoryRouter initialEntries={["/platform/tenants/org-x"]}>
      <PlatformTenantDetailContent data={data} loading={false} />
    </MemoryRouter>,
  );
}

test("detalhe da organização: com dado REAL mostra nome/usuários/módulos reais, sem fabricados", async () => {
  const detail: PlatformTenantDetailInfo = {
    id: "org-alpha",
    name: "Alpha Field Services",
    slug: "alpha",
    status: "active",
    createdAt: "2026-01-15T00:00:00Z",
    moduleCount: 2,
    modules: [
      { key: "inventory", label: "Estoque", enabled: true },
      { key: "finance", label: "Financeiro", enabled: true },
      { key: "analytics", label: "Analytics", enabled: false },
    ],
    users: [
      { name: "Marina Costa", email: "marina@alpha.com", roleLabel: "Administradora", status: "active" },
      { name: "Carlos Nunes", email: "carlos@alpha.com", roleLabel: "Técnico de Campo", status: "inactive" },
    ],
  };

  const html = await renderTenantDetailView(detail);

  // Dado REAL da org (nome, status PT-BR, criada em)
  assert.match(html, /Alpha Field Services/);
  assert.match(html, /Ativa/);
  assert.match(html, /criada em/);
  // Stats REAIS (usuários = 2; módulos habilitados = 2 de 3)
  assert.match(html, /Usuários/);
  assert.match(html, /2 de 3/);
  assert.match(html, /Módulos habilitados/);
  // Módulos reais + usuários reais
  assert.match(html, /Módulos contratados/);
  assert.match(html, /Estoque/);
  assert.match(html, /Marina Costa/);
  assert.match(html, /marina@alpha\.com/);
  assert.match(html, /Administradora/);
  assert.match(html, /Inativo/); // status PT-BR do 2º usuário
  // Selo honesto de omissão (receita/uptime sem número fabricado)
  assert.match(html, /Receita e disponibilidade/);

  // AUSÊNCIA dos fabricados antigos
  assert.doesNotMatch(html, /Techsolutions BH/);
  assert.doesNotMatch(html, /Saúde do sistema/);
  assert.doesNotMatch(html, /MRR/);
  assert.doesNotMatch(html, /Uptime/);
  assert.doesNotMatch(html, /R\$ 12,4k/);
  assert.doesNotMatch(html, /Plano Enterprise/);
  assert.doesNotMatch(html, /Endereço principal/);
  assert.doesNotMatch(html, /Tenant/);
});

// ── (d) estado 404 ───────────────────────────────────────────────────────────────────────────────────
test("detalhe da organização: estado 404 mostra 'Organização não encontrada'", async () => {
  const html = await renderTenantDetailContent({ detail: null, source: "api", forbidden: false, notFound: true });
  assert.match(html, /Organização não encontrada/);
  assert.doesNotMatch(html, /Techsolutions BH/);
  assert.doesNotMatch(html, /Tenant/);
});
