import assert from "node:assert/strict";
import test from "node:test";

import React, { type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { adaptPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.adapter";
import { getPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.service";
import type { PlatformTenantDetailData, PlatformTenantDetailInfo } from "../src/modules/platform/platform-tenant-detail.types";
import { DETAIL_A, ORGANIZATION_A } from "./helpers/plat-org.fixture";
import { installMiniDom, text } from "./helpers/mini-dom";

// PR-SCALE-5c — a tela "Detalhe da Organização" agora consome GET /api/v1/platform/tenants/:tenantId/detail
// (gate backend `platform:tenants:read`) lendo o :tenantId REAL da rota, em vez de FABRICAR o mesmo mock
// "Techsolutions BH" para qualquer org (violava D-007). Este teste prova: (a) o adapter defensivo (usuário
// sem e-mail descartado, org sem id → null, e MRR/uptime/saúde NUNCA vazam para o view §2.8/D-007); (b) o
// service — modo mock → detalhe vazio honesto (source "mock"), 404 → notFound; (c) o render com dado REAL
// mostra nome/usuários/módulos reais SEM os fabricados antigos ("Techsolutions BH" / "Saúde do sistema" /
// MRR / STATS chumbados); (d) o estado 404 mostra "Organização não encontrada".

const dom = installMiniDom();
const { createRoot } = await import("react-dom/client");
const { Route, Routes } = await import("react-router-dom");
const { PlatformTenantDetailPage } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
const settle = async () => { for (let step = 0; step < 8; step += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };

async function mountDetailPage() {
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read", "platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin", "platform:billing:read", "platform:billing:manage"] } });
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(
    <MemoryRouter initialEntries={[`/platform/tenants/${ORGANIZATION_A.id}`]}>
      <AuthProvider><TenantProvider><PermissionProvider><Routes><Route path="/platform/tenants/:tenantId" element={<PlatformTenantDetailPage />} /></Routes></PermissionProvider></TenantProvider></AuthProvider>
    </MemoryRouter>,
  ));
  await settle();
  return { container, unmount: async () => { await act(async () => root.unmount()); container.parentNode?.removeChild(container); } };
}

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
      { name: "Usuária Teste", email: "usuario@example.com", roleLabel: "Administradora", status: "active" },
      { name: "Sem e-mail", status: "active" }, // sem e-mail → descartado
      { email: "sem-nome@example.com", status: "active" }, // sem nome → descartado
      "lixo",
    ],
    subscription: { planCode: "starter", planName: "Plano Regional Teste", validFrom: "2026-11-05T15:00:00.000Z", overrides: { monthlyPrice: null, includedUsers: null, includedStorageGb: null, extraUserPrice: null, extraGbPrice: null }, addons: [], modules: [] },
  });

  assert.ok(detail);
  assert.equal(detail.id, "org-1");
  assert.equal(detail.name, "Alpha Field");
  assert.equal(detail.moduleCount, 2);
  assert.equal(detail.modules.length, 2); // "sem flag" e "sem key" descartados
  assert.equal(detail.users.length, 1); // só a usuária honesta sobra
  assert.equal(detail.users[0].name, "Usuária Teste");

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
          users: [{ name: "Usuária Exemplo", email: "usuaria@example.com", status: "active" }],
          subscription: { planCode: "starter", planName: "Plano Regional Teste", validFrom: "2026-11-05T15:00:00.000Z", overrides: { monthlyPrice: null, includedUsers: null, includedStorageGb: null, extraUserPrice: null, extraGbPrice: null }, addons: [], modules: [] },
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
      { name: "Usuária Teste", email: "usuario@example.com", roleLabel: "Administradora", status: "active" },
      { name: "Operador Teste", email: "operador@example.com", roleLabel: "Técnico de Campo", status: "inactive" },
    ],
    subscription: { planName: "Plano Regional Teste" },
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
  assert.match(html, /Usuária Teste/);
  assert.match(html, /usuario@example\.com/);
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

test("DP1 página rica mostra todos os usuários, situação, plano e ações", async () => {
  const users = Array.from({ length: 5 }, (_, index) => ({ name: `Usuário ${index + 1}`, email: `usuario${index + 1}@example.com`, roleLabel: index === 0 ? "Administrador" : "Operação", status: "active" }));
  const detail = { ...DETAIL_A, users } satisfies PlatformTenantDetailInfo;
  globalThis.fetch = (async (input: RequestInfo | URL) => String(input).endsWith("/detail")
    ? new Response(JSON.stringify({ data: detail }), { status: 200, headers: { "content-type": "application/json" } })
    : new Response(JSON.stringify({ data: ORGANIZATION_A }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  const page = await mountDetailPage();
  const html = text(page.container);
  assert.match(html, /Ativa/);
  assert.match(html, /criada em/);
  assert.match(html, /Plano Regional Teste/);
  assert.match(html, /Usuário 5/);
  assert.match(html, /Editar nome/);
  assert.match(html, /Suspender/);
  assert.match(html, /Criar administrador/);
  await page.unmount();
});

test("DP2 cadastro incompleto mostra um item por falta", async () => {
  const { PlatformTenantDetailView } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
  const organization = { id: "org-incomplete", name: "Organização Incompleta", slug: "incomplete", status: "active", createdAt: "2026-01-15T00:00:00Z", system: false, group: null, setup: { complete: false, missing: ["plan", "admin", "profile"] } } as const;
  const detail = { id: organization.id, name: organization.name, slug: organization.slug, status: "active", createdAt: organization.createdAt, moduleCount: 0, modules: [], users: [], subscription: null } satisfies PlatformTenantDetailInfo;
  const View = PlatformTenantDetailView as unknown as React.ComponentType<Record<string, unknown>>;
  const html = renderToString(<MemoryRouter><View detail={detail} organization={organization} permissions={["platform:users:create_admin", "platform:billing:read", "platform:billing:manage"]} onAction={() => undefined} /></MemoryRouter>);
  assert.match(html, /Cadastro incompleto/);
  assert.match(html, /Escolher plano/);
  assert.match(html, /Criar administrador/);
  assert.match(html, /Preencher/);
});

test("DP3 organização de sistema não mostra ações", async () => {
  const { PlatformTenantDetailView } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
  const organization = { id: "system", name: "Plataforma", slug: "platform", status: "active", createdAt: "2026-01-15T00:00:00Z", system: true, group: null, setup: { complete: true, missing: [] } } as const;
  const detail = { id: organization.id, name: organization.name, slug: organization.slug, status: "active", createdAt: organization.createdAt, moduleCount: 0, modules: [], users: [], subscription: null } satisfies PlatformTenantDetailInfo;
  const View = PlatformTenantDetailView as unknown as React.ComponentType<Record<string, unknown>>;
  const html = renderToString(<MemoryRouter><View detail={detail} organization={organization} permissions={["platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin"]} onAction={() => undefined} /></MemoryRouter>);
  assert.match(html, /A organização de sistema não muda por aqui\./);
  assert.doesNotMatch(html, /Editar nome|Suspender|Criar administrador/);
});

// ── (d) estado 404 ───────────────────────────────────────────────────────────────────────────────────
test("DP4 o 403 tira tudo da página direta", async () => {
  let detailCalls = 0;
  let writeCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") writeCalls += 1;
    const url = String(input);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/detail`)) {
      detailCalls += 1;
      return detailCalls === 1 ? new Response(JSON.stringify({ data: DETAIL_A }), { status: 200, headers: { "content-type": "application/json" } }) : new Response("", { status: 403 });
    }
    return new Response(JSON.stringify({ data: ORGANIZATION_A }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const page = await mountDetailPage();
  assert.match(text(page.container), /Plano Regional Teste|Cadastro incompleto/);
  const interval = [...dom.intervals].reverse().find((item) => item.fn !== null);
  assert.ok(interval?.fn);
  await act(async () => interval.fn?.());
  await settle();
  assert.match(text(page.container), /Acesso não permitido/);
  assert.doesNotMatch(text(page.container), /Plano Regional Teste|Administrador A|Editar nome|Cadastro incompleto|Escolher plano/);
  assert.equal(writeCalls, 0);
  await page.unmount();
});

test("DP5 leitura desatualizada desliga as ações", async () => {
  let detailCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/detail`)) {
      detailCalls += 1;
      return detailCalls === 1 ? new Response(JSON.stringify({ data: DETAIL_A }), { status: 200, headers: { "content-type": "application/json" } }) : new Response("", { status: 500 });
    }
    return new Response(JSON.stringify({ data: ORGANIZATION_A }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const page = await mountDetailPage();
  const interval = [...dom.intervals].reverse().find((item) => item.fn !== null);
  assert.ok(interval?.fn);
  await act(async () => interval.fn?.());
  await settle();
  assert.match(text(page.container), /Dados desatualizados/);
  assert.match(text(page.container), /Plano Regional Teste|Administrador A/);
  assert.doesNotMatch(text(page.container), /Editar nome|Suspender|Criar administrador|Escolher plano|Preencher/);
  await page.unmount();
});

test("detalhe da organização: estado 404 mostra 'Organização não encontrada'", async () => {
  const html = await renderTenantDetailContent({ detail: null, source: "api", forbidden: false, notFound: true });
  assert.match(html, /Organização não encontrada/);
  assert.doesNotMatch(html, /Techsolutions BH/);
  assert.doesNotMatch(html, /Tenant/);
});
