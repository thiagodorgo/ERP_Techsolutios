# B-SAN3-01b — a web guarda por alcance e pelo estado da pagina

> Comando do bloco, colado pelo orquestrador a partir do §14 do plano (docs/revisoes/SAN3/B-SAN3-01b-plano.md). O plano e a fonte; em divergencia, vale ele.


```markdown
# B-SAN3-01b — as guardas da propriedade que o B-SAN3-01 fechou (item 4 + 4 pendências)

- **Tipo:** feature de guarda (gate SAN3, bloqueante por D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA) · **Fase:** Execution ·
  **Trilha:** frontend · **Branch:** `fix/web-guarda-por-alcance-e-estado-da-pagina` · **Frente:** 3 — precede `SAN3-08`,
  `SAN3-25` e `SAN3-21` pelas travas de mesmo arquivo (o §6 não o agenda; o orquestrador recalcula)
- **Plano:** `docs/revisoes/SAN3/B-SAN3-01b-plano.md` (planejador-mestre, instância 2, **Opus** — fallback declarado; fechamento
  e commit pela instância 3, **Fable**)

## Objetivo
(i) teste vivo da WorkOrdersPage real com o hook real; (ii) G1 por alcance em qualquer profundidade + fecho + arquivo de
fronteira, e G1b para entidade inline; W1/W2 por comportamento; "Nova OS" só com work_orders:create; cabeçalhos dizem o
que o guard prova.

## Escopo PERMITIDO
frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx · frontend/tests/work-orders-page-live.test.tsx (novo) ·
frontend/tests/work-orders-honest-errors.test.tsx · SÓ comentário: frontend/src/modules/operations/dispatches/dispatches.service.ts,
frontend/src/modules/work-orders/repository.ts, frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts ·
SÓ a lista do test:smoke: frontend/package.json · Kpis/kpis-latest.json, Kpis/kpis-history.json, Kpis/kpis-history.md,
Kpis/app.js · registro (pendencias.md, pendencias-indice.md gerado, status-geral.md, log-execucao.md, este comando)

## Escopo PROIBIDO
o §6 do plano (inclui src/**, prisma/**, lockfiles, flags no comando do test:smoke, work-orders.service.ts salvo
ampliação nominal, hooks, App.tsx, tests/** da raiz, .github/**, Kpis/index.html)

## Rito (§C7)
1. Dev de identidade nova implementa só o plano. 2. Inspetor de terreno. 3. Junta unanimidade de 3: C1 guardiao-fail-closed,
C2 coordenador-de-acessos (inelegibilidade a conferir — achou o C2-05), C3 cognicao-visual. 4. CI verde → squash → §C5 → porteiro.

## Teste de encerramento (§5 + plano §7)
N-PG-PAINEL, N-BARREL2, N-LITERAL, N-W1TXT (e N-PG-KPI, N-FORA-RAIZ, N-W2TXT) VERMELHAS no bloco e no smoke; oráculo de
sítios vermelho fora dos 9 de interação; "Nova OS" × 13 papéis do catálogo; vermelho-controle no head-base do gate.

## Bateria
a do §8 do plano (cwd frontend/ para os .tsx; paridade Node 20).

## KPIs
§9 do plano: frontend_smoke_tests da execução real; blocks_completed +1; demais carregados com nota; mvp_* inalterados.
```

## Apêndices (verbatim)

Todos os arquivos abaixo vivem no rascunho da sessão (`/tmp/claude-0/-home-user-ERP-Techsolutios/04df6954-e279-5e2a-838d-c3ee70c95064/scratchpad/planos/b-san3-01b/`), **nunca** no worktree. Caminhos relativos a esse diretório. Os comandos rodam com `cwd` = `frontend/` do worktree (o `tsx` lê o `tsconfig.json` do cwd) e `VITE_USE_MOCKS=false`.

### Apêndice A — gerador de alcance e de entidade fabricada (L1), controles e saídas

**`gen/alcance.mjs`** — o gerador (P-A e P-B; raízes do disco; fecho de import; profundidade arbitrária)

````js
#!/usr/bin/env node
// B-SAN3-01b — GERADOR (planejador, instância 2). Deriva da PROPRIEDADE, não de lista escrita à mão:
//   P-A (mock por alcance): em nenhum arquivo ESCANEADO um identificador cuja ORIGEM é módulo de mock — por import direto,
//        barrel de N níveis (export * / export {a as b} from / export * as ns), re-export local de binding importado,
//        `export default x`, `import * as`, default ou `import()` dinâmico — é alcançável fora do ramo VERDADEIRO de
//        `isMockMode()` importado de `config/env`.
//   P-B (entidade fabricada inline): em nenhum arquivo das RAÍZES um literal de objeto com IDENTIDADE (`id`/`code`) de
//        valor CONSTANTE (string/número/template) nasce em RAMO DE FALHA (corpo de `catch`, callback de `.catch(`,
//        direita de `??`/`||`) fora do ramo verdadeiro de `isMockMode()`.
// Escopo: RAÍZES = todo *.ts(x) (sem *.test.*, sem mock) sob as pastas-raiz + arquivos-raiz, ENUMERADOS DO DISCO;
//         FECHO = tudo que as raízes importam (estático não-tipo, re-export, dinâmico), em profundidade, dentro de src/.
// Uso: node alcance.mjs <frontend> [--overlay overlay.json] [--paths]
//      overlay = { "<caminho relativo a frontend/>": "<conteúdo>" | null }  (controle sem tocar o disco)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

const FE = resolve(process.argv[2] ?? ".");
const SRC = join(FE, "src");
const argOverlay = process.argv.indexOf("--overlay");
const OVERLAY = new Map(argOverlay > 0 ? Object.entries(JSON.parse(readFileSync(process.argv[argOverlay + 1], "utf8"))).map(([k, v]) => [join(FE, k), v]) : []);
const SHOW_PATHS = process.argv.includes("--paths");
const ts = createRequire(join(FE, "package.json"))("typescript");

const slash = (p) => p.split("\\").join("/");
const rel = (p) => slash(relative(SRC, p));
const isMockModulePath = (p) => /(^|\/)mocks\//.test(slash(p)) || /\.mock\.tsx?$/.test(slash(p));
const isEnvModulePath = (p) => /(^|\/)config\/env\.tsx?$/.test(slash(p));
const read = (p) => (OVERLAY.has(p) ? OVERLAY.get(p) : existsSync(p) && statSync(p).isFile() ? readFileSync(p, "utf8") : null);

const ROOT_DIRS = ["modules/work-orders", "modules/operations/dispatches"].map((d) => join(SRC, d));
const ROOT_FILES = ["modules/registry/service-quotes/useServiceQuoteReferences.ts"].map((f) => join(SRC, f));

function listDisk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listDisk(p, acc);
    else if (/\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}
const isScannable = (p) => /\.tsx?$/.test(p) && !/\.test\./.test(p) && !isMockModulePath(p) && read(p) !== null;
function listRoots() {
  const all = new Set([...ROOT_DIRS.flatMap((d) => listDisk(d)), ...ROOT_FILES]);
  for (const k of OVERLAY.keys()) if (ROOT_DIRS.some((d) => k.startsWith(d + "/"))) all.add(k);
  return [...all].filter(isScannable).sort();
}
function resolveModule(from, spec) {
  if (!spec.startsWith(".")) return null; // bare specifier = node_modules (residual declarado)
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) if (/\.tsx?$/.test(c) && read(c) !== null) return c;
  return null;
}
const sfCache = new Map();
function parse(p) {
  if (!sfCache.has(p)) sfCache.set(p, ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true, p.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
  return sfCache.get(p);
}
const hasExport = (n) => ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
function declaredExports(sf) {
  const names = new Set();
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st)) names.add("default");
    if (!hasExport(st)) continue;
    const isDefault = (ts.getModifiers(st) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.add(isDefault ? "default" : st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
  }
  return names;
}
// Nomes importados (valor) de um arquivo: local → { target, imported } (imported = "*" p/ namespace, "default").
function importBindings(file) {
  const out = new Map();
  for (const st of parse(file).statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const c = st.importClause;
    if (!c || c.isTypeOnly) continue;
    const target = resolveModule(file, st.moduleSpecifier.text);
    if (!target) continue;
    if (c.name) out.set(c.name.text, { target, imported: "default" });
    const b = c.namedBindings;
    if (b && ts.isNamespaceImport(b)) out.set(b.name.text, { target, imported: "*" });
    if (b && ts.isNamedImports(b)) for (const el of b.elements) if (!el.isTypeOnly) out.set(el.name.text, { target, imported: (el.propertyName ?? el.name).text });
  }
  return out;
}
// ORIGEM MOCK em profundidade arbitrária: Map exportado → true ("all" = o módulo inteiro é mock).
const originMemo = new Map();
function mockOrigin(file, stack = new Set()) {
  if (isMockModulePath(file)) return "all";
  if (originMemo.has(file)) return originMemo.get(file);
  if (stack.has(file) || read(file) === null) return new Set();
  stack.add(file);
  const names = new Set();
  const has = (target, name) => { const o = mockOrigin(target, stack); return o === "all" || o.has(name); };
  const any = (target) => { const o = mockOrigin(target, stack); return o === "all" || o.size > 0; };
  const sf = parse(file);
  const imports = importBindings(file);
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
        const target = resolveModule(file, st.moduleSpecifier.text);
        if (!target) continue;
        const o = mockOrigin(target, stack);
        if (!st.exportClause) { // export * from — tudo menos default
          if (o === "all") { const t = read(target); if (t !== null) for (const n of declaredExports(parse(target))) if (n !== "default") names.add(n); }
          else for (const n of o) if (n !== "default") names.add(n);
        } else if (ts.isNamespaceExport(st.exportClause)) { if (any(target)) names.add(st.exportClause.name.text); }
        else for (const el of st.exportClause.elements) if (!el.isTypeOnly && has(target, (el.propertyName ?? el.name).text)) names.add(el.name.text);
      } else if (st.exportClause && ts.isNamedExports(st.exportClause)) { // export { a as b } de binding importado
        for (const el of st.exportClause.elements) {
          const b = imports.get((el.propertyName ?? el.name).text);
          if (b && (b.imported === "*" ? any(b.target) : has(b.target, b.imported))) names.add(el.name.text);
        }
      }
    }
    if (ts.isExportAssignment(st) && ts.isIdentifier(st.expression)) { // export default x
      const b = imports.get(st.expression.text);
      if (b && (b.imported === "*" ? any(b.target) : has(b.target, b.imported))) names.add("default");
    }
  }
  stack.delete(file);
  originMemo.set(file, names);
  return names;
}
const isMockBinding = (b) => { const o = mockOrigin(b.target); return o === "all" || (b.imported === "*" ? o.size > 0 : o.has(b.imported)); };

function analyze(file) {
  const sf = parse(file);
  const imports = importBindings(file);
  let authority = null;
  for (const [local, b] of imports) if (isEnvModulePath(b.target) && b.imported === "isMockMode") authority = local;
  if (authority) {
    const name = authority;
    const shadowed = (n) => ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isParameter(n) || ts.isClassDeclaration(n)) && n.name && ts.isIdentifier(n.name) && n.name.text === name) || (ts.forEachChild(n, shadowed) ?? false);
    if (shadowed(sf)) authority = null;
  }
  const isGuard = (e) => authority !== null && ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === authority && e.arguments.length === 0;
  const guarded = (node) => {
    let child = node;
    for (let p = node.parent; p && !ts.isSourceFile(p); child = p, p = p.parent) {
      if (ts.isIfStatement(p) && isGuard(p.expression) && child === p.thenStatement) return true;
      if (ts.isConditionalExpression(p) && isGuard(p.condition) && child === p.whenTrue) return true;
      if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && isGuard(p.left) && child === p.right) return true;
    }
    return false;
  };
  const inFailure = (node) => {
    let child = node;
    for (let p = node.parent; p && !ts.isSourceFile(p); child = p, p = p.parent) {
      if (ts.isCatchClause(p) && child === p.block) return "catch";
      if (ts.isBinaryExpression(p) && child === p.right && (p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || p.operatorToken.kind === ts.SyntaxKind.BarBarToken)) return ts.tokenToString(p.operatorToken.kind);
      if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === "catch" && p.arguments.includes(child)) return ".catch(";
    }
    return null;
  };
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const mockLocals = new Map();
  for (const [local, b] of imports) if (isMockBinding(b)) mockLocals.set(local, b);
  const isNamePos = (id) => { const p = id.parent; return (ts.isPropertyAccessExpression(p) && p.name === id) || (ts.isPropertyAssignment(p) && p.name === id) || (ts.isQualifiedName(p) && p.right === id) || ts.isExportSpecifier(p) || ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p); };
  const refs = [], leaks = [], literals = []; let failureObjects = 0;
  const constLike = (e) => e && (ts.isStringLiteralLike(e) || ts.isNumericLiteral(e) || ts.isTemplateExpression(e) || ts.isNoSubstitutionTemplateLiteral(e));
  const visit = (n) => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isIdentifier(n) && !isNamePos(n) && mockLocals.has(n.text)) { const r = `${rel(file)}:${line(n)} ${n.text}`; refs.push(r); if (!guarded(n)) leaks.push(`${r} ← ${rel(mockLocals.get(n.text).target)}`); }
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [a] = n.arguments; const t = a && ts.isStringLiteralLike(a) ? resolveModule(file, a.text) : null;
      if (t) { const o = mockOrigin(t); if (o === "all" || o.size > 0) { const r = `${rel(file)}:${line(n)} import("${a.text}")`; refs.push(r); if (!guarded(n)) leaks.push(r); } }
    }
    if (ts.isObjectLiteralExpression(n)) {
      const ident = n.properties.filter((p) => ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && ["id", "code"].includes(p.name.text) && constLike(p.initializer));
      const fw = inFailure(n); if (fw && !guarded(n)) failureObjects++;
      const where = ident.length ? fw : null;
      if (where && !guarded(n)) literals.push(`${rel(file)}:${line(n)} {${ident.map((p) => `${p.name.text}: ${p.initializer.getText(sf)}`).join(", ")}} em ${where}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const edges = [];
  for (const st of sf.statements) {
    if ((ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      const typeOnly = ts.isImportDeclaration(st) ? !st.importClause ? false : st.importClause.isTypeOnly : st.isTypeOnly;
      if (typeOnly) continue;
      const t = resolveModule(file, st.moduleSpecifier.text); if (t) edges.push(t);
    }
  }
  const dyn = (n) => { if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) { const [a] = n.arguments; const t = a && ts.isStringLiteralLike(a) ? resolveModule(file, a.text) : null; if (t) edges.push(t); } ts.forEachChild(n, dyn); };
  dyn(sf);
  return { refs, leaks, literals, edges, failureObjects };
}

const roots = listRoots();
const rootSet = new Set(roots);
const seen = new Map(); const queue = [...roots]; const parentOf = new Map();
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f) || isMockModulePath(f) || /\.test\./.test(f)) continue;
  const a = analyze(f); seen.set(f, a);
  for (const t of a.edges) { if (!seen.has(t) && !parentOf.has(t)) parentOf.set(t, f); queue.push(t); }
}
const pathTo = (f) => { const p = []; for (let x = f; x; x = parentOf.get(x)) { p.unshift(rel(x)); if (rootSet.has(x)) break; } return p.join(" → "); };
const rootRes = roots.map((f) => [f, seen.get(f)]);
const closure = [...seen.keys()].filter((f) => !rootSet.has(f)).sort();
const sum = (xs, k) => xs.reduce((a, [, r]) => a + r[k].length, 0);
console.log(`# frontend: ${slash(FE)} · overlay: ${OVERLAY.size} arquivo(s)`);
console.log(`# RAÍZES: ${roots.length} arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)`);
console.log(`# FECHO fora das raízes: ${closure.length} arquivos · módulos de mock alcançados: ${[...new Set([...seen.values()].flatMap((a) => a.edges).filter(isMockModulePath))].map(rel).sort().join(", ")}`);
console.log(`# P-A nas RAÍZES: referências de origem mock vistas=${sum(rootRes, "refs")} · VAZAMENTOS=${sum(rootRes, "leaks")}`);
for (const [, r] of rootRes) for (const l of r.leaks) console.log(`  VAZA-RAIZ ${l}`);
console.log(`# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=${rootRes.reduce((a, [, r]) => a + r.failureObjects, 0)} · com identidade constante (FABRICA)=${sum(rootRes, "literals")}`);
for (const [, r] of rootRes) for (const l of r.literals) console.log(`  FABRICA-RAIZ ${l}`);
const closRes = closure.map((f) => [f, seen.get(f)]);
console.log(`# P-A no FECHO (fora das raízes): referências=${sum(closRes, "refs")} · VAZAMENTOS=${sum(closRes, "leaks")}`);
for (const [f, r] of closRes) for (const l of r.leaks) console.log(`  VAZA-FECHO ${l}   [caminho: ${pathTo(f)}]`);
console.log(`# P-B no FECHO (informativo): ${sum(closRes, "literals")}`);
for (const [f, r] of closRes) for (const l of r.literals) console.log(`  FABRICA-FECHO ${l}   [caminho: ${pathTo(f)}]`);
if (SHOW_PATHS) { console.log("## referências de origem mock nas raízes (todas, guardadas ou não)"); for (const [, r] of rootRes) for (const x of r.refs) console.log(`  REF ${x}`); console.log("## fecho"); for (const f of closure) console.log(`  FECHO ${rel(f)}   [${pathTo(f)}]`); }
````

Comando: `(cwd frontend) node <rascunho>/gen/alcance.mjs .` — saída no head `3b1fe0f9`:

````
# frontend: /home/user/w-b-san3-01b/frontend · overlay: 0 arquivo(s)
# RAÍZES: 81 arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)
# FECHO fora das raízes: 48 arquivos · módulos de mock alcançados: mocks/auth/context.ts, mocks/work-orders/workOrders.ts, modules/operations/dispatches/dispatches.mock.ts, modules/work-orders/work-orders.mock.ts
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
````

**`gen/ctl-make.cjs`** — gera as 12 sobreposições de controle (em memória)

````js
// Gera as 12 sobreposições de controle do gerador de alcance (em memória: nada toca o disco do worktree).
// Uso: (cwd <rascunho>/gen/ctl) node ../ctl-make.cjs
const fs = require("fs");
const W = "src/modules/work-orders/";
const svc = (from, name = "getMockWorkOrderDetail") => `import { apiRequest } from "../../services/api/client";\nimport { ${name} } from "${from}";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(\`/work-orders/\${id}\`, ctx); } catch { return ${name}(id); } }\n`;
const O = {
  "C1-N-BARREL1": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "mut-summary.service.ts"]: svc("./reexport-a") },
  "C2-N-BARREL2": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "reexport-b.ts"]: 'export * from "./reexport-a";\n', [W + "mut-summary.service.ts"]: svc("./reexport-b") },
  "C3-N-BARREL3": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "reexport-b.ts"]: 'export * from "./reexport-a";\n', [W + "reexport-c.ts"]: 'export { getMockWorkOrderDetail as detalheDemo } from "./reexport-b";\n', [W + "mut-summary.service.ts"]: svc("./reexport-c", "detalheDemo") },
  "C4-N-LITERAL": { [W + "mut-summary.service.ts"]: 'import { apiRequest } from "../../services/api/client";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch { return { id: "", code: "OS-FALLBACK", title: "Ordem de servico indisponivel", status: "open" }; } }\n' },
  "C5-barrel-fora-das-raizes": { "src/lib/wo-demo.ts": 'export * from "../modules/work-orders/work-orders.mock";\n', [W + "mut-summary.service.ts"]: svc("../../lib/wo-demo") },
  "C6-helper-fora-embrulha-mock": { "src/lib/wo-demo2.ts": 'import { getMockWorkOrderDetail } from "../modules/work-orders/work-orders.mock";\nexport const demo = (id: string) => getMockWorkOrderDetail(id);\n', [W + "mut-summary.service.ts"]: svc("../../lib/wo-demo2", "demo") },
  "C7-reexport-local": { [W + "reexport-a.ts"]: 'import { getMockWorkOrderDetail } from "./work-orders.mock";\nexport { getMockWorkOrderDetail as fallbackDetail };\n', [W + "mut-summary.service.ts"]: svc("./reexport-a", "fallbackDetail") },
  "C8-N-FORA-RAIZ": { "src/modules/registry/service-quotes/useServiceQuoteReferences.ts": fs.readFileSync("/home/user/w-b-san3-01b/frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts", "utf8").replace('import type { ServiceQuoteReferenceOption } from "./service-quotes.types";', 'import type { ServiceQuoteReferenceOption } from "./service-quotes.types";\nimport { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";\nexport const workOrderOptionsFallback = () => getMockWorkOrdersData("mock").items.map((o) => ({ id: o.id, label: o.code }));') },
  "C9-guardado-negativo": { [W + "mut-summary.service.ts"]: 'import { isMockMode } from "../../config/env";\nimport { getMockWorkOrderDetail } from "./work-orders.mock";\nexport const getSummary = (id: string) => (isMockMode() ? getMockWorkOrderDetail(id) : null);\n' },
  "C10-default-reexport": { [W + "reexport-a.ts"]: 'import { getMockWorkOrderDetail } from "./work-orders.mock";\nexport default getMockWorkOrderDetail;\n', [W + "mut-summary.service.ts"]: 'import d from "./reexport-a";\nexport const getSummary = (id: string) => d(id);\n' },
  "C11-literal-negativo-e-positivo": { [W + "mut-summary.service.ts"]: 'import { apiRequest } from "../../services/api/client";\nexport async function a(ctx: never, id: string) { try { return await apiRequest<unknown>(`/x/${id}`, ctx); } catch { return { id, workOrder: null }; } }\nexport const b = (r: { code?: string } | null) => r ?? { code: "OS-DEMO" };\n' },
  "C12-dinamico-via-barrel2": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "reexport-b.ts"]: 'export * from "./reexport-a";\n', [W + "mut-summary.service.ts"]: 'export async function f() { const m = await import("./reexport-b"); return m.getMockWorkOrderDetail("x"); }\n' },
};
for (const [k, v] of Object.entries(O)) fs.writeFileSync(`${k}.json`, JSON.stringify(v));
console.log(Object.keys(O).join(" "));
````

Comando (cwd `frontend/` do worktree; `R` = diretório do rascunho): `for f in $R/gen/ctl/*.json; do echo "=== $(basename $f .json)"; node $R/gen/alcance.mjs . --overlay $f | grep -E '^# P-|VAZA|FABRICA'; done` — saída (72 linhas, md5 `ee39f02a3686d19f8302c20652452be2`, reproduzida três vezes — a 3ª pela instância 3; sem o `echo` do cabeçalho o laço devolve as mesmas 60 linhas de conteúdo, md5 `790ca6ad…`, `diff` vazio contra a saída abaixo sem as linhas `===`):

````
=== C1-N-BARREL1
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 getMockWorkOrderDetail ← modules/work-orders/reexport-a.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C10-default-reexport
# P-A nas RAÍZES: referências de origem mock vistas=22 · VAZAMENTOS=2
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:2 d ← modules/work-orders/reexport-a.ts
  VAZA-RAIZ modules/work-orders/reexport-a.ts:2 getMockWorkOrderDetail ← modules/work-orders/work-orders.mock.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C11-literal-negativo-e-positivo
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=21 · com identidade constante (FABRICA)=1
  FABRICA-RAIZ modules/work-orders/mut-summary.service.ts:3 {code: "OS-DEMO"} em ??
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C12-dinamico-via-barrel2
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:1 import("./reexport-b")
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C2-N-BARREL2
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 getMockWorkOrderDetail ← modules/work-orders/reexport-b.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C3-N-BARREL3
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 detalheDemo ← modules/work-orders/reexport-c.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C4-N-LITERAL
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=20 · com identidade constante (FABRICA)=1
  FABRICA-RAIZ modules/work-orders/mut-summary.service.ts:2 {id: "", code: "OS-FALLBACK"} em catch
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C5-barrel-fora-das-raizes
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 getMockWorkOrderDetail ← lib/wo-demo.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C6-helper-fora-embrulha-mock
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=3 · VAZAMENTOS=1
  VAZA-FECHO lib/wo-demo2.ts:2 getMockWorkOrderDetail ← modules/work-orders/work-orders.mock.ts   [caminho: modules/work-orders/mut-summary.service.ts → lib/wo-demo2.ts]
# P-B no FECHO (informativo): 0
=== C7-reexport-local
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 fallbackDetail ← modules/work-orders/reexport-a.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C8-N-FORA-RAIZ
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/registry/service-quotes/useServiceQuoteReferences.ts:11 getMockWorkOrdersData ← modules/work-orders/work-orders.mock.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C9-guardado-negativo
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
````

### Apêndice B — o DOM mínimo e a sonda da página viva (a técnica que o E1 usa)

**`proto/minidom.mjs`** — DOM mínimo, sem dependência (82 linhas)

````js
// PROTÓTIPO do planejador (B-SAN3-01b) — DOM mínimo para o react-dom/client rodar EFEITOS em Node, sem dependência.
// Não é entrega: prova de viabilidade da técnica que o plano prescreve ao desenvolvedor.
const HTML_NS = "http://www.w3.org/1999/xhtml";
class MiniNode {
  constructor(nodeType, nodeName, ownerDocument) {
    this.nodeType = nodeType; this.nodeName = nodeName; this.ownerDocument = ownerDocument;
    this.childNodes = []; this.parentNode = null; this._listeners = new Map();
  }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }
  get nextSibling() { if (!this.parentNode) return null; const s = this.parentNode.childNodes; return s[s.indexOf(this) + 1] ?? null; }
  get previousSibling() { if (!this.parentNode) return null; const s = this.parentNode.childNodes; return s[s.indexOf(this) - 1] ?? null; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  insertBefore(c, ref) { if (!ref) return this.appendChild(c); if (c.parentNode) c.parentNode.removeChild(c); const i = this.childNodes.indexOf(ref); this.childNodes.splice(i, 0, c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(""); }
  set textContent(v) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; if (v !== "" && v != null) this.appendChild(this.ownerDocument.createTextNode(String(v))); }
  addEventListener(type, fn) { const s = this._listeners.get(type) ?? new Set(); s.add(fn); this._listeners.set(type, s); }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
}
class MiniText extends MiniNode {
  constructor(data, doc) { super(3, "#text", doc); this.data = String(data); }
  get nodeValue() { return this.data; } set nodeValue(v) { this.data = String(v); }
  get textContent() { return this.data; } set textContent(v) { this.data = String(v); }
}
class MiniComment extends MiniNode { constructor(data, doc) { super(8, "#comment", doc); this.data = data; } get textContent() { return ""; } }
function styleObject() {
  const s = {}; Object.defineProperty(s, "setProperty", { value: (k, v) => { s[k] = v; } });
  Object.defineProperty(s, "removeProperty", { value: (k) => { delete s[k]; } }); return s;
}
class MiniElement extends MiniNode {
  constructor(tag, doc, ns = HTML_NS) { super(1, ns === HTML_NS ? tag.toUpperCase() : tag, doc); this.tagName = this.nodeName; this.localName = tag; this.namespaceURI = ns; this.attributes = new Map(); this.style = styleObject(); }
  setAttribute(n, v) { this.attributes.set(n, String(v)); } getAttribute(n) { return this.attributes.has(n) ? this.attributes.get(n) : null; }
  hasAttribute(n) { return this.attributes.has(n); } removeAttribute(n) { this.attributes.delete(n); }
  setAttributeNS(_ns, n, v) { this.setAttribute(n, v); } removeAttributeNS(_ns, n) { this.removeAttribute(n); }
  focus() {} blur() {}
  get options() { const out = []; const walk = (n) => { for (const c of n.childNodes) { if (c.localName === "option") out.push(c); if (c.childNodes) walk(c); } }; walk(this); return out; }
  get value() { return this._value ?? (this.localName === "option" ? (this.getAttribute("value") ?? this.textContent) : ""); }
  set value(v) { this._value = String(v); }
}
export function installMiniDom() {
  const doc = new MiniNode(9, "#document", null);
  doc.ownerDocument = null;
  doc.createElement = (tag) => new MiniElement(tag, doc);
  doc.createElementNS = (ns, tag) => new MiniElement(tag, doc, ns);
  doc.createTextNode = (t) => new MiniText(t, doc);
  doc.createComment = (t) => new MiniComment(t, doc);
  doc.documentElement = doc.appendChild(new MiniElement("html", doc));
  doc.body = doc.documentElement.appendChild(new MiniElement("body", doc));
  doc.activeElement = doc.body; doc.hidden = false;
  const storage = new Map();
  const timers = [];
  const win = {
    document: doc, event: undefined, HTMLIFrameElement: class {}, navigator: { userAgent: "node" }, location: { href: "http://localhost/", pathname: "/", search: "", hash: "" },
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k), clear: () => storage.clear() },
    addEventListener: (t, f) => doc.addEventListener(t, f), removeEventListener: (t, f) => doc.removeEventListener(t, f),
    dispatchEvent: (ev) => { for (const f of doc._listeners.get(ev.type) ?? []) f(ev); return true; },
    // Intervalos CAPTURADOS (não disparam sozinhos): o teste aciona o tick do auto-refresh quando quer (2º plano).
    setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearInterval: (id) => { if (timers[id - 1]) timers[id - 1].fn = null; },
    setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis),
    getComputedStyle: () => ({ getPropertyValue: () => "" }), scrollTo: () => {},
  };
  doc.defaultView = win;
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  // Node 20 não tem `navigator` global (Node ≥21 tem): o react-dom lê navigator.userAgent ao carregar.
  if (typeof globalThis.navigator === "undefined") Object.defineProperty(globalThis, "navigator", { configurable: true, value: win.navigator });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return { doc, win, storage, intervals: timers };
}
const VOID = new Set(["input", "img", "br", "hr", "meta", "link"]);
export function serialize(node) {
  if (node.nodeType === 3) return node.data.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  if (node.nodeType === 8) return "";
  if (node.nodeType !== 1) return node.childNodes.map(serialize).join("");
  const attrs = [...node.attributes].map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`).join("");
  const style = Object.entries(node.style).map(([k, v]) => `${k}:${v}`).join(";");
  const open = `<${node.localName}${attrs}${style ? ` style="${style}"` : ""}>`;
  return VOID.has(node.localName) ? open : `${open}${node.childNodes.map(serialize).join("")}</${node.localName}>`;
}
````

**`proto/probe-page-viva.mts`** — a página REAL + hook REAL + efeitos; cenários 403/500/200 vazio/200×3/pendente/gate/2º plano

````ts
// PROTÓTIPO do planejador (B-SAN3-01b) — a PÁGINA REAL com o HOOK REAL rodando EFEITOS (react-dom/client + DOM mínimo):
// fetch stub → service real → reducer real → hook real (useEffect → refresh → setState) → WorkOrdersPage real.
// Nenhuma substituição de módulo, nenhuma semente de estado. Uso: (cwd <wt>/frontend) node --import tsx <este>.mts
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { installMiniDom, serialize } from "./minidom.mjs";

const WT = process.env.WT ?? "/home/user/w-b-san3-01b";
const FE = `${WT}/frontend/`;
const dom = installMiniDom();
process.env.VITE_USE_MOCKS = "false";
const req = createRequire(`${FE}package.json`);
const React = req("react");
const { createRoot } = req("react-dom/client");
const { MemoryRouter } = await import(pathToFileURL(`${FE}node_modules/react-router-dom/dist/index.mjs`).href);
const imp = (p: string) => import(pathToFileURL(`${FE}${p}`).href);
const { WorkOrdersPage } = await imp("src/modules/work-orders/pages/WorkOrdersPage.tsx");
const { AuthProvider } = await imp("src/providers/AuthProvider.tsx");
const { TenantProvider } = await imp("src/providers/TenantProvider.tsx");
const { PermissionProvider } = await imp("src/providers/PermissionProvider.tsx");
const { setStoredAuthSession } = await imp("src/modules/auth/auth.storage.ts");
const { mockSession } = await imp("src/mocks/auth/context.ts");
const h = React.createElement;
const act = React.act as (cb: () => unknown) => Promise<void>;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const wo = (id: string, code: string) => ({ id, code, title: `Atendimento ${code}`, status: "open", priority: "high", created_at: "2026-09-01T10:00:00.000Z" });
const BODIES: Record<string, () => Response> = {
  "403": () => json(403, { error: { code: "FORBIDDEN", reason: "permission_required", message: "One of these permissions is required: work_orders:read." } }),
  "500": () => new Response("boom", { status: 500 }),
  "200vazio": () => json(200, { data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }),
  "pendente": () => new Promise<Response>(() => undefined) as unknown as Response,
  "200x3": () => json(200, { data: { items: [wo("a", "OS-000001"), wo("b", "OS-000002"), wo("c", "OS-000003")], pagination: { limit: 20, offset: 0, total: 3 } } }),
};
let current = "403";
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (/\/work-orders(\?|$)/.test(url)) return BODIES[current]();
  throw new Error(`rota não prevista: ${url}`);
}) as typeof fetch;

async function mount(perms: string[]) {
  dom.storage.clear();
  dom.intervals.length = 0;
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Operador"], permissions: [] } });
  dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify({ tenantId: "ten-industrial-01", tenantName: "T", tenantStatus: "active", branchId: "fil-sp-01", branchName: "SP", role: "Operador", permissions: perms, enabledModules: ["work-orders"], scope: "branch" }));
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(h(MemoryRouter, { initialEntries: ["/work-orders"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(WorkOrdersPage)))))); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return { container, root };
}
const describe = (html: string) => {
  const ds = [...html.matchAll(/data-state="([^"]+)"/g)].map((m) => m[1]).join(",");
  const kpis = [...html.matchAll(/pat-kpi__value">([^<]*)</g)].map((m) => m[1]).join("|");
  const nova = (html.match(/Nova OS/g) ?? []).length;
  const rows = (html.match(/pat-os-row/g) ?? []).length;
  return `data-state=[${ds}] kpis=[${kpis}] linhas=${rows} novaOS=${nova} alert=${/role="alert"/.test(html)} stale=${/Dados desatualizados|desatualizad/i.test(html)} skel=${(html.match(/pat-skel/g) ?? []).length} contagem=${(html.match(/pat-os-count">([^<]*)</) ?? [])[1] ?? "-"} pager=${/de \d+</.test(html)} kpiClicavel=${(html.match(/role="button"|aria-haspopup/g) ?? []).length} demo=${/Dados demonstrativos/.test(html)} atribuir=${(html.match(/Atribuir técnico/g) ?? []).length} retry=${(html.match(/Tentar novamente/g) ?? []).length} detalheErro=${JSON.stringify((html.match(/Não foi possível consultar[^<]*|Tente novamente em instantes\.|A consulta às ordens[^<]*/) ?? ["-"])[0])} hora=${/\d{2}:\d{2}/.test(html)}`;
};
const mode = process.argv[2] ?? "all";
for (const sc of ["403", "500", "200vazio", "200x3", "pendente"]) {
  current = sc;
  const { container, root } = await mount(["work_orders:read", "work_orders:create"]);
  console.log(`PAGINA-VIVA ${sc.padEnd(8)} (read+create) ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
// Gate do "Atribuir" (field_dispatch:create) sobre as mesmas 3 OS sem técnico
current = "200x3";
{
  const { container, root } = await mount(["work_orders:read", "field_dispatch:create"]);
  console.log(`PAGINA-VIVA 200x3    (read+dispatch) ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
// Gate do botão: sem create
for (const sc of ["403", "200vazio"]) {
  current = sc;
  const { container, root } = await mount(["work_orders:read"]);
  console.log(`PAGINA-VIVA ${sc.padEnd(8)} (só read)     ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
// 2º plano (W1 por comportamento): carrega 3, backend passa a 500, dispara o tick do auto-refresh capturado.
current = "200x3";
{
  const { container, root } = await mount(["work_orders:read"]);
  console.log(`W1-VIVO antes      ${describe(serialize(container))} intervalos=${dom.intervals.length}`);
  current = "500";
  const tick = dom.intervals.find((t) => t.fn)?.fn;
  await act(async () => { tick?.(); await new Promise((r) => setTimeout(r, 0)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  console.log(`W1-VIVO 2º plano   ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}

// 2º plano com 403 (permissão revogada em sessão): a lista sai e o painel é "sem permissão" (F1b, agora vivo).
current = "200x3";
{
  const { container, root } = await mount(["work_orders:read"]);
  current = "403";
  const tick = dom.intervals.find((t) => t.fn)?.fn;
  await act(async () => { tick?.(); await new Promise((r) => setTimeout(r, 0)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  console.log(`F1b-VIVO 2º plano 403 ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
````

Comando: `(cwd frontend) node --import tsx <rascunho>/proto/probe-page-viva.mts` — saída no head — idêntica em Node 22.22.2 e 20.20.2 (`md5` `cc4f976035f46fca2e92f6d74c90886d` nas duas); com as respostas no formato do DTO do backend (`{items, pagination}`, itens em camelCase) a saída é a mesma (`diff` vazio):

````
PAGINA-VIVA 403      (read+create) data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 500      (read+create) data-state=[error] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=true stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=1 detalheErro="A consulta às ordens de serviço falhou. Tente novamente em instantes." hora=false
PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=0 ordens pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 403      (só read)     data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1
W1-VIVO 2º plano   data-state=[stale] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=true skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=1 detalheErro="-" hora=true
F1b-VIVO 2º plano 403 data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
````

**`proto/probe-page-viva-dto.mts`** — a mesma sonda com as respostas nos **bytes do DTO do backend** (`{ items, pagination }` sem envelope `data`, itens em camelCase — §0.4 P-u). `diff proto/probe-page-viva.mts proto/probe-page-viva-dto.mts` (3 linhas; nada mais difere):

````diff
27c27
< const wo = (id: string, code: string) => ({ id, code, title: `Atendimento ${code}`, status: "open", priority: "high", created_at: "2026-09-01T10:00:00.000Z" });
---
> const wo = (id: string, code: string) => ({ id, code, title: `Atendimento ${code}`, status: "open", priority: "high", createdAt: "2026-09-01T10:00:00.000Z" });
31c31
<   "200vazio": () => json(200, { data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }),
---
>   "200vazio": () => json(200, { items: [], pagination: { limit: 20, offset: 0, total: 0 } }),
33c33
<   "200x3": () => json(200, { data: { items: [wo("a", "OS-000001"), wo("b", "OS-000002"), wo("c", "OS-000003")], pagination: { limit: 20, offset: 0, total: 3 } } }),
---
>   "200x3": () => json(200, { items: [wo("a", "OS-000001"), wo("b", "OS-000002"), wo("c", "OS-000003")], pagination: { limit: 20, offset: 0, total: 3 } }),
````

Comando: `(cwd frontend) node --import tsx proto/probe-page-viva-dto.mts | diff - proto/baseline-probe.txt` → **vazio** (ec=0; stderr 0 linhas; md5 `cc4f976035f46fca2e92f6d74c90886d` nas duas — reexecutado pela instância 3).

### Apêndice C — gerador dos sítios de decisão da página (L2) e o W2 vivo

(Nas saídas deste apêndice, o espaço no fim de 2 linhas — o corte de 70 caracteres do `repl` do `S29` — foi removido para o `git diff --check` do PR que versionar este plano; nada mais foi alterado.)

**`gen/sitios-pagina.mjs`** — gerador + máquina de mutação por sítio (modo sonda e modo oráculo)

````js
#!/usr/bin/env node
// B-SAN3-01b — GERADOR dos SÍTIOS DE DECISÃO da página (propriedade: "o que a página mostra é função do estado que o
// hook/reducer produziu"). Semente = nomes desestruturados de `useWorkOrders(...)` e `usePermissions()` no corpo de
// `WorkOrdersPage`; propagação = toda `const` cujo inicializador lê um nome contaminado. Sítio = (a) inicializador
// contaminado de `const` booleana/derivada, (b) condição de `?:` contaminada, (c) lado esquerdo contaminado de `&&`/`||`,
// (d) atributo JSX cujo valor lê nome contaminado. Para cada sítio gera UMA mutação (negar / trocar por constante) e,
// com --run, aplica IN PLACE, roda a sonda da página viva e compara com a linha de base (restaura e prova o restauro).
// Uso: node sitios-pagina.mjs <frontend> [--run <sonda.mts> <baseline.txt>] | [--oracle "<comando de teste>"]
//      --oracle: o ORÁCULO é um comando de teste (cwd frontend/); VERMELHO = exit code ≠ 0. É o modo da junta sobre o teste do dev.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
const FE = resolve(process.argv[2] ?? ".");
const FILE = join(FE, "src/modules/work-orders/pages/WorkOrdersPage.tsx");
const ts = createRequire(join(FE, "package.json"))("typescript");
const text = readFileSync(FILE, "utf8");
const sf = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === "WorkOrdersPage");
const tainted = new Set();
const reads = (node) => { let hit = false; const v = (n) => { if (ts.isIdentifier(n) && tainted.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) hit = true; ts.forEachChild(n, v); }; v(node); return hit; };
const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
// sementes
const walkDecl = (n) => {
  if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && ["useWorkOrders", "usePermissions"].includes(n.initializer.expression.text) && ts.isObjectBindingPattern(n.name))
    for (const el of n.name.elements) tainted.add(el.name.text);
  ts.forEachChild(n, walkDecl);
};
walkDecl(fn.body);
const seeds = [...tainted];
// propagação (ponto fixo)
let grew = true;
while (grew) { grew = false; const v = (n) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !tainted.has(n.name.text) && reads(n.initializer)) { tainted.add(n.name.text); grew = true; } ts.forEachChild(n, v); }; v(fn.body); }
const sites = [];
const add = (node, kind, find, repl) => { const target = kind.startsWith("const ") ? node : node; sites.push({ id: `S${String(sites.length + 1).padStart(2, "0")}`, line: line(node), kind, find, repl, start: kind.startsWith("const ") ? node.name.getStart(sf) : node.getStart(sf), end: node.getEnd() }); };
const v = (n) => {
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && reads(n.initializer) && !seeds.includes(n.name.text)) {
    const init = n.initializer.getText(sf);
    if (ts.isBinaryExpression(n.initializer) || ts.isPrefixUnaryExpression(n.initializer) || (ts.isCallExpression(n.initializer) && /includes|listStatusKind/.test(init)))
      add(n, `const ${n.name.text}`, `${n.name.text} = ${init}`, `${n.name.text} = !(${init}) as never`);
  }
  if (ts.isConditionalExpression(n) && reads(n.condition)) add(n, "?:", n.getText(sf), `(!(${n.condition.getText(sf)}) ? ${n.whenTrue.getText(sf)} : ${n.whenFalse.getText(sf)})`);
  if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind) && reads(n.left) && ts.isJsxExpression(n.parent)) add(n, n.operatorToken.getText(sf), n.getText(sf), `!(${n.left.getText(sf)}) ${n.operatorToken.getText(sf)} ${n.right.getText(sf)}`);
  if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && reads(n.initializer.expression)) {
    const name = n.name.getText(sf); const expr = n.initializer.expression.getText(sf);
    const repl = name === "status" ? `status="empty"` : /^(degraded|skeleton|filtered|embedded)$/.test(name) ? `${name}={!(${expr})}` : name === "kpiDetails" ? `kpiDetails={null}` : name === "kpis" ? `kpis={{ abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecnico: 0, atrasadasEmCampo: 0 }}` : `${name}={undefined}`;
    add(n, `attr ${name}`, n.getText(sf), repl);
  }
  ts.forEachChild(n, v);
};
v(fn.body);
console.log(`# sementes (hook/permissões): ${seeds.join(", ")}`);
console.log(`# contaminados (ponto fixo): ${[...tainted].filter((x) => !seeds.includes(x)).join(", ")}`);
console.log(`# SÍTIOS DE DECISÃO: ${sites.length}`);
const RUN = process.argv.indexOf("--run");
const ORA = process.argv.indexOf("--oracle");
let base = null;
if (RUN > 0) base = readFileSync(process.argv[RUN + 2], "utf8");
const WT = resolve(FE, "..");
const blob = execSync("git rev-parse HEAD:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", { cwd: WT, encoding: "utf8" }).trim();
let caught = 0, uniq = 0;
for (const s of sites) {
  const n = text.split(s.find).length - 1;
  let res = "";
  if (ORA > 0) {
    if (text.slice(s.start, s.end) !== s.find) res = `posição não confere — não aplicada`;
    else {
      writeFileSync(FILE, text.slice(0, s.start) + s.repl + text.slice(s.end));
      let ec = 0; try { execSync(process.argv[ORA + 1], { cwd: FE, encoding: "utf8", timeout: 300000, env: { ...process.env, VITE_USE_MOCKS: "false" }, stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { ec = e.status ?? 1; }
      writeFileSync(FILE, text);
      const h = execSync("git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", { cwd: WT, encoding: "utf8" }).trim();
      if (h !== blob) throw new Error("RESTAURO FALHOU");
      res = ec ? `VERMELHO (ec=${ec})` : "VERDE (o oráculo não vê)"; if (ec) caught++;
    }
  } else if (RUN > 0) {
    if (text.slice(s.start, s.end) !== s.find) res = `posição não confere — não aplicada`;
    else {
      writeFileSync(FILE, text.slice(0, s.start) + s.repl + text.slice(s.end));
      let out; try { out = execSync(`node --import tsx ${process.argv[RUN + 1]}`, { cwd: FE, encoding: "utf8", timeout: 180000, env: { ...process.env, VITE_USE_MOCKS: "false" }, stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { out = `CRASH ${String(e.stdout ?? "").slice(-200)}${String(e.stderr ?? "").split("\n").find((l) => /Error/.test(l)) ?? ""}`; }
      writeFileSync(FILE, text);
      const h = execSync("git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", { cwd: WT, encoding: "utf8" }).trim();
      if (h !== blob) throw new Error("RESTAURO FALHOU");
      const diffLines = out.trim().split("\n").filter((l, i) => l !== base.trim().split("\n")[i]).length;
      res = out.trim() === base.trim() ? "NÃO DISTINGUE (sonda idêntica à base)" : out.startsWith("CRASH") ? `DISTINGUE (quebra: ${out.slice(0, 120)})` : `DISTINGUE (${diffLines} linha(s) da sonda mudam)`;
      if (!res.startsWith("NÃO")) caught++;
    }
  }
  console.log(`${s.id} l.${s.line} [${s.kind}] ${s.find.replace(/\s+/g, " ").slice(0, 90)}  ⇒  ${s.repl.replace(/\s+/g, " ").slice(0, 70)}${res ? `\n     → ${res}` : ""}`);
}
if (ORA > 0) console.log(`# oráculo "${process.argv[ORA + 1]}": VERMELHO em ${caught}/${sites.length} · restauro por hash a cada mutação (blob ${blob.slice(0, 12)})`);
if (RUN > 0) console.log(`# distinguidos pela sonda: ${caught}/${sites.length} · restauro conferido por hash a cada mutação (blob ${blob.slice(0, 12)})`);
````

Modo sonda — `node gen/sitios-pagina.mjs . --run proto/probe-page-viva.mts proto/baseline-probe.txt`:

````
# sementes (hook/permissões): items, loading, source, status, error, stale, lastUpdatedAt, refresh, context, permissions
# contaminados (ponto fixo): handleAdvance, handleRevokeClick, target, handleRevokeConfirm, result, kpis, kpiDetails, filtered, total, maxPage, effectivePage, start, end, pageItems, canDispatch, kpiSkeleton, kind, degraded, showFailure, canCreate
# SÍTIOS DE DECISÃO: 39
S01 l.214 [const filtered] filtered = items .filter((o) => activeTab.match(o)) .filter((o) => (q ? [o.code, o.title,   ⇒  filtered = !(items .filter((o) => activeTab.match(o)) .filter((o) => (
     → DISTINGUE (quebra: CRASH TypeError: filtered.slice is not a function)
S02 l.222 [const start] start = effectivePage * pageSize  ⇒  start = !(effectivePage * pageSize) as never
     → DISTINGUE (4 linha(s) da sonda mudam)
S03 l.226 [const canDispatch] canDispatch = permissions.includes("field_dispatch:create")  ⇒  canDispatch = !(permissions.includes("field_dispatch:create")) as neve
     → DISTINGUE (4 linha(s) da sonda mudam)
S04 l.227 [const kpiSkeleton] kpiSkeleton = loading && items.length === 0  ⇒  kpiSkeleton = !(loading && items.length === 0) as never
     → DISTINGUE (11 linha(s) da sonda mudam)
S05 l.230 [const kind] kind = listStatusKind(status)  ⇒  kind = !(listStatusKind(status)) as never
     → DISTINGUE (4 linha(s) da sonda mudam)
S06 l.231 [const degraded] degraded = kind === "failure"  ⇒  degraded = !(kind === "failure") as never
     → DISTINGUE (11 linha(s) da sonda mudam)
S07 l.236 [const showFailure] showFailure = !loading && degraded  ⇒  showFailure = !(!loading && degraded) as never
     → DISTINGUE (11 linha(s) da sonda mudam)
S08 l.238 [const canCreate] canCreate = permissions.includes("work_orders:create")  ⇒  canCreate = !(permissions.includes("work_orders:create")) as never
     → DISTINGUE (2 linha(s) da sonda mudam)
S09 l.257 [attr kpis] kpis={kpis}  ⇒  kpis={{ abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecn
     → DISTINGUE (4 linha(s) da sonda mudam)
S10 l.257 [attr kpiDetails] kpiDetails={degraded ? null : kpiDetails}  ⇒  kpiDetails={null}
     → DISTINGUE (6 linha(s) da sonda mudam)
S11 l.257 [?:] degraded ? null : kpiDetails  ⇒  (!(degraded) ? null : kpiDetails)
     → DISTINGUE (6 linha(s) da sonda mudam)
S12 l.257 [attr skeleton] skeleton={kpiSkeleton}  ⇒  skeleton={!(kpiSkeleton)}
     → DISTINGUE (11 linha(s) da sonda mudam)
S13 l.257 [attr degraded] degraded={degraded}  ⇒  degraded={!(degraded)}
     → DISTINGUE (10 linha(s) da sonda mudam)
S14 l.259 [?:] stale ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner lastUpdatedAt={lastUpdatedAt  ⇒  (!(stale) ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner last
     → DISTINGUE (11 linha(s) da sonda mudam)
S15 l.261 [attr lastUpdatedAt] lastUpdatedAt={lastUpdatedAt}  ⇒  lastUpdatedAt={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S16 l.261 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S17 l.263 [?:] source === "mock" ? ( <div style={{ display: "flex", gap: 7, marginBottom: 12 }}> <StatusP  ⇒  (!(source === "mock") ? ( <div style={{ display: "flex", gap: 7, margi
     → DISTINGUE (10 linha(s) da sonda mudam)
S18 l.270 [?:] showFailure ? ( <WorkOrdersLoadState status={status} message={error} onRetry={() => void r  ⇒  (!(showFailure) ? ( <WorkOrdersLoadState status={status} message={erro
     → DISTINGUE (11 linha(s) da sonda mudam)
S19 l.271 [attr status] status={status}  ⇒  status="empty"
     → DISTINGUE (4 linha(s) da sonda mudam)
S20 l.271 [attr message] message={error}  ⇒  message={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S21 l.271 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S22 l.304 [?:] degraded ? null : <span className="pat-os-count">{total === 1 ? "1 ordem" : `${total} orde  ⇒  (!(degraded) ? null : <span className="pat-os-count">{total === 1 ? "1
     → DISTINGUE (7 linha(s) da sonda mudam)
S23 l.304 [?:] total === 1 ? "1 ordem" : `${total} ordens`  ⇒  (!(total === 1) ? "1 ordem" : `${total} ordens`)
     → DISTINGUE (7 linha(s) da sonda mudam)
S24 l.316 [?:] loading ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-os-grid" style={{ border  ⇒  (!(loading) ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-
     → DISTINGUE (7 linha(s) da sonda mudam)
S25 l.327 [?:] total === 0 ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + CTA (com o gate); OS esco  ⇒  (!(total === 0) ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + C
     → DISTINGUE (6 linha(s) da sonda mudam)
S26 l.332 [attr filtered] filtered={items.length > 0}  ⇒  filtered={!(items.length > 0)}
     → NÃO DISTINGUE (sonda idêntica à base)
S27 l.333 [attr onCreate] onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  onCreate={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S28 l.333 [?:] items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  (!(items.length === 0 && canCreate) ? () => navigate("/work-orders/new
     → DISTINGUE (2 linha(s) da sonda mudam)
S29 l.392 [?:] !isFinalStatus(o.status) && canDispatch ? ( <button type="button" className="pat-os-assign  ⇒  (!(!isFinalStatus(o.status) && canDispatch) ? ( <button type="button"
     → DISTINGUE (4 linha(s) da sonda mudam)
S30 l.422 [attr permissions] permissions={permissions}  ⇒  permissions={undefined}
     → DISTINGUE (quebra: CRASH o (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 orde)
S31 l.426 [attr onAdvance] onAdvance={() => void handleAdvance(o)}  ⇒  onAdvance={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S32 l.427 [attr onRevoke] onRevoke={() => void handleRevokeClick(o)}  ⇒  onRevoke={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S33 l.434 [?:] !loading && !degraded && total > 0 ? ( <TablePager pageSize={pageSize} onPageSize={(size)   ⇒  (!(!loading && !degraded && total > 0) ? ( <TablePager pageSize={pageS
     → DISTINGUE (7 linha(s) da sonda mudam)
S34 l.441 [attr rangeLabel] rangeLabel={`${start + 1}–${end} de ${total}`}  ⇒  rangeLabel={undefined}
     → DISTINGUE (4 linha(s) da sonda mudam)
S35 l.442 [attr onPrev] onPrev={() => setPage(Math.max(0, effectivePage - 1))}  ⇒  onPrev={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S36 l.443 [attr onNext] onNext={() => setPage(Math.min(maxPage, effectivePage + 1))}  ⇒  onNext={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S37 l.444 [attr canPrev] canPrev={effectivePage > 0}  ⇒  canPrev={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S38 l.445 [attr canNext] canNext={end < total}  ⇒  canNext={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S39 l.456 [attr onConfirm] onConfirm={(reason) => void handleRevokeConfirm(reason)}  ⇒  onConfirm={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
# distinguidos pela sonda: 30/39 · restauro conferido por hash a cada mutação (blob dbae6f97eb69)
````

Modo oráculo sobre o teste do bloco de HOJE — `node gen/sitios-pagina.mjs . --oracle "node --test --import tsx tests/work-orders-honest-errors.test.tsx"`:

````
# sementes (hook/permissões): items, loading, source, status, error, stale, lastUpdatedAt, refresh, context, permissions
# contaminados (ponto fixo): handleAdvance, handleRevokeClick, target, handleRevokeConfirm, result, kpis, kpiDetails, filtered, total, maxPage, effectivePage, start, end, pageItems, canDispatch, kpiSkeleton, kind, degraded, showFailure, canCreate
# SÍTIOS DE DECISÃO: 39
S01 l.214 [const filtered] filtered = items .filter((o) => activeTab.match(o)) .filter((o) => (q ? [o.code, o.title,   ⇒  filtered = !(items .filter((o) => activeTab.match(o)) .filter((o) => (
     → VERDE (o oráculo não vê)
S02 l.222 [const start] start = effectivePage * pageSize  ⇒  start = !(effectivePage * pageSize) as never
     → VERDE (o oráculo não vê)
S03 l.226 [const canDispatch] canDispatch = permissions.includes("field_dispatch:create")  ⇒  canDispatch = !(permissions.includes("field_dispatch:create")) as neve
     → VERDE (o oráculo não vê)
S04 l.227 [const kpiSkeleton] kpiSkeleton = loading && items.length === 0  ⇒  kpiSkeleton = !(loading && items.length === 0) as never
     → VERDE (o oráculo não vê)
S05 l.230 [const kind] kind = listStatusKind(status)  ⇒  kind = !(listStatusKind(status)) as never
     → VERDE (o oráculo não vê)
S06 l.231 [const degraded] degraded = kind === "failure"  ⇒  degraded = !(kind === "failure") as never
     → VERDE (o oráculo não vê)
S07 l.236 [const showFailure] showFailure = !loading && degraded  ⇒  showFailure = !(!loading && degraded) as never
     → VERDE (o oráculo não vê)
S08 l.238 [const canCreate] canCreate = permissions.includes("work_orders:create")  ⇒  canCreate = !(permissions.includes("work_orders:create")) as never
     → VERDE (o oráculo não vê)
S09 l.257 [attr kpis] kpis={kpis}  ⇒  kpis={{ abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecn
     → VERDE (o oráculo não vê)
S10 l.257 [attr kpiDetails] kpiDetails={degraded ? null : kpiDetails}  ⇒  kpiDetails={null}
     → VERDE (o oráculo não vê)
S11 l.257 [?:] degraded ? null : kpiDetails  ⇒  (!(degraded) ? null : kpiDetails)
     → VERDE (o oráculo não vê)
S12 l.257 [attr skeleton] skeleton={kpiSkeleton}  ⇒  skeleton={!(kpiSkeleton)}
     → VERDE (o oráculo não vê)
S13 l.257 [attr degraded] degraded={degraded}  ⇒  degraded={!(degraded)}
     → VERDE (o oráculo não vê)
S14 l.259 [?:] stale ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner lastUpdatedAt={lastUpdatedAt  ⇒  (!(stale) ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner last
     → VERDE (o oráculo não vê)
S15 l.261 [attr lastUpdatedAt] lastUpdatedAt={lastUpdatedAt}  ⇒  lastUpdatedAt={undefined}
     → VERDE (o oráculo não vê)
S16 l.261 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → VERDE (o oráculo não vê)
S17 l.263 [?:] source === "mock" ? ( <div style={{ display: "flex", gap: 7, marginBottom: 12 }}> <StatusP  ⇒  (!(source === "mock") ? ( <div style={{ display: "flex", gap: 7, margi
     → VERDE (o oráculo não vê)
S18 l.270 [?:] showFailure ? ( <WorkOrdersLoadState status={status} message={error} onRetry={() => void r  ⇒  (!(showFailure) ? ( <WorkOrdersLoadState status={status} message={erro
     → VERDE (o oráculo não vê)
S19 l.271 [attr status] status={status}  ⇒  status="empty"
     → VERDE (o oráculo não vê)
S20 l.271 [attr message] message={error}  ⇒  message={undefined}
     → VERDE (o oráculo não vê)
S21 l.271 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → VERDE (o oráculo não vê)
S22 l.304 [?:] degraded ? null : <span className="pat-os-count">{total === 1 ? "1 ordem" : `${total} orde  ⇒  (!(degraded) ? null : <span className="pat-os-count">{total === 1 ? "1
     → VERDE (o oráculo não vê)
S23 l.304 [?:] total === 1 ? "1 ordem" : `${total} ordens`  ⇒  (!(total === 1) ? "1 ordem" : `${total} ordens`)
     → VERDE (o oráculo não vê)
S24 l.316 [?:] loading ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-os-grid" style={{ border  ⇒  (!(loading) ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-
     → VERDE (o oráculo não vê)
S25 l.327 [?:] total === 0 ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + CTA (com o gate); OS esco  ⇒  (!(total === 0) ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + C
     → VERDE (o oráculo não vê)
S26 l.332 [attr filtered] filtered={items.length > 0}  ⇒  filtered={!(items.length > 0)}
     → VERDE (o oráculo não vê)
S27 l.333 [attr onCreate] onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  onCreate={undefined}
     → VERDE (o oráculo não vê)
S28 l.333 [?:] items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  (!(items.length === 0 && canCreate) ? () => navigate("/work-orders/new
     → VERDE (o oráculo não vê)
S29 l.392 [?:] !isFinalStatus(o.status) && canDispatch ? ( <button type="button" className="pat-os-assign  ⇒  (!(!isFinalStatus(o.status) && canDispatch) ? ( <button type="button"
     → VERDE (o oráculo não vê)
S30 l.422 [attr permissions] permissions={permissions}  ⇒  permissions={undefined}
     → VERDE (o oráculo não vê)
S31 l.426 [attr onAdvance] onAdvance={() => void handleAdvance(o)}  ⇒  onAdvance={undefined}
     → VERDE (o oráculo não vê)
S32 l.427 [attr onRevoke] onRevoke={() => void handleRevokeClick(o)}  ⇒  onRevoke={undefined}
     → VERDE (o oráculo não vê)
S33 l.434 [?:] !loading && !degraded && total > 0 ? ( <TablePager pageSize={pageSize} onPageSize={(size)   ⇒  (!(!loading && !degraded && total > 0) ? ( <TablePager pageSize={pageS
     → VERDE (o oráculo não vê)
S34 l.441 [attr rangeLabel] rangeLabel={`${start + 1}–${end} de ${total}`}  ⇒  rangeLabel={undefined}
     → VERDE (o oráculo não vê)
S35 l.442 [attr onPrev] onPrev={() => setPage(Math.max(0, effectivePage - 1))}  ⇒  onPrev={undefined}
     → VERDE (o oráculo não vê)
S36 l.443 [attr onNext] onNext={() => setPage(Math.min(maxPage, effectivePage + 1))}  ⇒  onNext={undefined}
     → VERDE (o oráculo não vê)
S37 l.444 [attr canPrev] canPrev={effectivePage > 0}  ⇒  canPrev={undefined}
     → VERDE (o oráculo não vê)
S38 l.445 [attr canNext] canNext={end < total}  ⇒  canNext={undefined}
     → VERDE (o oráculo não vê)
S39 l.456 [attr onConfirm] onConfirm={(reason) => void handleRevokeConfirm(reason)}  ⇒  onConfirm={undefined}
     → VERDE (o oráculo não vê)
# oráculo "node --test --import tsx tests/work-orders-honest-errors.test.tsx": VERMELHO em 0/39 · restauro por hash a cada mutação (blob dbae6f97eb69)
````

**`proto/probe-detalhe-viva.mts`** — W2 por comportamento: página do detalhe REAL + hook REAL

````ts
// PROTÓTIPO — W2 por COMPORTAMENTO: WorkOrderDetailPage REAL + useWorkOrderDetail REAL (efeitos), fetch stub.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { installMiniDom, serialize } from "./minidom.mjs";
const FE = "/home/user/w-b-san3-01b/frontend/";
const dom = installMiniDom();
process.env.VITE_USE_MOCKS = "false";
const req = createRequire(`${FE}package.json`);
const React = req("react"); const { createRoot } = req("react-dom/client");
const RR = await import(pathToFileURL(`${FE}node_modules/react-router-dom/dist/index.mjs`).href);
const imp = (p: string) => import(pathToFileURL(`${FE}${p}`).href);
const { WorkOrderDetailPage } = await imp("src/modules/work-orders/pages/WorkOrderDetailPage.tsx");
const { AuthProvider } = await imp("src/providers/AuthProvider.tsx");
const { TenantProvider } = await imp("src/providers/TenantProvider.tsx");
const { PermissionProvider } = await imp("src/providers/PermissionProvider.tsx");
const { setStoredAuthSession } = await imp("src/modules/auth/auth.storage.ts");
const { mockSession } = await imp("src/mocks/auth/context.ts");
const h = React.createElement; const act = React.act as (cb: () => unknown) => Promise<void>;
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const OS = { id: "wo-1", code: "OS-000901", title: "Atendimento OS-000901", status: "assigned", priority: "high", customer_name: "Cliente", created_at: "2026-09-01T10:00:00.000Z" };
let mode = "ok"; const seen = new Set<string>();
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input); seen.add(url.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, ""));
  if (/\/work-orders\/wo-1\/timeline$/.test(url)) return mode === "ok" ? json(200, { data: [] }) : new Response("boom", { status: 500 });
  if (/\/work-orders\/wo-1$/.test(url)) return mode === "ok" ? json(200, { data: OS }) : new Response("boom", { status: 500 });
  return json(200, { data: [] });
}) as typeof fetch;
setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Operador"], permissions: [] } });
dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify({ tenantId: "ten-1", tenantName: "T", tenantStatus: "active", branchId: "b", branchName: "B", role: "Operador", permissions: ["work_orders:read"], enabledModules: ["work-orders"], scope: "branch" }));
const container = dom.doc.createElement("div"); dom.doc.body.appendChild(container);
const root = createRoot(container);
await act(async () => { root.render(h(RR.MemoryRouter, { initialEntries: ["/work-orders/wo-1"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(RR.Routes, null, h(RR.Route, { path: "/work-orders/:workOrderId", element: h(WorkOrderDetailPage) }))))))); });
await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const d = (html: string) => `data-state=[${[...html.matchAll(/data-state="([^"]+)"/g)].map((m) => m[1]).join(",")}] OS=${/OS-000901/.test(html)}`;
console.log(`W2-VIVO antes    ${d(serialize(container))} intervalos=${dom.intervals.length}`);
mode = "500";
for (const t of dom.intervals) if (t.fn) await act(async () => { t.fn(); await new Promise((r) => setTimeout(r, 0)); });
await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
console.log(`W2-VIVO 2º plano ${d(serialize(container))}`);
console.log(`rotas chamadas: ${[...seen].sort().join(" ")}`);
await act(async () => root.unmount());
````

Saída no head:

````
W2-VIVO antes    data-state=[] OS=true intervalos=1
W2-VIVO 2º plano data-state=[stale] OS=true
rotas chamadas: /api/v1/approvals/pending /api/v1/work-orders/wo-1 /api/v1/work-orders/wo-1/timeline
````

Sob `N-W2TXT` aplicado in place (restaurado: `hash=287f5588c3ef… blob=287f5588c3ef…`):

````
W2-VIVO antes    data-state=[] OS=true intervalos=1
W2-VIVO 2º plano data-state=[error] OS=false
````

### Apêndice D — runner das mutações nomeadas, sonda de service e logs

**`mut/run.mjs`** — runner: aplica in place, mede bloco/tsc/smoke/sonda, restaura com prova de hash

````js
// Runner de mutações do planejador (B-SAN3-01b). Aplica cada mutação IN PLACE no worktree, mede, e RESTAURA com prova
// (git hash-object == blob do HEAD; arquivos criados removidos; git status só com o plano). Uso: node run.mjs [ids...]
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
const WT = "/home/user/w-b-san3-01b", FE = `${WT}/frontend`, S = "/tmp/claude-0/-home-user-ERP-Techsolutios/04df6954-e279-5e2a-838d-c3ee70c95064/scratchpad/planos/b-san3-01b";
const sh = (cmd, cwd = FE, t = 600) => { try { return { out: execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: t * 1000, env: { ...process.env, VITE_USE_MOCKS: "false" }, maxBuffer: 64 << 20 }), ec: 0 }; } catch (e) { return { out: `${e.stdout ?? ""}${e.stderr ?? ""}`, ec: e.status ?? 1 }; } };
const counts = (log) => ["tests", "pass", "fail"].map((k) => (log.match(new RegExp(`^# ${k} (\\d+)`, "m")) ?? [])[1]).join("/");
const reds = (log) => [...log.matchAll(/^not ok \d+ - (\[[A-Z0-9-]+\])/gm)].map((m) => m[1]).join(" ") || "(nenhum)";
const MUT = {
  "N-PG-PAINEL": { edit: [["src/modules/work-orders/pages/WorkOrdersPage.tsx", "<WorkOrdersLoadState status={status} message={error} onRetry={() => void refresh()} />", '<WorkOrdersLoadState status="empty" message={error} onRetry={() => void refresh()} />']], probe: "page" },
  "N-PG-KPI": { edit: [["src/modules/work-orders/pages/WorkOrdersPage.tsx", 'const degraded = kind === "failure";', 'const degraded = kind === "pending";']], probe: "page" },
  "N-W1TXT": { edit: [["src/modules/work-orders/useWorkOrders.ts", "setState((prev) => nextListState(prev, result, background));", "setState((prev) => { const background = false; return nextListState(prev, result, background); });"]], probe: "page" },
  "N-S1ERR": { edit: [["src/modules/work-orders/pages/WorkOrderCreatePage.tsx", "        setSaving,\n        setError,\n", "        setSaving,\n        setError: () => undefined,\n"]], probe: null },
  "N-W2TXT": { edit: [["src/modules/work-orders/useWorkOrderDetail.ts", "@@W2@@", null]], probe: null },
  "N-BARREL1": { create: { "src/modules/work-orders/reexport-a.ts": 'export * from "./work-orders.mock";\n', "src/modules/work-orders/mut-summary.service.ts": 'import { ApiError, apiRequest } from "../../services/api/client";\nimport { getMockWorkOrderDetail } from "./reexport-a";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch (e) { void (e instanceof ApiError); return getMockWorkOrderDetail(id); } }\n' }, sonda: ["src/modules/work-orders/mut-summary.service.ts", "getSummary"] },
  "N-BARREL2": { create: { "src/modules/work-orders/reexport-a.ts": 'export * from "./work-orders.mock";\n', "src/modules/work-orders/reexport-b.ts": 'export * from "./reexport-a";\n', "src/modules/work-orders/mut-summary.service.ts": 'import { ApiError, apiRequest } from "../../services/api/client";\nimport { getMockWorkOrderDetail } from "./reexport-b";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch (e) { void (e instanceof ApiError); return getMockWorkOrderDetail(id); } }\n' }, sonda: ["src/modules/work-orders/mut-summary.service.ts", "getSummary"] },
  "N-LITERAL": { create: { "src/modules/work-orders/mut-summary.service.ts": 'import { apiRequest } from "../../services/api/client";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch { return { id: "", code: "OS-FALLBACK", title: "Ordem de servico indisponivel", status: "open" }; } }\n' }, sonda: ["src/modules/work-orders/mut-summary.service.ts", "getSummary"] },
  "N-FORA-RAIZ": { edit: [["src/modules/registry/service-quotes/useServiceQuoteReferences.ts", 'import type { ServiceQuoteReferenceOption } from "./service-quotes.types";', 'import type { ServiceQuoteReferenceOption } from "./service-quotes.types";\nimport { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";\nexport const workOrderOptionsFallback = () => getMockWorkOrdersData("mock").items.map((o) => ({ id: o.id, label: o.code }));']], probe: null },
};
// W2: a forma do N-W1TXT no hook do detalhe (lida do arquivo para casar a linha exata)
{
  const t = readFileSync(`${FE}/src/modules/work-orders/useWorkOrderDetail.ts`, "utf8");
  const m = t.match(/setState\(\(prev\) => nextDetailState\(prev, \{ detail, timeline \}, background\)\);/);
  MUT["N-W2TXT"].edit = [["src/modules/work-orders/useWorkOrderDetail.ts", m ? m[0] : "@@nao-casou@@", "setState((prev) => { const background = false; return nextDetailState(prev, { detail, timeline }, background); });"]];
}
const blob = (f) => sh(`git rev-parse HEAD:frontend/${f}`, WT).out.trim();
const hash = (f) => sh(`git hash-object frontend/${f}`, WT).out.trim();
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MUT);
for (const id of ids) {
  const m = MUT[id]; const backups = []; const created = [];
  let applied = true;
  for (const [f, find, repl] of m.edit ?? []) {
    const p = `${FE}/${f}`; const txt = readFileSync(p, "utf8"); const n = txt.split(find).length - 1;
    if (n !== 1) { console.log(`[${id}] find casou ${n}x em ${f} — NÃO aplicada`); applied = false; break; }
    backups.push([p, txt, f]); writeFileSync(p, txt.replace(find, repl));
  }
  for (const [f, body] of Object.entries(m.create ?? {})) { const p = `${FE}/${f}`; if (existsSync(p)) throw new Error(`já existe ${f}`); writeFileSync(p, body); created.push(p); }
  let line = `[${id}]`;
  if (applied) {
    const diff = sh("git diff -U0 --no-color -- frontend/src | grep -E '^[-+][^-+]' || true", WT).out.trim().split("\n").slice(0, 4).join(" ‖ ");
    const bloco = sh("node --test --import tsx tests/work-orders-honest-errors.test.tsx", FE, 300);
    const tsc = sh("rm -f tsconfig.tsbuildinfo; npx tsc -b --noEmit --force", FE, 300);
    const smoke = sh("npm run test:smoke", FE, 600);
    line += ` diff: ${diff}${created.length ? ` · criados: ${created.map((p) => p.replace(FE + "/", "")).join(", ")}` : ""}\n  bloco ${counts(bloco.out)} ec=${bloco.ec} vermelhos=${reds(bloco.out)} | tsc ec=${tsc.ec}${tsc.ec ? " " + (tsc.out.match(/error TS\d+[^\n]*/) ?? [""])[0] : ""} | smoke ${counts(smoke.out)} ec=${smoke.ec}`;
    if (m.probe === "page") { const pr = sh(`node --import tsx ${S}/proto/probe-page-viva.mts`, FE, 180); line += `\n  PAGINA-VIVA: ${pr.out.trim().split("\n").filter((l) => /^(PAGINA|W1)/.test(l)).join(" ‖ ")}${pr.ec ? ` (ec=${pr.ec})` : ""}`; }
    if (m.sonda) { const so = sh(`node --import tsx ${S}/mut/sonda-service.mts ${m.sonda[0]} ${m.sonda[1]}`, FE, 120); line += `\n  ${so.out.trim().split("\n").filter((l) => l.startsWith("SONDA")).join(" ") || so.out.trim().slice(-300)}`; }
  }
  for (const [p, txt] of backups) writeFileSync(p, txt);
  for (const p of created) rmSync(p);
  const proof = backups.map(([, , f]) => `${f.split("/").pop()} hash=${hash(f).slice(0, 12)} blob=${blob(f).slice(0, 12)} ${hash(f) === blob(f) ? "OK" : "DIVERGE"}`).concat(created.map((p) => `${p.replace(FE + "/", "")} existe=${existsSync(p)}`));
  const st = sh("git status --porcelain --untracked-files=all", WT).out.trim().split("\n").filter((l) => l && !l.includes("B-SAN3-01b-plano.md"));
  line += `\n  restauro: ${proof.join(" · ")} · git status (fora o plano): ${JSON.stringify(st)}`;
  console.log(line);
}
````

**`mut/sonda-service.mts`** — sonda de service em modo real com backend 500

````ts
// Sonda: chama um service (arquivo mutante) em MODO REAL com backend 500 e imprime o que ele devolve. Uso: node --import tsx sonda-service.mts <arquivo relativo a frontend/> <export>
import { pathToFileURL } from "node:url";
const FE = "/home/user/w-b-san3-01b/frontend/";
const g = globalThis as unknown as { window?: Record<string, unknown> };
g.window ??= {}; g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }; g.window.dispatchEvent ??= () => true;
process.env.VITE_USE_MOCKS = "false";
globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
const [file, fn] = process.argv.slice(2);
const mod = await import(pathToFileURL(FE + file).href);
const out = await mod[fn]({ token: "t", tenantId: "ten-1" }, "wo-x");
console.log(`SONDA ${file}#${fn} (VITE_USE_MOCKS=false, backend 500) → id=${JSON.stringify(out?.id)} code=${JSON.stringify(out?.code)} title=${JSON.stringify(out?.title)}`);
````

`node mut/run.mjs N-PG-PAINEL N-PG-KPI N-W1TXT`:

````
[N-PG-PAINEL] diff: -        <WorkOrdersLoadState status={status} message={error} onRetry={() => void refresh()} /> ‖ +        <WorkOrdersLoadState status="empty" message={error} onRetry={() => void refresh()} />
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  PAGINA-VIVA: PAGINA-VIVA 403      (read+create) data-state=[empty] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 500      (read+create) data-state=[empty] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=0 ordens pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 403      (só read)     data-state=[empty] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1 ‖ W1-VIVO 2º plano   data-state=[stale] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=true skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=1 detalheErro="-" hora=true
  restauro: WorkOrdersPage.tsx hash=dbae6f97eb69 blob=dbae6f97eb69 OK · git status (fora o plano): []
[N-PG-KPI] diff: -  const degraded = kind === "failure"; ‖ +  const degraded = kind === "pending";
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  PAGINA-VIVA: PAGINA-VIVA 403      (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 500      (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 403      (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1 ‖ W1-VIVO 2º plano   data-state=[stale] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=true skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=1 detalheErro="-" hora=true
  restauro: WorkOrdersPage.tsx hash=dbae6f97eb69 blob=dbae6f97eb69 OK · git status (fora o plano): []
[N-W1TXT] diff: -    setState((prev) => nextListState(prev, result, background)); ‖ +    setState((prev) => { const background = false; return nextListState(prev, result, background); });
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  PAGINA-VIVA: PAGINA-VIVA 403      (read+create) data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 500      (read+create) data-state=[error] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=true stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=1 detalheErro="A consulta às ordens de serviço falhou. Tente novamente em instantes." hora=false ‖ PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=0 ordens pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 403      (só read)     data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1 ‖ W1-VIVO 2º plano   data-state=[error] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=true stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=1 detalheErro="A consulta às ordens de serviço falhou. Tente novamente em instantes." hora=false
  restauro: useWorkOrders.ts hash=d6afd5466242 blob=d6afd5466242 OK · git status (fora o plano): []
````

`node mut/run.mjs N-BARREL1 N-BARREL2 N-LITERAL N-FORA-RAIZ N-W2TXT`:

````
[N-BARREL1] diff:  · criados: src/modules/work-orders/reexport-a.ts, src/modules/work-orders/mut-summary.service.ts
  bloco 67/66/1 ec=1 vermelhos=[G1] | tsc ec=0 | smoke 1202/1201/1 ec=1
  SONDA src/modules/work-orders/mut-summary.service.ts#getSummary (VITE_USE_MOCKS=false, backend 500) → id="11111111-1111-4111-8111-000000000001" code="OS-000101" title="Coleta de veiculo para reboque"
  restauro: src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false · git status (fora o plano): []
[N-BARREL2] diff:  · criados: src/modules/work-orders/reexport-a.ts, src/modules/work-orders/reexport-b.ts, src/modules/work-orders/mut-summary.service.ts
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  SONDA src/modules/work-orders/mut-summary.service.ts#getSummary (VITE_USE_MOCKS=false, backend 500) → id="11111111-1111-4111-8111-000000000001" code="OS-000101" title="Coleta de veiculo para reboque"
  restauro: src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/reexport-b.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false · git status (fora o plano): []
[N-LITERAL] diff:  · criados: src/modules/work-orders/mut-summary.service.ts
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  SONDA src/modules/work-orders/mut-summary.service.ts#getSummary (VITE_USE_MOCKS=false, backend 500) → id="" code="OS-FALLBACK" title="Ordem de servico indisponivel"
  restauro: src/modules/work-orders/mut-summary.service.ts existe=false · git status (fora o plano): []
[N-FORA-RAIZ] diff: +import { getMockWorkOrdersData } from "../../work-orders/work-orders.mock"; ‖ +export const workOrderOptionsFallback = () => getMockWorkOrdersData("mock").items.map((o) => ({ id: o.id, label: o.code }));
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  restauro: useServiceQuoteReferences.ts hash=f8cd68f622c5 blob=f8cd68f622c5 OK · git status (fora o plano): []
[N-W2TXT] diff: -    setState((prev) => nextDetailState(prev, { detail, timeline }, background)); ‖ +    setState((prev) => { const background = false; return nextDetailState(prev, { detail, timeline }, background); });
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  restauro: useWorkOrderDetail.ts hash=287f5588c3ef blob=287f5588c3ef OK · git status (fora o plano): []
````

`node mut/run.mjs N-S1ERR`:

````
[N-S1ERR] diff: -        setError, ‖ +        setError: () => undefined,
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  restauro: WorkOrderCreatePage.tsx hash=bad025869aaf blob=bad025869aaf OK · git status (fora o plano): []
````

### Apêndice E — papel × gate na página viva (L3)

**`proto/probe-gate.mts`** — os 13 papéis de ROLE_PERMISSIONS executados contra a página viva

````ts
// PROTÓTIPO — CE-G2 gerado: para CADA papel do ROLE_PERMISSIONS (catálogo EXECUTADO, importado da árvore do backend),
// a página REAL com 3 OS: o botão "Nova OS" do cabeçalho aparece? (esperado: sse o papel tem work_orders:create)
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { installMiniDom, serialize } from "./minidom.mjs";
const WT = "/home/user/w-b-san3-01b"; const FE = `${WT}/frontend/`;
const dom = installMiniDom();
process.env.VITE_USE_MOCKS = "false";
const req = createRequire(`${FE}package.json`);
const React = req("react"); const { createRoot } = req("react-dom/client");
const RR = await import(pathToFileURL(`${FE}node_modules/react-router-dom/dist/index.mjs`).href);
const imp = (p: string) => import(pathToFileURL(`${FE}${p}`).href);
const { WorkOrdersPage } = await imp("src/modules/work-orders/pages/WorkOrdersPage.tsx");
const { AuthProvider } = await imp("src/providers/AuthProvider.tsx");
const { TenantProvider } = await imp("src/providers/TenantProvider.tsx");
const { PermissionProvider } = await imp("src/providers/PermissionProvider.tsx");
const { setStoredAuthSession } = await imp("src/modules/auth/auth.storage.ts");
const { mockSession } = await imp("src/mocks/auth/context.ts");
const { ROLE_PERMISSIONS } = await import(pathToFileURL(`${WT}/src/modules/core-saas/permissions/catalog.ts`).href);
const h = React.createElement; const act = React.act as (cb: () => unknown) => Promise<void>;
const wo = (id: string) => ({ id, code: `OS-${id}`, title: "t", status: "open", priority: "high", created_at: "2026-09-01T10:00:00.000Z" });
globalThis.fetch = (async () => new Response(JSON.stringify({ data: { items: [wo("1"), wo("2"), wo("3")], pagination: { limit: 20, offset: 0, total: 3 } } }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
let wrong = 0;
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS as Record<string, string[]>)) {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: [], permissions: [] } });
  dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify({ tenantId: "t", tenantName: "T", tenantStatus: "active", branchId: "b", branchName: "B", role, permissions: [...perms], enabledModules: ["work-orders"], scope: "branch" }));
  const c = dom.doc.createElement("div"); dom.doc.body.appendChild(c); const root = createRoot(c);
  await act(async () => { root.render(h(RR.MemoryRouter, null, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(WorkOrdersPage)))))); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  const html = serialize(c);
  const header = (html.match(/Nova OS/g) ?? []).length; const esperado = perms.includes("work_orders:create") ? 1 : 0;
  const atribuir = (html.match(/Atribuir técnico/g) ?? []).length; const espA = perms.includes("field_dispatch:create") ? 3 : 0;
  if (header !== esperado || atribuir !== espA) wrong++;
  console.log(`${role.padEnd(16)} create=${esperado ? "sim" : "não"} 'Nova OS'=${header} ${header === esperado ? "ok" : "ERRADO"} · dispatch=${espA ? "sim" : "não"} 'Atribuir'=${atribuir} ${atribuir === espA ? "ok" : "ERRADO"}`);
  await act(async () => root.unmount());
}
console.log(`# papéis: ${Object.keys(ROLE_PERMISSIONS).length} · divergentes do catálogo: ${wrong}`);
````

Saída no head:

````
super_admin      create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
tenant_admin     create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
manager          create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
technician       create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
field_dispatcher create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
viewer           create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
platform_admin   create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
operator         create=sim 'Nova OS'=1 ok · dispatch=não 'Atribuir'=0 ok
finance          create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
inventory        create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
field_technician create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
auditor          create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
support          create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
# papéis: 13 · divergentes do catálogo: 7
````

**`fechamento/e4-proto.mjs`** — o protótipo do conserto (E4) aplicado **in place**, medido (gate × 13 papéis, bloco, `tsc`, smoke) e restaurado com prova de hash (verbatim; reexecutado pela instância 3):

````js
// B-SAN3-01b — protótipo do E4 (gate do botão "Nova OS") aplicado IN PLACE, medido, e RESTAURADO com prova de hash.
// Uso: (cwd <worktree>/frontend) node e4-proto.mjs   — imprime o diff aplicado, probe-gate, bloco, tsc, smoke, restauro.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const WT = "/home/user/w-b-san3-01b", FE = `${WT}/frontend`, S = process.env.S;
const P = `${FE}/src/modules/work-orders/pages/WorkOrdersPage.tsx`;
const sh = (cmd, cwd = FE, t = 600) => { try { return { out: execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: t * 1000, env: { ...process.env, VITE_USE_MOCKS: "false" }, maxBuffer: 64 << 20 }), ec: 0 }; } catch (e) { return { out: `${e.stdout ?? ""}${e.stderr ?? ""}`, ec: e.status ?? 1 }; } };
const counts = (log) => ["tests", "pass", "fail"].map((k) => (log.match(new RegExp(`^# ${k} (\\d+)`, "m")) ?? [])[1]).join("/");
const FIND = `          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
            <Plus size={15} aria-hidden="true" />
            Nova OS
          </button>
        }`;
const REPL = `          canCreate ? (
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
              <Plus size={15} aria-hidden="true" />
              Nova OS
            </button>
          ) : undefined
        }`;
const orig = readFileSync(P, "utf8");
if (orig.split(FIND).length !== 2) throw new Error("FIND não casou exatamente 1x");
writeFileSync(P, orig.replace(FIND, REPL));
try {
  console.log("## diff aplicado (git diff -U2)");
  console.log(sh("git diff -U2 --no-color -- frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", WT).out.trim());
  const gate = sh(`node --import tsx ${S}/proto/probe-gate.mts`, FE, 180);
  console.log(`## probe-gate ec=${gate.ec}\n${gate.out.trim().split("\n").filter((l) => /ERRADO|^# papéis/.test(l)).join("\n")}`);
  const bloco = sh("node --test --import tsx tests/work-orders-honest-errors.test.tsx", FE, 300);
  const tsc = sh("rm -f tsconfig.tsbuildinfo; npx tsc -b --noEmit --force", FE, 300);
  const smoke = sh("npm run test:smoke", FE, 600);
  console.log(`## bloco ${counts(bloco.out)} ec=${bloco.ec} | tsc ec=${tsc.ec} | smoke ${counts(smoke.out)} ec=${smoke.ec}`);
} finally {
  writeFileSync(P, orig);
  const h = sh("git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", WT).out.trim();
  const b = sh("git rev-parse HEAD:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", WT).out.trim();
  console.log(`## restauro hash=${h.slice(0, 12)} blob=${b.slice(0, 12)} ${h === b ? "OK" : "DIVERGE"} · git status: ${JSON.stringify(sh("git status --porcelain", WT).out.trim().split("\n"))}`);
  sh("rm -f tsconfig.tsbuildinfo", FE);
}
````

Saída (`S=<rascunho> node fechamento/e4-proto.mjs`, cwd `frontend/`):

````
## diff aplicado (git diff -U2)
diff --git a/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx b/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
index dbae6f9..98ef352 100644
--- a/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
+++ b/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
@@ -247,8 +247,10 @@ export function WorkOrdersPage() {
           // "Filtrar" omitido (filtros reais são inline na toolbar) e "Exportar" omitido
           // (sem ação de exportação real nesta tela) — nunca botão morto.
-          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
-            <Plus size={15} aria-hidden="true" />
-            Nova OS
-          </button>
+          canCreate ? (
+            <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
+              <Plus size={15} aria-hidden="true" />
+              Nova OS
+            </button>
+          ) : undefined
         }
       />
## probe-gate ec=0
# papéis: 13 · divergentes do catálogo: 0
## bloco 67/67/0 ec=0 | tsc ec=0 | smoke 1202/1202/0 ec=0
## restauro hash=dbae6f97eb69 blob=dbae6f97eb69 OK · git status: ["?? docs/revisoes/SAN3/B-SAN3-01b-plano.md"]
````

### Apêndice F — catálogo executado, atalho de plataforma e modo de demonstração

**`gen/papeis.mts`** — quem tem work_orders:read/create e field_dispatch:create (CE-G2)

````ts
// Gera, EXECUTANDO o catálogo da ref, quem tem work_orders:create / :read / field_dispatch:create (CE-G2).
import { pathToFileURL } from "node:url";
const WT = process.env.WT ?? "/home/user/w-b-san3-01b";
const cat = await import(pathToFileURL(`${WT}/src/modules/core-saas/permissions/catalog.ts`).href);
const RP = cat.ROLE_PERMISSIONS as Record<string, readonly string[]>;
const roles = Object.keys(RP);
console.log(`# papéis no ROLE_PERMISSIONS: ${roles.length} → ${roles.join(", ")}`);
for (const perm of ["work_orders:read", "work_orders:create", "field_dispatch:create"]) {
  const com = roles.filter((r) => RP[r].includes(perm));
  console.log(`${perm.padEnd(22)} COM: ${com.join(", ") || "-"}  |  SEM: ${roles.filter((r) => !com.includes(r)).join(", ")}`);
}
const readSemCreate = roles.filter((r) => RP[r].includes("work_orders:read") && !RP[r].includes("work_orders:create"));
console.log(`# read SEM create (veem a lista e hoje veem o botão 'Nova OS' que o backend recusa): ${readSemCreate.join(", ")}`);
````

````
# papéis no ROLE_PERMISSIONS: 13 → super_admin, tenant_admin, manager, technician, field_dispatcher, viewer, platform_admin, operator, finance, inventory, field_technician, auditor, support
work_orders:read       COM: super_admin, tenant_admin, manager, technician, field_dispatcher, viewer, platform_admin, operator, finance, field_technician, auditor  |  SEM: inventory, support
work_orders:create     COM: super_admin, tenant_admin, manager, field_dispatcher, platform_admin, operator  |  SEM: technician, viewer, finance, inventory, field_technician, auditor, support
field_dispatch:create  COM: super_admin, tenant_admin, manager, field_dispatcher, platform_admin  |  SEM: technician, viewer, operator, finance, inventory, field_technician, auditor, support
# read SEM create (veem a lista e hoje veem o botão 'Nova OS' que o backend recusa): technician, viewer, finance, field_technician, auditor
````

**`gen/bypass.mts`** — papéis com o atalho isPlatformAdmin do front × create

````ts
import { pathToFileURL } from "node:url";
const cat = await import(pathToFileURL("/home/user/w-b-san3-01b/src/modules/core-saas/permissions/catalog.ts").href);
const RP = cat.ROLE_PERMISSIONS as Record<string, readonly string[]>;
const bypass = Object.keys(RP).filter((r) => RP[r].includes("platform:tenants:read"));
console.log(`papéis com platform:tenants:read (bypass isPlatformAdmin do front): ${bypass.join(", ") || "-"}; destes SEM work_orders:create: ${bypass.filter((r) => !RP[r].includes("work_orders:create")).join(", ") || "nenhum"}`);
````

````
papéis com platform:tenants:read (bypass isPlatformAdmin do front): super_admin, platform_admin; destes SEM work_orders:create: nenhum
````

**`gen/mockmode.mts`** — o que a coluna de OS recebe em modo de demonstração e em modo real

````ts
import { pathToFileURL } from "node:url";
const FE = "/home/user/w-b-san3-01b/frontend/";
(globalThis as any).window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, dispatchEvent: () => true };
process.env.VITE_USE_MOCKS = process.argv[2];
const svc = await import(pathToFileURL(FE + "src/modules/work-orders/work-orders.service.ts").href);
const cs = await import(pathToFileURL(FE + "src/modules/registry/customers/customers.service.ts").href);
globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
const wo = await svc.listWorkOrdersFromApi({ token: "t", tenantId: "x" }, {});
const c = await cs.listCustomersFromApi({ token: "t", tenantId: "x" }, { search: "", isActive: "active", limit: 100 });
console.log(`VITE_USE_MOCKS=${process.argv[2]} → OS: source=${wo.source} itens=${wo.items.length} · clientes: source=${c.source} itens=${c.items.length}`);
````

````
VITE_USE_MOCKS=true → OS: source=mock itens=6 · clientes: source=mock itens=0
VITE_USE_MOCKS=false → OS: source=fallback itens=0 · clientes: source=fallback itens=0
````

### Apêndice G — evidência incremental da instância 2 (P1), verbatim

(Uma palavra da linha `12:19:16Z` — a primeira das duas que o mandato veda mencionar — foi trocada por "efeito colateral"; nada mais foi alterado. A evidência da instância 3 está no Apêndice H4.)

````
# Evidência — planejador-mestre B-SAN3-01b — instância 2 (Opus, fallback §C7.6-bis). Formato P1: comando → saída resumida → veredito parcial
2026-09-30T11:27:29Z | git fetch origin; git rev-parse origin/main HEAD → 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c ×2 → worktree em origin/main
2026-09-30T11:27:29Z | git status --short (início) → '?? docs/revisoes/SAN3/B-SAN3-01b-plano.md' + '?? frontend/tests/_probe-page-real.test.tsx' → resíduo da instância caída (Fable) no worktree
2026-09-30T11:27:29Z | readlink scratch/node_modules → /home/user/w-b-san3-01b/frontend/node_modules → symlink de node_modules criado pela instância caída (proibido §C7.1-ter(c)); unlink (só o link); ls frontend/node_modules|wc -l → 61 antes e depois; react/package.json presente → intacto
2026-09-30T11:27:29Z | rm frontend/tests/_probe-page-real.test.tsx (cópia preservada em scratch/caida/) → git status só com o plano → worktree devolvido ao estado do mandato
2026-09-30T11:29:00Z | git show origin/main:.claude/agents/planejador-mestre.md → model: fable; fallback Opus declarado → papel e degrau conferidos
2026-09-30T11:29:00Z | git show origin/docs/plano-b-san3-05:docs/revisoes/SAN3/B-SAN3-05-plano.md → 1292 linhas, §0..§14 + apêndices → molde adotado
2026-09-30T11:29:00Z | git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md | grep -n -i 01b → só l.266 (linha do §5.3); §6 (l.332-367) sem 01b → 01b FORA da agenda; travas por arquivo: SAN3-08 (registry/service-quotes/**), SAN3-25 (serviço de OS em work-orders/**), SAN3-21 (textos)
2026-09-30T11:29:00Z | pendencias.md:9487/9555/9564/9573 lidas na ref → 4 pendências, dono B-SAN3-01b; testes de encerramento anotados
2026-09-30T11:29:00Z | decisoes.md:2365-2390 D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA → obriga (i) página REAL, (ii) barrel N níveis + literal inline, A-03 no mesmo bloco, texto dos cabeçalhos
2026-09-30T11:29:00Z | J-B-SAN3-01.md + votos/B-SAN3-01-c2/C4-* → mutações N-PG-PAINEL, N-PG-KPI, N-W1TXT, N-BARREL1(ctrl), N-BARREL2, N-LITERAL, N-FORA-RAIZ; objeto 8adaaa31; herdado, a reexecutar em 3b1fe0f9
2026-09-30T11:36:17Z | (cwd frontend, VITE_USE_MOCKS=false) node --test --import tsx tests/work-orders-honest-errors.test.tsx → # tests 67 · pass 67 · fail 0 (1,9 s) → baseline do arquivo do bloco = 67 (o "67/67" da linha do §5 REPRODUZ no head 3b1fe0f9)
2026-09-30T11:36:17Z | npm run check → ec=0 (16,5 s; deixa frontend/tsconfig.tsbuildinfo, ignorado) → baseline tsc verde
2026-09-30T11:36:17Z | npm run test:smoke → # tests 1202 · pass 1202 · fail 0 · skipped 0 (30,4 s); 142 arquivos na lista → baseline smoke = 1202
2026-09-30T11:36:17Z | proto/probe-page-viva.mts (minidom.mjs ~80 l., react-dom/client + React.act, SEM dependência nova) → PÁGINA REAL + HOOK REAL com efeitos: 403→[forbidden] KPIs —; 500→[error]+alert; 200vazio→[empty] KPIs 0; 200x3→3 linhas; só read: 'Nova OS'=1 (botão do cabeçalho sem gate); W1 vivo: 3 OS + 500 em 2º plano → [stale], 3 linhas → técnica VIÁVEL
2026-09-30T11:44:22Z | mut/run.mjs N-PG-PAINEL → bloco 67/67/0, tsc ec=0, smoke 1202/1202/0 (VERDE); página viva: 403 e 500 → [empty] → DEFEITO DE GUARDA REPRODUZIDO; restauro hash=blob OK, status limpo
2026-09-30T11:44:22Z | mut/run.mjs N-PG-KPI → 67/67, tsc 0, smoke 1202 (VERDE); página viva: 403/500 → [empty] KPIs 0|0|0|0 → REPRODUZIDO; restauro OK
2026-09-30T11:44:22Z | mut/run.mjs N-W1TXT → 67/67, tsc 0, smoke 1202 (VERDE); página viva W1: 2º plano → [error] (era [stale]) → REPRODUZIDO; a técnica viva DISTINGUE; restauro OK
2026-09-30T11:44:22Z | mut/run.mjs N-BARREL1 (controle) → 67/66/1 [G1] VERMELHO, smoke 1201/1; sonda: OS-000101 fabricada → o G1 vê 1 nível
2026-09-30T11:44:22Z | mut/run.mjs N-BARREL2 → 67/67, tsc 0, smoke 1202 (VERDE); sonda: id=11111111-…-000000000001 code=OS-000101 → REPRODUZIDO
2026-09-30T11:44:22Z | mut/run.mjs N-LITERAL → 67/67, tsc 0, smoke 1202 (VERDE); sonda: id="" code=OS-FALLBACK → REPRODUZIDO
2026-09-30T11:44:22Z | mut/run.mjs N-FORA-RAIZ (useServiceQuoteReferences.ts, import de work-orders.mock sem guarda) → 67/67, tsc 0, smoke 1202 (VERDE) → arquivo da fronteira fora do alcance do G1
2026-09-30T11:44:22Z | mut/run.mjs N-W2TXT (useWorkOrderDetail.ts, fora da fronteira) → 67/67, tsc 0, smoke 1202 (VERDE) → mesma classe do W1 no hook do detalhe
2026-09-30T11:51:51Z | gen/alcance.mjs . (head) → RAÍZES 81 arq · FECHO 48 arq · P-A raízes: 20 refs, 0 vazamentos · P-B raízes: 0 · fecho: 2 refs, 0 vaz. → propriedade VALE hoje; guard gerado fica verde no head
2026-09-30T11:51:51Z | gen/alcance.mjs --overlay ctl/C1..C12 → C1 barrel1, C2 barrel2, C3 barrel3+rename, C5 barrel fora das raízes, C7 re-export local, C8 fora-raiz, C10 default, C12 import() via barrel2 → VAZA-RAIZ; C6 helper fora embrulhando mock → VAZA-FECHO; C4/C11 literal → FABRICA-RAIZ; C9 guardado e C11 {id, workOrder:null} → 0 → controles OK
2026-09-30T11:51:51Z | grep G1/por alcance em src → 3 textos: dispatches.service.ts:25-27, repository.ts:6-8, work-orders.service.ts:29-32 (este FORA da fronteira do §5) → lista gerada dos cabeçalhos
2026-09-30T11:51:51Z | find src -iname '*demo*|*fixture*|*sample*|*fake*|*seed*|*stub*' → 0; grep aliases '@/' → 0 → residuais R1/R6 vazios hoje
2026-09-30T11:51:51Z | node /opt/node20 v20.20.2 → sonda viva idêntica (md5) em Node 20 e 22 após shim de navigator; bloco 67/67 e smoke 1202/1202 em Node 20 → a CI (node-version 20) roda a técnica
2026-09-30T11:51:51Z | gen/sitios-pagina.mjs --run (sonda viva) → 39 sítios de decisão gerados do AST; 30 distinguidos pela matriz de cenários; 9 não (fiação de interação: onRetry do banner, filtered, onAdvance, onRevoke, onPrev/onNext/canPrev/canNext, onConfirm); restauro por hash em cada um
2026-09-30T11:59:23Z | gen/papeis.mts (ROLE_PERMISSIONS executado) → 13 papéis; work_orders:create COM super_admin,tenant_admin,manager,field_dispatcher,platform_admin,operator; read SEM create: technician,viewer,finance,field_technician,auditor → CE-G2 medido
2026-09-30T11:59:23Z | src/modules/work-orders/work-order.routes.ts:111-116 POST /work-orders requirePermission(work_orders:create); app.ts:137 monta em /api/v1; rbac.middleware.ts:30 includes estrito (sem bypass) → rota comparada
2026-09-30T11:59:23Z | frontend App.tsx:776-780 PermissionGuard hasAny([work_orders:create]) (bypass isPlatformAdmin); papéis com platform:tenants:read = super_admin, platform_admin, ambos COM create → impacto 0 nos papéis do catálogo
2026-09-30T11:59:23Z | proto/probe-gate.mts (página viva × 13 papéis) → 'Nova OS' do cabeçalho presente em 7 papéis SEM create (technician,viewer,finance,inventory,field_technician,auditor,support) → DEFEITO medido; 'Atribuir' correto 13/13
2026-09-30T11:59:23Z | protótipo do conserto (actions={canCreate ? … : undefined}) in place → 0/13 divergentes, bloco 67/67, tsc 0; restaurado hash=blob → conserto viável, não entregue
2026-09-30T11:59:23Z | proto/probe-detalhe-viva.mts → W2 vivo: OS + 500 em 2º plano → [stale] OS na tela; sob N-W2TXT → [error] OS some → W2 por comportamento viável SEM tocar useWorkOrderDetail.ts
2026-09-30T11:59:23Z | gen/sitios-pagina.mjs --oracle "node --test … work-orders-honest-errors.test.tsx" → VERMELHO 0/39 → a suíte do bloco de hoje não vê NENHUM sítio de decisão da página
2026-09-30T11:59:23Z | git for-each-ref origin (139 ramos) × fronteira → só origin/demo/investidor (último commit 2026-08-29, base 2026-08-19, 49 commits, toca WorkOrdersPage.tsx) → ramo de demonstração parado, não é bloco da agenda
2026-09-30T11:59:23Z | tests/kpi-*.test.ts 29/29; kpi-freeze --check em dia (2026-09-28); node --check Kpis/app.js ok → baseline KPI
2026-09-30T12:05:34Z | git log -S 'navigate("/work-orders/new")' -- WorkOrdersPage.tsx → f4ef511 2026-08-11 (raiz do histórico = git rev-list --max-parents=0) e 83a3c68 (01 acrescentou o CTA) → botão do cabeçalho PRÉ-EXISTENTE ao 01
2026-09-30T12:05:34Z | protótipo do gate + npm run test:smoke → 1202/1202 (smoke-flow l.1435 /Nova OS/ roda com work_orders:create l.1351) → o gate não quebra o smoke; restaurado hash=blob
2026-09-30T12:05:34Z | mut/run.mjs N-S1ERR (WorkOrderCreatePage: setError → no-op) → 67/67, tsc 0, smoke 1202 (VERDE) → S1 textual deixa passar create recusado sem mensagem; e2e E2 (tests/e2e/critical-flows.spec.ts) asserta role=alert, mas NÃO há job e2e na CI (ci.yml: backend, backend-postgres, frontend, owner-portal, authority-portal, flutter, docker) → pendência proposta, dono B-SAN3-10
2026-09-30T12:05:34Z | backend toWorkOrderListDto (work-order.dto.ts:121-150) → {items:[…], pagination:{limit,offset,total}}; 403 = {error:{code:FORBIDDEN,reason,message}} → sonda com o formato DTO dá saída IDÊNTICA à base → fixtures do teste = formato do backend
2026-09-30T12:05:34Z | VITE_USE_MOCKS=true → OS 6 itens (source=mock), clientes 0 → o cabeçalho de useServiceQuoteReferences.ts ("em mock/erro voltam vazios") é FALSO para a coluna de OS em modo mock → texto a corrigir (dentro da fronteira)
2026-09-30T12:05:34Z | pendencias.md:1666 P-SCREEN-REFS-PATH ABERTA → a divergência do §11 já tem registro; git ls-tree origin/main screen-refs/web → 0; docs/claude-code-handoff/screen-refs/web → 35 PNG; README l.36: ordens-servico.png ↔ workOrders
2026-09-30T12:09:24Z | mm2/probe.test.ts (mock.module) sem flag → 'mock.module is not a function' em Node 22.22.2 e 20.20.2; com --experimental-test-module-mocks → ok → alternativa exige mudar o comando do test:smoke (fora da fronteira) → descartada
2026-09-30T12:18:21Z | mut/run.mjs N-PG-PAINEL N-PG-KPI N-W1TXT (reexecutado com a sonda FINAL) → as três VERDES no bloco/tsc/smoke, página viva distingue; restauro hash=blob; git status só o plano
2026-09-30T12:18:40Z | sonda FINAL (proto/probe-page-viva.mts) em /opt/node22 e /opt/node20 → md5 cc4f976035f46fca2e92f6d74c90886d nas duas = md5 de proto/baseline-probe.txt → paridade Node 20/22 com a versão do apêndice
2026-09-30T12:19:16Z | sondas vivas (página e detalhe) 2>stderr → 0 linhas de stderr, 0 'Warning'/'act(' → H3 vira MEDIDO; o teste pode tornar console.error fatal sem efeito colateral
2026-09-30T12:20:34Z | plano preenchido seção a seção (fill.py sobre o esqueleto P2): §0–§14 + apêndices A–G; grep -c do marcador de seção por apurar → 0
2026-09-30T12:20:34Z | git -C /home/user/w-b-san3-01b status --porcelain → só '?? docs/revisoes/SAN3/B-SAN3-01b-plano.md'; nenhuma mutação pendente; cluster NÃO subido (sem premissa de banco)
2026-09-30T12:21:05Z | rm frontend/tsconfig.tsbuildinfo (artefato ignorado do tsc -b das minhas medições; §C5) → git status --ignored só com node_modules e o plano
````

### Apêndice H — medições acrescentadas na conferência pré-commit (instância 3, Fable)

Arquivos em `<rascunho>/fechamento/` (H1, H3, H4) e `<rascunho>/mm2/` (H2). Comandos com cwd = worktree (H1) ou `frontend/` do worktree (H2, H3).

**H1 — `fechamento/ramos.sh`** (P-q: ramos em voo × fronteira; gerado da lista de caminhos do §5 + o arquivo novo)

````bash
#!/usr/bin/env bash
# B-SAN3-01b — ramos em voo × fronteira do bloco (gerado; cwd = worktree em origin/main). Fronteira = os 7 caminhos de
# código/teste da tabela do §5 + o arquivo NOVO que o bloco cria (um ramo que o crie também conflita).
FRONTEIRA='^(frontend/src/modules/work-orders/pages/WorkOrdersPage\.tsx|frontend/src/modules/work-orders/useWorkOrders\.ts|frontend/src/modules/work-orders/repository\.ts|frontend/src/modules/registry/service-quotes/useServiceQuoteReferences\.ts|frontend/src/modules/operations/dispatches/dispatches\.service\.ts|frontend/tests/work-orders-honest-errors\.test\.tsx|frontend/tests/work-orders-page-live\.test\.tsx|frontend/package\.json)$'
n=0; hits=0
for R in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin); do
  [ "$R" = "origin/main" ] && continue
  n=$((n+1))
  B=$(git merge-base origin/main "$R") || continue
  T=$(git diff --name-only "$B" "$R" | grep -E "$FRONTEIRA")
  if [ -n "$T" ]; then hits=$((hits+1)); echo "$R (base $(git log -1 --format='%h %cs' $B); último $(git log -1 --format='%h %cs' $R); $(git rev-list --count $B..$R) commits)"; echo "$T" | sed 's/^/    /'; fi
done
echo "# refs remotos (sem origin/main): $n · ramos que tocam a fronteira: $hits · medido em origin/main=$(git rev-parse --short origin/main) $(date -u +%FT%TZ)"
````

Saída (`bash ramos.sh`, após `git fetch origin`):

````
origin/demo/investidor (base 6efe5ad 2026-08-19; último d1fab3b 2026-08-29; 49 commits)
    frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
# refs remotos (sem origin/main): 142 · ramos que tocam a fronteira: 1 · medido em origin/main=3b1fe0f 2026-09-30T12:58:03Z
# total refs/remotes/origin (com origin/main): 143
````

**H2 — `mm2/real.ts`, `mm2/consumer.ts`, `mm2/probe.test.ts`** (§2.2 (i): a alternativa `mock.module` exige flag no comando do `test:smoke`)

````ts
// mm2/real.ts
export function who() { return "real"; }
// mm2/consumer.ts
import { who } from "./real.ts";
export function tell() { return `consumer sees ${who()}`; }
// mm2/probe.test.ts
import test, { mock } from "node:test";
import assert from "node:assert/strict";
test("mock.module + tsx", async () => {
  mock.module(new URL("./real.ts", import.meta.url).href, { namedExports: { who: () => "MOCK" } });
  const m = await import("./consumer.ts");
  console.log("RESULT:", m.tell());
  assert.equal(m.tell(), "consumer sees MOCK");
});
````

Comando: `(cwd frontend) VITE_USE_MOCKS=false node --test [--experimental-test-module-mocks] --import tsx <rascunho>/mm2/probe.test.ts`, em Node 22.22.2 e 20.20.2:

````
v22.22.2 flag='(sem)' ec=1 :: not ok 1 import_node_test.mock.module is not a function
v22.22.2 flag='--experimental-test-module-mocks' ec=0 :: ok 1
v20.20.2 flag='(sem)' ec=1 :: not ok 1 import_node_test.mock.module is not a function
v20.20.2 flag='--experimental-test-module-mocks' ec=0 :: ok 1
````

**H3 — censo de P-A/P-B em todo `frontend/src/`** (§13 N1) — o gerador do Apêndice A com as raízes = todo `src/`; **só duas linhas mudam** (a etiqueta da linha `# RAÍZES` continua a do gerador — texto fixo, não o que foi enumerado):

````bash
sed -e 's|^const ROOT_DIRS = .*|const ROOT_DIRS = [""].map((d) => join(SRC, d));|' \
    -e 's|^const ROOT_FILES = .*|const ROOT_FILES = [];|' gen/alcance.mjs > fechamento/alcance-all.mjs
diff gen/alcance.mjs fechamento/alcance-all.mjs
````

````
31,32c31,32
< const ROOT_DIRS = ["modules/work-orders", "modules/operations/dispatches"].map((d) => join(SRC, d));
< const ROOT_FILES = ["modules/registry/service-quotes/useServiceQuoteReferences.ts"].map((f) => join(SRC, f));
---
> const ROOT_DIRS = [""].map((d) => join(SRC, d));
> const ROOT_FILES = [];
````

Saída de `(cwd frontend) node <rascunho>/fechamento/alcance-all.mjs .` no head `3b1fe0f9` (linhas `#`, `VAZA`, `FABRICA`):

````
# frontend: /home/user/w-b-san3-01b/frontend · overlay: 0 arquivo(s)
# RAÍZES: 589 arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)
# FECHO fora das raízes: 0 arquivos · módulos de mock alcançados: mocks/auth/context.ts, mocks/dashboard/dashboard.ts, mocks/events/events.ts, mocks/logistics/logistics.ts, mocks/work-orders/workOrders.ts, modules/checklists/checklist-attachments.mock.ts, modules/checklists/checklist-runtime.mock.ts, modules/checklists/checklist.mock.ts, modules/navigation/navigation.mock.ts, modules/notifications/notification.mock.ts, modules/operations/dispatches/dispatches.mock.ts, modules/platform/cloud-billing/cloud-billing.mock.ts, modules/platform/platform.mock.ts, modules/work-orders/work-orders.mock.ts
# P-A nas RAÍZES: referências de origem mock vistas=68 · VAZAMENTOS=21
  VAZA-RAIZ modules/dashboard/repository.ts:29 mockDashboardSummary ← mocks/dashboard/dashboard.ts
  VAZA-RAIZ modules/logistics/repository.ts:7 mockAssets ← mocks/logistics/logistics.ts
  VAZA-RAIZ modules/logistics/repository.ts:8 mockQueues ← mocks/logistics/logistics.ts
  VAZA-RAIZ modules/logistics/repository.ts:9 mockWorkOrders ← mocks/work-orders/workOrders.ts
  VAZA-RAIZ modules/navigation/useNavigationMenu.ts:15 getMockNavigationMenu ← modules/navigation/navigation.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:35 mockCloudCostImports ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:36 mockCloudAllocationRuns ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:37 mockCloudChargeRuns ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:38 mockCloudChargeRules ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:43 mockCloudUsageSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:58 mockCloudCostSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:71 mockCloudCostSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:83 mockCloudAllocationSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:92 mockCloudAllocationSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:111 mockCloudChargeSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:123 mockCloudChargeSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/platform.service.ts:21 mockPlatformTenants ← modules/platform/platform.mock.ts
  VAZA-RAIZ modules/platform/platform.service.ts:79 buildTenantModules ← modules/platform/platform.mock.ts
  VAZA-RAIZ modules/platform/platform.service.ts:86 buildTenantModules ← modules/platform/platform.mock.ts
  VAZA-RAIZ services/realtime/pollingClient.ts:13 mockEvents ← mocks/events/events.ts
  VAZA-RAIZ services/realtime/pollingClient.ts:13 mockEvents ← mocks/events/events.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=131 · com identidade constante (FABRICA)=1
  FABRICA-RAIZ modules/inventory/cycle-counts.adapter.ts:90 {id: ""} em ??
# P-A no FECHO (fora das raízes): referências=0 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
````

**H4 — evidência incremental da instância 3 (P1), verbatim** (as linhas posteriores — commit e push — ficam só no rascunho):

````
# Evidência — fechamento (planejador-mestre, instância 3, Fable) — comando → saída resumida → veredito parcial
2026-09-30T12:56Z | git rev-parse HEAD; git status --short; git branch --show-current → 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · '?? docs/revisoes/SAN3/B-SAN3-01b-plano.md' · docs/plano-b-san3-01b → worktree no SHA do mandato, só o plano untracked
2026-09-30T12:56Z | (echo > /dev/tcp/127.0.0.1/54333) → livre; ls /var/lib/postgresql → só '16' → nenhum cluster herdado (o plano não tem premissa de banco)
2026-09-30T12:57Z | D1: laço literal (caminhos absolutos) → 60 linhas md5 790ca6adaa4e020a6218333806497039; com echo "=== …" → 72 linhas md5 ee39f02a3686d19f8302c20652452be2 = colada (diff vazio); literal × colada sem === → diff vazio → PROCEDE (comando errado, conteúdo certo)
2026-09-30T12:57Z | D2: caida/plano-esqueleto-caido.md grep -c '^## ' → 16; marcador exato → 16; raiz da palavra (-i) → 17 (l.5 preâmbulo); 1140 B; 1ª linha 'Fable' → PROCEDE
2026-09-30T12:57Z | D3: grep -n 'G1' work-orders.service.ts | wc -l → 1 (l.29); sed -n '29,32p' → o texto citado; md5 worktree = git show origin/main → PROCEDE
2026-09-30T12:58Z | D4: git fetch; bash fechamento/ramos.sh (verbatim) → 142 refs sem origin/main (143 com); 1 toca a fronteira: origin/demo/investidor (base 6efe5ad 2026-08-19, último d1fab3b 2026-08-29, 49 commits, só WorkOrdersPage.tsx); comm -13 logs/ramos.txt × agora → docs/plano-b-san3-06b, -09, -11 → PROCEDE (laço não estava verbatim)
2026-09-30T12:59Z | D6/D7: git show origin/main:<C4-evidencia> l.330-338/355-362/430-434 → (a)=21 (c)=1; '21 com pendência e dono conferidos, 1 sem pendência nominando o arquivo' (dashboard/repository.ts:29); censo.mjs NÃO verbatim (0 cercas de código) → PROCEDEM
2026-09-30T13:00Z | D8: git show --stat --format= {fc3363e,b3f0af5,3b1fe0f} -- Kpis/ → 4 / 4 / 3 files (3b1fe0f sem kpis-history.md) → PROCEDE
2026-09-30T13:00Z | D11: grep da 1ª palavra vedada pelo mandato → só l.1815 ('customer' nas demais); grep -i da 2ª palavra vedada → 0; identificador exato de modelo 0 → PROCEDE
2026-09-30T13:00Z | D10: work-orders.service.ts:2 importa ApiError/apiRequest de services/api/client; :57 err instanceof ApiError && err.status === 403; client.ts:10 class ApiError, :12 readonly status, :70 apiRequest; erp-techsolutions.active-context só em auth.storage.ts:7 e TenantProvider.tsx:6; AuthProvider.tsx:3,19 getStoredAuthSession → PROCEDE (4 linhas faltavam no §2.3)
2026-09-30T13:01Z | D6 (medição própria): gen/alcance.mjs com ROOT_DIRS=[""], ROOT_FILES=[] (diff = 2 linhas) sobre 3b1fe0f9 → P-A VAZAMENTOS=21 (dashboard:29, logistics:7,8,9, navigation:15, cloud-billing ×11, platform.service:21,79,86, pollingClient:13 ×2); P-B FABRICA=1 (inventory/cycle-counts.adapter.ts:90 {id: ""} em ??) → coincide com a C4; N1 vira MEDIDO
2026-09-30T13:02Z | D5a: diff probe-page-viva.mts × probe-page-viva-dto.mts → 3 linhas (createdAt; sem envelope data); node --import tsx …-dto.mts → ec=0, stderr 0, diff vazio × baseline-probe.txt, md5 cc4f976035f46fca2e92f6d74c90886d → PROCEDE (script faltava verbatim); reproduz
2026-09-30T13:03Z | D5b: mm2/probe.test.ts (cwd frontend) Node 22.22.2 e 20.20.2: sem flag → not ok 1 'import_node_test.mock.module is not a function'; com --experimental-test-module-mocks → ok 1 → reproduz
2026-09-30T13:05Z | D5c: fechamento/e4-proto.mjs (actions={canCreate ? (<button…>) : undefined}) in place → probe-gate 0/13 divergentes; bloco 67/67/0; tsc ec=0; smoke 1202/1202/0; restauro hash=dbae6f97eb69=blob; git status só o plano → reproduz
2026-09-30T13:06Z | git show origin/main:.claude/agents/planejador-mestre.md | grep '^model:' → model: fable → conferido por esta instância
2026-09-30T13:06Z | node scripts/kpi-freeze.mjs --check → 'em dia (snapshot 2026-09-28)' ec=0; o script compara a linha FROZEN do app.js com kpis-latest.json (l.22-36) → mutação (c) do A15 válida
2026-09-30T13:06Z | A14 hoje: os 3 cabeçalhos → VERMELHO no grep (profundidade=0 fecho=0 nao-prova=0); 'em mock/erro voltam vazios' → 1 → vermelho-controle do A14 no head-base
2026-09-30T13:07Z | D9: A14 e A15 sem mutação (awk das l.399-400) → PROCEDE; mutações escritas (A14: reverter um cabeçalho → grep VERMELHO; A15: tirar o caminho da lista → 1201≠1214; KPI ≠ execução → C1; app.js ≠ latest → kpi-freeze vermelho)
````
