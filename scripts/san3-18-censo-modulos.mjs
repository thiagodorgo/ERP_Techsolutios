// B-SAN3-18 (F0 do plano v2) — censo de módulos e rotas. Mede, por comando, o que o plano usa:
//   (a) os caminhos do item 16: `MVP_NAV_PATHS` (frontend/src/layouts/appSidebarNav.ts) fora do registro de navegação,
//       pela string EXATA, mais as entradas de organização do registro sem `requiredModules` fora do núcleo;
//   (b) toda rota montada em `src/app.ts`, com a classe que o gate dá (src/modules/navigation/route-modules.ts);
//   (c) a matriz página → endpoints (chamadas `apiRequest` dos módulos do front) e capacidade do bootstrap → endpoints;
//   (d) a permissão do `PermissionGuard` de cada página do menu web (frontend/src/App.tsx).
// O (a) e o (d) leem os arquivos da REF pedida (`--ref <sha>`, padrão HEAD) por `git show`, para medir a `main` sem
// trocar de ramo. O (b) e o (c) leem a árvore de trabalho.
//
// Uso (raiz do repositório):
//   node --import tsx scripts/san3-18-censo-modulos.mjs [--ref <sha>]          → relatório em Markdown no stdout
//   node --import tsx scripts/san3-18-censo-modulos.mjs --gravar <arquivo.json> → instantâneo rota → classe
// O instantâneo é `tests/fixtures/san3-18-route-modules.json`, conferido por tests/san3-18-route-module-census.test.ts.
// Sem dependência nova. Nada aqui escreve no banco nem na rede.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const REF = opt("--ref") ?? "HEAD";
const GRAVAR = opt("--gravar");

function lerNaRef(arquivo) {
  return execFileSync("git", ["show", `${REF}:${arquivo}`], { cwd: RAIZ, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function sha(ref) {
  return execFileSync("git", ["rev-parse", ref], { cwd: RAIZ, encoding: "utf8" }).trim();
}

// ---------- (a) caminhos do item 16, por texto, na ref ----------
function medirCaminhos() {
  const sb = lerNaRef("frontend/src/layouts/appSidebarNav.ts");
  const bloco = sb.slice(sb.indexOf("export const MVP_NAV_PATHS"));
  const mvp = [...bloco.slice(0, bloco.indexOf("]);")).matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
  const reg = lerNaRef("src/modules/navigation/navigation.registry.ts");
  const entradas = [];
  for (const m of reg.matchAll(/\{\s*\n\s*(?:\/\/[^\n]*\n\s*)*id: "([^"]+)",([\s\S]*?)\n  \},/g)) {
    const corpo = m[2];
    const caminho = corpo.match(/\n\s*path: "([^"]+)"/)?.[1];
    const modulos = corpo.match(/requiredModules: \[([^\]]*)\]/)?.[1];
    entradas.push({
      id: m[1],
      path: caminho,
      plataforma: /platformOnly: true/.test(corpo),
      modulos: modulos === undefined ? [] : [...modulos.matchAll(/"([^"]+)"/g)].map((x) => x[1]),
    });
  }
  let nucleo = [];
  try {
    const n = lerNaRef("src/modules/navigation/nucleo.ts");
    nucleo = [...n.slice(n.indexOf("NUCLEO_MENU_PATHS"), n.indexOf("];")).matchAll(/"(\/[^"]*)"/g)].map((x) => x[1]);
  } catch {
    // Antes do bloco não existe núcleo de menu: só `/administrator/subscription` é núcleo pelo comentário
    // (navigation.registry.ts, B-ASS-04 F9).
    nucleo = ["/administrator/subscription"];
  }
  const noRegistro = new Set(entradas.map((e) => e.path));
  const fora = mvp.filter((p) => !noRegistro.has(p));
  const semModulo = entradas.filter((e) => !e.plataforma && e.modulos.length === 0 && !nucleo.includes(e.path)).map((e) => e.path);
  return { mvp, entradas, fora, semModulo, nucleo };
}

// ---------- (d) permissão do PermissionGuard de cada página, por texto, na ref ----------
function medirGuardas() {
  const app = lerNaRef("frontend/src/App.tsx");
  const g = {};
  for (const m of app.matchAll(/path="([^"]+)"\s*element=\{\s*<PermissionGuard permissions=\{\[([^\]]*)\]\}/g)) {
    g[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  }
  return g;
}

// ---------- (c) página → endpoints, pelas chamadas apiRequest do front (árvore de trabalho) ----------
function arquivosDe(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) arquivosDe(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}
export function endpointsDoFront(rel) {
  const set = new Set();
  const abs = path.join(RAIZ, rel);
  const arquivos = fs.existsSync(abs) && fs.statSync(abs).isFile() ? [abs] : arquivosDe(abs);
  for (const f of arquivos) {
    const t = fs.readFileSync(f, "utf8");
    const re = /apiRequest(?:<[^>]*>)?\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g;
    let m;
    while ((m = re.exec(t))) {
      const bruto = m[1].slice(1, -1).replace(/\$\{(?:buildQuery|query|qs|search)[^}]*\}|\?.*$/g, "");
      const caminho = bruto.replace(/\$\{[^}]+\}/g, ":id").replace(/\/$/, "");
      const janela = t.slice(m.index, m.index + 400);
      const prox = janela.indexOf("apiRequest", 10);
      const metodo = (prox > 0 ? janela.slice(0, prox) : janela).match(/method:\s*"([A-Z]+)"/)?.[1] ?? "GET";
      set.add(`${metodo} /api/v1${caminho.startsWith("/") ? caminho : `/${caminho}`}`);
    }
  }
  return [...set].sort();
}
const PAGINAS = {
  "/approvals": ["frontend/src/modules/work-orders/approval.service.ts"],
  "/cadastros/clientes": ["frontend/src/modules/registry/customers"],
  "/cadastros/filiais": ["frontend/src/modules/registry/branches"],
  "/cadastros/fornecedores": ["frontend/src/modules/registry/suppliers"],
  "/cadastros/viaturas": ["frontend/src/modules/registry/vehicles"],
  "/cadastros/equipes": ["frontend/src/modules/registry/teams"],
  "/cadastros/profissionais": ["frontend/src/modules/registry/operator-profiles"],
  "/cadastros/servicos": ["frontend/src/modules/registry/service-catalog"],
  "/cadastros/tabelas-valores": ["frontend/src/modules/registry/price-tables"],
  "/cadastros/tarifas": ["frontend/src/modules/registry/tariffs"],
  "/cadastros/tags": ["frontend/src/modules/registry/tags"],
  "/cadastros/pontos-interesse": ["frontend/src/modules/registry/pois"],
  "/patios/painel": ["frontend/src/modules/patios"],
  "/fleet/fuel": ["frontend/src/modules/fleet/fuel"],
  "/fleet/maintenance": ["frontend/src/modules/fleet/maintenance"],
  "/fleet/fines": ["frontend/src/modules/fleet/fines"],
  "/fleet/insurance": ["frontend/src/modules/fleet/insurance"],
  "/fleet/damages": ["frontend/src/modules/fleet/damages"],
  "/fleet/statement": ["frontend/src/modules/fleet/statement"],
  "/inventory": ["frontend/src/modules/inventory"],
  "/finance/commissions": ["frontend/src/modules/finance"],
  "/users": ["frontend/src/modules/users"],
  "/audit": ["frontend/src/modules/audit"],
  "/controle/usuarios/acessos": ["frontend/src/modules/sessions"],
  "/controle/usuarios/sessoes": ["frontend/src/modules/sessions"],
  "/dashboard": ["frontend/src/modules/dashboard"],
  "/notifications": ["frontend/src/modules/notifications"],
  "/work-orders": ["frontend/src/modules/work-orders"],
};

// Capacidade do bootstrap móvel → combinações mínimas de módulos que a ligam → endpoints. A matriz é LITERAL e mora em
// tests/fixtures/san3-18-formas/capacidades.json, conferida por tests/san3-18-bootstrap-capabilities.test.ts.
const CAPACIDADES = JSON.parse(fs.readFileSync(path.join(RAIZ, "tests/fixtures/san3-18-formas/capacidades.json"), "utf8")).capacidades;

// ---------- (b) rotas montadas, pelo MESMO walk do censo do 07c (tests/helpers/route-walk.ts) ----------
async function rotasDoApp() {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
  const { instalarRegistroDeCaminhos, percorrerApp } = await imp("tests/helpers/route-walk.ts");
  instalarRegistroDeCaminhos();
  const { createApp } = await imp("src/app.ts");
  const { CoreSaasRegistry } = await imp("src/modules/core-saas/services/core-saas.service.ts");
  const { MemoryCoreSaasAdapter } = await imp("src/modules/core-saas/services/memory-core-saas.adapter.ts");
  const { InMemoryCoreSaasStore } = await imp("src/modules/core-saas/store/core-saas.store.ts");
  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const percurso = percorrerApp(app);
  const rotas = [...new Set(percurso.rotas.map((r) => `${r.method} ${r.path}`))].sort();
  const rm = await imp("src/modules/navigation/route-modules.ts");
  return { rotas, semCaminho: percurso.semCaminho, rm };
}

async function main() {
  const { rotas, semCaminho, rm } = await rotasDoApp();
  const classe = Object.fromEntries(rotas.map((r) => {
    const [m, p] = r.split(" ");
    return [r, rm.formatRouteModuleClass(rm.classifyApiRoute(m, p))];
  }));

  if (GRAVAR) {
    fs.writeFileSync(GRAVAR, `${JSON.stringify(classe, null, 1)}\n`);
    const sem = Object.entries(classe).filter(([, c]) => c === "SEM_CLASSE").map(([r]) => r);
    console.log(`instantâneo gravado: ${rotas.length} rotas · sem classe ${sem.length} · sem caminho ${semCaminho.length}`);
    process.exit(sem.length || semCaminho.length ? 1 : 0);
  }

  const a = medirCaminhos();
  const guardas = medirGuardas();
  const linhas = [];
  linhas.push(`# Censo de módulos e rotas (B-SAN3-18 F0)`, "", `- ref de (a) e (d): \`${REF}\` = \`${sha(REF)}\``, `- árvore de (b) e (c): \`${sha("HEAD")}\` + mudanças locais`, "");
  linhas.push(`## (a) Caminhos do item 16`, "", `- \`MVP_NAV_PATHS\`: ${a.mvp.length} · entradas do registro: ${a.entradas.length} (${a.entradas.filter((e) => e.plataforma).length} de plataforma)`);
  linhas.push(`- fora do registro (string exata): **${a.fora.length}**`, ...a.fora.map((p) => `  - \`${p}\``));
  linhas.push(`- de organização sem módulo, fora do núcleo: **${a.semModulo.length}**`, ...a.semModulo.map((p) => `  - \`${p}\``));
  linhas.push(`- total do item 16: **${a.fora.length + a.semModulo.length}**`, "");
  const porClasse = {};
  for (const c of Object.values(classe)) porClasse[c] = (porClasse[c] ?? 0) + 1;
  linhas.push(`## (b) Rotas e classes`, "", `- rotas montadas: **${rotas.length}** · sem caminho: ${semCaminho.length}`);
  for (const [c, n] of Object.entries(porClasse).sort()) linhas.push(`  - \`${c}\`: ${n}`);
  linhas.push("", `## (c) Página → endpoints (front) e capacidade → endpoints (bootstrap)`, "");
  for (const [pagina, fontes] of Object.entries(PAGINAS)) {
    const eps = [...new Set(fontes.flatMap(endpointsDoFront))].sort();
    linhas.push(`- \`${pagina}\` (${fontes.join(", ")}): ${eps.map((e) => `\`${e}\` ${(() => { const [m, p] = e.split(" "); return rm.formatRouteModuleClass(rm.classifyApiRoute(m, p)); })()}`).join(" · ") || "—"}`);
  }
  linhas.push("");
  for (const [cap, { liga, endpoints }] of Object.entries(CAPACIDADES)) {
    linhas.push(`- capacidade \`${cap}\` (liga com ${liga.map((x) => `[${x.join(",")}]`).join(" ou ")}): ${endpoints.map((e) => { const [m, p] = e.split(" "); return `\`${e}\` ${rm.formatRouteModuleClass(rm.classifyApiRoute(m, p))}`; }).join(" · ")}`);
  }
  linhas.push("", `## (d) Permissão do PermissionGuard por página`, "");
  for (const p of a.mvp) {
    const base = p.split("?")[0];
    linhas.push(`- \`${p}\`: ${guardas[base] ? guardas[base].map((x) => `\`${x}\``).join(", ") : "(sem PermissionGuard direto no App.tsx)"}`);
  }
  console.log(linhas.join("\n"));
}

const chamadoDireto = Boolean(process.argv[1]) && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (chamadoDireto) {
  main().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
