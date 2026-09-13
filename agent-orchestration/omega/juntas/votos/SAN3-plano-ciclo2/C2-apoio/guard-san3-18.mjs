// Guard do B-SAN3-18 EXATAMENTE como o plano v5 o descreve (PLANO_SAN3.md:256 @ecc32712):
//  G1 "toda entrada do registro tem requiredModules OU está numa lista fechada de núcleo, e o guard falha para
//      entrada sem módulo fora da lista"
//  G2 "todo caminho do menu está no registro"
// Rodado contra o NAVIGATION_REGISTRY e o MVP_NAV_PATHS reais de ecc32712 e contra mutações do desenho.
import fs from "node:fs";
import { loadRegistry, loadMvp, flatten } from "./load.mjs";
const S = process.argv[2];
const REAL = loadRegistry(`${S}/registry.ts`);
const MVP = loadMvp(`${S}/appSidebarNav.ts`);
const clone = (x) => JSON.parse(JSON.stringify(x));
function guard(registry, mvp, core) {
  const flat = flatten(registry);
  const regPaths = new Set(flat.map((e) => e.path));
  const g1 = flat.filter((e) => !(e.requiredModules?.length) && !core.has(e.path)).map((e) => e.path);
  const g2 = mvp.filter((p) => !regPaths.has(p));
  return { verdict: g1.length || g2.length ? "VERMELHO" : "VERDE", g1, g2 };
}
const show = (name, r) => console.log(`${name.padEnd(64)} → ${r.verdict}  (G1 falhas: ${r.g1.length}${r.g1.length && r.g1.length <= 3 ? " " + r.g1.join(",") : ""} | G2 falhas: ${r.g2.length}${r.g2.length && r.g2.length <= 3 ? " " + r.g2.join(",") : ""})`);

// Lista fechada de núcleo: LITERAL, independente do registro (o que "lista fechada" significa).
const CORE = new Set(["/platform/dashboard", "/platform/tenants", "/platform/cloud-billing", "/platform/audit", "/controle/notificacoes", "/operations/quotes"]);

// S0 — head-base real (o que o plano chama de "vermelho hoje")
show("S0 head-base real, CORE vazio", guard(REAL, MVP, new Set()));
show("S0' head-base real, CORE literal (6)", guard(REAL, MVP, CORE));

// S1 — estado simulado "depois do bloco": /patios/* e /telemetria/* ganham chave; os 27 do menu entram no registro com chave
function afterBlock() {
  const reg = clone(REAL);
  for (const e of reg) {
    if (e.path.startsWith("/patios/")) e.requiredModules = ["patios"];
    if (e.path.startsWith("/telemetria/")) e.requiredModules = ["telemetria"];
  }
  const regPaths = new Set(reg.map((e) => e.path));
  for (const p of MVP.filter((p) => !regPaths.has(p))) reg.push({ id: `sim.${p}`, path: p, requiredPermissions: [], requiredModules: [p.startsWith("/fleet/") ? "frota" : p.startsWith("/patios/") ? "patios" : "modulo-simulado"], group: "tenant", order: 999, tenantOnly: true });
  return reg;
}
const S1 = afterBlock();
show("S1 depois do bloco (simulado), CORE literal", guard(S1, MVP, CORE));

// M1 — a mutação pedida: entrada NOVA do registro sem requiredModules, fora do núcleo
const m1 = clone(S1); m1.push({ id: "tenant.novo", path: "/patios/relatorio-novo", requiredPermissions: ["impound:read"], group: "tenant", order: 1000, tenantOnly: true });
show("M1 entrada nova SEM requiredModules (fora do núcleo)", guard(m1, MVP, CORE));
const m1b = clone(S1); m1b.push({ id: "tenant.novo2", path: "/frota/novo", requiredPermissions: [], requiredModules: [], group: "tenant", order: 1001, tenantOnly: true });
show("M1b entrada nova com requiredModules: [] (vazio)", guard(m1b, MVP, CORE));
const m1c = clone(S1); m1c.push({ id: "tenant.novo3", path: "/patios/novo3", requiredPermissions: [], requiredModules: ["patio"], group: "tenant", order: 1002, tenantOnly: true });
show("M1c entrada nova com chave fora do catálogo ('patio')", guard(m1c, MVP, CORE));
// M2 — caminho novo no menu, fora do registro
show("M2 caminho novo no MVP_NAV_PATHS fora do registro", guard(S1, [...MVP, "/novo-menu"], CORE));
// M3 — sonda de tautologia: núcleo DERIVADO do registro (o que 'lista fechada' proíbe)
const derived = (reg) => new Set(flatten(reg).filter((e) => !(e.requiredModules?.length)).map((e) => e.path));
show("M3 M1 com núcleo DERIVADO do registro (sonda)", guard(m1, MVP, derived(m1)));

// M4 — a enumeração do BACKEND: endpoint novo num router de módulo (Pátios), nenhuma entrada do registro tocada
const impound = fs.readFileSync(`${S}/routes/src_modules_impound_impound.routes.ts`, "utf8");
const impoundMut = impound.replace(/(\n\s*router\.post\()/, `\n  router.post("/impound-processes/:processId/export", (_q, r) => r.json({ ok: true }));$1`);
fs.writeFileSync(`${S}/routes-mut-impound.routes.ts`, impoundMut);
const r4 = guard(S1, MVP, CORE);
show("M4 endpoint novo POST /impound-processes/:p/export (router)", r4);
console.log("   (entradas do guard em M4 = registro + menu; o arquivo de rota mutado não é entrada do guard: diff de entradas =", JSON.stringify(S1) === JSON.stringify(S1) ? "nenhum)" : "algum)");
const regEps = new Set(flatten(S1).flatMap((e) => e.relatedEndpoints ?? []).map((x) => x.replace(/:[A-Za-z_]+/g, ":p")));
console.log("   o endpoint novo aparece em algum relatedEndpoints? ", regEps.has("POST /api/v1/impound-processes/:p/export") ? "sim" : "NAO → nenhum módulo associado por construção");
// M4b — router NOVO montado em app.ts
const app = fs.readFileSync(`${S}/app.ts`, "utf8");
fs.writeFileSync(`${S}/app-mut.ts`, app.replace('app.use("/api/v1", attachAuthenticatedActor(), createCoreSaasRouter(service));', 'app.use("/api/v1", attachAuthenticatedActor(), createModuloNovoRouter());\n  app.use("/api/v1", attachAuthenticatedActor(), createCoreSaasRouter(service));'));
show("M4b router NOVO montado em app.ts", guard(S1, MVP, CORE));
