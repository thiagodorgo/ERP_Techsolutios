import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as catalogModule from "../src/modules/core-saas/permissions/catalog.js";

// B-SAN3-04a — T1: GUARD célula da RBAC_MATRIX.md × catálogo (CE-6 / CE-G1). Sem banco; roda em todo job.
//
// Porte literal do gerador do mapa que o planejador usou
// (`agent-orchestration/omega/planos/B-SAN3-04a-apoio/mapa-rbac.mts`, §§1-4): parser da tabela, dicionário
// de valores de célula, mapeamento de cada linha para famílias/permissões e a avaliação célula a célula.
//
// CE-G1 (fonte, default, mutação):
//   (a) FONTE da enumeração = a tabela REAL da `RBAC_MATRIX.md` (lida por parser) × o `catalog.ts` IMPORTADO —
//       nunca uma lista curada de células. Uma linha nova na matriz ou uma permissão nova no catálogo entram
//       sozinhas na avaliação.
//   (b) DEFAULT = negar: valor de célula fora do dicionário → `throw`; linha da matriz sem mapeamento → `throw`;
//       célula B (qualificada "por escopo" e concedida sem o backend aplicar escopo) fora da allowlist → falha;
//       conflito interno da matriz fora dos registrados → falha; ação concedida que a célula de checklist não
//       nomeia, fora dos excedentes registrados → falha. E a allowlist NÃO apodrece: entrada morta também falha.
//   (c) MUTAÇÃO: as cinco mutações do plano (M1–M5) rodam aqui como casos negativos sobre cópias em memória do
//       catálogo/matriz — o guard fica vermelho em cada uma.
//
// Vermelho-controle no head-base (`13e3783c`, antes do bloco): (A) falha com as 7 células A do M2 e (l.44) com os 2
// excedentes do `manager` (`checklist_runs:update`, `checklist_runs:acknowledge`).

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MATRIX_PATH = join(ROOT, "RBAC_MATRIX.md");
const SRC_DIR = join(ROOT, "src");

const { PERMISSION_CATALOG, ROLE_PERMISSIONS } = catalogModule;
// Lida pelo namespace (e não por import nomeado) de propósito: no head-base o export não existe e o import nomeado
// derrubaria o ARQUIVO inteiro — o vermelho-controle precisa mostrar as células, não um SyntaxError.
const DELIBERATE_REVOCATIONS = (
  catalogModule as { DELIBERATE_REVOCATIONS?: readonly { role: string; permission: string; decision: string }[] }
).DELIBERATE_REVOCATIONS;

const CANON = [
  "platform_admin",
  "tenant_admin",
  "manager",
  "operator",
  "finance",
  "inventory",
  "field_technician",
  "auditor",
  "support",
] as const;
type CanonRole = (typeof CANON)[number];
type Catalog = Record<CanonRole, Set<string>>;

function catalogFromRolePermissions(rolePermissions: Record<string, readonly string[]>): Catalog {
  return Object.fromEntries(CANON.map((role) => [role, new Set<string>(rolePermissions[role] ?? [])])) as Catalog;
}

// ---------- 1) matriz (parser da tabela "Baseline matrix") ----------
type Row = { line: number; label: string; cells: Record<CanonRole, string> };

function parseMatrix(text: string): Row[] {
  const lines = text.split(/\r?\n/);
  const rows: Row[] = [];
  let header: string[] | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.startsWith("| ")) {
      if (header && rows.length) break;
      continue;
    }
    const cells = l
      .split("|")
      .slice(1, -1)
      .map((s) => s.trim());
    if (!header) {
      header = cells;
      continue;
    }
    if (cells[0].startsWith("---")) continue;
    const rec = { line: i + 1, label: cells[0], cells: {} as Record<CanonRole, string> };
    header.slice(1).forEach((role, k) => {
      rec.cells[role as CanonRole] = cells[k + 1];
    });
    rows.push(rec);
  }
  if (!header || header.slice(1).join(",") !== CANON.join(",")) {
    throw new Error(`CE-G1: cabecalho da matriz != 9 papeis canonicos: ${String(header)}`);
  }
  return rows;
}

// ---------- 2) vocabulário das células (CE-G1: membro fora do dicionário → ERRO) ----------
// u = ações incondicionais exigidas; q = ações qualificadas (por escopo/política/suporte: o backend NÃO aplica →
// fail-closed, a concessão só passa pela allowlist com evidência ou pendência).
const VOCAB: Record<string, { u: string[]; q: string[]; none?: boolean }> = {
  full: { u: ["FULL"], q: [] },
  none: { u: [], q: [], none: true },
  read: { u: ["read"], q: [] },
  limited: { u: ["read"], q: [] },
  scoped: { u: [], q: ["scoped"] },
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
  "create/read/update/delete/publish": { u: ["create", "read", "update", "publish"], q: [] },
  "read/complete-by-scope": { u: ["read"], q: ["complete"] },
  "create/answer/complete-by-scope": { u: ["read", "create"], q: ["answer", "complete"] },
  "read/answer-by-scope": { u: ["read"], q: ["answer"] },
  "answer-assigned": { u: ["read"], q: ["answer", "complete", "acknowledge"] },
  "material-view": { u: [], q: ["material-view"] },
  "execute/update-assigned": { u: ["read"], q: ["update", "status"] },
  request: { u: [], q: ["request"] },
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
type RowSpec = {
  family: string[];
  act: Record<string, string[]>;
  FULL: string[];
  FULLREAD: string[];
  FULLADMIN?: string[];
  platform?: boolean;
  skip?: string;
  conflict?: string;
};
const fam = (f: string, acts: string[]) => acts.map((a) => `${f}:${a}`);
const crud = (f: string) => ({
  read: [`${f}:read`],
  create: [`${f}:create`],
  update: [`${f}:update`],
  edit: [`${f}:create`, `${f}:update`],
});
const merge = (...specs: Record<string, string[]>[]) =>
  specs.reduce(
    (acc, s) => {
      for (const [k, v] of Object.entries(s)) acc[k] = [...(acc[k] ?? []), ...v];
      return acc;
    },
    {} as Record<string, string[]>,
  );
const MD = ["branches", "suppliers", "tags", "pois", "operator_profiles"];
const FIN = ["financial_accounts", "financial_titles", "financial_entries", "cheques", "professional_statements"];
const WO = ["read", "create", "update", "assign", "status", "cancel", "comment"];
const RCU = ["read", "create", "update"];
const simple = (f: string): RowSpec => ({ family: fam(f, RCU), act: crud(f), FULL: fam(f, RCU), FULLREAD: [`${f}:read`] });
const PLATFORM_FAMILY = PERMISSION_CATALOG.filter((p: string) => p.startsWith("platform:"));
const ROWS: Record<string, RowSpec> = {
  "Platform configuration": { platform: true, family: PLATFORM_FAMILY, act: {}, FULL: [], FULLREAD: [] },
  "Tenant administration": {
    family: ["tenant.manage", "tenant_settings:read", "tenant_settings:update"],
    act: { read: ["tenant_settings:read"] },
    FULL: ["tenant.manage", "tenant_settings:read", "tenant_settings:update"],
    FULLREAD: ["tenant_settings:read"],
  },
  "User and role assignment": {
    family: ["users.manage", "users.read", "users:read", "roles.manage"],
    act: { read: ["users.read"] },
    FULL: ["users.manage", "users.read", "roles.manage"],
    FULLREAD: ["users.read"],
  },
  "Dashboard and operational overview": {
    family: ["dashboard:read"],
    act: { read: ["dashboard:read"] },
    FULL: ["dashboard:read"],
    FULLREAD: ["dashboard:read"],
  },
  "Backend navigation menu": {
    skip: "sem permissao propria (GET /navigation/menu so exige autenticacao) - avaliada pela secao do menu",
    family: [],
    act: {},
    FULL: [],
    FULLREAD: [],
  },
  "Field operator location": {
    family: fam("field_location", ["read", "send", "history"]),
    act: { read: ["field_location:read"], send: ["field_location:send"], history: ["field_location:history"] },
    FULL: fam("field_location", ["read", "send", "history"]),
    FULLREAD: ["field_location:read", "field_location:history"],
  },
  "Master data": {
    conflict:
      "l.37 (tabela) x bullets l.131,141,142,143,144 (mirror of service_catalog -> l.41: finance, inventory e support = none)",
    family: MD.flatMap((f) => fam(f, RCU)),
    act: merge(...MD.map(crud)),
    FULL: MD.flatMap((f) => fam(f, RCU)),
    FULLREAD: MD.map((f) => `${f}:read`),
  },
  "Customer registry (Cadastros - Clientes)": simple("customers"),
  "Vehicle registry (Cadastros - Viaturas)": simple("vehicles"),
  "Team registry (Cadastros - Equipes)": simple("teams"),
  "Service catalog (Cadastros - Serviços)": {
    // A família `tariffs:*` entra nesta linha pelo bullet l.105 da própria matriz ("mirror of `service_catalog:*` —
    // same role distribution"). É esse espelho que produz o 3º conflito registrado abaixo (l.41 × finance).
    conflict: "l.41 (tabela, finance = read por D-SAN3-PLANO-OPCAO-B P2) x bullet l.105 (tariffs:* espelha service_catalog:*)",
    family: [...fam("service_catalog", RCU), ...fam("tariffs", RCU)],
    act: merge(crud("service_catalog"), crud("tariffs")),
    FULL: [...fam("service_catalog", RCU), ...fam("tariffs", RCU)],
    FULLREAD: ["service_catalog:read", "tariffs:read"],
  },
  "Price tables (Configurações - Tabela de Valores)": simple("price_tables"),
  "Configurable checklist templates": {
    family: fam("tenant_checklists", ["read", "create", "update", "publish"]),
    act: {
      read: ["tenant_checklists:read"],
      create: ["tenant_checklists:create"],
      update: ["tenant_checklists:update"],
      publish: ["tenant_checklists:publish"],
    },
    FULL: fam("tenant_checklists", ["read", "create", "update", "publish"]),
    FULLREAD: ["tenant_checklists:read"],
  },
  "Checklist executions and answers": {
    family: fam("checklist_runs", ["read", "create", "update", "complete", "acknowledge", "reopen"]),
    act: {
      read: ["checklist_runs:read"],
      create: ["checklist_runs:create"],
      answer: ["checklist_runs:update"],
      complete: ["checklist_runs:complete"],
      acknowledge: ["checklist_runs:acknowledge"],
    },
    FULL: fam("checklist_runs", ["read", "create", "update", "complete", "acknowledge", "reopen"]),
    FULLREAD: ["checklist_runs:read"],
  },
  "Work orders / service orders": {
    family: fam("work_orders", [...WO, "delete", "mileage_correct"]),
    act: {
      read: ["work_orders:read"],
      create: ["work_orders:create"],
      update: ["work_orders:update"],
      status: ["work_orders:status"],
    },
    FULL: fam("work_orders", WO),
    FULLREAD: ["work_orders:read"],
  },
  "Workflow / approvals": {
    family: ["work_orders:approve"],
    act: { approve: ["work_orders:approve"] },
    FULL: ["work_orders:approve"],
    FULLREAD: [],
  },
  "Inventory movements": {
    family: [
      ...fam("inventory_items", RCU),
      ...fam("stock_movements", ["read", "create"]),
      ...fam("cycle_counts", ["read", "create"]),
    ],
    act: {
      read: ["inventory_items:read", "stock_movements:read"],
      use: ["stock_movements:create"],
      consume: ["stock_movements:create"],
    },
    FULL: [
      ...fam("inventory_items", RCU),
      ...fam("stock_movements", ["read", "create"]),
      ...fam("cycle_counts", ["read", "create"]),
    ],
    FULLREAD: ["inventory_items:read", "stock_movements:read", "cycle_counts:read"],
  },
  Purchasing: {
    family: fam("purchase_orders", ["read", "create"]),
    act: { read: ["purchase_orders:read"], create: ["purchase_orders:create"], approve: [] },
    FULL: fam("purchase_orders", ["read", "create"]),
    FULLREAD: ["purchase_orders:read"],
  },
  Finance: {
    family: [...FIN.flatMap((f) => fam(f, RCU)), ...fam("financial_period", ["read", "close", "reopen"])],
    act: { read: [...FIN.map((f) => `${f}:read`), "financial_period:read"] },
    FULL: [...FIN.flatMap((f) => fam(f, RCU)), "financial_period:read", "financial_period:close"],
    FULLADMIN: [...FIN.flatMap((f) => fam(f, RCU)), ...fam("financial_period", ["read", "close", "reopen"])],
    FULLREAD: [...FIN.map((f) => `${f}:read`), "financial_period:read"],
  },
  Billing: {
    skip: "familia ORFA (billing:read, invoices:read, payments:read - nenhuma rota compara; medido) - item 13 trata no registro de navegacao",
    family: ["billing:read", "invoices:read", "payments:read"],
    act: {},
    FULL: [],
    FULLREAD: [],
  },
  "Cloud usage metering": { platform: true, family: ["platform:cloud-usage:read"], act: {}, FULL: [], FULLREAD: [] },
  "Cloud cost import": {
    platform: true,
    family: ["platform:cloud-costs:read", "platform:cloud-costs:import"],
    act: {},
    FULL: [],
    FULLREAD: [],
  },
  "Cloud cost allocation": {
    platform: true,
    family: ["platform:cloud-cost-allocation:read", "platform:cloud-cost-allocation:run"],
    act: {},
    FULL: [],
    FULLREAD: [],
  },
  "Cloud charge markup rules": {
    platform: true,
    family: [
      "platform:cloud-charge-rules:read",
      "platform:cloud-charge-rules:write",
      "platform:cloud-charges:read",
      "platform:cloud-charges:calculate",
    ],
    act: {},
    FULL: [],
    FULLREAD: [],
  },
  "Reports and analytics": {
    skip: "familia ORFA (reports:read: nenhuma rota compara; medido) - relatorios sem backend",
    family: ["reports:read"],
    act: {},
    FULL: [],
    FULLREAD: [],
  },
  "Audit logs": { family: ["audit:read", "audit.read"], act: { read: ["audit:read"] }, FULL: ["audit:read"], FULLREAD: ["audit:read"] },
  "Cross-tenant support operations": { platform: true, family: [], act: {}, FULL: [], FULLREAD: [] },
};

// ---------- 4) avaliação célula a célula ----------
type Kind = "A" | "B" | "C" | "conflito";
type Finding = { line: number; row: string; role: CanonRole; cell: string; kind: Kind; perms: string[] };
type Excedente = { line: number; role: CanonRole; cell: string; perms: string[] };
type Evaluation = { findings: Finding[]; excedentesChecklist: Excedente[] };

const CHECKLIST_ROWS = new Set(["Configurable checklist templates", "Checklist executions and answers"]);

function evaluate(rows: readonly Row[], cat: Catalog): Evaluation {
  const findings: Finding[] = [];
  const excedentesChecklist: Excedente[] = [];
  for (const row of rows) {
    const spec = ROWS[row.label];
    if (!spec) throw new Error(`CE-G1: linha da matriz sem mapeamento: l.${row.line} "${row.label}"`);
    for (const role of CANON) {
      const cell = row.cells[role];
      const v = VOCAB[cell];
      if (!v) throw new Error(`CE-G1: valor de celula fora do dicionario: l.${row.line} ${role} = "${cell}"`);
      if (spec.skip) continue;
      if (spec.platform) {
        const has = spec.family.filter((p) => cat[role].has(p));
        if (role !== "platform_admin" && has.length) {
          findings.push({ line: row.line, row: row.label, role, cell, kind: "C", perms: has });
        }
        continue;
      }
      if (role === "platform_admin") continue; // catálogo integral por construção (catalog.ts, `platform_admin: PERMISSION_CATALOG`)
      if (v.none) {
        const has = spec.family.filter((p) => cat[role].has(p));
        if (has.length) findings.push({ line: row.line, row: row.label, role, cell, kind: "C", perms: has });
        continue;
      }
      const must = new Set<string>();
      for (const a of v.u) {
        if (a === "FULL") spec.FULL.forEach((p) => must.add(p));
        else if (a === "FULLREAD") spec.FULLREAD.forEach((p) => must.add(p));
        else if (a === "FULLADMIN") (spec.FULLADMIN ?? spec.FULL).forEach((p) => must.add(p));
        else (spec.act[a] ?? []).forEach((p) => must.add(p));
      }
      const missing = [...must].filter((p) => !cat[role].has(p));
      if (missing.length) {
        findings.push({ line: row.line, row: row.label, role, cell, kind: spec.conflict ? "conflito" : "A", perms: missing });
      }
      const qual = new Set<string>();
      for (const a of v.q) (spec.act[a] ?? []).forEach((p) => qual.add(p));
      if (v.q.includes("scoped") || v.q.includes("support")) spec.FULLREAD.forEach((p) => qual.add(p));
      const qualGranted = [...qual].filter((p) => cat[role].has(p));
      if (qualGranted.length) findings.push({ line: row.line, row: row.label, role, cell, kind: "B", perms: qualGranted });

      // T-CHK — item 15: em linha de checklist, ação CONCEDIDA que a célula NÃO nomeia (nem incondicional nem
      // qualificada) é EXCEDENTE. É a regra que pega `manager` × `checklist_runs:update`/`acknowledge` (o
      // dicionário não os vê: a célula "read/complete-by-scope" nem os menciona). Célula "full*" não entra.
      if (CHECKLIST_ROWS.has(row.label) && !v.u.some((a) => a.startsWith("FULL"))) {
        const nomeadas = new Set<string>([...must, ...qual]);
        const extras = spec.family.filter((p) => cat[role].has(p) && !nomeadas.has(p));
        if (extras.length) excedentesChecklist.push({ line: row.line, role, cell, perms: extras });
      }
    }
  }
  return { findings, excedentesChecklist };
}

const key = (line: number, role: string) => `l.${line} × ${role}`;
const describe = (f: Finding | Excedente) => `${key(f.line, f.role)} [${f.cell}]: ${f.perms.join(", ")}`;

// ---------- allowlists (cada entrada com evidência OU pendência — default: falha) ----------
type Justificativa = { readonly evidencia: string } | { readonly pendencia: string };
type AllowEntry = { readonly line: number; readonly role: CanonRole; readonly perms: readonly string[] } & Justificativa;

// B — 13 células qualificadas ("por escopo/atribuição/suporte") concedidas sem o backend aplicar escopo. Cada uma
// vive aqui SÓ com uma pendência nomeada com dono ou com evidência de que o escopo É aplicado (plano §3, B1–B13).
const ALLOWLIST_QUALIFICADAS: readonly AllowEntry[] = [
  { line: 33, role: "support", perms: ["users.read"], pendencia: "P-SAN3-04A-SUPPORT-SEM-POLITICA" },
  { line: 34, role: "field_technician", perms: ["dashboard:read"], pendencia: "P-SAN3-04A-DASHBOARD-SCOPED" },
  { line: 34, role: "support", perms: ["dashboard:read"], pendencia: "P-SAN3-04A-SUPPORT-SEM-POLITICA" },
  { line: 43, role: "support", perms: ["tenant_checklists:read"], pendencia: "P-SAN3-04A-SUPPORT-SEM-POLITICA" },
  { line: 44, role: "manager", perms: ["checklist_runs:complete"], pendencia: "P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO" },
  {
    line: 44,
    role: "operator",
    perms: ["checklist_runs:update", "checklist_runs:complete"],
    pendencia: "P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO",
  },
  {
    line: 44,
    role: "field_technician",
    perms: ["checklist_runs:update", "checklist_runs:complete", "checklist_runs:acknowledge"],
    pendencia: "P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO (item 51, B-O6R-07c)",
  },
  { line: 44, role: "support", perms: ["checklist_runs:read"], pendencia: "P-SAN3-04A-SUPPORT-SEM-POLITICA" },
  {
    line: 45,
    role: "field_technician",
    perms: ["work_orders:update", "work_orders:status"],
    evidencia: "B-O6R-07a — escopo por atribuição APLICADO: 403 `not_assigned_to_actor` nas mutações da OS",
  },
  {
    line: 47,
    role: "operator",
    perms: ["stock_movements:create"],
    evidencia: "docs/navigation-matrix.md F7 — operator E(mov); F7a (Estoque core): movimenta, não gerencia itens",
  },
  { line: 48, role: "support", perms: ["purchase_orders:read"], pendencia: "P-SAN3-04A-SUPPORT-SEM-POLITICA" },
  { line: 56, role: "manager", perms: ["audit:read"], pendencia: "P-SAN3-04A-AUDIT-SCOPED" },
  { line: 56, role: "support", perms: ["audit:read"], pendencia: "P-SAN3-04A-SUPPORT-SEM-POLITICA" },
];

// Conflitos INTERNOS da matriz (§A2 — registrados, NÃO resolvidos em silêncio; fail-closed: nada concedido).
//   K1/K2 — l.37 Master data (tabela: finance read; inventory read/edit-scoped) × bullets l.131/141-144 ("mirror of
//   service_catalog:*", que na l.41 dava `none` a esses papéis) → `P-SAN3-04A-MATRIZ-L37-X-BULLETS` (decisão do dono).
//   K3 — l.41 Service catalog × finance: a P2 do dono (`D-SAN3-PLANO-OPCAO-B`) concede `service_catalog:read` e a tabela
//   passa a dizer `read`; o bullet l.105 espelha `tariffs:*` em `service_catalog:*` ("same role distribution"), o que
//   pediria `tariffs:read` — que a decisão NÃO nomeia e este bloco NÃO concede → `P-SAN3-04A-TARIFAS-X-L41-FINANCE`.
const CONFLITOS_REGISTRADOS: readonly AllowEntry[] = [
  {
    line: 37,
    role: "finance",
    perms: ["branches:read", "suppliers:read", "tags:read", "pois:read", "operator_profiles:read"],
    pendencia: "P-SAN3-04A-MATRIZ-L37-X-BULLETS",
  },
  {
    line: 37,
    role: "inventory",
    perms: ["branches:read", "suppliers:read", "tags:read", "pois:read", "operator_profiles:read"],
    pendencia: "P-SAN3-04A-MATRIZ-L37-X-BULLETS (leitura) + P-SAN3-04A-MASTER-DATA-EDIT-SCOPED (escrita por escopo)",
  },
  { line: 41, role: "finance", perms: ["tariffs:read"], pendencia: "P-SAN3-04A-TARIFAS-X-L41-FINANCE" },
];

// Excedentes de checklist REGISTRADOS (ação que a célula não nomeia, mantida por decisão nomeada).
const EXCEDENTES_REGISTRADOS: readonly AllowEntry[] = [
  {
    line: 44,
    role: "manager",
    perms: ["checklist_runs:reopen"],
    evidencia: "D-CHK-P1-REOPEN-RBAC (CHECKLIST P1 PR-03) — só o gestor reabre a vistoria concluída (nova versão auditada)",
  },
];

function assertJustificada(entries: readonly AllowEntry[], nome: string): void {
  for (const e of entries) {
    const j = e as Partial<{ evidencia: string; pendencia: string }>;
    assert.ok(
      (j.evidencia && j.evidencia.length > 0) || (j.pendencia && j.pendencia.length > 0),
      `${nome}: entrada ${key(e.line, e.role)} sem evidência nem pendência — entrada sem justificativa é concessão às cegas`,
    );
  }
}

function diffSets(actual: readonly (Finding | Excedente)[], allow: readonly AllowEntry[]) {
  const toMap = (items: readonly { line: number; role: string; perms: readonly string[] }[]) =>
    new Map(items.map((i) => [key(i.line, i.role), [...i.perms].sort().join(",")]));
  const a = toMap(actual);
  const b = toMap(allow);
  const foraDaAllowlist = [...a].filter(([k, v]) => b.get(k) !== v).map(([k, v]) => `${k}: ${v}`);
  const mortas = [...b].filter(([k, v]) => a.get(k) !== v).map(([k, v]) => `${k}: ${v}`);
  return { foraDaAllowlist, mortas };
}

// ---------- fontes REAIS (CE-G1a) ----------
const MATRIX_TEXT = readFileSync(MATRIX_PATH, "utf8");
const ROWS_REAL = parseMatrix(MATRIX_TEXT);
const CAT_REAL = catalogFromRolePermissions(ROLE_PERMISSIONS as Record<string, readonly string[]>);
const REAL = evaluate(ROWS_REAL, CAT_REAL);
const byKind = (kind: Kind) => REAL.findings.filter((f) => f.kind === kind);

test("[CE-G1a] a fonte é a tabela real: 27 linhas × 9 papéis canônicos = 243 células, todas no dicionário e todas mapeadas", () => {
  assert.equal(ROWS_REAL.length, 27);
  assert.equal(ROWS_REAL.length * CANON.length, 243);
  for (const row of ROWS_REAL) {
    assert.ok(ROWS[row.label], `linha sem mapeamento: l.${row.line} "${row.label}"`);
    for (const role of CANON) assert.ok(VOCAB[row.cells[role]], `valor fora do dicionário: l.${row.line} ${role} = "${row.cells[role]}"`);
  }
});

test("[A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)", () => {
  assert.deepEqual(byKind("A").map(describe), [], "célula(s) A — a matriz concede e o catálogo não tem");
});

test("[C] nenhuma célula `none` da matriz tem permissão concedida no catálogo", () => {
  assert.deepEqual(byKind("C").map(describe), [], "célula(s) C — a matriz nega e o catálogo concede");
});

test("[B] toda qualificada concedida sem escopo está na allowlist (com evidência ou pendência) — e a allowlist não apodrece", () => {
  assertJustificada(ALLOWLIST_QUALIFICADAS, "ALLOWLIST_QUALIFICADAS");
  const { foraDaAllowlist, mortas } = diffSets(byKind("B"), ALLOWLIST_QUALIFICADAS);
  assert.deepEqual(foraDaAllowlist, [], "célula B fora da allowlist — 'por escopo' concedido sem escopo e sem pendência");
  assert.deepEqual(mortas, [], "entrada morta na allowlist — a célula já não é B; remova a entrada (e feche a pendência)");
  assert.equal(byKind("B").length, 13);
});

test("[§A2] os conflitos internos da matriz são exatamente os registrados (l.37 × finance/inventory; l.41 × finance) e nada foi concedido", () => {
  assertJustificada(CONFLITOS_REGISTRADOS, "CONFLITOS_REGISTRADOS");
  const { foraDaAllowlist, mortas } = diffSets(byKind("conflito"), CONFLITOS_REGISTRADOS);
  assert.deepEqual(foraDaAllowlist, [], "conflito interno da matriz sem registro");
  assert.deepEqual(mortas, [], "conflito registrado que já não existe — o registro precisa acompanhar a matriz");
  // fail-closed: nenhuma das permissões em conflito foi concedida ao papel
  for (const c of CONFLITOS_REGISTRADOS) for (const p of c.perms) assert.equal(CAT_REAL[c.role].has(p), false, `${key(c.line, c.role)} concedeu ${p} sem decisão`);
});

test("[item 15 · l.43] modelos de checklist: finance, inventory, field_technician, manager, auditor e support leem; operator não", () => {
  for (const role of ["finance", "inventory", "field_technician", "manager", "auditor", "support"] as const) {
    assert.equal(CAT_REAL[role].has("tenant_checklists:read"), true, `${role} sem tenant_checklists:read (l.43 = read)`);
  }
  assert.equal(CAT_REAL.operator.has("tenant_checklists:read"), false, "operator: l.43 = none");
  for (const role of ["finance", "inventory", "field_technician", "auditor", "support"] as const) {
    for (const p of ["tenant_checklists:create", "tenant_checklists:update", "tenant_checklists:publish"]) {
      assert.equal(CAT_REAL[role].has(p), false, `${role} com ${p} — l.43 só dá leitura`);
    }
  }
});

test("[item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os registrados", () => {
  const runs = (role: CanonRole) => [...CAT_REAL[role]].filter((p) => p.startsWith("checklist_runs:")).sort();
  assert.deepEqual(runs("manager"), ["checklist_runs:complete", "checklist_runs:read", "checklist_runs:reopen"]);
  for (const role of ["finance", "inventory"] as const) {
    const chk = [...CAT_REAL[role]].filter((p) => p.startsWith("checklist_runs:") || p.startsWith("tenant_checklists:")).sort();
    assert.deepEqual(chk, ["checklist_runs:read", "tenant_checklists:read"], `${role}: l.43/l.44 dão só leitura incondicional`);
  }
  assert.equal(CAT_REAL.field_technician.has("tenant_checklists:read"), true);
  assert.equal(CAT_REAL.field_technician.has("checklist_runs:create"), false, "answer-assigned não cria run (D-CHK-DISPATCH-CREATE)");
  assertJustificada(EXCEDENTES_REGISTRADOS, "EXCEDENTES_REGISTRADOS");
  const { foraDaAllowlist, mortas } = diffSets(REAL.excedentesChecklist, EXCEDENTES_REGISTRADOS);
  assert.deepEqual(foraDaAllowlist, [], "ação de checklist concedida que a célula da matriz não nomeia (item 15)");
  assert.deepEqual(mortas, [], "excedente registrado que já não existe");
});

test("[§4.4] DELIBERATE_REVOCATIONS: lista nomeada, cada item ausente do papel e presente no catálogo, com a decisão", () => {
  assert.ok(DELIBERATE_REVOCATIONS, "catalog.ts não exporta DELIBERATE_REVOCATIONS (a lista que o provisionamento aplica)");
  const lista = DELIBERATE_REVOCATIONS ?? [];
  assert.deepEqual(
    lista.map((r) => `${r.role} → ${r.permission}`).sort(),
    ["manager → checklist_runs:acknowledge", "manager → checklist_runs:update"],
  );
  const catalogo = new Set<string>(PERMISSION_CATALOG);
  for (const r of lista) {
    assert.equal(catalogo.has(r.permission), true, `${r.permission} não existe no catálogo — revogação órfã`);
    assert.equal(CAT_REAL[r.role as CanonRole].has(r.permission), false, `${r.role} ainda tem ${r.permission} no catálogo`);
    assert.match(r.decision, /B-SAN3-04a/, "cada revogação carrega a decisão que a nomeia");
  }
});

// ---------- órfãs (nenhuma rota compara) — P-SAN3-04A-PERMISSOES-ORFAS (dono: B-SAN3-04b) ----------
const ORFAS_ESPERADAS = [
  "users:read",
  "audit:read",
  "purchase_orders:read",
  "purchase_orders:create",
  "field_operator:read",
  "field_operator:action",
  "logistics:read",
  "logistics_routes:read",
  "billing:read",
  "invoices:read",
  "payments:read",
  "reports:read",
  "expense_report:approve_manager",
  "expense_report:approve_finance",
  "expense_report:return",
  "expense_report:reject",
  "expense_report:pay",
  "expense_policy:manage",
  "expense_receipt:attach",
  "expense_audit:read",
  "os.manage",
  "os.read",
  "finance.manage",
  "finance.read",
  "finance:read",
].sort();

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walkTs(p, acc);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) acc.push(p);
  }
  return acc;
}

test("[órfãs] as 25 chaves que nenhuma rota compara são exatamente as nomeadas — órfã nova ou órfã que ganhou rota move o número COM nome", () => {
  const files = walkTs(SRC_DIR)
    .map((f) => f.split("\\").join("/"))
    .filter((f) => !f.endsWith("permissions/catalog.ts") && !f.includes("navigation.registry"));
  const srcText = files.map((f) => readFileSync(f, "utf8")).join("\n");
  const orfas = PERMISSION_CATALOG.filter((p: string) => !srcText.includes(`"${p}"`)).sort();
  assert.deepEqual(orfas, ORFAS_ESPERADAS);
});

// ---------- (CE-G1c) mutações executadas sobre cópias em memória — cada uma deixa o guard VERMELHO ----------
function mutateRolePermissions(mutate: (copy: Record<string, string[]>) => void): Catalog {
  const copy: Record<string, string[]> = Object.fromEntries(
    Object.entries(ROLE_PERMISSIONS as Record<string, readonly string[]>).map(([k, v]) => [k, [...v]]),
  );
  mutate(copy);
  return catalogFromRolePermissions(copy);
}

test("[M1] tirar customers:read do finance → célula A em l.38 (P2 volta a faltar)", () => {
  const cat = mutateRolePermissions((c) => {
    c.finance = c.finance.filter((p) => p !== "customers:read");
  });
  const A = evaluate(ROWS_REAL, cat).findings.filter((f) => f.kind === "A").map(describe);
  assert.ok(A.some((d) => d.startsWith("l.38 × finance") && d.includes("customers:read")), `esperava A em l.38 × finance; A = ${JSON.stringify(A)}`);
});

test("[M2] devolver checklist_runs:acknowledge ao manager → excedente em l.44 (item 15)", () => {
  const cat = mutateRolePermissions((c) => {
    c.manager.push("checklist_runs:acknowledge");
  });
  const { foraDaAllowlist } = diffSets(evaluate(ROWS_REAL, cat).excedentesChecklist, EXCEDENTES_REGISTRADOS);
  assert.ok(foraDaAllowlist.some((d) => d.startsWith("l.44 × manager") && d.includes("checklist_runs:acknowledge")), JSON.stringify(foraDaAllowlist));
});

test("[M3] trocar uma célula da matriz por `foo` → o parser/avaliador lança (default negar)", () => {
  const mutated = MATRIX_TEXT.replace("| Customer registry (Cadastros - Clientes) | full | full | create/edit | read | read |", "| Customer registry (Cadastros - Clientes) | full | full | create/edit | read | foo |");
  assert.notEqual(mutated, MATRIX_TEXT, "a célula alvo (l.38 finance) não foi encontrada para mutar");
  assert.throws(() => evaluate(parseMatrix(mutated), CAT_REAL), /fora do dicionario: l\.38 finance = "foo"/);
});

test("[M4] acrescentar uma linha nova à tabela → lança `linha da matriz sem mapeamento`", () => {
  const anchor = "| Cross-tenant support operations |";
  const idx = MATRIX_TEXT.indexOf(anchor);
  assert.ok(idx > 0);
  const eol = MATRIX_TEXT.indexOf("\n", idx);
  const nova = "| Linha nova sem mapeamento | full | full | read | none | none | none | none | read | none |";
  const mutated = `${MATRIX_TEXT.slice(0, eol + 1)}${nova}${MATRIX_TEXT.slice(eol)}`;
  assert.throws(() => evaluate(parseMatrix(mutated), CAT_REAL), /sem mapeamento: l\.\d+ "Linha nova sem mapeamento"/);
});

test("[M5] dar checklist_runs:update ao inventory → célula B em l.44 fora da allowlist", () => {
  const cat = mutateRolePermissions((c) => {
    c.inventory.push("checklist_runs:update");
  });
  const B = evaluate(ROWS_REAL, cat).findings.filter((f) => f.kind === "B");
  const { foraDaAllowlist } = diffSets(B, ALLOWLIST_QUALIFICADAS);
  assert.ok(foraDaAllowlist.some((d) => d.startsWith("l.44 × inventory") && d.includes("checklist_runs:update")), JSON.stringify(foraDaAllowlist));
});
