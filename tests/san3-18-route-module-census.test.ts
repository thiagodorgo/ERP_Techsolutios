import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { before } from "node:test";

import { instalarRegistroDeCaminhos, percorrerApp, preencherParametros } from "./helpers/route-walk.js";

// B-SAN3-18 (P2 e P5 do plano v2; R2-01 da Emenda 1) — TODA rota montada tem exatamente UMA classe de módulo.
//
// A enumeração vem das montagens REAIS de `src/app.ts`, pelo MESMO walk do censo do 07c (`tests/helpers/route-walk.ts`,
// do #527, que repete só o walk de `censoCamadas`): rota, roteador e sub-app, sem lista curada (CE-G1(a)). O membro
// não previsto nasce SEM CLASSE e o gate o recusa (CE-G1(b)); as mutações abaixo o deixam vermelho (CE-G1(c)).
//   (i)   todo endpoint montado está no instantâneo `tests/fixtures/san3-18-route-modules.json`, e vice-versa;
//   (ii)  a classe do instantâneo é a que `classifyApiRoute` devolve (o diff do instantâneo é o que a junta revisa);
//   (iii) nenhum endpoint está SEM CLASSE, e uma montagem nova sem classe deixa este teste vermelho;
//   (iv)  todo padrão de `ROUTE_MODULE_OVERRIDES`, em maiúsculas e com barra final, tem a classe da forma canônica;
//   (v)   ORÁCULO INDEPENDENTE do classificador (R2-01): rota que o RBAC recusa só quando se tiram as permissões
//         financeiras exige o Financeiro, e por isso tem `finance` na classe;
//   P5    todo `relatedEndpoints` do registro é NÚCLEO/PLATAFORMA ou tem classe que cruza `requiredModules`.
// O instantâneo se regenera com `node --import tsx scripts/san3-18-censo-modulos.mjs --gravar tests/fixtures/san3-18-route-modules.json`.
// Vermelho-controle no head-base (`da12fec6`): o instantâneo e o classificador não existem.

instalarRegistroDeCaminhos();

const INSTANTANEO: Record<string, string> = JSON.parse(fs.readFileSync(new URL("./fixtures/san3-18-route-modules.json", import.meta.url), "utf8"));

let rm: typeof import("../src/modules/navigation/route-modules.js");
let rotas: string[] = [];
let app: any;
let core: any;

before(async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  rm = await import("../src/modules/navigation/route-modules.js");
  core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  app = createApp(new MemoryCoreSaasAdapter(core));
  const percurso = percorrerApp(app);
  assert.deepEqual(percurso.semCaminho, [], "camada sem caminho textual: o censo não a classificaria");
  rotas = [...new Set(percurso.rotas.map((r) => `${r.method} ${r.path}`))].sort();
});

function conferirCenso(vivas: readonly string[], instantaneo: Record<string, string>, classificar: (rota: string) => string): string[] {
  const violacoes: string[] = [];
  const vivasSet = new Set(vivas);
  for (const rota of vivas) {
    if (!(rota in instantaneo)) violacoes.push(`NOVA (fora do instantâneo): ${rota}`);
    const classe = classificar(rota);
    if (classe === "SEM_CLASSE") violacoes.push(`SEM CLASSE: ${rota}`);
    if (rota in instantaneo && instantaneo[rota] !== classe) violacoes.push(`CLASSE DIVERGE: ${rota} instantâneo ${instantaneo[rota]} × runtime ${classe}`);
  }
  for (const rota of Object.keys(instantaneo)) if (!vivasSet.has(rota)) violacoes.push(`ENVELHECIDA: ${rota}`);
  return violacoes;
}

const classeDe = (rota: string) => {
  const [m, p] = rota.split(" ");
  return rm.formatRouteModuleClass(rm.classifyApiRoute(m, p));
};

test("P2 (i)(ii)(iii) — toda rota montada está no instantâneo com a classe do runtime, e nenhuma está sem classe", () => {
  assert.ok(rotas.length >= 440, `rotas enumeradas: ${rotas.length}`);
  assert.deepEqual(conferirCenso(rotas, INSTANTANEO, classeDe), []);
});

test("P2 — o walk e o censo do 07c enumeram as MESMAS rotas (as duas fontes da enumeração concordam)", () => {
  const vias = JSON.parse(fs.readFileSync(new URL("./fixtures/o6r07c-classificacao-vias.json", import.meta.url), "utf8"));
  const doCenso = Object.keys(vias).filter((k) => k.startsWith("ROTA ")).map((k) => k.slice(5)).sort();
  assert.deepEqual(rotas, doCenso);
});

async function appInjetado(metodo: "get" | "post", caminho: string) {
  const [{ createApp }, { MemoryCoreSaasAdapter }, { injetarRota }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("./fixtures/san3-18-formas/inject.mts"),
  ]);
  const outro = createApp(new MemoryCoreSaasAdapter(core));
  injetarRota(outro, metodo, caminho);
  const percurso = percorrerApp(outro);
  return { outro, vivas: [...new Set(percurso.rotas.map((r) => `${r.method} ${r.path}`))].sort() };
}

test("P2 (iii) — mutação: uma montagem nova sem classe (`GET /api/v1/zz-sem-classe`) acende o censo, e o gate a recusa", async () => {
  const { outro, vivas } = await appInjetado("get", "/zz-sem-classe");
  const violacoes = conferirCenso(vivas, INSTANTANEO, classeDe);
  assert.deepEqual(violacoes, ["NOVA (fora do instantâneo): GET /api/v1/zz-sem-classe", "SEM CLASSE: GET /api/v1/zz-sem-classe"]);

  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  const { signAccessToken } = await import("../src/modules/auth/index.js");
  const t = core.createTenant({ name: "Injeção B-SAN3-18", modules: ["work_orders"] });
  const u = core.createUser({ tenantId: t.id, name: "Inj", email: `inj-18-${Date.now()}@example.com`, roles: ["tenant_admin"] });
  const token = await signAccessToken({ user_id: u.id, tenant_id: t.id, email: "inj@example.com", roles: ["tenant_admin"] });
  const server: Server = outro.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  try {
    const r = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/zz-sem-classe`, { headers: { authorization: `Bearer ${token}` } });
    const corpo: any = await r.json();
    assert.equal(r.status, 403);
    assert.equal(corpo?.error?.reason, "route_module_unclassified");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("P2 (ii) — mutação: um endpoint novo sob um prefixo conhecido (`GET /api/v1/yards/zz-novo`) acende o censo", async () => {
  const { vivas } = await appInjetado("get", "/yards/zz-novo");
  assert.deepEqual(conferirCenso(vivas, INSTANTANEO, classeDe), ["NOVA (fora do instantâneo): GET /api/v1/yards/zz-novo"]);
});

test("P2 (iv) (R-A1) — todo padrão de ROUTE_MODULE_OVERRIDES tem a mesma classe em maiúsculas e com barra final", () => {
  assert.ok(rm.ROUTE_MODULE_OVERRIDES.length >= 20);
  for (const override of rm.ROUTE_MODULE_OVERRIDES) {
    const metodo = override.method ?? "GET";
    const canonica = rm.formatRouteModuleClass(rm.classifyRoute(metodo, override.pattern));
    for (const variante of [override.pattern.toUpperCase(), `${override.pattern}/`, `${override.pattern.toUpperCase()}/`, `${override.pattern}//`]) {
      assert.equal(rm.formatRouteModuleClass(rm.classifyRoute(metodo, variante)), canonica, `${metodo} ${variante}`);
    }
    assert.equal(rm.formatRouteModuleClass(rm.classifyRoute("HEAD", override.pattern)), rm.formatRouteModuleClass(rm.classifyRoute("GET", override.pattern)));
    assert.equal(rm.formatRouteModuleClass(rm.classifyApiRoute(metodo, `/API/V1${override.pattern.toUpperCase()}/`)), canonica);
  }
});

test("P2 (v) (R2-01) — oráculo por permissão: toda rota que exige permissão financeira tem `finance` na classe", async () => {
  const { PERMISSION_CATALOG } = await import("../src/modules/core-saas/permissions/catalog.js");
  const todas: string[] = [...PERMISSION_CATALOG];
  const FINANCEIRAS = /^(financial_|cheques:|commissions:|professional_statements:|work_order_financials:)/;
  const semFinanceiras = todas.filter((p) => !FINANCEIRAS.test(p));
  assert.ok(todas.length - semFinanceiras.length >= 20, "o oráculo precisa tirar as permissões financeiras de verdade");
  const t = core.createTenant({ name: "Oráculo B-SAN3-18", modules: [] });
  const u = core.createUser({ tenantId: t.id, name: "Oráculo", email: `oraculo-18-${Date.now()}@example.com`, roles: ["tenant_admin"] });
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const UUID = "0b9f6a2e-1c3d-4e5f-8a7b-9c0d1e2f3a4b";
  // Legado em NODE_ENV=test: o gate não decide sobre ele, então o oráculo mede SÓ o RBAC das rotas.
  const bater = async (metodo: string, caminho: string, permissoes: readonly string[]) => {
    const r = await fetch(base + preencherParametros(caminho, () => UUID), {
      method: metodo,
      headers: { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": u.id, "x-role": "super_admin,tenant_admin", "x-permissions": permissoes.join(",") },
      body: metodo === "GET" ? undefined : "{}",
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    if (!r) return "sem-resposta";
    const texto = await r.text().catch(() => "");
    let reason = "";
    try {
      reason = String(JSON.parse(texto)?.error?.reason ?? "");
    } catch {
      reason = "";
    }
    return `${r.status}:${reason}`;
  };
  const exigeFinanceiro: string[] = [];
  const fora: string[] = [];
  try {
    for (const rota of rotas) {
      const [metodo, caminho] = rota.split(" ");
      if (/^\/api\/v1\/(platform|auth|health|webhooks)(\/|$)/.test(caminho)) continue;
      const comTudo = await bater(metodo, caminho, todas);
      const semFin = await bater(metodo, caminho, semFinanceiras);
      if (comTudo !== semFin && semFin.startsWith("403:")) {
        exigeFinanceiro.push(rota);
        const classe = rm.classifyApiRoute(metodo, caminho);
        if (!(classe.kind === "MODULO" && classe.modules.includes("finance"))) fora.push(`${rota} = ${rm.formatRouteModuleClass(classe)}`);
      }
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  assert.ok(exigeFinanceiro.length >= 60, `rotas que exigem permissão financeira: ${exigeFinanceiro.length}`);
  assert.ok(exigeFinanceiro.includes("POST /api/v1/fuel-logs/:id/payable"), "o oráculo vê o lançamento a pagar da Frota");
  assert.ok(exigeFinanceiro.includes("POST /api/v1/work-orders/:workOrderId/invoice"), "o oráculo vê o faturamento da OS");
  assert.deepEqual(fora, [], "rota de dinheiro fora de {finance}");
});

test("P5 (R-A4) — todo endpoint de entrada do menu é NÚCLEO/PLATAFORMA ou tem classe que cruza requiredModules", async () => {
  const { NAVIGATION_REGISTRY } = await import("../src/modules/navigation/navigation.registry.js");
  const violacoes: string[] = [];
  let pares = 0;
  const rotasSet = new Set(rotas);
  const naoMontados: string[] = [];
  const visitar = (itens: readonly any[]) => {
    for (const item of itens) {
      for (const endpoint of item.relatedEndpoints ?? []) {
        pares += 1;
        const [metodo, caminho] = String(endpoint).split(" ");
        const normal = `${metodo} ${caminho}`;
        const montado = [...rotasSet].some((r) => {
          const [m, p] = r.split(" ");
          if (m !== metodo) return false;
          const a = p.split("/");
          const b = caminho.split("/");
          return a.length === b.length && a.every((seg, i) => seg === b[i] || (seg.startsWith(":") && b[i].startsWith(":")));
        });
        if (!montado) naoMontados.push(`${item.id}: ${normal}`);
        const classe = rm.classifyApiRoute(metodo, caminho);
        if (classe.kind === "NUCLEO" || classe.kind === "PLATAFORMA") continue;
        const requeridos: string[] = item.requiredModules ?? [];
        if (classe.kind !== "MODULO" || !classe.modules.some((m: string) => requeridos.includes(m))) {
          violacoes.push(`${item.id} (${requeridos.join(",") || "núcleo"}): ${normal} = ${rm.formatRouteModuleClass(classe)}`);
        }
      }
      visitar(item.children ?? []);
    }
  };
  visitar(NAVIGATION_REGISTRY);
  assert.ok(pares >= 150, `pares (entrada, endpoint): ${pares}`);
  assert.deepEqual(violacoes, []);
  assert.deepEqual(naoMontados, [], "relatedEndpoints que não existe nas montagens");
});
