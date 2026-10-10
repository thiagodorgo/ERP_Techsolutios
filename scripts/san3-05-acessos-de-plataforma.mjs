#!/usr/bin/env node
// B-SAN3-05 (v3) — INVENTÁRIO SEMÂNTICO, gerado da fonte, dos acessos a tabelas sob FORCE ROW LEVEL SECURITY que NÃO
// estão provadamente sob contexto de tenant. Serve a um RATCHET (teste T13): o inventário suspeito é congelado por
// chave (sem número de linha); chave NOVA ou SUMIDA é vermelho — default NEGAR.
//
// O QUE MUDOU DA v2 (crítica r2, F2 — 9 formas verdes por reconhecimento de NOME e REGEX DE TEXTO):
//   • o delegate é reconhecido pelo TIPO (type checker: a assinatura resolvida da chamada mora numa interface
//     `<Model>Delegate` do client gerado), não pelo nome do acessor — alias, desestruturação renomeada, delegate
//     passado como argumento e acesso por índice resolvem para o mesmo tipo;
//   • a classe instanciada é reconhecida pelo SÍMBOLO (import renomeado, namespace, subclasse via namespace, herança
//     pelo símbolo da base), não pelo texto do identificador;
//   • o `$transaction` só é absolvido se a PRIMEIRA instrução do callback é `await setTenantRlsContext(<o mesmo tx>, …)`
//     (AST + identidade de símbolo) — nunca por regex, nunca por comentário, nunca condicional, nunca com outro client;
//   • o envoltório de contexto só é confiado pelo SÍMBOLO declarado nos arquivos listados em WRAPPERS; um runner injetado
//     com o mesmo nome (ex.: `runWithTenantContext`, cujo default em local-auth-login.service.ts é `work()`) NÃO absolve;
//   • o receptor é classificado pela DECLARAÇÃO do seu símbolo raiz (parâmetro de callback de envoltório → SOB-CONTEXTO;
//     campo injetado → INJETADO, decidido em L2; parâmetro de função comum → PARAMETRO; variável de módulo → CRU;
//     alias/desestruturação seguem o inicializador); o que não resolve é OUTRO (suspeito);
//   • tipo `any`/`unknown` com método de delegate (`.findMany(` …) → TIPO-DESCONHECIDO (suspeito): o que não se prova
//     que não é tabela FORCE entra no inventário;
//   • fixtures de mutação entram como ARQUIVOS VIRTUAIS (`--mutant <arquivo>` → src/modules/zz-mut/<nome>.ts) e sobrescritas
//     (`--override <rel>=<arquivo>`) num CompilerHost próprio: sem cópia de `src`, sem symlink de `node_modules`.
//
// O QUE ISTO É: aproximação ESTÁTICA com resolução de tipos. Residual DECLARADO (o que fica fora por construção):
//   (i) a SEMÂNTICA do contexto — um envoltório confiado que não sete o GUC, um `tenantId` errado, um `tx` usado após
//       o fim da transação — só a medição dinâmica (T10–T12 na superfície de plataforma; B-ARNES-2 no resto) vê;
//   (ii) código fora de `src/**` (helpers de teste, scripts) e acesso ao banco fora do Prisma (pg direto) — não varridos;
//   (iii) `$queryRaw*` com SQL que não cite literalmente a tabela é OPACO → SUSPEITO (não é residual: está no inventário).
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--mutant", "--override", "--schema-extra", "--migration-extra"]);
const positional = args.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
const repo = path.resolve(positional[0] ?? ".");
const showAll = args.includes("--all");
const mutants = []; const overrides = new Map(); const schemaExtras = []; const migrationExtras = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mutant") mutants.push(path.resolve(args[++i]));
  if (args[i] === "--override") { const s = args[++i]; const k = s.indexOf("="); overrides.set(s.slice(0, k).replace(/\\/g, "/"), path.resolve(s.slice(k + 1))); }
  if (args[i] === "--schema-extra") schemaExtras.push(path.resolve(args[++i]));
  if (args[i] === "--migration-extra") migrationExtras.push(path.resolve(args[++i]));
}
let req = null;
for (const base of [import.meta.url, path.join(process.cwd(), "package.json"), path.join(repo, "package.json")]) {
  try { const r = createRequire(base); r.resolve("typescript"); req = r; break; } catch { /* próximo */ }
}
if (!req) throw new Error("typescript não resolvido a partir do script, do cwd nem do alvo");
const ts = req("typescript");

// ---------- L0: tabelas FORCE ← migrações; tabela→model→acessor ← schema; OPS ← client gerado ----------
function walk(dir, out = []) { for (const e of readdirSync(dir)) { const f = path.join(dir, e); if (statSync(f).isDirectory()) walk(f, out); else out.push(f); } return out; }
const FORCE = new Set(); const ENABLE = new Set();
const sqlIdentifier = (quoted, plain) => quoted === undefined ? plain.toLowerCase() : quoted.replace(/""/g, '"');
const rlsStatement = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:(?:"((?:[^"]|"")*)"|([A-Za-z_][A-Za-z0-9_$]*))\s*\.\s*)?(?:"((?:[^"]|"")*)"|([A-Za-z_][A-Za-z0-9_$]*))\s+(NO\s+FORCE|FORCE|ENABLE|DISABLE)\s+ROW\s+LEVEL\s+SECURITY/gi;
for (const f of [...walk(path.join(repo, "prisma/migrations")).filter((f) => f.endsWith("migration.sql")), ...migrationExtras]) {
  const sql = readFileSync(f, "utf8");
  for (const m of sql.matchAll(rlsStatement)) {
    const schemaName = m[1] === undefined && m[2] === undefined ? "public" : sqlIdentifier(m[1], m[2]);
    if (schemaName !== "public") continue;
    const table = sqlIdentifier(m[3], m[4]);
    const action = m[5].replace(/\s+/g, " ").toUpperCase();
    if (action === "FORCE") FORCE.add(table);
    if (action === "NO FORCE") FORCE.delete(table);
    if (action === "ENABLE") ENABLE.add(table);
    if (action === "DISABLE") ENABLE.delete(table);
  }
}
const schema = [readFileSync(path.join(repo, "prisma/schema.prisma"), "utf8"), ...schemaExtras.map((f) => readFileSync(f, "utf8"))].join("\n");
const modelToTable = new Map(); const modelBodies = new Map();
for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const model = m[1];
  const map = m[2].match(/@@map\("((?:[^"]|\\")+)"\)/);
  modelToTable.set(model, map ? map[1].replace(/\\"/g, '"') : model);
  modelBodies.set(model, m[2]);
}
const relations = new Map();
for (const [model, body] of modelBodies) {
  const fields = new Map();
  for (const line of body.split(/\r?\n/)) {
    const field = line.match(/^\s*(\w+)\s+(\w+)(?:\[\])?\??(?:\s|$)/);
    if (field && modelToTable.has(field[2])) fields.set(field[1], field[2]);
  }
  relations.set(model, fields);
}
const accessorToTable = new Map(); const accessorToModel = new Map();
for (const [model, table] of modelToTable) {
  const accessor = model[0].toLowerCase() + model.slice(1);
  accessorToModel.set(accessor, model);
  if (FORCE.has(table)) accessorToTable.set(accessor, table);
}
let OPS = null; // derivado do PROGRAMA (abaixo), não de regex sobre o d.ts
const RAW = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);
// Envoltórios CONFIADOS — pelo SÍMBOLO declarado nestes arquivos (a junta lê os corpos: ambos setam o GUC a cada volta).
const WRAPPERS = [
  { name: "withTenantRls", file: /src[\\/]database[\\/]rls\.ts$/ },
  { name: "forEachTenantRls", file: /src[\\/]database[\\/]rls\.ts$/ },
  { name: "forEachTenantInOneTx", file: /cloud-cost-allocation-prisma\.repository\.ts$/ },
];
const SETTERS = [{ name: "setTenantRlsContext", file: /src[\\/]database[\\/]rls\.ts$/ }, { name: "setIdentityRlsContext", file: /src[\\/]database[\\/]rls\.ts$/ }];

// ---------- Programa TypeScript (arquivos virtuais para mutantes e sobrescritas) ----------
const cfg = ts.readConfigFile(path.join(repo, "tsconfig.json"), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, repo);
const options = { ...parsed.options, noEmit: true, skipLibCheck: true };
const virtual = new Map();
for (const m of mutants) virtual.set(path.normalize(path.join(repo, "src/modules/zz-mut", path.basename(m))), readFileSync(m, "utf8"));
for (const [rel, file] of overrides) virtual.set(path.normalize(path.join(repo, rel)), readFileSync(file, "utf8"));
const realSrc = walk(path.join(repo, "src")).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts")).map((f) => path.normalize(f));
const rootNames = [...new Set([...realSrc, ...virtual.keys()])];
const host = ts.createCompilerHost(options, true);
const _gsf = host.getSourceFile.bind(host), _fe = host.fileExists.bind(host), _rf = host.readFile.bind(host);
host.fileExists = (f) => virtual.has(path.normalize(f)) || _fe(f);
host.readFile = (f) => (virtual.has(path.normalize(f)) ? virtual.get(path.normalize(f)) : _rf(f));
host.getSourceFile = (f, lang, onError, create) => (virtual.has(path.normalize(f)) ? ts.createSourceFile(f, virtual.get(path.normalize(f)), lang, true, ts.ScriptKind.TS) : _gsf(f, lang, onError, create));
const program = ts.createProgram({ rootNames, options, host });
const checker = program.getTypeChecker();
// OPS ← métodos das interfaces *Delegate do client GERADO, pelo próprio programa (F4 da r1, agora sem regex de texto)
OPS = new Set();
for (const sf of program.getSourceFiles()) {
  if (!sf.fileName.replace(/\\/g, "/").endsWith("/.prisma/client/index.d.ts")) continue;
  sf.forEachChild(function look(n) {
    if (ts.isInterfaceDeclaration(n) && /Delegate$/.test(n.name.text)) {
      for (const m of n.members) if (ts.isMethodSignature(m) && m.name) OPS.add(m.name.getText());
    }
    ts.forEachChild(n, look);
  });
}
if (OPS.size < 10) {
  console.error(`# erro: OPS não derivado do client gerado (N=${OPS.size})`);
  process.exit(2);
}
const rel = (f) => path.relative(repo, f).replace(/\\/g, "/");
const GENERATED = /[\\/](\.prisma|@prisma)[\\/]client[\\/]/;

// ---------- utilitários semânticos ----------
function unwrap(e) { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression?.(e) || ts.isTypeAssertionExpression(e))) e = e.expression; return e; }
function realSymbol(sym) { return sym && (sym.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(sym) : sym; }
function symbolOf(node) { return realSymbol(checker.getSymbolAtLocation(node)); }
function moduleExportOfBinding(d) { // d: BindingElement de `const { x } = await import("m")` ou `const [{ x }, …] = await Promise.all([import("m"), …])`
  let p = d.parent; while (p && !ts.isVariableDeclaration(p)) p = p.parent; if (!p?.initializer) return null;
  let init = unwrap(p.initializer); if (ts.isAwaitExpression(init)) init = unwrap(init.expression);
  let importCall = null;
  if (ts.isCallExpression(init) && init.expression.kind === ts.SyntaxKind.ImportKeyword) importCall = init;
  else if (ts.isCallExpression(init) && /Promise\.all$/.test(init.expression.getText()) && init.arguments[0] && ts.isArrayLiteralExpression(init.arguments[0]) && ts.isArrayBindingPattern(p.name)) {
    const elem = d.parent?.parent; const i = elem ? p.name.elements.indexOf(elem) : -1;
    const cand = i >= 0 ? unwrap(init.arguments[0].elements[i]) : null;
    if (cand && ts.isCallExpression(cand) && cand.expression.kind === ts.SyntaxKind.ImportKeyword) importCall = cand;
  }
  if (!importCall || !importCall.arguments[0]) return null;
  const modSym = checker.getSymbolAtLocation(importCall.arguments[0]); if (!modSym) return null;
  const name = (d.propertyName ?? d.name).getText();
  const exp = checker.getExportsOfModule(modSym).find((s) => s.name === name);
  return exp ? realSymbol(exp) : null;
}
function deepSymbol(node) { const s = symbolOf(node); const d = s?.declarations?.[0]; if (d && ts.isBindingElement(d)) { const m = moduleExportOfBinding(d); if (m) return m; } return s; }
function declOf(node) { const s = deepSymbol(node); return s?.declarations?.[0] ?? null; }
function isFunctionLike(n) { return ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n); }
function enclosing(node) {
  let klass = null, method = null;
  for (let n = node.parent; n; n = n.parent) {
    if (!method && (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isGetAccessorDeclaration(n)) && n.name) method = n.name.getText();
    if (!method && ts.isPropertyDeclaration(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) method = n.name.getText();
    if (!method && ts.isVariableDeclaration(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) method = n.name.getText();
    if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) { klass = n.name?.text ?? "(anonima)"; break; }
  }
  return { klass, method };
}
function nameOfCallee(call) { const c = unwrap(call.expression); return ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : c.getText().slice(0, 30); }
function isTrustedSymbol(node, list) {
  const c = unwrap(node); const target = ts.isPropertyAccessExpression(c) ? c.name : c;
  const s = deepSymbol(target); const d = s?.declarations?.[0]; if (!s || !d) return false;
  return list.some((w) => w.name === s.name && w.file.test(d.getSourceFile().fileName));
}
function wrapperKind(call) {
  if (nameOfCallee(call) === "$transaction") return "$transaction";
  if (isTrustedSymbol(call.expression, WRAPPERS)) return "wrapper";
  return null;
}
// $transaction: absolvido só se a PRIMEIRA instrução do callback é `await <setter confiado>(<o mesmo tx>, …)`
function setterFirst(fn, param) {
  if (!fn.body || !ts.isBlock(fn.body)) return false;
  const st = fn.body.statements[0]; if (!st || !ts.isExpressionStatement(st)) return false;
  let e = unwrap(st.expression); if (ts.isAwaitExpression(e)) e = unwrap(e.expression);
  if (!ts.isCallExpression(e) || !isTrustedSymbol(e.expression, SETTERS)) return false;
  const a0 = e.arguments[0] ? unwrap(e.arguments[0]) : null;
  if (!a0 || !ts.isIdentifier(a0)) return false;
  return checker.getSymbolAtLocation(a0) === checker.getSymbolAtLocation(param.name);
}
const injected = new Map(); // ClassDeclaration node -> Set<índice do parâmetro do construtor>
function classDeclOf(expr) {
  const c = unwrap(expr); const target = ts.isPropertyAccessExpression(c) ? c.name : c;
  const t = checker.getTypeAtLocation(c); const ts_ = t?.getSymbol?.() ?? t?.symbol; const td = ts_?.declarations?.[0];
  if (td && (ts.isClassDeclaration(td) || ts.isClassExpression(td))) return td;
  const d = declOf(target); return d && (ts.isClassDeclaration(d) || ts.isClassExpression(d)) ? d : null;
}
function classChain(decl) {
  const out = []; let d = decl; const seen = new Set();
  while (d && !seen.has(d)) { seen.add(d); out.push(d); let base = null;
    for (const h of d.heritageClauses ?? []) if (h.token === ts.SyntaxKind.ExtendsKeyword) base = classDeclOf(h.types[0].expression);
    d = base; }
  return out;
}
function ctorOf(decl) { return decl.members.find((m) => ts.isConstructorDeclaration(m)) ?? null; }
function classifyParam(param, name, depth) {
  const fn = param.parent; const idx = fn.parameters.indexOf(param); const call = fn.parent;
  if (call && ts.isCallExpression(call) && call.arguments.includes(fn)) {
    const w = wrapperKind(call);
    if (w === "wrapper") return idx === 0 ? { cls: "SOB-CONTEXTO", note: nameOfCallee(call) } : { cls: `PARAMETRO(${name} #${idx} de callback de ${nameOfCallee(call)})` };
    if (w === "$transaction") return idx === 0 && setterFirst(fn, param) ? { cls: "SOB-CONTEXTO", note: "$transaction+setter-primeiro" } : { cls: "$TRANSACTION-SEM-SETTER-PROVADO" };
    return { cls: `PARAMETRO(${name} de callback de ${nameOfCallee(call)})` };
  }
  if (ts.isConstructorDeclaration(fn)) return { cls: "INJETADO", index: idx, klass: fn.parent };
  return { cls: `PARAMETRO(${name})`, note: fn.name?.getText() ?? "(anonima)" };
}
function classifyField(expr, depth) { // expr = this.<campo>
  const field = expr.name.text; let k = expr; while (k && !ts.isClassDeclaration(k) && !ts.isClassExpression(k)) k = k.parent;
  if (!k) return { cls: `OUTRO(this.${field} fora de classe)` };
  for (const c of classChain(k)) {
    const ctor = ctorOf(c);
    const pp = ctor?.parameters.find((p) => ts.isIdentifier(p.name) && p.name.text === field && (p.modifiers?.length ?? 0) > 0);
    if (pp) return { cls: "INJETADO", index: ctor.parameters.indexOf(pp), klass: c };
    const prop = c.members.find((m) => ts.isPropertyDeclaration(m) && m.name.getText() === field);
    if (prop) {
      if (prop.initializer) { const r = classify(prop.initializer, depth + 1); return { ...r, cls: r.cls === "INJETADO" ? "INJETADO" : `CAMPO-INICIALIZADO:${r.cls}`, note: `this.${field} =` }; }
      let assigned = null;
      ctor?.body?.forEachChild(function look(n) { if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.expression.kind === ts.SyntaxKind.ThisKeyword && n.left.name.text === field) assigned = n.right; else ts.forEachChild(n, look); });
      if (assigned) { const r = classify(assigned, depth + 1); if (r.cls === "INJETADO") return r; return { ...r, cls: `CAMPO-ATRIBUIDO:${r.cls}`, note: `this.${field} = (construtor)` }; }
      return { cls: `CAMPO-NAO-RASTREADO(this.${field})` };
    }
  }
  return { cls: `CAMPO-NAO-RASTREADO(this.${field})` };
}
function classify(expr, depth = 0) {
  if (!expr || depth > 8) return { cls: "OUTRO(profundidade)" };
  const e = unwrap(expr);
  if (ts.isPropertyAccessExpression(e) && accessorToTable.has(e.name.text)) return classify(e.expression, depth + 1);
  if (ts.isElementAccessExpression(e) && ts.isStringLiteralLike(e.argumentExpression) && accessorToTable.has(e.argumentExpression.text)) return classify(e.expression, depth + 1);
  if (ts.isPropertyAccessExpression(e) && e.expression.kind === ts.SyntaxKind.ThisKeyword) return classifyField(e, depth);
  if (ts.isIdentifier(e)) {
    const d = declOf(e); if (!d) return { cls: `OUTRO(${e.text} sem declaracao)` };
    if (ts.isParameter(d)) return classifyParam(d, e.text, depth);
    if (ts.isVariableDeclaration(d)) {
      const st = d.parent?.parent;
      if (st && ts.isVariableStatement(st) && ts.isSourceFile(st.parent)) return { cls: "CRU", note: `modulo ${rel(d.getSourceFile().fileName)}:${e.text}` };
      if (d.initializer) { const r = classify(d.initializer, depth + 1); return { ...r, note: `via alias ${e.text}${r.note ? " ← " + r.note : ""}` }; }
      return { cls: `OUTRO(${e.text} sem inicializador)` };
    }
    if (ts.isBindingElement(d)) {
      let p = d.parent; while (p && !ts.isVariableDeclaration(p) && !ts.isParameter(p)) p = p.parent;
      if (p && ts.isVariableDeclaration(p) && p.initializer) { const r = classify(p.initializer, depth + 1); return { ...r, note: `via desestruturacao ${e.text}` }; }
      if (p && ts.isParameter(p)) return classifyParam(p, e.text, depth);
      return { cls: "OUTRO(desestruturacao)" };
    }
    return { cls: `OUTRO(${e.text}:${ts.SyntaxKind[d.kind]})` };
  }
  if (ts.isAwaitExpression(e)) return classify(e.expression, depth + 1);
  if (ts.isCallExpression(e)) return { cls: `OUTRO(chamada ${nameOfCallee(e)}())` };
  if (ts.isNewExpression(e)) return { cls: "CRU", note: `new ${e.expression.getText()}` };
  if (ts.isPropertyAccessExpression(e)) return { cls: `OUTRO(${e.getText().replace(/\s+/g, "").slice(0, 40)})` };
  return { cls: `OUTRO(${ts.SyntaxKind[e.kind]})` };
}
function literalTablesIn(text) { const hit = []; for (const t of FORCE) if (new RegExp(`\\b${t}\\b`).test(text)) hit.push(t); return hit; }
function rawTables(node) { // tabelas citadas no SQL literal, ou numa constante string referenciada
  let text = node.getText(); const args = ts.isCallExpression(node) ? node.arguments : [];
  for (const a of args) { const u = unwrap(a); if (ts.isIdentifier(u)) { const d = declOf(u); if (d && ts.isVariableDeclaration(d) && d.initializer && ts.isStringLiteralLike(d.initializer)) text += " " + d.initializer.text; } }
  return literalTablesIn(text);
}
function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}
function relationAccesses(model, expression, prefix = [], out = []) {
  const value = unwrap(expression);
  if (!value || !ts.isObjectLiteralExpression(value)) return out;
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue;
    const name = propertyName(property.name);
    if (!name) continue;
    const initializer = ts.isShorthandPropertyAssignment(property) ? property.name : property.initializer;
    const related = relations.get(model)?.get(name);
    if (related) {
      const table = modelToTable.get(related);
      if (table && FORCE.has(table)) out.push({ path: [...prefix, name].join("."), table });
      relationAccesses(related, initializer, [...prefix, name], out);
    } else {
      relationAccesses(model, initializer, [...prefix, name], out);
    }
  }
  return out;
}

// ---------- L1: toda chamada a método de delegate de tabela FORCE, ou RAW ----------
const rows = []; const pushRow = (r) => rows.push(r);
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !rootNames.includes(path.normalize(sf.fileName))) continue;
  const file = rel(sf.fileName);
  function emit(node, clientExpr, what, table, how) {
    const c = classify(clientExpr); const { klass, method } = enclosing(node);
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const recv = unwrap(clientExpr).getText(sf).replace(/\s+/g, "").slice(0, 40);
    const row = { loc: `${file}:${line}`, file, klass, method, recv, what, table, cls: c.cls, note: c.note ?? "", how };
    if (c.cls === "INJETADO") { row.klassNode = c.klass; row.index = c.index; if (!injected.has(c.klass)) injected.set(c.klass, new Set()); injected.get(c.klass).add(c.index); }
    pushRow(row);
  }
  function visit(node) {
    if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      const callee = node.expression;
      const op = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isStringLiteralLike(callee.argumentExpression) ? callee.argumentExpression.text : null;
      const target = unwrap(callee.expression);
      if (op && RAW.has(op)) { const tabs = rawTables(node); if (tabs.length) for (const t of tabs) emit(node, target, `RAW-SQL(${op})`, t, "literal"); else emit(node, target, `RAW-SQL(${op}) OPACO`, "?", "opaco"); }
      else if (op && OPS.has(op)) {
        let model = null; const sig = checker.getResolvedSignature(node); const d = sig?.declaration;
        if (d) { let p = d.parent; while (p && !ts.isInterfaceDeclaration(p)) p = p.parent; if (p && /Delegate$/.test(p.name.text) && GENERATED.test(p.getSourceFile().fileName)) model = p.name.text.replace(/Delegate$/, ""); }
        if (!model) { const ty = checker.getTypeAtLocation(callee.expression); const sy = ty?.getSymbol?.() ?? ty?.symbol; const sd = sy?.declarations?.[0]; if (sy && /Delegate$/.test(sy.name) && sd && GENERATED.test(sd.getSourceFile().fileName) && OPS.has(op)) model = sy.name.replace(/Delegate$/, ""); }
        let acc = null; if (ts.isPropertyAccessExpression(target)) acc = target.name.text; else if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)) acc = target.argumentExpression.text; else if (ts.isIdentifier(target)) acc = target.text;
        if (!model && acc) model = accessorToModel.get(acc) ?? null;
        if (model) {
          const accessor = model[0].toLowerCase() + model.slice(1);
          const t = modelToTable.get(model);
          if (t && FORCE.has(t)) emit(node, target, `${accessor}.${op}`, t, "semantico");
          for (const nested of relationAccesses(model, node.arguments[0])) {
            emit(node, target, `${accessor}.${op}.${nested.path}`, nested.table, "relacao-aninhada");
          }
        }
        else if (acc && accessorToTable.has(acc) && OPS.has(op)) emit(node, target, `${acc}.${op}`, accessorToTable.get(acc), "sintatico");
        else if (OPS.has(op)) { const ty = checker.getTypeAtLocation(callee.expression); if (ty.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) emit(node, target, `?.${op}`, "?", "TIPO-DESCONHECIDO"); }
      }
    }
    if (ts.isTaggedTemplateExpression(node) && ts.isPropertyAccessExpression(node.tag) && RAW.has(node.tag.name.text)) {
      const tabs = literalTablesIn(node.getText()); const target = unwrap(node.tag.expression);
      if (tabs.length) for (const t of tabs) emit(node, target, `RAW-SQL(${node.tag.name.text})`, t, "literal"); else emit(node, target, `RAW-SQL(${node.tag.name.text}) OPACO`, "?", "opaco");
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
for (const r of rows) if (r.how === "TIPO-DESCONHECIDO" && !/^(SOB-CONTEXTO)$/.test(r.cls)) r.cls = `TIPO-DESCONHECIDO/${r.cls}`;

// ---------- L2: instanciações de classes (ou subclasses) com executor injetado, pelo SÍMBOLO ----------
const inst = []; let rodada = 0; let antes = -1;
while (injected.size !== antes && rodada < 4) { // lista de trabalho: classe que so REPASSA o campo injetado vira injetada e precisa de nova passada
rodada++; inst.length = 0; antes = injected.size;
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !rootNames.includes(path.normalize(sf.fileName))) continue;
  const file = rel(sf.fileName);
  function visit(node) {
    if (ts.isNewExpression(node)) {
      const decl = classDeclOf(node.expression);
      if (decl) {
        const chain = classChain(decl);
        for (const c of chain) {
          if (!injected.has(c)) continue;
          for (const idx of injected.get(c)) {
            let arg = node.arguments?.[idx] ?? null; let note = "";
            // subclasse com construtor próprio: segue o super(...) até o argumento de `new`
            const own = ctorOf(decl);
            if (c !== decl && own) { let sup = null; own.body?.forEachChild(function look(n) { if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.SuperKeyword) sup = n; else ts.forEachChild(n, look); });
              const sa = sup?.arguments?.[idx] ? unwrap(sup.arguments[idx]) : null;
              if (sa && ts.isIdentifier(sa)) { const d = declOf(sa); if (d && ts.isParameter(d) && d.parent === own) { arg = node.arguments?.[own.parameters.indexOf(d)] ?? null; note = "via super()"; } else { arg = sa; note = "super() literal"; } }
              else if (sa) { arg = sa; note = "super() literal"; } }
            let r;
            if (arg) r = classify(arg); else { const p = ctorOf(c)?.parameters[idx]; r = p?.initializer ? { ...classify(p.initializer), note: "default do construtor" } : { cls: "OUTRO(sem argumento)" }; }
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            if (r.cls === "INJETADO" && r.klass) { if (!injected.has(r.klass)) injected.set(r.klass, new Set()); injected.get(r.klass).add(r.index); }
            inst.push({ loc: `${file}:${line}`, file, klass: decl.name?.text ?? "(anonima)", base: c === decl ? "" : ` extends ${c.name?.text}`, arg: arg ? arg.getText(sf).replace(/\s+/g, "").slice(0, 40) : "", cls: r.cls, note: [r.note, note].filter(Boolean).join(" · "), injClass: c, injIdx: idx, upKlass: r.klass ?? null, upIdx: r.index ?? null });
          }
          break; // a primeira classe injetada na cadeia decide
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

}
// transitividade: `new K(this.<campo injetado de J>)` é SOB-CONTEXTO só se TODA instanciação de J em src o for (recursivo, com guarda)
function cleanUpstream(K, j, seen) {
  const ups = inst.filter((e) => e.injClass === K && e.injIdx === j); if (!ups.length) return "SEM-INSTANCIACAO-EM-SRC";
  for (const e of ups) {
    if (e.cls === "SOB-CONTEXTO" || e.cls.startsWith("SOB-CONTEXTO")) continue;
    if (e.cls === "INJETADO" && e.upKlass && !seen.has(e.upKlass)) { const r = cleanUpstream(e.upKlass, e.upIdx, new Set([...seen, K])); if (r === "ok") continue; return r; }
    return `SUSPEITO-ACIMA(${e.file}:new ${e.klass}(${e.arg}) ${e.cls})`;
  }
  return "ok";
}
for (const i of inst) if (i.cls === "INJETADO" && i.upKlass) { const r = cleanUpstream(i.upKlass, i.upIdx, new Set([i.injClass])); i.cls = r === "ok" ? `SOB-CONTEXTO(transitivo via ${i.upKlass.name?.text})` : `INJETADO-TRANSITIVO:${r}`; }

// ---------- saída ----------
const hasKnownInstantiation = (row) => inst.some((i) => i.injClass === row.klassNode && i.injIdx === row.index);
const SUSPEITO_L1 = (row) => row.cls !== "SOB-CONTEXTO" && (row.cls !== "INJETADO" || !hasKnownInstantiation(row));
const SUSPEITO_L2 = (cls) => !cls.startsWith("SOB-CONTEXTO");
const byCls = {}; for (const r of rows) byCls[r.cls.replace(/\(.*$/, "")] = (byCls[r.cls.replace(/\(.*$/, "")] ?? 0) + 1;
const instByCls = {}; for (const i of inst) instByCls[i.cls.replace(/\(.*$/, "")] = (instByCls[i.cls.replace(/\(.*$/, "")] ?? 0) + 1;
const diag = program.getSyntacticDiagnostics().length;
console.log(`# L0: tabelas ENABLE=${ENABLE.size} FORCE=${FORCE.size} · acessores Prisma em FORCE=${accessorToTable.size} · OPS(derivados)=${OPS.size} · arquivos no programa=${rootNames.length} (virtuais=${virtual.size}) · erros sintaticos=${diag}`);
console.log(`# L0 FORCE: ${JSON.stringify([...FORCE].sort())}`);
console.log(`# L1: call-sites sobre tabelas FORCE (+ RAW) = ${rows.length} · por como: ${JSON.stringify(rows.reduce((a, r) => ((a[r.how] = (a[r.how] ?? 0) + 1), a), {}))}`);
console.log(`# L1 por classificação: ${JSON.stringify(byCls)}`);
console.log(`# L2: classes com executor injetado = ${injected.size}; instanciações achadas = ${inst.length}; rodadas L2 = ${rodada}`);
console.log(`# L2 por classificação do argumento: ${JSON.stringify(instByCls)}`);
const keys = new Map(); const add = (k) => keys.set(k, (keys.get(k) ?? 0) + 1);
for (const r of rows.filter(SUSPEITO_L1)) add(`L1\t${r.file}\t${r.klass ?? "-"}.${r.method ?? "-"}\t${r.recv}\t${r.what}\t${r.table}\t${r.cls}`);
for (const i of inst.filter((i) => SUSPEITO_L2(i.cls))) add(`L2\t${i.file}\tnew ${i.klass}${i.base}(${i.arg})\t${i.cls}`);
const inv = [...keys].map(([k, n]) => `${k}\t×${n}`).sort();
console.log(`# INVENTÁRIO SUSPEITO (L1+L2): ${inv.length} chaves · sha1=${createHash("sha1").update(inv.join("\n")).digest("hex")}`);
console.log(""); console.log("## INVENTÁRIO SUSPEITO (ratchet: chave sem número de linha; chave nova OU sumida = vermelho)");
for (const k of inv) console.log(k);
if (showAll) {
  console.log(""); console.log("## TODOS os call-sites (--all)");
  for (const r of rows) console.log(`${r.loc}\t${r.recv}\t${r.what}\t${r.table}\t${r.cls}\t${r.klass ?? ""}.${r.method ?? ""}\t${r.how}\t${r.note}`);
  console.log(""); console.log("## TODAS as instanciações (--all)");
  for (const i of inst) console.log(`${i.loc}\tnew ${i.klass}${i.base}(${i.arg})\t${i.cls}\t${i.note}`);
}
