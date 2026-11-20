import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-PLAT-PERMISSAO (item 72 do portão; plano §4.1 + Emenda 1 §5 + Emenda 2 §3) — MATRIZ papel × rota da plataforma,
// sobre o app REAL em memória. As rotas vêm do walk (filtro de prefixo insensível a caixa); a permissão esperada de cada
// rota vem do instantâneo tests/fixtures/plat-perm-rotas.json (gerado, nunca digitado). "Passa o portão" = a resposta NÃO
// é 403 `platform_permission_required` nem 403 `platform_actor_required` (o handler pode responder 400/404/422 com
// parâmetros fictícios).
//   (a) cada papel de plataforma, cabeçalho legado SEM `x-permissions`: passa (é o catálogo);
//   (b) cada papel de plataforma, `x-permissions` = todas as PLATFORM_PERMISSIONS menos P: 403 platform_permission_required;
//   (c) cada papel de plataforma, `x-permissions` = só P: passa;
//   (d) cada papel de organização (derivado do catálogo), sem e com `x-permissions: P`: 403 platform_permission_required;
//   (e) JWT real: o super_admin passa numa rota de cada permissão viva; tenant_admin e finance recebem 403;
//   (f) 200 exato nas 16 GET que respondem 200 em memória, para super_admin e platform_admin;
//   (g′) super_admin com `x-permissions: platform:billing:read` → POST …/statements/:id/payments → 403 (a classe da L4-01);
//   (h) JWT com papel `" Super_Admin "` (sem normalização dava 500): GET …/billing/plans → 200; POST …/payments não é 500;
//   (i) `x-permissions` vazio ou só espaços = sem permissão (fail-closed): 403 nas rotas, nos 2 papéis de plataforma;
//       controle: JWT super_admin + `x-permissions: ""` → 200 (o JWT ignora o cabeçalho).
// O (g) — este arquivo rodado contra o `src/` da base fica vermelho em (b) e em (d) com `x-permissions` — é medido e
// publicado pelo dev (diário do bloco), não roda aqui.
// -----------------------------------------------------------------------------------------------

process.env.NODE_ENV = "test";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET ??= "dev-only-change-me";
process.env.DATABASE_URL ??= "postgresql://plat-perm-matriz:x@127.0.0.1:1/plat_perm_matriz";

const PLATFORM_PREFIX = /^\/api\/v1\/platform(\/|$)/i;
const PAGAMENTO = "POST /api/v1/platform/billing/statements/:statementId/payments";
const PLANOS = "GET /api/v1/platform/billing/plans";
// As 16 GET que respondem 200 em memória (planos/sondas-plat/censo-plat.out do plano, coluna "depois do portão" = 200).
const GET_200 = [
  "GET /api/v1/platform/billing/economic-groups",
  "GET /api/v1/platform/billing/plans",
  "GET /api/v1/platform/billing/plans/:planId/versions",
  "GET /api/v1/platform/billing/plans/summary",
  "GET /api/v1/platform/billing/providers",
  "GET /api/v1/platform/cloud-cost-allocations/runs",
  "GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations",
  "GET /api/v1/platform/cloud-cost-allocations/summary",
  "GET /api/v1/platform/cloud-costs/imports",
  "GET /api/v1/platform/cloud-costs/line-items",
  "GET /api/v1/platform/cloud-costs/summary",
  "GET /api/v1/platform/cloud-usage/summary",
  "GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily",
  "GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary",
  "GET /api/v1/platform/overview",
  "GET /api/v1/platform/tenants",
];

const censo: any = await import("../scripts/plat-perm-censo.mjs");
const { PLATFORM_ROLES, ROLE_PERMISSIONS, TENANT_ASSIGNABLE_ROLES } = await import("../src/modules/core-saas/permissions/catalog.js");
const { PLATFORM_PERMISSIONS } = await import("../src/modules/platform/platform-permissions.js");
const { signAccessToken } = await import("../src/modules/auth/index.js");
const amb = await censo.subirApp();
after(() => amb.fechar());

const instantaneo = JSON.parse(readFileSync(censo.INSTANTANEO, "utf8")) as Record<string, string>;
const rotas = amb.percurso.rotas
  .filter((r: any) => PLATFORM_PREFIX.test(r.path))
  .map((r: any) => ({ method: r.method as string, path: r.path as string, k: `${r.method} ${r.path}` }));
const papeisPlataforma = [...PLATFORM_ROLES] as string[];
const plataforma = new Set<string>(papeisPlataforma);
const papeisOrganizacao = Object.keys(ROLE_PERMISSIONS).filter((role) => !plataforma.has(role));
// B-USERS-CONCESSAO-PAINEL (Emenda 2, E2-2) — o número de papéis de organização é DERIVADO do catálogo (os papéis com
// autoridade `tenant` em ROLE_AUTHORITY), não um literal: papel de organização novo entra no laço do (d) sem editar o teste.
const papeisAutoridadeOrganizacao = [...(TENANT_ASSIGNABLE_ROLES as readonly string[])];

function permissaoDe(k: string): string {
  const p = instantaneo[k];
  assert.ok(p, `${k}: a rota está no instantâneo`);
  return p;
}

function passa(res: { status: number; reason?: string }): boolean {
  return !(res.status === 403 && (res.reason === "platform_permission_required" || res.reason === "platform_actor_required"));
}

function negadoPelaPermissao(res: { status: number; reason?: string }): boolean {
  return res.status === 403 && res.reason === "platform_permission_required";
}

const legado = (role: string, extra: Record<string, string> = {}) => ({ "x-user-id": "plat-perm-matriz", "x-role": role, ...extra });

async function jwt(roles: string[], tenantId = "platform"): Promise<Record<string, string>> {
  const token = await signAccessToken({ user_id: "usr_plat_perm_matriz", tenant_id: tenantId, email: "plat-perm@example.com", roles });
  return { authorization: `Bearer ${token}` };
}

function rotaDe(k: string) {
  const r = rotas.find((x: any) => x.k === k);
  assert.ok(r, `${k}: a rota existe no app`);
  return r!;
}

test("o universo: as rotas do app sob o prefixo são as do instantâneo; 2 papéis de plataforma e os de organização derivados do catálogo", () => {
  assert.deepEqual(rotas.map((r: any) => r.k).sort(), Object.keys(instantaneo).sort());
  assert.deepEqual(papeisPlataforma.sort(), ["platform_admin", "super_admin"]);
  // Todo papel do catálogo que não é de plataforma tem autoridade de organização, e vice-versa (partição sem resto).
  assert.deepEqual([...papeisOrganizacao].sort(), [...papeisAutoridadeOrganizacao].sort());
  assert.equal(papeisOrganizacao.length, papeisAutoridadeOrganizacao.length);
  // O papel adicional "Visão da organização" é de organização: entra no laço do (d) e recebe 403 como os demais.
  assert.ok(papeisOrganizacao.includes("organization_view"), "organization_view é papel de organização");
});

test("(a) papel de plataforma sem `x-permissions` passa em toda rota (o catálogo do papel)", async () => {
  const falhas: string[] = [];
  for (const role of papeisPlataforma) {
    for (const r of rotas) {
      const res = await amb.bate(r.method, r.path, legado(role));
      if (!passa(res)) falhas.push(`${role} ${r.k} → ${res.status}/${res.reason}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(b) papel de plataforma com `x-permissions` = todas as de plataforma menos P → 403 platform_permission_required", async () => {
  const falhas: string[] = [];
  for (const role of papeisPlataforma) {
    for (const r of rotas) {
      const P = permissaoDe(r.k);
      const outras = PLATFORM_PERMISSIONS.filter((p: string) => p !== P).join(",");
      const res = await amb.bate(r.method, r.path, legado(role, { "x-permissions": outras }));
      if (!negadoPelaPermissao(res)) falhas.push(`${role} ${r.k} sem ${P} → ${res.status}/${res.reason}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(c) papel de plataforma com `x-permissions` = só P passa", async () => {
  const falhas: string[] = [];
  for (const role of papeisPlataforma) {
    for (const r of rotas) {
      const P = permissaoDe(r.k);
      const res = await amb.bate(r.method, r.path, legado(role, { "x-permissions": P }));
      if (!passa(res)) falhas.push(`${role} ${r.k} com ${P} → ${res.status}/${res.reason}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(d) os papéis de organização (derivados do catálogo), sem e com `x-permissions: P` → 403 platform_permission_required", async () => {
  const falhas: string[] = [];
  for (const role of papeisOrganizacao) {
    for (const r of rotas) {
      const P = permissaoDe(r.k);
      for (const headers of [legado(role), legado(role, { "x-permissions": P })]) {
        const res = await amb.bate(r.method, r.path, headers);
        if (!negadoPelaPermissao(res)) falhas.push(`${role} ${r.k} ${headers["x-permissions"] ?? "(sem x-permissions)"} → ${res.status}/${res.reason}`);
      }
    }
  }
  assert.deepEqual(falhas, []);
});

test("(e) JWT real: super_admin passa numa rota de cada permissão viva; tenant_admin e finance recebem 403", async () => {
  const umaPorPermissao = new Map<string, string>();
  for (const k of Object.keys(instantaneo).sort()) if (!umaPorPermissao.has(instantaneo[k]!)) umaPorPermissao.set(instantaneo[k]!, k);
  assert.ok(umaPorPermissao.size >= 10, `permissões vivas no instantâneo: ${umaPorPermissao.size}`);
  const superAdmin = await jwt(["super_admin"]);
  const tenantAdmin = await jwt(["tenant_admin"], "ten_plat_perm");
  const finance = await jwt(["finance"], "ten_plat_perm");
  const falhas: string[] = [];
  for (const [P, k] of umaPorPermissao) {
    const r = rotaDe(k);
    const sa = await amb.bate(r.method, r.path, superAdmin);
    if (!passa(sa)) falhas.push(`JWT super_admin ${k} (${P}) → ${sa.status}/${sa.reason}`);
    for (const [nome, h] of [["tenant_admin", tenantAdmin], ["finance", finance]] as const) {
      const res = await amb.bate(r.method, r.path, h);
      if (!negadoPelaPermissao(res)) falhas.push(`JWT ${nome} ${k} → ${res.status}/${res.reason}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(f) 200 exato nas 16 GET que respondem 200 em memória, para super_admin e platform_admin", async () => {
  assert.equal(GET_200.length, 16);
  const falhas: string[] = [];
  for (const k of GET_200) {
    const r = rotaDe(k);
    for (const role of papeisPlataforma) {
      const res = await amb.bate(r.method, r.path, legado(role));
      if (res.status !== 200) falhas.push(`${role} ${k} → ${res.status}/${res.reason}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(g′) super_admin com `x-permissions: platform:billing:read` → POST …/statements/:id/payments → 403 (a classe da L4-01)", async () => {
  assert.equal(permissaoDe(PAGAMENTO), "platform:billing:settle");
  const r = rotaDe(PAGAMENTO);
  const res = await amb.bate(r.method, r.path, legado("super_admin", { "x-permissions": "platform:billing:read" }));
  assert.equal(res.status, 403);
  assert.equal(res.reason, "platform_permission_required");
  assert.equal(res.message, "Permission platform:billing:settle is required.");
});

test("(h) JWT com papel `\" Super_Admin \"`: GET …/billing/plans → 200; POST …/payments não é 500", async () => {
  const h = await jwt([" Super_Admin "]);
  const planos = await amb.bate("GET", rotaDe(PLANOS).path, h);
  assert.equal(planos.status, 200, `GET planos → ${planos.status}/${planos.reason}`);
  const pagamento = await amb.bate("POST", rotaDe(PAGAMENTO).path, h);
  assert.notEqual(pagamento.status, 500, `POST pagamento → ${pagamento.status}/${pagamento.reason}`);
  assert.ok(passa(pagamento), `POST pagamento passa o portão → ${pagamento.status}/${pagamento.reason}`);
});

test("(i) `x-permissions` vazio ou só espaços = sem permissão: 403 em toda rota, nos 2 papéis de plataforma; JWT ignora o cabeçalho", async () => {
  const falhas: string[] = [];
  let n = 0;
  for (const r of rotas) {
    for (const role of papeisPlataforma) {
      for (const valor of ["", "   "]) {
        n += 1;
        const res = await amb.bate(r.method, r.path, legado(role, { "x-permissions": valor }));
        if (!negadoPelaPermissao(res)) falhas.push(`${role} ${r.k} x-permissions=${JSON.stringify(valor)} → ${res.status}/${res.reason}`);
      }
    }
  }
  assert.equal(n, rotas.length * 4);
  assert.deepEqual(falhas, []);
  const controle = await amb.bate("GET", rotaDe(PLANOS).path, { ...(await jwt(["super_admin"])), "x-permissions": "" });
  assert.equal(controle.status, 200, `JWT super_admin + x-permissions vazio → ${controle.status}/${controle.reason}`);
});
