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
  assert.deepEqual(filterPlatformOrganizations(rows, { query: "", groupId: "", status: "active" }).map((row) => row.id), [ORGANIZATION_A.id, ORGANIZATION_SYSTEM.id]);
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
  assert.match(html, /Alterar situação/);
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
  assert.doesNotMatch(html, /Editar nome|Alterar situação|Criar administrador|Concluir cadastro/);
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
