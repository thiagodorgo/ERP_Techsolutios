import assert from "node:assert/strict";
import test from "node:test";

import type { NavigationAccessContext } from "../src/navigation/types";

// ── F11 — Teste por papel (9 papéis canônicos × telas), base = navigation-matrix.md ──
//
// A camada RBAC (tenantNavigation + filterNavigationItems) gate por PERMISSÃO do backend
// (autoridade). As permissões por papel abaixo espelham `catalog.ts` ajustadas à matriz;
// onde catálogo e matriz divergem (ex.: `support` sem Dashboard; `finance`/`inventory` com
// Dashboard), vale a MATRIZ — que é o oráculo do teste.
//
// Papel `inventory` NÃO possui rótulo UserRole no front (mapBackendRole → null): usa-se
// roles [] e o gate por permissão decide (STOP registrado no relatório).

const FROTA_PATHS = [
  "/cadastros/viaturas",
  "/fleet/fuel",
  "/fleet/maintenance",
  "/fleet/fines",
  "/fleet/insurance",
  "/fleet/damages",
];
const GESTAO_PATHS = [
  "/cadastros/clientes",
  "/cadastros/equipes",
  "/cadastros/servicos",
  "/inventory",
  "/purchase-orders",
  "/finance/commissions",
  "/reports",
  "/finance",
];
// Núcleo de ADMINISTRAÇÃO (exclui Notificações, que é ubíqua) para asserção limpa de grupo.
const ADMIN_CORE_PATHS = ["/users", "/audit", "/administrator/settings"];

function flattenPaths(items: readonly { path: string; children?: readonly { path: string }[] }[]): string[] {
  return items.flatMap((item) => [item.path, ...(item.children?.map((child) => child.path) ?? [])]);
}

function includesAny(paths: readonly string[], group: readonly string[]): boolean {
  return group.some((path) => paths.includes(path));
}

type RoleCase = {
  readonly name: string;
  readonly context: NavigationAccessContext;
  readonly mustSee: readonly string[];
  readonly mustNotSee: readonly string[];
  readonly frota: boolean;
  readonly gestao: boolean;
};

function ctx(
  roles: NavigationAccessContext["roles"],
  permissions: string[],
  mode: NavigationAccessContext["mode"],
): NavigationAccessContext {
  // enabledModules omitido de propósito: o teste isola o gate de RBAC (papel + permissão),
  // não a habilitação de módulos por tenant.
  return { roles, permissions, mode, scope: "tenant", tenantStatus: "active" };
}

const ROLE_CASES: readonly RoleCase[] = [
  {
    name: "platform_admin ve tudo (bypass de plataforma no escopo do tenant)",
    context: ctx(["Super Admin"], ["platform:tenants:read"], "tenant_admin"),
    mustSee: ["/dashboard", "/work-orders", "/fleet/fuel", "/inventory", "/users", "/audit", "/administrator/settings"],
    mustNotSee: [],
    frota: true,
    gestao: true,
  },
  {
    name: "tenant_admin ve o menu completo, inclusive Configuracoes",
    context: ctx(
      ["Administrador"],
      [
        "dashboard:read",
        "work_orders:read",
        "field_dispatch:read",
        "field_location:read",
        "checklist_runs:read",
        "customers:read",
        "vehicles:read",
        "teams:read",
        "service_catalog:read",
        "fuel_logs:read",
        "maintenance_orders:read",
        "fines:read",
        "insurance_policies:read",
        "damages:read",
        "inventory_items:read",
        "purchase_orders:read",
        "commissions:read",
        "reports:read",
        "finance:read",
        "users.read",
        "notifications:read",
        "tenant.manage",
        "audit:read",
      ],
      "tenant_admin",
    ),
    mustSee: ["/dashboard", "/fleet/fines", "/cadastros/clientes", "/inventory", "/users", "/audit", "/administrator/settings"],
    mustNotSee: [],
    frota: true,
    gestao: true,
  },
  {
    name: "manager ve operacao/frota/gestao + Usuarios/Auditoria, mas NAO Configuracoes",
    context: ctx(
      ["Gestor Operacional"],
      [
        "dashboard:read",
        "work_orders:read",
        "field_dispatch:read",
        "field_location:read",
        "checklist_runs:read",
        "customers:read",
        "vehicles:read",
        "teams:read",
        "service_catalog:read",
        "fuel_logs:read",
        "maintenance_orders:read",
        "fines:read",
        "insurance_policies:read",
        "damages:read",
        "inventory_items:read",
        "purchase_orders:read",
        "commissions:read",
        "reports:read",
        "finance.read",
        "users.read",
        "notifications:read",
        "audit:read",
      ],
      "operation",
    ),
    mustSee: ["/dashboard", "/work-orders", "/fleet/fuel", "/cadastros/clientes", "/inventory", "/finance", "/users", "/audit"],
    mustNotSee: ["/administrator/settings"],
    frota: true,
    gestao: true,
  },
  {
    name: "operator ve o proprio subconjunto (frota, cadastros leitura, estoque, extrato proprio)",
    context: ctx(
      ["Operador Logistico"],
      [
        "dashboard:read",
        "work_orders:read",
        "customers:read",
        "vehicles:read",
        "teams:read",
        "service_catalog:read",
        "fuel_logs:read",
        "maintenance_orders:read",
        "fines:read",
        "insurance_policies:read",
        "damages:read",
        "inventory_items:read",
        "field_dispatch:read",
        "checklist_runs:read",
        "commissions:read_own",
        "notifications:read",
      ],
      "operation",
    ),
    mustSee: ["/dashboard", "/work-orders", "/fleet/fuel", "/cadastros/clientes", "/inventory", "/finance/commissions"],
    mustNotSee: ["/finance", "/reports", "/users", "/audit", "/administrator/settings"],
    frota: true,
    gestao: true,
  },
  {
    name: "finance ve Multas/Seguros/Remuneracoes/Financeiro, mas NAO Cadastros/Despachos",
    context: ctx(
      ["Financeiro"],
      [
        "dashboard:read",
        "notifications:read",
        "fuel_logs:read",
        "maintenance_orders:read",
        "fines:read",
        "insurance_policies:read",
        "damages:read",
        "inventory_items:read",
        "commissions:read",
        "finance:read",
        "reports:read",
        "purchase_orders:read",
      ],
      "operation",
    ),
    mustSee: ["/dashboard", "/fleet/fines", "/fleet/insurance", "/finance/commissions", "/finance", "/reports"],
    mustNotSee: [
      "/cadastros/clientes",
      "/cadastros/viaturas",
      "/operations/dispatches",
      "/work-orders",
      "/users",
      "/audit",
      "/administrator/settings",
    ],
    frota: true,
    gestao: true,
  },
  {
    name: "inventory e dono do Estoque; nao ve Frota/Cadastros/Administracao",
    // Nota: `inventory` sem rotulo UserRole nao casa com o allowedRoles de Notificacoes
    // (gap de vocabulario do front — STOP no relatorio); Estoque/Pedidos gate por permissao.
    context: ctx([], ["dashboard:read", "inventory_items:read", "purchase_orders:read", "notifications:read"], "operation"),
    mustSee: ["/dashboard", "/inventory", "/purchase-orders"],
    mustNotSee: ["/fleet/fuel", "/cadastros/clientes", "/operations/dispatches", "/users", "/audit", "/administrator/settings"],
    frota: false,
    gestao: true,
  },
  {
    name: "field_technician ve dashboard/frota/cadastros; nunca Administracao",
    context: ctx(
      ["Operador Logistico"],
      [
        "dashboard:read",
        "work_orders:read",
        "customers:read",
        "vehicles:read",
        "teams:read",
        "service_catalog:read",
        "fuel_logs:read",
        "maintenance_orders:read",
        "fines:read",
        "damages:read",
        "field_dispatch:read",
        "checklist_runs:read",
        "commissions:read_own",
        "notifications:read",
      ],
      "operation",
    ),
    mustSee: ["/dashboard", "/fleet/fuel", "/cadastros/clientes"],
    mustNotSee: ["/users", "/audit", "/administrator/settings", "/inventory"],
    frota: true,
    gestao: true,
  },
  {
    name: "auditor le tudo (cadastros/frota/estoque) + Auditoria; nunca Configuracoes",
    context: ctx(
      ["Auditor"],
      [
        "dashboard:read",
        "users.read",
        "audit:read",
        "audit.read",
        "customers:read",
        "vehicles:read",
        "teams:read",
        "service_catalog:read",
        "fuel_logs:read",
        "maintenance_orders:read",
        "fines:read",
        "insurance_policies:read",
        "damages:read",
        "inventory_items:read",
        "work_orders:read",
        "field_location:read",
        "field_dispatch:read",
        "commissions:read",
        "finance.read",
        "reports:read",
        "notifications:read",
      ],
      "operation",
    ),
    mustSee: ["/dashboard", "/cadastros/clientes", "/fleet/fuel", "/inventory", "/audit", "/users"],
    mustNotSee: ["/administrator/settings"],
    frota: true,
    gestao: true,
  },
  {
    name: "support so ve Administracao limitada (Usuarios/Auditoria/Notificacoes)",
    context: ctx(["Supervisor"], ["users.read", "audit:read", "notifications:read"], "operation"),
    mustSee: ["/users", "/audit", "/notifications"],
    mustNotSee: [
      "/dashboard",
      "/work-orders",
      "/operations/dispatches",
      "/fleet/fuel",
      "/cadastros/clientes",
      "/inventory",
      "/administrator/settings",
    ],
    frota: false,
    gestao: false,
  },
];

for (const roleCase of ROLE_CASES) {
  test(`sidebar RBAC: ${roleCase.name}`, async () => {
    const { filterNavigationItems } = await import("../src/navigation/types");
    const { tenantNavigation } = await import("../src/navigation/tenantNavigation");

    const paths = flattenPaths(filterNavigationItems(roleCase.context, tenantNavigation));

    for (const path of roleCase.mustSee) {
      assert.equal(paths.includes(path), true, `esperado ${path} VISIVEL para ${roleCase.name}`);
    }
    for (const path of roleCase.mustNotSee) {
      assert.equal(paths.includes(path), false, `esperado ${path} OCULTO para ${roleCase.name}`);
    }
    assert.equal(includesAny(paths, FROTA_PATHS), roleCase.frota, `grupo FROTA (${roleCase.name})`);
    assert.equal(includesAny(paths, GESTAO_PATHS), roleCase.gestao, `grupo GESTAO (${roleCase.name})`);
  });
}

test("sidebar RBAC: support e inventory nunca alcancam o nucleo de ADMINISTRACAO restrito", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");

  // support ve Usuarios/Auditoria (limitado) — mas nunca Configuracoes.
  const supportPaths = flattenPaths(
    filterNavigationItems(ctx(["Supervisor"], ["users.read", "audit:read"], "operation"), tenantNavigation),
  );
  assert.equal(supportPaths.includes("/administrator/settings"), false);

  // inventory nao alcanca nenhum item do nucleo de administracao.
  const inventoryPaths = flattenPaths(
    filterNavigationItems(ctx([], ["inventory_items:read"], "operation"), tenantNavigation),
  );
  assert.equal(includesAny(inventoryPaths, ADMIN_CORE_PATHS), false);
});

// ── Camada VISUAL da sidebar (AppShell) — restauracao dos 5 grupos da IA por RoleKind ──

const IA_GROUP_LABELS = ["VISÃO GERAL", "OPERAÇÃO", "FROTA", "GESTÃO", "ADMINISTRAÇÃO"];

test("sidebar visual: roleKindFor mapeia os rotulos para o RoleKind correto", async () => {
  const { roleKindFor } = await import("../src/layouts/appSidebarNav");

  assert.equal(roleKindFor(["Financeiro"]), "finance");
  assert.equal(roleKindFor(["Supervisor"]), "support");
  assert.equal(roleKindFor(["Operador Logistico"]), "dispatcher");
  assert.equal(roleKindFor(["Operação de Campo"]), "dispatcher");
  assert.equal(roleKindFor(["Administrador"]), "admin");
  assert.equal(roleKindFor(["Gestor Operacional"]), "gestor");
  // STOP conhecido: `inventory` nao tem rotulo UserRole no front → cai em gestor (menu visual
  // amplo); a autoridade de acesso e o route guard/backend. Ver relatorio F11.
  assert.equal(roleKindFor([]), "gestor");
});

test("sidebar visual: cada RoleKind so usa os 5 rotulos de grupo da IA aprovada", async () => {
  const { NAV_BY_ROLE } = await import("../src/layouts/appSidebarNav");

  for (const groups of Object.values(NAV_BY_ROLE)) {
    for (const group of groups) {
      assert.equal(IA_GROUP_LABELS.includes(group.label), true, `rotulo de grupo inesperado: ${group.label}`);
    }
  }
});

test("sidebar visual: support nao ve FROTA/GESTAO/OPERACAO; finance recupera FROTA/GESTAO", async () => {
  const { buildSidebarNav } = await import("../src/layouts/appSidebarNav");

  const support = buildSidebarNav(["Supervisor"]);
  const supportLabels = support.map((group) => group.label);
  assert.deepEqual(supportLabels, ["ADMINISTRAÇÃO"]);

  const finance = buildSidebarNav(["Financeiro"]);
  const financeLabels = finance.map((group) => group.label);
  assert.equal(financeLabels.includes("FROTA"), true);
  assert.equal(financeLabels.includes("GESTÃO"), true);

  const financePaths = finance.flatMap((group) => group.items.map((item) => item.path));
  assert.equal(financePaths.includes("/fleet/fines"), true, "finance ve Multas");
  assert.equal(financePaths.includes("/fleet/insurance"), true, "finance ve Seguros");
  assert.equal(financePaths.includes("/finance/commissions"), true, "finance ve Remuneracoes");
  assert.equal(financePaths.includes("/cadastros/clientes"), false, "finance NAO gerencia Clientes");
  assert.equal(financePaths.includes("/cadastros/viaturas"), false, "finance NAO gerencia Viaturas");
});

test("sidebar visual: gestor/admin recebem os 5 grupos; dispatcher tem FROTA e GESTAO sem admin restrito", async () => {
  const { buildSidebarNav } = await import("../src/layouts/appSidebarNav");

  const gestor = buildSidebarNav(["Gestor Operacional"]).map((group) => group.label);
  assert.deepEqual(gestor, IA_GROUP_LABELS);

  const admin = buildSidebarNav(["Administrador"]).map((group) => group.label);
  assert.deepEqual(admin, IA_GROUP_LABELS);

  const dispatcher = buildSidebarNav(["Operador Logistico"]);
  const dispatcherLabels = dispatcher.map((group) => group.label);
  assert.equal(dispatcherLabels.includes("FROTA"), true);
  assert.equal(dispatcherLabels.includes("GESTÃO"), true);
  const dispatcherPaths = dispatcher.flatMap((group) => group.items.map((item) => item.path));
  assert.equal(dispatcherPaths.includes("/users"), false, "dispatcher nao ve Usuarios");
  assert.equal(dispatcherPaths.includes("/administrator/settings"), false, "dispatcher nao ve Configuracoes");
  assert.equal(dispatcherPaths.includes("/audit"), false, "dispatcher nao ve Auditoria");
});
