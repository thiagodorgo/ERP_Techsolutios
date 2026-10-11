import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
  "/finance/commissions",
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
    mustSee: ["/dashboard", "/fleet/fines", "/fleet/insurance", "/finance/commissions", "/finance"],
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
    mustSee: ["/dashboard", "/inventory"],
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

// ── Camada VISUAL da sidebar (AppShell) — grupos aprovados da IA por RoleKind ──
// Ω4C PR-14 acrescenta o grupo TELEMETRIA (Quilometragem/Acessos/Recusas/Dispositivos), antes de
// ADMINISTRAÇÃO, para os roleKind admin/gestor/dispatcher (papéis com telemetry:read).
// Ω5P PR-04 acrescenta o grupo PÁTIOS (Pátios/Perfis Normativos/Tabela de Valores) entre GESTÃO e TELEMETRIA,
// para admin/gestor/dispatcher (papéis com yard:read/jurisdiction:read/price_tables:read).

const IA_GROUP_LABELS = ["VISÃO GERAL", "OPERAÇÃO", "FROTA", "GESTÃO", "PÁTIOS", "TELEMETRIA", "ADMINISTRAÇÃO"];

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

test("sidebar visual: cada RoleKind so usa os rotulos de grupo aprovados (IA + TELEMETRIA)", async () => {
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
  // B-SAN3-04a (P2, D-SAN3-PLANO-OPCAO-B): o Financeiro VÊ Clientes e Serviços (leitura — monta orçamento).
  assert.equal(financePaths.includes("/cadastros/clientes"), true, "finance VE Clientes (customers:read, P2)");
  assert.equal(financePaths.includes("/cadastros/servicos"), true, "finance VE Servicos (service_catalog:read, P2)");
  assert.equal(financePaths.includes("/cadastros/viaturas"), false, "finance NAO gerencia Viaturas");
});

test("sidebar visual: gestor/admin recebem os grupos aprovados; dispatcher tem FROTA/GESTAO/TELEMETRIA sem admin restrito", async () => {
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

// ── B-SAN3-06a (D-TELAS-SAN3-06a) — Pedidos de compra e Relatórios saem do menu E da rota ──────────────────────────
// Eram telas 100% literais, sem servidor. A propriedade (plano, §0 P2): nenhum Route nem import das duas telas no
// App.tsx (o deep-link cai no catch-all, como toda rota desconhecida), nenhuma entrada de menu em NENHUM RoleKind, na
// allowlist MVP ou no registro tenantNavigation, nenhum literal de caminho em frontend/src, e a matriz de navegação sem
// as duas linhas — conferida contra as rotas reais do App.tsx (toda rota da matriz precisa responder).
// Mutações que cada caso derruba (executadas no relatório do dev): C1 devolver o Route; C2 devolver PEDIDOS ao grupo
// inventory; C3 devolver o Link da EstoquePage; C9 devolver a linha de Pedidos à matriz.

const FRONTEND_DIR = fileURLToPath(new URL("../", import.meta.url));
const REPO_DIR = path.dirname(FRONTEND_DIR);
const RETIRED_PATHS: readonly string[] = ["/purchase-orders", "/reports"];
const RETIRED_LABELS: readonly string[] = ["Pedidos", "Relatórios"];

function appRoutePaths(): string[] {
  const appText = readFileSync(path.join(FRONTEND_DIR, "src/App.tsx"), "utf8");
  return [...appText.matchAll(/\bpath="([^"]+)"/g)].map((m) => m[1]);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? sourceFiles(target) : /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}

test("[06a·C1] App.tsx sem Route nem import das duas telas; o deep-link só casa com o catch-all, que leva a /login", async () => {
  const { matchRoutes } = await import("react-router-dom");
  const appText = readFileSync(path.join(FRONTEND_DIR, "src/App.tsx"), "utf8");
  const paths = appRoutePaths();
  assert.ok(paths.length > 50, `leitura das rotas do App.tsx suspeita: ${paths.length}`);
  assert.match(appText, /<Route path="\*" element=\{<Navigate to="\/login" replace \/>\} \/>/, "o catch-all leva a /login");
  const routes = paths.map((routePath) => ({ path: routePath }));
  for (const retired of RETIRED_PATHS) {
    assert.equal(paths.includes(retired), false, `Route ${retired} ainda declarado`);
    for (const target of [retired, `${retired}/qualquer`]) {
      const matched = (matchRoutes(routes, target) ?? []).map((match) => match.route.path);
      assert.deepEqual(matched, ["*"], `${target} deveria cair só no catch-all; casou com ${JSON.stringify(matched)}`);
    }
  }
  assert.doesNotMatch(appText, /modules\/(purchase-orders|reports)\/|PedidosPage|ReportsPage/);
  for (const dir of ["src/modules/purchase-orders", "src/modules/reports"]) {
    assert.equal(existsSync(path.join(FRONTEND_DIR, dir)), false, `${dir} deveria ter sido apagado`);
  }
});

test("[06a·C2] nenhum RoleKind, a allowlist MVP nem o registro tenantNavigation oferecem as duas telas", async () => {
  const { NAV_BY_ROLE, MVP_NAV_PATHS, buildSidebarNav } = await import("../src/layouts/appSidebarNav");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");
  assert.deepEqual(Object.keys(NAV_BY_ROLE).sort(), ["admin", "dispatcher", "finance", "gestor", "inventory", "support"]);
  for (const [kind, groups] of Object.entries(NAV_BY_ROLE)) {
    for (const group of groups) {
      for (const item of group.items) {
        assert.equal(RETIRED_PATHS.includes(item.path), false, `${kind}/${group.label} oferece ${item.path}`);
        assert.equal(RETIRED_LABELS.includes(item.label), false, `${kind}/${group.label} oferece "${item.label}"`);
      }
    }
  }
  for (const retired of RETIRED_PATHS) assert.equal(MVP_NAV_PATHS.has(retired), false, `MVP_NAV_PATHS ainda tem ${retired}`);
  const registryPaths = flattenPaths(tenantNavigation);
  for (const retired of RETIRED_PATHS) assert.equal(registryPaths.includes(retired), false, `tenantNavigation ainda tem ${retired}`);
  for (const labels of [["Administrador"], ["Gestor Operacional"], ["Financeiro"], ["Estoque"], ["Operação de Campo"], ["Supervisor"], []]) {
    const visible = buildSidebarNav(labels).flatMap((group) => group.items.map((item) => item.path));
    for (const retired of RETIRED_PATHS) assert.equal(visible.includes(retired), false, `${JSON.stringify(labels)} vê ${retired}`);
  }
});

test("[06a·C3] nenhum literal de caminho para as duas telas em frontend/src", () => {
  const literal = /["'`]\/(purchase-orders|reports)(?=["'`?#/])/;
  const hits: string[] = [];
  for (const file of sourceFiles(path.join(FRONTEND_DIR, "src"))) {
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (literal.test(line)) hits.push(`${path.relative(FRONTEND_DIR, file).replace(/\\/g, "/")}:${index + 1}`);
      });
  }
  assert.deepEqual(hits, []);
});

// Pré-existente, fora deste bloco: a matriz documenta a timeline do despacho como rota, mas ela não é uma rota do
// App.tsx. Entrada morta (passar a responder) também falha — a exceção não apodrece.
const MATRIX_ROUTES_WITHOUT_SCREEN: Record<string, string> = {
  "/operations/dispatches/:id/timeline": "pré-existente (Ω3-b): a timeline é um painel dentro de /operations/dispatches",
};

test("[06a·C9] navigation-matrix sem as duas telas, e toda rota da matriz responde no App.tsx", async () => {
  const { matchRoutes } = await import("react-router-dom");
  const matrix = readFileSync(path.join(REPO_DIR, "docs/navigation-matrix.md"), "utf8");
  for (const retired of RETIRED_PATHS) assert.equal(matrix.includes(`\`${retired}\``), false, `a matriz ainda lista ${retired}`);
  const routes = appRoutePaths().map((routePath) => ({ path: routePath }));
  const matrixRoutes = matrix
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => [...(line.split("|")[1] ?? "").matchAll(/`(\/[^`\s]*)`/g)].map((m) => m[1]));
  assert.ok(matrixRoutes.length >= 40, `leitura da matriz suspeita: ${matrixRoutes.length}`);
  const withoutScreen = matrixRoutes.filter((route) => {
    const matched = (matchRoutes(routes, route) ?? []).map((match) => match.route.path);
    return matched.length === 0 || matched.every((routePath) => routePath === "*");
  });
  assert.deepEqual(withoutScreen.sort(), Object.keys(MATRIX_ROUTES_WITHOUT_SCREEN).sort());
});
