import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { PlatformTenantsScreen, PlatformTenantsView } from "../src/modules/platform/pages/PlatformTenantsPage";
import { composePlatformOrganizations, organizationsTableDensity } from "../src/modules/platform/platform-organizations.state";
import { listPlatformTenants } from "../src/modules/platform/platform.service";
import type { PlatformOverviewData } from "../src/modules/platform/platform-overview.types";
import { ORGANIZATION_A, ORGANIZATION_SYSTEM } from "./helpers/plat-org.fixture";

const ORGANIZATION_B = {
  ...ORGANIZATION_A,
  id: "44444444-4444-4444-8444-444444444444",
  name: "Organização B",
  slug: "organizacao-b",
  status: "suspended" as const,
  setup: { complete: true, missing: [] },
};

const overview: PlatformOverviewData = {
  activeOrgs: 2,
  totalOrgs: 3,
  totalUsers: 20,
  source: "api",
  forbidden: false,
  stale: false,
  orgs: [
    { id: ORGANIZATION_SYSTEM.id, name: ORGANIZATION_SYSTEM.name, slug: "platform", status: "active", userCount: 5, moduleCount: 3, createdAt: ORGANIZATION_SYSTEM.createdAt },
    { id: ORGANIZATION_A.id, name: ORGANIZATION_A.name, slug: ORGANIZATION_A.slug, status: "active", userCount: 9, moduleCount: 4, createdAt: ORGANIZATION_A.createdAt },
    { id: ORGANIZATION_B.id, name: ORGANIZATION_B.name, slug: ORGANIZATION_B.slug, status: "suspended", userCount: 6, moduleCount: 2, createdAt: ORGANIZATION_B.createdAt },
  ],
};
const rows = composePlatformOrganizations([ORGANIZATION_SYSTEM, ORGANIZATION_A, ORGANIZATION_B], overview);

function render(props: Partial<React.ComponentProps<typeof PlatformTenantsView>> = {}) {
  return renderToString(<MemoryRouter><PlatformTenantsView rows={rows} {...props} /></MemoryRouter>);
}

test("T1 organizações exibem somente o payload real em português", () => {
  const html = render({ canCreate: true });
  assert.match(html, /Organização A/);
  assert.match(html, /Grupo Teste/);
  assert.match(html, /Organização de sistema/);
  assert.match(html, /pat-page-header__kicker[^>]*>Plataforma/);
  assert.match(html, /pat-page-header__actions[^]*?Nova organização/);
  assert.doesNotMatch(html, /Techsolutions BH|Tenant|MRR|uptime/i);
});

test("T2 resposta 403 produz estado de acesso não permitido", () => {
  const html = renderToString(<MemoryRouter><PlatformTenantsScreen rows={[]} status="forbidden" /></MemoryRouter>);
  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(html, /Organização A/);
});

test("T3 falha do backend não fabrica contagens", () => {
  const html = renderToString(<MemoryRouter><PlatformTenantsScreen rows={[]} status="error" /></MemoryRouter>);
  assert.match(html, /Não foi possível carregar as organizações/);
  assert.doesNotMatch(html, /Organizações ativas/);
});

test("T4 payload vazio mantém o estado vazio honesto", () => {
  const html = renderToString(<MemoryRouter><PlatformTenantsScreen rows={[]} status="empty" /></MemoryRouter>);
  assert.match(html, /Nenhuma organização encontrada/);
});

test("T4-S somente a organização de sistema mantém a linha e mostra o vazio de clientes", () => {
  const systemOnly = composePlatformOrganizations([ORGANIZATION_SYSTEM], overview);
  const withPermission = render({ rows: systemOnly, canCreate: true });
  const withoutPermission = render({ rows: systemOnly, canCreate: false });
  assert.match(withPermission, /Plataforma/);
  assert.match(withPermission, /Nenhuma organização cliente ainda/);
  assert.match(withPermission, /Só existe a organização de sistema\. A primeira filial nasce aqui, com o grupo dela\./);
  assert.match(withPermission, /Nova organização/);
  assert.doesNotMatch(withoutPermission, /Nova organização/);
});

test("T5 modo demonstração devolve vazio sem organização fabricada", async () => {
  const previous = process.env.VITE_USE_MOCKS;
  process.env.VITE_USE_MOCKS = "true";
  try { assert.deepEqual(await listPlatformTenants(), []); }
  finally { if (previous === undefined) delete process.env.VITE_USE_MOCKS; else process.env.VITE_USE_MOCKS = previous; }
});

test("T6 dado anterior desatualizado permanece visível com aviso", () => {
  const html = render({ stale: true });
  assert.match(html, /Dados desatualizados/);
  assert.match(html, /Organização A/);
});

test("T7 busca, grupo e indicadores derivam suas contagens do recorte e o filtro é removível", () => {
  const all = render({ query: "Grupo Teste" });
  assert.match(all, />1<\/div><div class="pat-kpi__label">Organizações ativas/);
  assert.match(all, />1<\/div><div class="pat-kpi__label">Organizações suspensas/);
  assert.match(all, />1<\/div><div class="pat-kpi__label">Cadastro incompleto/);
  assert.match(all, /2<!-- --> de <!-- -->3<!-- --> organizações/);
  assert.match(all, /sem a organização de sistema/);
  assert.match(all, /platform-organizations__list-card[^]*?platform-organizations__filters/);
  assert.match(all, /class="pat-pill/);
  assert.match(render(), /<option value="__sem">Sem grupo<\/option>/);
  const withoutGroup = render({ groupId: "__sem" });
  assert.match(withoutGroup, /Plataforma/);
  assert.doesNotMatch(withoutGroup, /Organização A|Organização B/);
  const suspended = render({ statusFilter: "suspended" });
  assert.match(suspended, /Organização B/);
  assert.doesNotMatch(suspended, /Organização A/);
  assert.match(suspended.replace(/<!--.*?-->/g, ""), /Filtro: Suspensas/);
});

test("T8 linhas de cliente expandem abaixo e a linha de sistema permanece inerte", () => {
  const html = render({ expandedId: ORGANIZATION_A.id, renderDetail: (row) => <a href={`/platform/tenants/${row.id}`}>Ver detalhes completos</a> });
  assert.match(html, /aria-expanded="true"[^]*?pat-ab-detail-row[^]*?Ver detalhes completos/);
  assert.match(html, new RegExp(`/platform/tenants/${ORGANIZATION_A.id}`));
  assert.match(html, /pat-ab-row pat-ab-row--static/);
  assert.match(html, /aria-label="Organização de sistema" title="Organização de sistema">Sistema</);
  assert.match(html, /title="Plataforma">Plataforma/);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 2, "somente as duas organizações clientes são focáveis");
});

test("T9 texto visível não expõe endpoint/termo técnico e a ação de criar respeita permissão", () => {
  const without = render({ canCreate: false });
  const withPermission = render({ canCreate: true });
  const visible = without.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /\/api\/|tenant|rbac|permission/i);
  assert.doesNotMatch(without, /Nova organização/);
  assert.match(withPermission, /Nova organização/);
});

test("T-DENS densidade da tabela deriva da largura do conteúdo", () => {
  assert.equal(organizationsTableDensity(861), "full");
  assert.equal(organizationsTableDensity(860), "medium");
  assert.equal(organizationsTableDensity(601), "medium");
  assert.equal(organizationsTableDensity(600), "narrow");
});

test("T7-e tabela adapta colunas e grupo pela densidade", () => {
  const firstRowCellCount = (html: string) => {
    const row = html.match(/<tbody><tr[^>]*pat-ab-row[^>]*>([^]*?)<\/tr>/)?.[1] ?? "";
    return (row.match(/<td\b/g) ?? []).length;
  };
  const full = render({ density: "full" });
  const medium = render({ density: "medium" });
  const narrow = render({ density: "narrow" });

  assert.equal(firstRowCellCount(full), 7);
  assert.equal(firstRowCellCount(medium), 5);
  assert.doesNotMatch(medium, />MÓDULOS<|>CRIADA EM</);
  assert.equal(firstRowCellCount(narrow), 3);
  assert.doesNotMatch(narrow, />GRUPO<|>USUÁRIOS<|>MÓDULOS<|>CRIADA EM</);
  assert.match(narrow, /platform-organizations__group-inline[^]*?Grupo Teste/);
});
