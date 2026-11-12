import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";
import { NAVIGATION_REGISTRY } from "../src/modules/navigation/navigation.registry.js";
import { filterNavigationByTenantModules, getMenuForCurrentUser } from "../src/modules/navigation/navigation.service.js";
import type { NavigationItem } from "../src/modules/navigation/navigation.types.js";
import { FORBIDDEN_MENU_MODULE_KEYS, NUCLEO_MENU_PATHS } from "../src/modules/navigation/nucleo.js";

// B-SAN3-18 (P3 do plano v2) — o MENU por módulo é fail-closed e cobre o menu web inteiro.
//   P3-núcleo     — toda entrada de organização tem `requiredModules` não vazio XOR está em `NUCLEO_MENU_PATHS`;
//                   `users` e `tenant-admin` não são chave de menu; organização com `[]` vê só o núcleo (R-A8, R-A11);
//   P3-all-of     — a entrada exige TODOS os seus módulos (R-A4);
//   P3-não resolvida — lista de módulos `undefined` (ou leitura que falha) conta como vazia;
//   P3-MVP        — todo caminho de `MVP_NAV_PATHS`, pela string EXATA (com a query), está no registro (R-A6).
// Vermelho-controle no head-base (`da12fec6`): `[]` → 14 itens; `undefined` → 33; 27 caminhos do menu web fora do registro.

function achatar(itens: readonly NavigationItem[]): NavigationItem[] {
  return itens.flatMap((item) => [item, ...achatar(item.children ?? [])]);
}

const TODAS = achatar(NAVIGATION_REGISTRY);
const DE_ORGANIZACAO = TODAS.filter((item) => !item.platformOnly);
const TENANT = "11111111-1111-1111-1111-111111111111";

function menuDe(enabledModules: readonly string[] | undefined, role: keyof typeof ROLE_PERMISSIONS = "tenant_admin"): string[] {
  return getMenuForCurrentUser({
    userId: "22222222-2222-2222-2222-222222222222",
    tenantId: TENANT,
    roles: [role],
    permissions: [...ROLE_PERMISSIONS[role], "users:read", "billing:read", "audit:read", "sessions:read"],
    enabledModules,
  }).map((item) => item.path);
}

test("P3-núcleo — toda entrada de organização tem requiredModules não vazio XOR está no núcleo", () => {
  const violacoes: string[] = [];
  for (const item of DE_ORGANIZACAO) {
    const temModulo = Boolean(item.requiredModules?.length);
    const nucleo = NUCLEO_MENU_PATHS.includes(item.path);
    if (temModulo === nucleo) violacoes.push(`${item.id} (${item.path}) módulo=${temModulo} núcleo=${nucleo}`);
  }
  assert.deepEqual(violacoes, []);
  for (const caminho of NUCLEO_MENU_PATHS) {
    assert.ok(DE_ORGANIZACAO.some((item) => item.path === caminho), `núcleo sem entrada no registro: ${caminho}`);
  }
});

test("P3-núcleo (R-A8) — `users` e `tenant-admin` não são chave de menu", () => {
  const usados = DE_ORGANIZACAO.flatMap((item) => (item.requiredModules ?? []).filter((m) => FORBIDDEN_MENU_MODULE_KEYS.includes(m)).map((m) => `${item.id}: ${m}`));
  assert.deepEqual(usados, []);
});

test("P3-núcleo (P2(a) do dono) — organização sem módulo nenhum vê só o núcleo (Painel, Usuários, Acessos, Sessões, Configurações, Minha assinatura)", () => {
  const vazio = menuDe([]);
  assert.deepEqual(vazio.filter((p) => !NUCLEO_MENU_PATHS.includes(p)), [], "só o núcleo aparece sem módulo");
  for (const caminho of ["/dashboard", "/users", "/administrator/settings", "/administrator/subscription", "/controle/usuarios/acessos", "/controle/usuarios/sessoes"]) {
    assert.ok(vazio.includes(caminho), `núcleo some sem módulo: ${caminho}`);
  }
  assert.equal(vazio.includes("/work-orders"), false);
  assert.equal(vazio.includes("/patios/patios"), false);
  assert.equal(vazio.includes("/telemetria/quilometragem"), false);
});

test("P3-all-of (R-A4) — o mapa operacional exige Operação de Campo E OS; o mapa logístico exige Logística E Campo", () => {
  assert.equal(menuDe(["field_operations"]).includes("/operations/map"), false);
  assert.equal(menuDe(["field_operations", "work_orders"]).includes("/operations/map"), true);
  const logistica = TODAS.find((item) => item.path === "/logistics/map");
  assert.deepEqual(logistica?.requiredModules, ["logistics", "field_operations"]);
  assert.equal(filterNavigationByTenantModules([logistica!], ["logistics"]).length, 0);
  assert.equal(filterNavigationByTenantModules([logistica!], ["logistics", "field_operations"]).length, 1);
});

test("P3-não resolvida — `undefined` vale `[]`: nenhum item de módulo aparece", () => {
  const comModulo = DE_ORGANIZACAO.filter((item) => item.requiredModules?.length).map((item) => item.path);
  const naoResolvida = menuDe(undefined);
  assert.deepEqual(naoResolvida.filter((p) => comModulo.includes(p)), []);
  assert.deepEqual([...naoResolvida].sort(), [...menuDe([])].sort());
});

test("P3-alias — o apelido `checklists` na organização vale `tenant_checklist` no menu", () => {
  assert.equal(menuDe(["checklists"]).includes("/administrator/checklists"), true);
  assert.equal(menuDe(["work-orders"]).includes("/work-orders"), true);
});

test("P3-MVP (R-A6) — todo caminho do menu web (`MVP_NAV_PATHS`, string exata) está no registro", () => {
  const sb = fs.readFileSync(new URL("../frontend/src/layouts/appSidebarNav.ts", import.meta.url), "utf8");
  const bloco = sb.slice(sb.indexOf("export const MVP_NAV_PATHS"));
  const mvp = [...bloco.slice(0, bloco.indexOf("]);")).matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(mvp.length >= 45, `MVP_NAV_PATHS lido: ${mvp.length}`);
  assert.ok(mvp.includes("/finance?aba=rec"), "a leitura do fonte manteve a query");
  const registro = new Set(TODAS.map((item) => item.path));
  assert.deepEqual(mvp.filter((p) => !registro.has(p)), []);
});

test("P3 — com todos os módulos, nenhuma entrada de organização que o papel pode ver some", () => {
  const todos = [...new Set(DE_ORGANIZACAO.flatMap((item) => item.requiredModules ?? []))];
  const visivelSemFiltro = getMenuForCurrentUser({ userId: "u", tenantId: TENANT, roles: ["tenant_admin"], permissions: [...ROLE_PERMISSIONS.tenant_admin], enabledModules: todos }).map((i) => i.path);
  const porPermissao = DE_ORGANIZACAO.filter((item) => item.requiredPermissions.length === 0 || item.requiredPermissions.some((p) => (ROLE_PERMISSIONS.tenant_admin as readonly string[]).includes(p))).map((i) => i.path);
  assert.deepEqual([...new Set(porPermissao)].filter((p) => !visivelSemFiltro.includes(p)), []);
});

test("P3-não resolvida — GET /navigation/menu com a leitura da organização falhando → 0 itens de módulo", async () => {
  const { abrirArnesDoGate } = await import("./helpers/san3-18-gate.js");
  let falhar = false;
  const arnes = await abrirArnesDoGate({
    envolverServico: (servico) =>
      new Proxy(servico, {
        get(alvo, chave) {
          const valor = Reflect.get(alvo, chave);
          if (chave === "getTenantForActor") {
            return async (...args: unknown[]) => {
              if (falhar) throw new Error("db down");
              return (valor as (...a: unknown[]) => unknown).apply(alvo, args);
            };
          }
          return typeof valor === "function" ? valor.bind(alvo) : valor;
        },
      }),
  });
  try {
    const todos = [...new Set(DE_ORGANIZACAO.flatMap((item) => item.requiredModules ?? []))];
    const org = arnes.criarOrganizacao(todos);
    const user = arnes.criarUsuario(org.id, ["tenant_admin"]);
    const token = await arnes.token({ tenantId: org.id, userId: user.id, email: user.email, roles: ["tenant_admin"] });
    const ok = await arnes.chamar("GET", "/api/v1/navigation/menu", { token });
    assert.equal(ok.status, 200);
    const comModulo = new Set(DE_ORGANIZACAO.filter((item) => item.requiredModules?.length).map((item) => item.path));
    assert.ok(ok.body.data.some((item: { path: string }) => comModulo.has(item.path)), "controle: com a leitura de pé, itens de módulo aparecem");
    falhar = true;
    const quebrado = await arnes.chamar("GET", "/api/v1/navigation/menu", { token });
    assert.equal(quebrado.status, 200);
    assert.deepEqual(quebrado.body.data.filter((item: { path: string }) => comModulo.has(item.path)).map((item: { path: string }) => item.path), []);
  } finally {
    await arnes.fechar();
  }
});
