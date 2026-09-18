import assert from "node:assert/strict";
import test from "node:test";

import { resolveFrontendRoles } from "../src/modules/auth/auth.adapter";
import { buildSidebarNav, NAV_BY_ROLE, roleKindFor, ROLE_SUBTITLE } from "../src/layouts/appSidebarNav";

// B-SAN3-04a — T5 (item 38 + P1/P2 no menu): o papel `inventory` ganha rótulo "Estoque" na união `UserRole`, RoleKind
// próprio e menu próprio; o Financeiro passa a ver OS, Clientes, Serviços e Checklists e deixa de ver Auditoria.
// Entra na lista `test:smoke` de `frontend/package.json` (teste fora da lista nunca roda — precedente #357/#344).
//
// Vermelho-controle no head-base (`13e3783c`): `resolveFrontendRoles(["inventory"])` = `[]` (mapBackendRole → null),
// `roleKindFor(["Estoque"])` = "gestor", `ROLE_SUBTITLE.inventory` inexistente, finance com Auditoria e sem OS/Clientes/Serviços.

const IA_GROUP_LABELS = ["VISÃO GERAL", "OPERAÇÃO", "FROTA", "GESTÃO", "PÁTIOS", "TELEMETRIA", "ADMINISTRAÇÃO"];

const pathsOf = (nav: ReturnType<typeof buildSidebarNav>) => nav.flatMap((g) => g.items.map((i) => i.path));
const labelsOf = (nav: ReturnType<typeof buildSidebarNav>) => nav.flatMap((g) => g.items.map((i) => i.label));

test("[item 38] resolveFrontendRoles mapeia inventory → \"Estoque\" (normalizando caixa/espaços) e preserva os demais", () => {
  assert.deepEqual(resolveFrontendRoles(["inventory"]), ["Estoque"]);
  assert.deepEqual(resolveFrontendRoles([" INVENTORY "]), ["Estoque"]);
  assert.deepEqual(resolveFrontendRoles(["finance", "inventory"]), ["Financeiro", "Estoque"]);
  assert.deepEqual(resolveFrontendRoles(["inventory", "inventory"]), ["Estoque"], "sem duplicar rótulo");
});

test("[item 38] roleKindFor: Estoque → inventory; Financeiro vence Estoque (precedência declarada); demais rótulos inalterados", () => {
  assert.equal(roleKindFor(["Estoque"]), "inventory");
  assert.equal(roleKindFor(["Financeiro", "Estoque"]), "finance");
  assert.equal(roleKindFor(["Estoque", "Financeiro"]), "finance");
  assert.equal(roleKindFor(["Supervisor"]), "support");
  assert.equal(roleKindFor(["Operador Logistico"]), "dispatcher");
  assert.equal(roleKindFor(["Administrador"]), "admin");
  assert.equal(roleKindFor(["Gestor Operacional"]), "gestor");
  assert.equal(roleKindFor([]), "gestor", "sem rótulo continua caindo em gestor (comportamento anterior preservado)");
});

test("[item 38 · §3] ROLE_SUBTITLE.inventory = \"Estoque\" — rótulo de negócio, sem termo técnico", () => {
  assert.equal(ROLE_SUBTITLE.inventory, "Estoque");
  for (const subtitle of Object.values(ROLE_SUBTITLE)) assert.doesNotMatch(subtitle, /tenant|inventory|rbac/i, subtitle);
});

test("[item 38] buildSidebarNav([\"Estoque\"], hidden={/dashboard}) = grupos e itens EXATOS do §4.5", () => {
  const nav = buildSidebarNav(["Estoque"], new Set(["/dashboard"]));
  assert.deepEqual(
    nav.map((g) => ({ label: g.label, items: g.items.map((i) => i.label) })),
    [
      { label: "OPERAÇÃO", items: ["Checklists"] },
      { label: "GESTÃO", items: ["Estoque", "Pedidos", "Relatórios"] },
      { label: "ADMINISTRAÇÃO", items: ["Notificações", "Modelos de Checklist"] },
    ],
  );
});

test("[item 38] o Dashboard fica no grupo do Estoque e só o esconde-fino o oculta (04b concede dashboard:read sem mexer no menu)", () => {
  const nav = buildSidebarNav(["Estoque"]);
  assert.deepEqual(nav[0], { label: "VISÃO GERAL", items: [{ ...nav[0].items[0] }] });
  assert.equal(nav[0].items[0].path, "/dashboard");
  assert.deepEqual(
    nav.map((g) => g.label),
    ["VISÃO GERAL", "OPERAÇÃO", "GESTÃO", "ADMINISTRAÇÃO"],
  );
});

test("[item 38] o Estoque nunca vê Frota, Cadastros mestres, Pátios, Telemetria nem o núcleo administrativo", () => {
  const paths = pathsOf(buildSidebarNav(["Estoque"]));
  for (const p of ["/fleet/fuel", "/cadastros/viaturas", "/cadastros/clientes", "/patios/patios", "/telemetria/quilometragem", "/users", "/audit", "/administrator/settings", "/work-orders", "/finance"]) {
    assert.equal(paths.includes(p), false, `Estoque não deveria ver ${p}`);
  }
});

test("[P1/P2/item 13] Financeiro vê OS, Clientes, Serviços, Checklists, Financeiro, Cobranças e Pagamentos — e não vê Auditoria", () => {
  const nav = buildSidebarNav(["Financeiro"]);
  const labels = labelsOf(nav);
  for (const l of ["Ordens de Serviço", "Orçamentos", "Aprovações", "Checklists", "Clientes", "Serviços", "Estoque", "Pedidos", "Remunerações", "Relatórios", "Financeiro", "Cobranças", "Pagamentos", "Notificações", "Modelos de Checklist"]) {
    assert.ok(labels.includes(l), `Financeiro sem "${l}"`);
  }
  assert.equal(labels.includes("Auditoria"), false, "Auditoria saiu do menu do Financeiro (audit:read não concedido; matriz l.56 scoped)");
  const paths = pathsOf(nav);
  for (const p of ["/cadastros/viaturas", "/operations/dispatches", "/users", "/administrator/settings", "/audit"]) {
    assert.equal(paths.includes(p), false, `Financeiro não deveria ver ${p}`);
  }
  assert.deepEqual(
    nav.map((g) => g.label),
    ["VISÃO GERAL", "OPERAÇÃO", "FROTA", "GESTÃO", "ADMINISTRAÇÃO"],
  );
});

test("[item 38] usuário com os dois rótulos (Financeiro + Estoque) recebe o menu do Financeiro (precedência declarada)", () => {
  const nav = buildSidebarNav(["Financeiro", "Estoque"]);
  assert.equal(labelsOf(nav).includes("Cobranças"), true);
  assert.equal(nav.map((g) => g.label).includes("FROTA"), true);
});

test("[IA aprovada] NAV_BY_ROLE.inventory e .finance só usam rótulos de grupo aprovados", () => {
  for (const kind of ["inventory", "finance"] as const) {
    for (const group of NAV_BY_ROLE[kind]) assert.ok(IA_GROUP_LABELS.includes(group.label), `rótulo de grupo inesperado em ${kind}: ${group.label}`);
  }
});
