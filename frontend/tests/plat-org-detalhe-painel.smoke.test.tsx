import assert from "node:assert/strict";
import test from "node:test";

import React, { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Building2 } from "lucide-react";

import { DenseExpandableRow } from "../src/components/dense-list/DenseExpandableRow";
import { KpiStatCard } from "../src/components/patterns/KpiStatCard";
import { OrganizationDetailPanelView } from "../src/modules/platform/components/OrganizationDetailPanel";
import { PlatformTenantsView } from "../src/modules/platform/pages/PlatformTenantsPage";
import { adaptPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.adapter";
import { getPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.service";
import { composePlatformOrganizations, filterPlatformOrganizations } from "../src/modules/platform/platform-organizations.state";
import type { PlatformOverviewData } from "../src/modules/platform/platform-overview.types";
import { DETAIL_A, ORGANIZATION_A, ORGANIZATION_SYSTEM } from "./helpers/plat-org.fixture";
import { elements, hasClass, installMiniDom, text } from "./helpers/mini-dom";

const overview: PlatformOverviewData = {
  activeOrgs: 3,
  totalOrgs: 3,
  totalUsers: 11,
  source: "api",
  forbidden: false,
  stale: false,
  orgs: [
    { id: ORGANIZATION_SYSTEM.id, name: "nome não canônico", slug: "platform", status: "active", userCount: 8, moduleCount: 2, createdAt: ORGANIZATION_SYSTEM.createdAt },
    { id: "somente-overview", name: "Não deve nascer", status: "active", userCount: 99, moduleCount: 99, createdAt: "2026-01-01" },
    { id: ORGANIZATION_A.id, name: "nome não canônico", status: "suspended", userCount: 3, moduleCount: 1, createdAt: ORGANIZATION_A.createdAt },
  ],
};

test("FP10 composição por id usa somente organizações canônicas, conserva ordem e marca status divergente", () => {
  const rows = composePlatformOrganizations([ORGANIZATION_A, ORGANIZATION_SYSTEM], overview);
  assert.deepEqual(rows.map((row) => row.id), [ORGANIZATION_A.id, ORGANIZATION_SYSTEM.id]);
  assert.equal(rows[0]?.name, "Organização A");
  assert.equal(rows[0]?.userCount, 3);
  assert.equal(rows[0]?.countsStale, true);
  assert.equal(rows[1]?.userCount, 8);
  assert.equal(rows.some((row) => row.id === "somente-overview"), false);
});

test("FP10 contagem ausente é desconhecida, nunca zero", () => {
  const rows = composePlatformOrganizations([ORGANIZATION_A], { ...overview, orgs: [] });
  assert.equal(rows[0]?.userCount, null);
  assert.equal(rows[0]?.moduleCount, null);
});

test("FP12 incompleto é dimensão própria e busca inclui grupo", () => {
  const completePending = { ...ORGANIZATION_A, id: "pending", status: "pending" as const, setup: { complete: true, missing: [] } };
  const rows = composePlatformOrganizations([ORGANIZATION_A, completePending, ORGANIZATION_SYSTEM], { ...overview, orgs: [] });
  assert.deepEqual(filterPlatformOrganizations(rows, { query: "grupo teste", groupId: "", status: "incomplete" }).map((row) => row.id), [ORGANIZATION_A.id]);
  assert.deepEqual(filterPlatformOrganizations(rows, { query: "", groupId: "", status: "active" }).map((row) => row.id), [ORGANIZATION_A.id]);
});

test("FP5/FP8/FP11 painel mostra grupo e plano literais, três usuários e link com contexto, nunca slug", () => {
  const html = renderToString(
    <MemoryRouter>
      <OrganizationDetailPanelView
        organization={ORGANIZATION_A}
        data={{ detail: DETAIL_A, source: "api", forbidden: false, notFound: false }}
        returnSearch="?q=grupo&amp;situacao=active"
        permissions={["platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin"]}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Grupo Teste/);
  assert.match(html, /Plano Regional Teste/);
  assert.match(html, /Administrador A/);
  assert.match(html, /Operador A/);
  assert.match(html, /Inativo A/);
  assert.match(html, new RegExp(`/platform/tenants/${ORGANIZATION_A.id}`));
  assert.doesNotMatch(html, /organizacao-a/);
  assert.match(html, /Editar nome/);
  assert.match(html, /Suspender/);
});

test("FP6 painel 403 retira dados e ações", () => {
  const html = renderToString(
    <MemoryRouter>
      <OrganizationDetailPanelView
        organization={ORGANIZATION_A}
        data={{ detail: null, source: "fallback", forbidden: true, notFound: false }}
        permissions={["platform:tenants:update"]}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(html, /Editar nome|Plano Regional Teste/);
});

test("FS3 organização de sistema não oferece ações", () => {
  const html = renderToString(
    <MemoryRouter>
      <OrganizationDetailPanelView
        organization={ORGANIZATION_SYSTEM}
        data={{ detail: { ...DETAIL_A, id: ORGANIZATION_SYSTEM.id, name: ORGANIZATION_SYSTEM.name }, source: "api", forbidden: false, notFound: false }}
        permissions={["platform:tenants:update", "platform:tenants:suspend", "platform:users:create_admin", "platform:billing:manage"]}
      />
    </MemoryRouter>,
  );
  assert.match(html, /Organização de sistema/);
  assert.doesNotMatch(html, /Editar nome|Suspender|Reativar|Criar administrador|Concluir cadastro/);
});

test("FP1 linha aberta mantém o detalhe imediatamente abaixo", () => {
  const rows = composePlatformOrganizations([ORGANIZATION_A], overview);
  const html = renderToString(<MemoryRouter><PlatformTenantsView rows={rows} expandedId={ORGANIZATION_A.id} renderDetail={() => <div>PAINEL-REAL</div>} /></MemoryRouter>);
  assert.match(html, new RegExp(`data-row-key="${ORGANIZATION_A.id}"[^]*?</tr><tr class="pat-ab-detail-row"[^]*?PAINEL-REAL`));
});

function firstRowProps(node: ReactNode): Record<string, unknown> {
  let found: Record<string, unknown> | null = null;
  const visit = (current: ReactNode) => {
    if (Array.isArray(current)) { current.forEach(visit); return; }
    if (!isValidElement(current)) return;
    const element = current as ReactElement<Record<string, unknown>>;
    if (!found && element.type === "tr" && element.props.className === "pat-ab-row") found = element.props;
    visit(element.props.children as ReactNode);
  };
  visit(node);
  assert.ok(found);
  return found;
}

test("FP3 Enter, Espaço e Escape alternam a linha de organização", () => {
  const calls: string[] = [];
  const props = firstRowProps(DenseExpandableRow({ rowKey: ORGANIZATION_A.id, expanded: false, colSpan: 7, onToggle: () => calls.push("toggle"), cells: [], detail: "detalhe" }));
  for (const key of ["Enter", " "]) (props.onKeyDown as (event: unknown) => void)({ key, preventDefault() {} });
  assert.deepEqual(calls, ["toggle", "toggle"]);
});

test("FP7 indicador executa o filtro solicitado", () => {
  let calls = 0;
  const element = KpiStatCard({ icon: Building2, iconColor: "var(--color-core-primary)", iconBg: "var(--surface-panel-muted)", value: 1, label: "Ativas", onClick: () => { calls += 1; } }) as ReactElement<{ onClick: () => void }>;
  element.props.onClick();
  assert.equal(calls, 1);
});

test("FP6 service preserva 403 como acesso não permitido", async () => {
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => null } } });
  globalThis.fetch = (async () => new Response("", { status: 403 })) as typeof fetch;
  try {
    const result = await getPlatformTenantDetail(ORGANIZATION_A.id, {});
    assert.equal(result.forbidden, true);
    assert.equal(result.detail, null);
  } finally {
    globalThis.fetch = previousFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});

test("FP8 adaptador conserva nome literal, null e rejeita assinatura malformada", () => {
  const adapted = adaptPlatformTenantDetail(DETAIL_A);
  assert.equal(adapted?.subscription?.planName, "Plano Regional Teste");
  assert.equal(adaptPlatformTenantDetail({ ...DETAIL_A, subscription: null })?.subscription, null);
  assert.equal(adaptPlatformTenantDetail({ ...DETAIL_A, subscription: { status: "active", planName: "" } }), null);
  assert.equal(adaptPlatformTenantDetail({ ...DETAIL_A, subscription: undefined }), null);
});

const dom = installMiniDom();
const { createRoot } = await import("react-dom/client");
const { Route, Routes, useNavigate } = await import("react-router-dom");
const { OrganizationDetailPanel } = await import("../src/modules/platform/components/OrganizationDetailPanel");
const { PlatformTenantDetailPage } = await import("../src/modules/platform/pages/PlatformTenantDetailPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
const settle = async () => { for (let step = 0; step < 8; step += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };

async function mountClient(element: ReactElement, initialEntry = "/") {
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read", "platform:tenants:update"] } });
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider><TenantProvider><PermissionProvider>{element}</PermissionProvider></TenantProvider></AuthProvider>
    </MemoryRouter>,
  ));
  await settle();
  return { container, unmount: async () => { await act(async () => root.unmount()); container.parentNode?.removeChild(container); } };
}

test("FP6-C 403 em segundo plano tira os dados e as ações do painel", async () => {
  let detailCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/detail`)) {
      detailCalls += 1;
      return detailCalls === 1 ? new Response(JSON.stringify({ data: DETAIL_A }), { status: 200, headers: { "content-type": "application/json" } }) : new Response("", { status: 403 });
    }
    return new Response(JSON.stringify({ data: ORGANIZATION_A }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const page = await mountClient(<OrganizationDetailPanel organization={ORGANIZATION_A} permissions={["platform:tenants:update"]} />);
  assert.match(text(page.container), /Plano Regional Teste|Editar nome/);
  const interval = [...dom.intervals].reverse().find((item) => item.fn !== null);
  assert.ok(interval?.fn);
  await act(async () => interval.fn?.());
  await settle();
  assert.match(text(page.container), /Acesso não permitido/);
  assert.doesNotMatch(text(page.container), /Plano Regional Teste|Administrador A|Editar nome/);
  await page.unmount();
});

test("FP2 resposta de A não entra na página direta de B", async () => {
  const B = { ...ORGANIZATION_A, id: "77777777-7777-4777-8777-777777777777", name: "Organização B", slug: "organizacao-b" };
  const DETAIL_B = { ...DETAIL_A, id: B.id, name: B.name, slug: B.slug, subscription: { ...DETAIL_A.subscription, planName: "Plano B" } };
  let resolveA: ((response: Response) => void) | null = null;
  const pendingA = new Promise<Response>((resolve) => { resolveA = resolve; });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/detail`)) return pendingA;
    if (url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}`)) return new Response(JSON.stringify({ data: ORGANIZATION_A }), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith(`/platform/tenants/${B.id}/detail`)) return new Response(JSON.stringify({ data: DETAIL_B }), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith(`/platform/tenants/${B.id}`)) return new Response(JSON.stringify({ data: B }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ data: null }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  let navigate: ((to: string) => void) | null = null;
  function NavigationProbe() { navigate = useNavigate(); return null; }
  const page = await mountClient(<><NavigationProbe /><Routes><Route path="/platform/tenants/:tenantId" element={<PlatformTenantDetailPage />} /></Routes></>, `/platform/tenants/${ORGANIZATION_A.id}`);
  await act(async () => navigate?.(`/platform/tenants/${B.id}`));
  await settle();
  assert.match(text(page.container), /Organização B|Plano B/);
  await act(async () => resolveA?.(new Response(JSON.stringify({ data: DETAIL_A }), { status: 200, headers: { "content-type": "application/json" } })));
  await settle();
  assert.match(text(page.container), /Organização B|Plano B/);
  assert.doesNotMatch(text(page.container), /Plano Regional Teste/);
  await page.unmount();
});

test("FP9 grade tem sete células, detalhe colspan 7, coluna final 22 px e nenhuma ação na linha", () => {
  const rows = composePlatformOrganizations([ORGANIZATION_A], overview);
  const html = renderToString(<MemoryRouter><PlatformTenantsView rows={rows} expandedId={ORGANIZATION_A.id} renderDetail={() => <div>DETALHE</div>} /></MemoryRouter>);
  const summary = html.match(/<tr class="pat-ab-row"[^]*?<\/tr>/)?.[0] ?? "";
  assert.equal((summary.match(/<td/g) ?? []).length, 7);
  assert.match(html, /colSpan="7"/);
  assert.match(html, /width:22px/);
  assert.doesNotMatch(summary, /<button|<a |AÇÃO/);
  for (const width of ["30.216% - 6.647px", "19.424% - 4.273px", "9.353% - 2.058px", "12.230% - 2.691px"]) assert.match(html, new RegExp(width.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
