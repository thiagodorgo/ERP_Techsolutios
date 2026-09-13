// mapa-rbac.ts — B-SAN3-04a (planejador): mapa papel × permissão gerado por script a partir das fontes.
// Fontes: RBAC_MATRIX.md (tabela l.29-57, lida por parser), catalog.ts (importado), banco (pg: prov_seed e seed_only),
// registro de navegação (importado) + appSidebarNav.ts/auth.adapter.ts/App.tsx (lidos por texto).
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WT = "C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/bsan304a";
const OUT = process.env.MAPA_OUT ?? "";
const require = createRequire(WT + "/package.json");
const { Client } = require("pg");
const catalog = await import(`file:///${WT}/src/modules/core-saas/permissions/catalog.ts`);
const navsvc = await import(`file:///${WT}/src/modules/navigation/navigation.service.ts`);
const { ROLE_PERMISSIONS, PERMISSION_CATALOG } = catalog as any;

const CANON = ["platform_admin","tenant_admin","manager","operator","finance","inventory","field_technician","auditor","support"] as const;
type R = typeof CANON[number];
const cat: Record<R, Set<string>> = Object.fromEntries(CANON.map(r => [r, new Set<string>(ROLE_PERMISSIONS[r])])) as any;

// ---------- 1) matriz ----------
const matrixText = readFileSync(`${WT}/RBAC_MATRIX.md`, "utf8").split(/\r?\n/);
const rows: { line: number; label: string; cells: Record<R, string> }[] = [];
let header: string[] | null = null;
for (let i = 0; i < matrixText.length; i++) {
  const l = matrixText[i];
  if (!l.startsWith("| ")) { if (header && rows.length) break; continue; }
  const cells = l.split("|").slice(1, -1).map(s => s.trim());
  if (!header) { header = cells; continue; }
  if (cells[0].startsWith("---")) continue;
  const rec: any = { line: i + 1, label: cells[0], cells: {} };
  header.slice(1).forEach((role, k) => rec.cells[role] = cells[k + 1]);
  rows.push(rec);
}
if (!header || header.slice(1).join(",") !== CANON.join(",")) throw new Error("cabecalho da matriz != 9 papeis canonicos: " + header);

// ---------- 2) vocabulário das células (CE-G1: membro fora do dicionário → ERRO) ----------
// u = ações incondicionais exigidas; q = ações qualificadas (por escopo/política/suporte: o backend NÃO aplica → fail-closed)
const VOCAB: Record<string, { u: string[]; q: string[]; none?: boolean; note?: string }> = {
  "full": { u: ["FULL"], q: [] },
  "none": { u: [], q: [], none: true },
  "read": { u: ["read"], q: [] },
  "limited": { u: ["read"], q: [] },
  "scoped": { u: [], q: ["scoped"] },
  "tenant-scoped": { u: ["FULL"], q: [] },
  "limited-support": { u: [], q: ["support"] },
  "support-audited": { u: [], q: ["support"] },
  "full-tenant": { u: ["FULL"], q: [] },
  "read-history": { u: ["read", "history"], q: [] },
  "send-own/read-tenant": { u: ["send", "read"], q: [] },
  "send-own": { u: ["send"], q: [] },
  "full-read": { u: ["FULLREAD"], q: [] },
  "support-view": { u: [], q: ["support"] },
  "approve/edit": { u: ["read", "create", "update"], q: [] },
  "edit-scoped": { u: ["read"], q: ["edit"] },
  "read/edit-scoped": { u: ["read"], q: ["edit"] },
  "read-support": { u: [], q: ["support"] },
  "create/edit": { u: ["read", "create", "update"], q: [] },
  "create/read/update/delete/publish": { u: ["create", "read", "update", "publish"], q: [], note: "delete: nao existe permissao no catalogo" },
  "read/complete-by-scope": { u: ["read"], q: ["complete"] },
  "create/answer/complete-by-scope": { u: ["read", "create"], q: ["answer", "complete"] },
  "read/answer-by-scope": { u: ["read"], q: ["answer"] },
  "answer-assigned": { u: ["read"], q: ["answer", "complete", "acknowledge"] },
  "material-view": { u: [], q: ["material-view"] },
  "execute/update-assigned": { u: ["read"], q: ["update", "status"] },
  "request": { u: [], q: ["request"] },
  "approval-by-policy": { u: [], q: ["approve"] },
  "request/ack": { u: [], q: ["request"] },
  "request/use": { u: ["read"], q: ["use"] },
  "full-operational": { u: ["FULL"], q: [] },
  "consume/confirm": { u: [], q: ["consume"] },
  "request/approve-policy": { u: ["read", "create"], q: ["approve"] },
  "budget-check": { u: ["read"], q: [] },
  "stock-driven-request": { u: ["read", "create"], q: [] },
  "tenant-finance-admin": { u: ["FULLADMIN"], q: [] },
  "manager-view": { u: ["FULLREAD"], q: [] },
  "stock-cost-view": { u: [], q: ["stock-cost-view"] },
  "finance-scoped": { u: ["read"], q: [] },
  "inventory-scoped": { u: ["read"], q: [] },
  "field-scoped": { u: ["read"], q: [] },
  "audit-full-read": { u: ["read"], q: [] },
  "support-scoped": { u: [], q: ["support"] },
  "scoped-support-only": { u: [], q: ["support"] },
};

// ---------- 3) linhas → famílias/permissões (CE-G1: linha sem mapeamento → ERRO) ----------
type RowSpec = { family: string[]; act: Record<string, string[]>; FULL: string[]; FULLREAD: string[]; FULLADMIN?: string[]; platform?: boolean; skip?: string; conflict?: string };
const fam = (f: string, acts: string[]) => acts.map(a => `${f}:${a}`);
const crud = (f: string) => ({ read: [`${f}:read`], create: [`${f}:create`], update: [`${f}:update`], edit: [`${f}:create`, `${f}:update`] });
const merge = (...specs: Record<string, string[]>[]) => specs.reduce((acc, s) => { for (const [k, v] of Object.entries(s)) acc[k] = [...(acc[k] ?? []), ...v]; return acc; }, {} as Record<string, string[]>);
const MD = ["branches", "suppliers", "tags", "pois", "operator_profiles"];
const FIN = ["financial_accounts", "financial_titles", "financial_entries", "cheques", "professional_statements"];
const WO = ["read", "create", "update", "assign", "status", "cancel", "comment"];
const RCU = ["read", "create", "update"];
const simple = (f: string): RowSpec => ({ family: fam(f, RCU), act: crud(f), FULL: fam(f, RCU), FULLREAD: [`${f}:read`] });
const ROWS: Record<string, RowSpec> = {
  "Platform configuration": { platform: true, family: PERMISSION_CATALOG.filter((p: string) => p.startsWith("platform:")), act: {}, FULL: [], FULLREAD: [] },
  "Tenant administration": { family: ["tenant.manage", "tenant_settings:read", "tenant_settings:update"], act: { read: ["tenant_settings:read"] }, FULL: ["tenant.manage", "tenant_settings:read", "tenant_settings:update"], FULLREAD: ["tenant_settings:read"] },
  "User and role assignment": { family: ["users.manage", "users.read", "users:read", "roles.manage"], act: { read: ["users.read"] }, FULL: ["users.manage", "users.read", "roles.manage"], FULLREAD: ["users.read"] },
  "Dashboard and operational overview": { family: ["dashboard:read"], act: { read: ["dashboard:read"] }, FULL: ["dashboard:read"], FULLREAD: ["dashboard:read"] },
  "Backend navigation menu": { skip: "sem permissao propria (GET /navigation/menu so exige autenticacao) - avaliada pela secao do menu", family: [], act: {}, FULL: [], FULLREAD: [] },
  "Field operator location": { family: fam("field_location", ["read", "send", "history"]), act: { read: ["field_location:read"], send: ["field_location:send"], history: ["field_location:history"] }, FULL: fam("field_location", ["read", "send", "history"]), FULLREAD: ["field_location:read", "field_location:history"] },
  "Master data": { conflict: "l.37 (tabela) x bullets l.131,141,142,143,144 (mirror of service_catalog -> l.41: finance, inventory e support = none)", family: MD.flatMap(f => fam(f, RCU)), act: merge(...MD.map(crud)), FULL: MD.flatMap(f => fam(f, RCU)), FULLREAD: MD.map(f => `${f}:read`) },
  "Customer registry (Cadastros - Clientes)": simple("customers"),
  "Vehicle registry (Cadastros - Viaturas)": simple("vehicles"),
  "Team registry (Cadastros - Equipes)": simple("teams"),
  "Service catalog (Cadastros - Serviços)": { family: [...fam("service_catalog", RCU), ...fam("tariffs", RCU)], act: merge(crud("service_catalog"), crud("tariffs")), FULL: [...fam("service_catalog", RCU), ...fam("tariffs", RCU)], FULLREAD: ["service_catalog:read", "tariffs:read"] },
  "Price tables (Configurações - Tabela de Valores)": simple("price_tables"),
  "Configurable checklist templates": { family: fam("tenant_checklists", ["read", "create", "update", "publish"]), act: { read: ["tenant_checklists:read"], create: ["tenant_checklists:create"], update: ["tenant_checklists:update"], publish: ["tenant_checklists:publish"] }, FULL: fam("tenant_checklists", ["read", "create", "update", "publish"]), FULLREAD: ["tenant_checklists:read"] },
  "Checklist executions and answers": { family: fam("checklist_runs", ["read", "create", "update", "complete", "acknowledge", "reopen"]), act: { read: ["checklist_runs:read"], create: ["checklist_runs:create"], answer: ["checklist_runs:update"], complete: ["checklist_runs:complete"], acknowledge: ["checklist_runs:acknowledge"] }, FULL: fam("checklist_runs", ["read", "create", "update", "complete", "acknowledge", "reopen"]), FULLREAD: ["checklist_runs:read"] },
  "Work orders / service orders": { family: fam("work_orders", [...WO, "delete", "mileage_correct"]), act: { read: ["work_orders:read"], create: ["work_orders:create"], update: ["work_orders:update"], status: ["work_orders:status"] }, FULL: fam("work_orders", WO), FULLREAD: ["work_orders:read"] },
  "Workflow / approvals": { family: ["work_orders:approve"], act: { approve: ["work_orders:approve"] }, FULL: ["work_orders:approve"], FULLREAD: [] },
  "Inventory movements": { family: [...fam("inventory_items", RCU), ...fam("stock_movements", ["read", "create"]), ...fam("cycle_counts", ["read", "create"])], act: { read: ["inventory_items:read", "stock_movements:read"], use: ["stock_movements:create"], consume: ["stock_movements:create"] }, FULL: [...fam("inventory_items", RCU), ...fam("stock_movements", ["read", "create"]), ...fam("cycle_counts", ["read", "create"])], FULLREAD: ["inventory_items:read", "stock_movements:read", "cycle_counts:read"] },
  "Purchasing": { family: fam("purchase_orders", ["read", "create"]), act: { read: ["purchase_orders:read"], create: ["purchase_orders:create"], approve: [] }, FULL: fam("purchase_orders", ["read", "create"]), FULLREAD: ["purchase_orders:read"] },
  "Finance": { family: [...FIN.flatMap(f => fam(f, RCU)), ...fam("financial_period", ["read", "close", "reopen"])], act: { read: [...FIN.map(f => `${f}:read`), "financial_period:read"] }, FULL: [...FIN.flatMap(f => fam(f, RCU)), "financial_period:read", "financial_period:close"], FULLADMIN: [...FIN.flatMap(f => fam(f, RCU)), ...fam("financial_period", ["read", "close", "reopen"])], FULLREAD: [...FIN.map(f => `${f}:read`), "financial_period:read"] },
  "Billing": { skip: "familia ORFA (billing:read, invoices:read, payments:read - nenhuma rota compara; medido) - item 13 trata no registro de navegacao", family: ["billing:read", "invoices:read", "payments:read"], act: {}, FULL: [], FULLREAD: [] },
  "Cloud usage metering": { platform: true, family: ["platform:cloud-usage:read"], act: {}, FULL: [], FULLREAD: [] },
  "Cloud cost import": { platform: true, family: ["platform:cloud-costs:read", "platform:cloud-costs:import"], act: {}, FULL: [], FULLREAD: [] },
  "Cloud cost allocation": { platform: true, family: ["platform:cloud-cost-allocation:read", "platform:cloud-cost-allocation:run"], act: {}, FULL: [], FULLREAD: [] },
  "Cloud charge markup rules": { platform: true, family: ["platform:cloud-charge-rules:read", "platform:cloud-charge-rules:write", "platform:cloud-charges:read", "platform:cloud-charges:calculate"], act: {}, FULL: [], FULLREAD: [] },
  "Reports and analytics": { skip: "familia ORFA (reports:read: nenhuma rota compara; medido) - relatorios sem backend", family: ["reports:read"], act: {}, FULL: [], FULLREAD: [] },
  "Audit logs": { family: ["audit:read", "audit.read"], act: { read: ["audit:read"] }, FULL: ["audit:read"], FULLREAD: ["audit:read"] },
  "Cross-tenant support operations": { platform: true, family: [], act: {}, FULL: [], FULLREAD: [] },
};

// ---------- 4) avaliação célula a célula ----------
type Finding = { line: number; row: string; role: R; cell: string; kind: "A-falta-incondicional" | "B-qualificada-concedida-sem-escopo" | "C-none-mas-concedida" | "conflito" | "skip" | "platform"; perms: string[] };
const findings: Finding[] = [];
for (const row of rows) {
  const spec = ROWS[row.label];
  if (!spec) throw new Error(`CE-G1: linha da matriz sem mapeamento: l.${row.line} "${row.label}"`);
  for (const role of CANON) {
    const cell = row.cells[role];
    const v = VOCAB[cell];
    if (!v) throw new Error(`CE-G1: valor de celula fora do dicionario: l.${row.line} ${role} = "${cell}"`);
    if (spec.skip) { findings.push({ line: row.line, row: row.label, role, cell, kind: "skip", perms: [] }); continue; }
    if (spec.platform) {
      const has = spec.family.filter(p => cat[role].has(p));
      if (role !== "platform_admin" && has.length) findings.push({ line: row.line, row: row.label, role, cell, kind: "C-none-mas-concedida", perms: has });
      else findings.push({ line: row.line, row: row.label, role, cell, kind: "platform", perms: [] });
      continue;
    }
    if (role === "platform_admin") continue; // catalogo integral por construcao (catalog.ts:729)
    if (v.none) {
      const has = spec.family.filter(p => cat[role].has(p));
      if (has.length) findings.push({ line: row.line, row: row.label, role, cell, kind: "C-none-mas-concedida", perms: has });
      continue;
    }
    const must = new Set<string>();
    for (const a of v.u) {
      if (a === "FULL") spec.FULL.forEach(p => must.add(p));
      else if (a === "FULLREAD") spec.FULLREAD.forEach(p => must.add(p));
      else if (a === "FULLADMIN") (spec.FULLADMIN ?? spec.FULL).forEach(p => must.add(p));
      else (spec.act[a] ?? []).forEach(p => must.add(p));
    }
    const missing = [...must].filter(p => !cat[role].has(p));
    if (missing.length) findings.push({ line: row.line, row: row.label, role, cell, kind: spec.conflict ? "conflito" : "A-falta-incondicional", perms: missing });
    const qual = new Set<string>();
    for (const a of v.q) (spec.act[a] ?? []).forEach(p => qual.add(p));
    if (v.q.includes("scoped") || v.q.includes("support")) spec.FULLREAD.forEach(p => qual.add(p));
    const qualGranted = [...qual].filter(p => cat[role].has(p));
    if (qualGranted.length) findings.push({ line: row.line, row: row.label, role, cell, kind: "B-qualificada-concedida-sem-escopo", perms: qualGranted });
  }
}

// ---------- 5) banco ----------
async function grantsFromDb(db: string): Promise<Record<string, Set<string>>> {
  const c = new Client({ connectionString: `postgresql://postgres:postgres@localhost:5498/${db}` });
  await c.connect();
  const r = await c.query(`SELECT r.key AS role, p.key AS permission FROM role_permissions rp JOIN roles r ON r.id = rp.role_id AND r.tenant_id IS NULL JOIN permissions p ON p.id = rp.permission_id`);
  const roles = await c.query(`SELECT key FROM roles WHERE tenant_id IS NULL`);
  await c.end();
  const out: Record<string, Set<string>> = {};
  for (const row of roles.rows) out[row.key] = new Set();
  for (const row of r.rows) out[row.role].add(row.permission);
  return out;
}
const dbProv = await grantsFromDb("prov_seed");
const dbSeed = await grantsFromDb("seed_only");
const dbReport: Record<string, any> = {};
for (const role of CANON) {
  const inProv = dbProv[role]; const inSeed = dbSeed[role];
  dbReport[role] = {
    catalogo: cat[role].size,
    seed_only: inSeed ? inSeed.size : "AUSENTE",
    prov_seed: inProv ? inProv.size : "AUSENTE",
    prov_menos_catalogo: inProv ? [...inProv].filter(p => !cat[role].has(p)) : null,
    catalogo_menos_prov: inProv ? [...cat[role]].filter(p => !inProv.has(p)) : null,
  };
}

// ---------- 6) menu backend (registro) por papel, com permissões do BANCO (prov_seed) e do catálogo ----------
const seedText = readFileSync(`${WT}/prisma/seed.ts`, "utf8");
const DEMO_MODULES = [...seedText.match(/const DEMO_TENANT_MODULES = \[([^\]]*)\]/)![1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const governed: string[] = navsvc.getGovernedNavigationPaths();
const backendMenu: Record<string, { catalogo: string[]; banco: string[] | "AUSENTE"; planned: string[] }> = {};
for (const role of CANON) {
  const ctx = (perms: string[]) => navsvc.getMenuForCurrentUser({ userId: "u", tenantId: role === "platform_admin" ? undefined : "t", roles: [role], permissions: perms, enabledModules: DEMO_MODULES });
  const mc = ctx([...cat[role]]);
  const mb = dbProv[role] ? ctx([...dbProv[role]]) : null;
  backendMenu[role] = { catalogo: mc.map((i: any) => i.path), banco: mb ? mb.map((i: any) => i.path) : "AUSENTE", planned: mc.filter((i: any) => i.status === "planned").map((i: any) => i.path) };
}

// ---------- 7) sidebar do front (texto de appSidebarNav.ts + auth.adapter.ts + App.tsx) ----------
const sbText = readFileSync(`${WT}/frontend/src/layouts/appSidebarNav.ts`, "utf8");
const items: Record<string, { label: string; path: string }> = {};
for (const m of sbText.matchAll(/const (\w+): NavItem = \{ label: "([^"]+)", path: "([^"]+)"/g)) items[m[1]] = { label: m[2], path: m[3] };
const groups: Record<string, { label: string; items: string[] }> = {};
for (const m of sbText.matchAll(/const (G_\w+): NavGroup = \{\s*label: "([^"]+)",\s*items: \[([^\]]*)\]/g)) groups[m[1]] = { label: m[2], items: m[3].split(",").map(s => s.trim()).filter(Boolean) };
const navByRoleBlock = sbText.slice(sbText.indexOf("export const NAV_BY_ROLE"), sbText.indexOf("export const ROLE_SUBTITLE"));
const NAV_BY_ROLE: Record<string, { label: string; items: string[] }[]> = {};
for (const kind of ["admin", "gestor", "dispatcher", "finance", "support"]) {
  const start = navByRoleBlock.indexOf(String.fromCharCode(10) + "  " + kind + ": [") + 1;
  const rest = navByRoleBlock.slice(start);
  const endIdx = rest.slice(1).search(/^\s{2}[a-z]+: \[|^\};/m) + 1;
  const body = rest.slice(rest.indexOf("["), endIdx);
  const list: { label: string; items: string[] }[] = [];
  for (const m of body.matchAll(/G_\w+|\{ label: "([^"]+)", items: \[([^\]]*)\] \}/g)) {
    if (m[0].startsWith("G_")) list.push(groups[m[0]]);
    else list.push({ label: m[1], items: m[2].split(",").map(s => s.trim()).filter(Boolean) });
  }
  NAV_BY_ROLE[kind] = list;
}
const MVP = new Set([...sbText.slice(sbText.indexOf("MVP_NAV_PATHS")).matchAll(/"(\/[^"]+)"/g)].map(m => m[1]));
// réplica de mapBackendRole (auth.adapter.ts:225-238) e roleKindFor (appSidebarNav.ts:271-277)
const LABEL: Record<R, string | null> = { platform_admin: "Super Admin", tenant_admin: "Administrador", manager: "Gestor Operacional", operator: "Operador Logistico", finance: "Financeiro", inventory: null, field_technician: "Operador Logistico", auditor: "Auditor", support: "Supervisor" };
function roleKindFor(roles: string[]): string {
  if (roles.includes("Financeiro")) return "finance";
  if (roles.includes("Supervisor")) return "support";
  if (roles.includes("Operador Logistico") || roles.includes("Operação de Campo")) return "dispatcher";
  if (roles.includes("Administrador") && !roles.includes("Gestor Operacional")) return "admin";
  return "gestor";
}
// guards de rota do App.tsx: Route path → PermissionGuard permissions (primeiro guard após o path)
const appText = readFileSync(`${WT}/frontend/src/App.tsx`, "utf8");
const routeGuard: Record<string, string[]> = {};
for (const m of appText.matchAll(/path="([^"]+)"([\s\S]{0,400}?)<PermissionGuard permissions=\{\[([^\]]*)\]\}/g)) {
  if (m[2].includes("<Route")) continue;
  routeGuard[m[1]] = [...m[3].matchAll(/"([^"]+)"/g)].map(x => x[1]);
}
const sidebar: Record<string, any> = {};
for (const role of CANON) {
  if (role === "platform_admin") continue;
  const labels = LABEL[role] ? [LABEL[role]!] : [];
  const kind = roleKindFor(labels);
  const menu = backendMenu[role].banco === "AUSENTE" ? backendMenu[role].catalogo : (backendMenu[role].banco as string[]);
  const hidden = new Set<string>(backendMenu[role].planned);
  for (const p of governed) if (!menu.includes(p)) hidden.add(p);
  const visible: { group: string; label: string; path: string; guard: string[] | null; ok: boolean }[] = [];
  for (const g of NAV_BY_ROLE[kind]) for (const id of g.items) {
    const it = items[id]; if (!it) throw new Error("item nao resolvido: " + id);
    if (!MVP.has(it.path) || hidden.has(it.path)) continue;
    const guard = routeGuard[it.path] ?? null;
    const perms = dbProv[role] ?? cat[role];
    const ok = guard ? guard.some(p => perms.has(p)) : true;
    visible.push({ group: g.label, label: it.label, path: it.path, guard, ok });
  }
  sidebar[role] = { labels, kind, visiveis: visible.length, negados_pelo_guard: visible.filter(v => !v.ok).map(v => `${v.label} (${v.path}) guard=${v.guard?.join("|")}`), sem_guard: visible.filter(v => v.guard === null).map(v => v.path), itens: visible.map(v => `${v.group}/${v.label}`) };
}

// ---------- 8) permissões órfãs (nenhuma rota compara) ----------
function walk(dir: string, acc: string[] = []): string[] { for (const e of readdirSync(dir)) { const p = join(dir, e); const s = statSync(p); if (s.isDirectory()) walk(p, acc); else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) acc.push(p); } return acc; }
const BS = String.fromCharCode(92);
const srcFiles = walk(`${WT}/src`).filter(f => !f.split(BS).join("/").endsWith("permissions/catalog.ts") && !f.includes("navigation.registry"));
const srcText = srcFiles.map(f => readFileSync(f, "utf8")).join("\n");
const orfas = PERMISSION_CATALOG.filter((p: string) => !srcText.includes(`"${p}"`));

// ---------- saída ----------
const summary = {
  linhas_da_matriz: rows.length, celulas: rows.length * 9,
  findings_por_tipo: Object.fromEntries(["A-falta-incondicional", "B-qualificada-concedida-sem-escopo", "C-none-mas-concedida", "conflito"].map(k => [k, findings.filter(f => f.kind === k).length])),
  findings_por_papel: Object.fromEntries(CANON.map(r => [r, findings.filter(f => f.role === r && f.kind !== "skip" && f.kind !== "platform").length])),
  A: findings.filter(f => f.kind === "A-falta-incondicional").map(f => `l.${f.line} ${f.row} x ${f.role} [${f.cell}] falta: ${f.perms.join(", ")}`),
  conflito: findings.filter(f => f.kind === "conflito").map(f => `l.${f.line} ${f.row} x ${f.role} [${f.cell}] falta: ${f.perms.join(", ")}`),
  B: findings.filter(f => f.kind === "B-qualificada-concedida-sem-escopo").map(f => `l.${f.line} ${f.row} x ${f.role} [${f.cell}] concedida: ${f.perms.join(", ")}`),
  C: findings.filter(f => f.kind === "C-none-mas-concedida").map(f => `l.${f.line} ${f.row} x ${f.role} [${f.cell}] concedida: ${f.perms.join(", ")}`),
  banco: dbReport,
  menu_backend_banco: Object.fromEntries(CANON.map(r => [r, backendMenu[r].banco === "AUSENTE" ? "AUSENTE (papel sem linha global em prov_seed)" : backendMenu[r].banco])),
  menu_backend_catalogo_vs_banco_diff: Object.fromEntries(CANON.map(r => [r, backendMenu[r].banco === "AUSENTE" ? "n/a" : JSON.stringify(backendMenu[r].catalogo) === JSON.stringify(backendMenu[r].banco) ? "igual" : "DIFERENTE"])),
  sidebar_front: sidebar,
  orfas: { n: orfas.length, lista: orfas },
  demo_modules: DEMO_MODULES,
  governed_paths_n: governed.length,
};
console.log(JSON.stringify(summary, null, 1));
if (OUT) writeFileSync(OUT, JSON.stringify({ summary, findings, rows }, null, 1));
