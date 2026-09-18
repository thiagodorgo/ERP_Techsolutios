import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";
import { getGovernedNavigationPaths, getMenuForCurrentUser } from "../src/modules/navigation/navigation.service.js";

// B-SAN3-04a — T3 (itens 38 e 13, P1/P2 no menu): o sidebar do FRONT, montado como o AppShell monta (rótulo →
// RoleKind → NAV_BY_ROLE → allowlist MVP → esconde-fino com o menu do backend), só oferece ao papel itens cuja rota o
// `PermissionGuard` deixa entrar com as permissões do catálogo. Item visível que o guard nega é "menu que mente".
//
// Sem banco. Lê `.ts/.tsx` do front POR TEXTO (padrão da casa: os contratos front vivem na suíte backend —
// `reference-frontend-contract-tests-backend-suite`), e usa o registro de navegação IMPORTADO com os módulos demo
// lidos do `prisma/seed.ts`. Porte do §7 de `agent-orchestration/omega/planos/B-SAN3-04a-apoio/mapa-rbac.mts`.
//
// Default fail-closed: item negado fora de `ALLOWLIST_MENU` (com pendência) → falha; entrada morta → falha; rótulo,
// kind ou ramo de `roleKindFor` que o parser não entenda → `throw`.
//
// Vermelho-controle no head-base (`13e3783c`): `inventory` sem rótulo cai em `gestor` com 24 itens negados; `finance`
// sem OS/Clientes/Serviços e com Auditoria negada. Mutações: devolver AUDITORIA ao finance → vermelho; tirar o ramo
// "Estoque" de `roleKindFor` → inventory cai em `gestor` → vermelho.

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (rel: string) => readFileSync(`${ROOT}${rel}`, "utf8");

const CANON_TENANT = ["tenant_admin", "manager", "operator", "finance", "inventory", "field_technician", "auditor", "support"] as const;
type TenantRole = (typeof CANON_TENANT)[number];

// ---------- fontes do front, por texto ----------
const sbText = read("frontend/src/layouts/appSidebarNav.ts");
const adapterText = read("frontend/src/modules/auth/auth.adapter.ts");
const appText = read("frontend/src/App.tsx");
const seedText = read("prisma/seed.ts");

const DEMO_MODULES = [...seedText.match(/const DEMO_TENANT_MODULES = \[([^\]]*)\]/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

type Item = { label: string; path: string };
type Group = { label: string; items: string[] };
type NavByRole = Record<string, Group[]>;

const ITEMS: Record<string, Item> = {};
for (const m of sbText.matchAll(/const (\w+): NavItem = \{ label: "([^"]+)", path: "([^"]+)"/g)) ITEMS[m[1]] = { label: m[2], path: m[3] };

const GROUPS: Record<string, Group> = {};
for (const m of sbText.matchAll(/const (G_\w+): NavGroup = \{\s*label: "([^"]+)",\s*items: \[([^\]]*)\]/g)) {
  GROUPS[m[1]] = { label: m[2], items: m[3].split(",").map((s) => s.trim()).filter(Boolean) };
}

const ROLE_KINDS = [...(sbText.match(/export type RoleKind = ([^;]+);/)![1]).matchAll(/"(\w+)"/g)].map((m) => m[1]);

function parseNavByRole(text: string): NavByRole {
  const block = text.slice(text.indexOf("export const NAV_BY_ROLE"), text.indexOf("export const ROLE_SUBTITLE"));
  const out: NavByRole = {};
  for (const kind of ROLE_KINDS) {
    const start = block.indexOf(`\n  ${kind}: [`);
    if (start < 0) throw new Error(`NAV_BY_ROLE sem a chave "${kind}" (RoleKind declara e o mapa não tem)`);
    const rest = block.slice(start + 1);
    const endIdx = rest.slice(1).search(/^\s{2}[a-z]+: \[|^\};/m) + 1;
    const body = rest.slice(rest.indexOf("["), endIdx);
    const list: Group[] = [];
    for (const m of body.matchAll(/G_\w+|\{ label: "([^"]+)", items: \[([^\]]*)\] \}/g)) {
      if (m[0].startsWith("G_")) {
        const g = GROUPS[m[0]];
        if (!g) throw new Error(`grupo não resolvido: ${m[0]}`);
        list.push(g);
      } else {
        list.push({ label: m[1], items: m[2].split(",").map((s) => s.trim()).filter(Boolean) });
      }
    }
    out[kind] = list;
  }
  return out;
}
const NAV_BY_ROLE = parseNavByRole(sbText);
const MVP = new Set([...sbText.slice(sbText.indexOf("MVP_NAV_PATHS")).matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]));
const ROLE_SUBTITLE: Record<string, string> = Object.fromEntries(
  [...sbText.slice(sbText.indexOf("export const ROLE_SUBTITLE")).matchAll(/^\s{2}(\w+): "([^"]+)",$/gm)].map((m) => [m[1], m[2]]),
);

// `roleKindFor` interpretado a partir do TEXTO da função: cada `if (<cond>) return "<kind>";` na ordem, `<cond>` composta
// de `roles.includes("X")` com `!`, `||` e `&&`. Forma fora disso → throw (o teste não adivinha).
type Rule = { terms: { atom: string; negated: boolean }[][]; kind: string };
function parseRoleKindFor(text: string): { rules: Rule[]; fallback: string } {
  const start = text.indexOf("export function roleKindFor");
  const body = text.slice(start, text.indexOf("\n}", start));
  const rules: Rule[] = [];
  for (const m of body.matchAll(/if \((.+?)\) return "(\w+)";/g)) {
    const terms = m[1].split("||").map((orTerm) =>
      orTerm.split("&&").map((andTerm) => {
        const atom = andTerm.trim().match(/^(!?)roles\.includes\("([^"]+)"\)$/);
        if (!atom) throw new Error(`roleKindFor: átomo não interpretado: ${andTerm.trim()}`);
        return { atom: atom[2], negated: atom[1] === "!" };
      }),
    );
    rules.push({ terms, kind: m[2] });
  }
  const fallback = body.match(/\n\s+return "(\w+)";\n?$/)?.[1] ?? body.match(/return "(\w+)";\s*$/)?.[1];
  if (!fallback) throw new Error("roleKindFor: sem retorno padrão");
  return { rules, fallback };
}
const ROLE_KIND_FOR = parseRoleKindFor(sbText);
function roleKindFor(roles: readonly string[], parsed = ROLE_KIND_FOR): string {
  for (const rule of parsed.rules) {
    const hit = rule.terms.some((and) => and.every((a) => (roles.includes(a.atom) ? !a.negated : a.negated)));
    if (hit) return rule.kind;
  }
  return parsed.fallback;
}

// `mapBackendRole` interpretado do texto de auth.adapter.ts.
const LABEL_BY_BACKEND_ROLE: Record<string, string> = {};
{
  const start = adapterText.indexOf("function mapBackendRole");
  const body = adapterText.slice(start, adapterText.indexOf("\n}", start));
  for (const m of body.matchAll(/if \(([^)]+)\) return "([^"]+)";/g)) {
    for (const r of m[1].matchAll(/normalized === "([a-z_]+)"/g)) LABEL_BY_BACKEND_ROLE[r[1]] = m[2];
  }
}

// Guards de rota do App.tsx: `path="..."` → primeiro <PermissionGuard permissions={[...]}> que se segue.
const ROUTE_GUARD: Record<string, string[]> = {};
for (const m of appText.matchAll(/path="([^"]+)"([\s\S]{0,400}?)<PermissionGuard permissions=\{\[([^\]]*)\]\}/g)) {
  if (m[2].includes("<Route")) continue;
  ROUTE_GUARD[m[1]] = [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

// ---------- composição: menu do backend (registro × catálogo × módulos demo) → esconde-fino → sidebar ----------
const GOVERNED = getGovernedNavigationPaths();

type Visible = { group: string; label: string; path: string; guard: string[] | null; ok: boolean };
function sidebarFor(role: TenantRole, nav: NavByRole = NAV_BY_ROLE, kindFor: typeof roleKindFor = roleKindFor) {
  const perms = new Set<string>(ROLE_PERMISSIONS[role]);
  const menu = getMenuForCurrentUser({ userId: "u", tenantId: "t", roles: [role], permissions: [...perms], enabledModules: DEMO_MODULES });
  const menuPaths = new Set(menu.map((i) => i.path));
  const hidden = new Set<string>(menu.filter((i) => i.status === "planned").map((i) => i.path));
  for (const p of GOVERNED) if (!menuPaths.has(p)) hidden.add(p);
  const label = LABEL_BY_BACKEND_ROLE[role];
  const labels = label ? [label] : [];
  const kind = kindFor(labels);
  if (!nav[kind]) throw new Error(`kind "${kind}" sem NAV_BY_ROLE`);
  const visible: Visible[] = [];
  for (const g of nav[kind]) {
    for (const id of g.items) {
      const it = ITEMS[id];
      if (!it) throw new Error(`item não resolvido: ${id}`);
      if (!MVP.has(it.path) || hidden.has(it.path)) continue;
      const guard = ROUTE_GUARD[it.path] ?? null;
      visible.push({ group: g.label, label: it.label, path: it.path, guard, ok: guard ? guard.some((p) => perms.has(p)) : true });
    }
  }
  return { labels, kind, visible, negados: visible.filter((v) => !v.ok).map((v) => v.label) };
}

// Itens visíveis que o guard nega, MANTIDOS com pendência nomeada (resíduo da P-026 → `P-SAN3-04A-MENU-RESIDUAL`,
// dono `B-SAN3-06a`). Qualquer outro negado → falha; entrada que deixou de ser negada → falha (não apodrece).
const ALLOWLIST_MENU: Record<string, { negados: string[]; pendencia: string }> = {
  manager: { negados: ["Sessões"], pendencia: "P-SAN3-04A-MENU-RESIDUAL (manager × sessions:read)" },
  field_technician: { negados: ["Seguros", "Estoque"], pendencia: "P-SAN3-04A-MENU-RESIDUAL (operator×field_technician fundidos)" },
};

for (const role of CANON_TENANT) {
  test(`[menu × guard] ${role}: todo item visível passa no PermissionGuard — negados só os da allowlist com pendência`, () => {
    const { negados, kind, labels } = sidebarFor(role);
    const allow = ALLOWLIST_MENU[role];
    if (allow) assert.ok(allow.pendencia.length > 0, "allowlist sem pendência");
    assert.deepEqual([...negados].sort(), [...(allow?.negados ?? [])].sort(), `${role} (rótulos ${JSON.stringify(labels)} → kind ${kind}) — itens visíveis negados pelo guard`);
  });
}

test("[P1/P2/item 13] finance vê OS, Clientes, Serviços, Checklists, Financeiro, Cobranças, Pagamentos — e NÃO vê Auditoria", () => {
  const { visible, kind } = sidebarFor("finance");
  assert.equal(kind, "finance");
  const labels = new Set(visible.map((v) => v.label));
  for (const l of ["Ordens de Serviço", "Clientes", "Serviços", "Checklists", "Modelos de Checklist", "Financeiro", "Cobranças", "Pagamentos", "Orçamentos", "Aprovações"]) {
    assert.ok(labels.has(l), `finance sem "${l}" no sidebar`);
  }
  assert.equal(labels.has("Auditoria"), false, "Auditoria: guard audit:read, matriz l.56 `scoped` não concedida");
});

test("[item 38] inventory tem rótulo Estoque, kind próprio e o conjunto EXATO de itens do §4.5 (Dashboard escondido até o 04b)", () => {
  const { labels, kind, visible } = sidebarFor("inventory");
  assert.deepEqual(labels, ["Estoque"]);
  assert.equal(kind, "inventory");
  assert.deepEqual(
    visible.map((v) => `${v.group}/${v.label}`),
    ["OPERAÇÃO/Checklists", "GESTÃO/Estoque", "GESTÃO/Pedidos", "GESTÃO/Relatórios", "ADMINISTRAÇÃO/Notificações", "ADMINISTRAÇÃO/Modelos de Checklist"],
  );
  assert.equal(visible.some((v) => v.path === "/dashboard"), false, "/dashboard é governado e o inventory ainda não tem dashboard:read (P-SAN3-04A-DASHBOARD-SCOPED → B-SAN3-04b)");
  assert.equal(ROLE_SUBTITLE.inventory, "Estoque");
});

test("[item 38] roleKindFor lido por regex: Estoque → inventory; Financeiro vence Estoque (precedência declarada); [] segue gestor", () => {
  assert.equal(roleKindFor(["Estoque"]), "inventory");
  assert.equal(roleKindFor(["Financeiro", "Estoque"]), "finance");
  assert.equal(roleKindFor([]), "gestor");
  assert.ok(ROLE_KINDS.includes("inventory"), "RoleKind sem \"inventory\"");
});

test("[§3] nenhum termo técnico nos rótulos do sidebar nem nos subtítulos", () => {
  const tecnicos = /\b(tenant|rbac|inventory|platform_admin|field_technician|permission)\b/i;
  for (const it of Object.values(ITEMS)) assert.doesNotMatch(it.label, tecnicos, `rótulo técnico: ${it.label}`);
  for (const s of Object.values(ROLE_SUBTITLE)) assert.doesNotMatch(s, tecnicos, `subtítulo técnico: ${s}`);
});

// ---------- mutações (executadas sobre cópias em memória) ----------
test("[mutação] devolver AUDITORIA ao finance → item visível negado pelo guard (vermelho)", () => {
  const nav: NavByRole = JSON.parse(JSON.stringify(NAV_BY_ROLE));
  const admin = nav.finance.find((g) => g.label === "ADMINISTRAÇÃO");
  assert.ok(admin, "finance sem grupo ADMINISTRAÇÃO");
  admin.items.push("AUDITORIA");
  const { negados } = sidebarFor("finance", nav);
  assert.deepEqual(negados, ["Auditoria"]);
});

test("[mutação] tirar o ramo Estoque de roleKindFor → inventory cai em gestor com dezenas de itens negados (vermelho)", () => {
  const semEstoque = { ...ROLE_KIND_FOR, rules: ROLE_KIND_FOR.rules.filter((r) => !r.terms.some((and) => and.some((a) => a.atom === "Estoque"))) };
  const { kind, negados } = sidebarFor("inventory", NAV_BY_ROLE, (roles) => roleKindFor(roles, semEstoque));
  assert.equal(kind, "gestor");
  assert.ok(negados.length >= 20, `esperava ≥ 20 negados; veio ${negados.length}: ${negados.join(", ")}`);
  assert.ok(negados.includes("Viaturas"));
});
