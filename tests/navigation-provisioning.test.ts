import assert from "node:assert/strict";
import test from "node:test";

import { getGovernedNavigationPaths, getMenuForCurrentUser } from "../src/modules/navigation/navigation.service.js";
import { ROLE_PERMISSIONS, type Role } from "../src/modules/core-saas/permissions/catalog.js";

// Ω-ACESSO — o Mapa Operacional só entra no menu com o módulo field_operations provisionado E a permissão
// field_location:read. Estes testes travam a MATRIZ por papel e o gating dinâmico (remover módulo → some),
// codificando o que foi validado por login real (ver T-ACESSO / demo-credentials.md).

const DEMO_MODULES = [
  "dashboard", "work_orders", "field_operations", "logistics", "finance",
  "checklists", "tenant_checklist", "notifications", "users", "audit",
];

const TENANT = "11111111-1111-1111-1111-111111111111";

function menuPathsForRole(role: Role, modules: string[] = DEMO_MODULES): string[] {
  const menu = getMenuForCurrentUser({
    userId: "22222222-2222-2222-2222-222222222222",
    tenantId: TENANT,
    roles: [role],
    permissions: [...ROLE_PERMISSIONS[role]],
    enabledModules: modules,
  });
  return menu.map((item) => item.path);
}

// Matriz do Mapa por papel (navigation-matrix.md): quem VÊ o item /operations/map no menu web.
const MAP_VISIBLE_BY_ROLE: Record<Role, boolean> = {
  super_admin: true,
  tenant_admin: true,
  manager: true,
  operator: true,
  auditor: true,
  finance: false,
  inventory: false,
  support: false,
  field_technician: false,
};

for (const role of Object.keys(MAP_VISIBLE_BY_ROLE) as Role[]) {
  test(`Ω-ACESSO matriz: papel ${role} ${MAP_VISIBLE_BY_ROLE[role] ? "VÊ" : "NÃO vê"} o Mapa Operacional`, () => {
    const hasMap = menuPathsForRole(role).includes("/operations/map");
    assert.equal(hasMap, MAP_VISIBLE_BY_ROLE[role]);
  });
}

test("Ω-ACESSO gating dinâmico: remover o módulo field_operations tira o Mapa do menu do admin", () => {
  assert.equal(menuPathsForRole("tenant_admin").includes("/operations/map"), true);
  const semModulo = DEMO_MODULES.filter((m) => m !== "field_operations");
  assert.equal(menuPathsForRole("tenant_admin", semModulo).includes("/operations/map"), false);
});

test("Ω-ACESSO: sem NENHUM módulo provisionado, o menu do tenant fica vazio de itens gated (bug original)", () => {
  const vazio = menuPathsForRole("tenant_admin", []);
  assert.equal(vazio.includes("/operations/map"), false);
  assert.equal(vazio.includes("/work-orders"), false);
});

test("Ω-ACESSO: operator tem field_location:read (opera o mapa)", () => {
  assert.equal(ROLE_PERMISSIONS.operator.includes("field_location:read"), true);
});

test("Ω-ACESSO: getGovernedNavigationPaths inclui o Mapa e paths-chave (para o gating do sidebar)", () => {
  const governed = getGovernedNavigationPaths();
  assert.equal(governed.includes("/operations/map"), true);
  assert.equal(governed.includes("/operations/dispatches"), true);
  assert.equal(governed.includes("/work-orders"), true);
  assert.ok(governed.length >= 15);
});

// Ω4C PR-14 — Telemetria: os 4 paths do console do app de campo são GOVERNADOS pelo registry (gate
// telemetry:read). Sem isso, o gating dinâmico do sidebar não esconde o grupo TELEMETRIA de quem não tem
// a permissão (mesma classe do veto V1 de Orçamentos).
// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — o 5º path "Rastreamento" (mapa do trajeto, GET /telemetry/track) é
// GOVERNADO pelo mesmo gate telemetry:read: sem o registry, o gating dinâmico não esconde o item de quem não
// tem a permissão (lição de esconde-fino do PR-14).
const TELEMETRY_NAV_PATHS = [
  "/telemetria/quilometragem",
  "/telemetria/acessos",
  "/telemetria/recusas",
  "/telemetria/dispositivos",
  "/telemetria/rastreamento",
] as const;

test("Ω4C PR-14/PR-15: getGovernedNavigationPaths governa os 5 paths de telemetria (inclui Rastreamento)", () => {
  const governed = getGovernedNavigationPaths();
  for (const path of TELEMETRY_NAV_PATHS) {
    assert.equal(governed.includes(path), true, `governed deveria incluir ${path}`);
  }
  // O Rastreamento entra como path governado adicional (28→29 no registry).
  assert.equal(governed.includes("/telemetria/rastreamento"), true);
});

for (const role of Object.keys(MAP_VISIBLE_BY_ROLE) as Role[]) {
  const hasTelemetry = ROLE_PERMISSIONS[role].includes("telemetry:read");
  test(`Ω4C PR-14: papel ${role} ${hasTelemetry ? "VÊ" : "NÃO vê"} o grupo Telemetria (gate telemetry:read)`, () => {
    const paths = menuPathsForRole(role);
    for (const telemetryPath of TELEMETRY_NAV_PATHS) {
      assert.equal(
        paths.includes(telemetryPath),
        hasTelemetry,
        `${role} → ${telemetryPath} deveria ${hasTelemetry ? "aparecer" : "sumir"} no menu`,
      );
    }
  });
}

// Ω4C PR-20 (Central de Notificações): a rota tenant-wide /controle/notificacoes é governada por
// notifications:create (esconde-fino, lição PR-14). Quem NÃO tem create (ex.: field_technician, que só
// tem o inbox notifications:read) NÃO vê o item — o backend é a autoridade (403 real).
const CENTRAL_NOTIFICACOES_PATH = "/controle/notificacoes";

test("Ω4C PR-20: getGovernedNavigationPaths governa /controle/notificacoes (notifications:create)", () => {
  const governed = getGovernedNavigationPaths();
  assert.equal(governed.includes(CENTRAL_NOTIFICACOES_PATH), true);
});

for (const role of Object.keys(MAP_VISIBLE_BY_ROLE) as Role[]) {
  const hasCreate = ROLE_PERMISSIONS[role].includes("notifications:create");
  test(`Ω4C PR-20: papel ${role} ${hasCreate ? "VÊ" : "NÃO vê"} a Central de Notificações (gate notifications:create)`, () => {
    assert.equal(
      menuPathsForRole(role).includes(CENTRAL_NOTIFICACOES_PATH),
      hasCreate,
      `${role} → ${CENTRAL_NOTIFICACOES_PATH} deveria ${hasCreate ? "aparecer" : "sumir"} no menu`,
    );
  });
}

// Ω5P PR-04 (Pátios — console do operador): os 3 paths de administração são GOVERNADOS pelo registry, cada um
// com gate ÚNICO por permissão pura (SEM requiredModules, como operations.quotes/telemetria/central). Sem o
// registry, o gating dinâmico do sidebar não esconde o grupo PÁTIOS de quem não tem a permissão (esconde-fino).
// A matriz por papel é DERIVADA de ROLE_PERMISSIONS (não hardcoded): quem tem a permissão VÊ o path; quem não
// tem (finance/inventory/support) NÃO vê. O drilldown /patios/patios/:yardId NÃO é governed (não é item de menu).
const PATIOS_NAV: readonly { readonly path: string; readonly permission: string }[] = [
  { path: "/patios/patios", permission: "yard:read" },
  { path: "/patios/perfis", permission: "jurisdiction:read" },
  { path: "/patios/tarifas", permission: "price_tables:read" },
];

test("Ω5P PR-04: getGovernedNavigationPaths governa os 3 paths de Pátios (yards/perfis/tarifas)", () => {
  const governed = getGovernedNavigationPaths();
  for (const { path } of PATIOS_NAV) {
    assert.equal(governed.includes(path), true, `governed deveria incluir ${path}`);
  }
  // O drilldown por :yardId NÃO é item de sidebar → não é governed.
  assert.equal(governed.includes("/patios/patios/:yardId"), false);
});

for (const { path, permission } of PATIOS_NAV) {
  for (const role of Object.keys(MAP_VISIBLE_BY_ROLE) as Role[]) {
    const hasPermission = ROLE_PERMISSIONS[role].includes(permission);
    test(`Ω5P PR-04: papel ${role} ${hasPermission ? "VÊ" : "NÃO vê"} ${path} (gate ${permission})`, () => {
      assert.equal(
        menuPathsForRole(role).includes(path),
        hasPermission,
        `${role} → ${path} deveria ${hasPermission ? "aparecer" : "sumir"} no menu`,
      );
    });
  }
}

// Ω5P PR-08a (Processos de custódia — console de operação): o item /patios/processos é GOVERNADO pelo registry
// com gate ÚNICO impound:read (esconde-fino, SEM requiredModules — igual a patios.*). A matriz por papel é
// DERIVADA de ROLE_PERMISSIONS: quem tem impound:read VÊ; finance/inventory (e support) NÃO. O dossiê
// /patios/processos/:processId NÃO é item de menu → não é governed (gate por route-guard).
const PATIOS_PROCESSES_PATH = "/patios/processos";
const PATIOS_PROCESSES_PERMISSION = "impound:read";

test("Ω5P PR-08a: getGovernedNavigationPaths governa /patios/processos (impound:read); o dossiê :processId não", () => {
  const governed = getGovernedNavigationPaths();
  assert.equal(governed.includes(PATIOS_PROCESSES_PATH), true);
  assert.equal(governed.includes("/patios/processos/:processId"), false);
});

for (const role of Object.keys(MAP_VISIBLE_BY_ROLE) as Role[]) {
  const hasPermission = ROLE_PERMISSIONS[role].includes(PATIOS_PROCESSES_PERMISSION);
  test(`Ω5P PR-08a: papel ${role} ${hasPermission ? "VÊ" : "NÃO vê"} os Processos de custódia (gate ${PATIOS_PROCESSES_PERMISSION})`, () => {
    assert.equal(
      menuPathsForRole(role).includes(PATIOS_PROCESSES_PATH),
      hasPermission,
      `${role} → ${PATIOS_PROCESSES_PATH} deveria ${hasPermission ? "aparecer" : "sumir"} no menu`,
    );
  });
}

// A junta pediu a asserção explícita de que finance e inventory NÃO veem o console (esconde-fino + 403 backend).
test("Ω5P PR-08a: finance e inventory NÃO veem os Processos de custódia (sem impound:read)", () => {
  assert.equal(ROLE_PERMISSIONS.finance.includes(PATIOS_PROCESSES_PERMISSION), false);
  assert.equal(ROLE_PERMISSIONS.inventory.includes(PATIOS_PROCESSES_PERMISSION), false);
  assert.equal(menuPathsForRole("finance").includes(PATIOS_PROCESSES_PATH), false);
  assert.equal(menuPathsForRole("inventory").includes(PATIOS_PROCESSES_PATH), false);
});
