import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-PLAT-PERMISSAO (item 72 do portão; plano §4.2 + Emenda 1 §3/§4 + Emenda 2 §1/§2) — GUARD DE CENSO das rotas da
// plataforma, sobre o app REAL em memória (o walk de tests/helpers/route-walk.ts; o censo de scripts/plat-perm-censo.mjs).
//   (i)   R1 (a propriedade `platformPermission` do portão; uma rota, UM portão) = R2 (uma requisição com papel de
//         organização lê a permissão do 403) = o instantâneo tests/fixtures/plat-perm-rotas.json. Rota nova, sumida ou
//         permissão trocada ficam vermelhas.
//   (ii)  toda rota sob /api/v1/platform: 403 `platform_actor_required` sem ator; 403 `platform_permission_required` com
//         papel de organização. Rota de plataforma nascida sem portão fica vermelha.
//   (iii) toda permissão do instantâneo ∈ PERMISSION_CATALOG.
//   (iv)  os 11 papéis de organização têm 0 chave `platform:` no catálogo (torna a MP-2 equivalente por invariante).
//   (v)   camadas `use` COM caminho sob o prefixo: a allowlist literal é `/api/v1/platform` com 1 camada (o
//         `attachAuthenticatedActor` de src/app.ts, sem portão); toda outra só passa com portão na 1ª camada.
//   (v′)  camadas `use` SEM caminho (middleware/handler, não roteador) sob o prefixo: allowlist literal e VAZIA.
//   (vi)  canário: para cada roteador montado sob o prefixo (gerado do walk) e cada verbo, `<p>/__plat_perm_nao_existe`
//         sem ator → 404 `route_not_found` ou 403 `platform_actor_required`;
//   (vi-b) o mesmo com `super_admin` legado → só 404 `route_not_found`.
// O filtro do prefixo é insensível a caixa (o Express roteia com caseSensitive=false; Emenda 2 §2).
// Alcance, declarado: o censo enxerga rota MONTADA no app; roteador exportado e não montado fica fora até ser montado.
// -----------------------------------------------------------------------------------------------

process.env.NODE_ENV = "test";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL ??= "postgresql://plat-perm-censo:x@127.0.0.1:1/plat_perm_censo";

const PLATFORM_PREFIX = /^\/api\/v1\/platform(\/|$)/i;
const VERBOS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const ALLOWLIST_USE_COM_CAMINHO = ["/api/v1/platform"];
const ALLOWLIST_USE_SEM_CAMINHO: string[] = [];
const ATOR_ORGANIZACAO = { "x-user-id": "plat-perm-censo", "x-role": "auditor", "x-permissions": "users.read" };
const SUPER_ADMIN_LEGADO = { "x-user-id": "plat-perm-censo", "x-role": "super_admin" };

const censo: any = await import("../scripts/plat-perm-censo.mjs");
const { PERMISSION_CATALOG, ROLE_PERMISSIONS, PLATFORM_ROLES } = await import("../src/modules/core-saas/permissions/catalog.js");
const amb = await censo.subirApp();
after(() => amb.fechar());

const percurso = amb.percurso;
const rotasPlataforma = percurso.rotas.filter((r: any) => PLATFORM_PREFIX.test(r.path));
const catalogo = new Set<string>(PERMISSION_CATALOG);
const instantaneo = JSON.parse(readFileSync(censo.INSTANTANEO, "utf8")) as Record<string, string>;

test("(i) uma rota, UM portão: toda rota sob /api/v1/platform tem exatamente 1 `platformPermission` na pilha (R1)", () => {
  assert.ok(rotasPlataforma.length > 0, "o walk achou rotas sob o prefixo");
  const fora = rotasPlataforma
    .map((r: any) => ({ k: `${r.method} ${r.path}`, n: censo.portoesDaRota(r).length }))
    .filter((x: any) => x.n !== 1);
  assert.deepEqual(fora, []);
});

test("(i) R1 = R2 = instantâneo (tests/fixtures/plat-perm-rotas.json)", async () => {
  const { mapa, falhas, rotas } = await censo.gerarCenso({ ambiente: amb });
  assert.deepEqual(falhas, [], "R1 e R2 concordam em toda rota");
  assert.equal(rotas, rotasPlataforma.length);
  assert.equal(Object.keys(mapa).length, rotasPlataforma.length, "toda rota sob o prefixo entra no mapa");
  assert.equal(censo.serializar(mapa), censo.serializar(instantaneo), "o mapa regenerado é o instantâneo");
});

test("(ii) toda rota sob o prefixo: 403 platform_actor_required sem ator; 403 platform_permission_required com papel de organização", async () => {
  const falhas: string[] = [];
  for (const r of rotasPlataforma) {
    const semAtor = await amb.bate(r.method, r.path, {});
    if (!(semAtor.status === 403 && semAtor.reason === "platform_actor_required")) {
      falhas.push(`${r.method} ${r.path} sem ator → ${semAtor.status}/${semAtor.reason}`);
    }
    const organizacao = await amb.bate(r.method, r.path, { "x-user-id": "plat-perm-censo", "x-role": "tenant_admin" });
    if (!(organizacao.status === 403 && organizacao.reason === "platform_permission_required")) {
      falhas.push(`${r.method} ${r.path} tenant_admin → ${organizacao.status}/${organizacao.reason}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(iii) toda permissão do instantâneo está no PERMISSION_CATALOG", () => {
  const fora = Object.entries(instantaneo).filter(([, p]) => !catalogo.has(p));
  assert.deepEqual(fora, []);
});

test("(iv) os 11 papéis de organização têm 0 chave `platform:` no catálogo", () => {
  const plataforma = new Set<string>(PLATFORM_ROLES);
  const organizacao = Object.entries(ROLE_PERMISSIONS as Record<string, readonly string[]>).filter(([role]) => !plataforma.has(role));
  assert.equal(organizacao.length, 11, "11 papéis de organização no catálogo");
  const comPlataforma = organizacao
    .map(([role, perms]) => [role, perms.filter((p) => p.startsWith("platform:")).length] as const)
    .filter(([, n]) => n > 0);
  assert.deepEqual(comPlataforma, []);
});

test("(v) camadas `use` COM caminho sob o prefixo: só a allowlist literal sem portão; toda outra tem portão na 1ª camada", async () => {
  assert.deepEqual(percurso.semCaminho, [], "nenhuma rota/camada sem caminho conhecido");
  const grupos = new Map<string, any[]>();
  for (const c of percurso.mwComCaminho.filter((c: any) => PLATFORM_PREFIX.test(c.path))) {
    const chave = c.path.toLowerCase();
    grupos.set(chave, [...(grupos.get(chave) ?? []), c]);
  }
  for (const caminho of ALLOWLIST_USE_COM_CAMINHO) {
    const grupo = grupos.get(caminho) ?? [];
    assert.equal(grupo.length, 1, `${caminho}: exatamente 1 camada (o attachAuthenticatedActor de src/app.ts)`);
    assert.equal(grupo[0]?.handle?.platformPermission, undefined, `${caminho}: a camada da allowlist não é portão`);
  }
  const falhas: string[] = [];
  for (const [caminho, camadas] of grupos) {
    if (ALLOWLIST_USE_COM_CAMINHO.includes(caminho)) continue;
    const P = camadas[0]?.handle?.platformPermission;
    const semAtor = await amb.bate("GET", caminho, {});
    const organizacao = await amb.bate("GET", caminho, ATOR_ORGANIZACAO);
    const ok =
      typeof P === "string" &&
      catalogo.has(P) &&
      semAtor.status === 403 &&
      semAtor.reason === "platform_actor_required" &&
      organizacao.status === 403 &&
      organizacao.reason === "platform_permission_required" &&
      organizacao.message === `Permission ${P} is required.`;
    if (!ok) falhas.push(`${caminho} P=${P} semAtor=${semAtor.status}/${semAtor.reason} org=${organizacao.status}/${organizacao.reason}`);
  }
  assert.deepEqual(falhas, []);
});

test("(v′) camadas `use` SEM caminho (middleware/handler) sob o prefixo: allowlist literal e vazia", () => {
  assert.ok(Array.isArray(percurso.mwSemCaminho), "o walk expõe mwSemCaminho");
  const sob = percurso.mwSemCaminho.filter((c: any) => PLATFORM_PREFIX.test(c.path)).map((c: any) => c.key);
  assert.deepEqual(sob, ALLOWLIST_USE_SEM_CAMINHO);
});

function prefixosDoCanario(): Set<string> {
  assert.ok(Array.isArray(percurso.roteadores), "o walk expõe roteadores");
  assert.ok(
    percurso.roteadores.some((r: any) => r.path.toLowerCase() === "/api/v1/platform"),
    "o roteador da plataforma aparece em `roteadores` (o conjunto é gerado do walk)",
  );
  const prefixos = new Set<string>(["/api/v1/platform"]);
  for (const r of percurso.roteadores.filter((r: any) => PLATFORM_PREFIX.test(r.path))) prefixos.add(r.path.toLowerCase());
  return prefixos;
}

test("(vi) canário por verbo × roteador sob o prefixo, sem ator: 404 route_not_found ou 403 platform_actor_required", async () => {
  const falhas: string[] = [];
  for (const p of prefixosDoCanario()) {
    for (const verbo of VERBOS) {
      const caminho = `${p}/__plat_perm_nao_existe`;
      const semAtor = await amb.bate(verbo, caminho, {});
      const ok =
        (semAtor.status === 404 && semAtor.reason === "route_not_found") ||
        (semAtor.status === 403 && semAtor.reason === "platform_actor_required");
      if (!ok) falhas.push(`${verbo} ${caminho} sem ator → ${semAtor.status}/${semAtor.reason ?? "(sem reason)"}`);
    }
  }
  assert.deepEqual(falhas, []);
});

test("(vi-b) canário por verbo × roteador sob o prefixo, com super_admin legado: só 404 route_not_found", async () => {
  const falhas: string[] = [];
  for (const p of prefixosDoCanario()) {
    for (const verbo of VERBOS) {
      const caminho = `${p}/__plat_perm_nao_existe`;
      const superAdmin = await amb.bate(verbo, caminho, SUPER_ADMIN_LEGADO);
      if (!(superAdmin.status === 404 && superAdmin.reason === "route_not_found")) {
        falhas.push(`${verbo} ${caminho} super_admin → ${superAdmin.status}/${superAdmin.reason ?? "(sem reason)"}`);
      }
    }
  }
  assert.deepEqual(falhas, []);
});
