#!/usr/bin/env node
// B-SAN3-11 — GERADOR v3 (ciclo 3) — censo CE-G1 por PROPRIEDADE, com o checker de tipos do TypeScript.
// PROPRIEDADES (não lista de nomes):
//   P-L0  as três cópias da verdade (DTO emite · espelho declara · adapter consome) são o MESMO conjunto, nos dois sentidos,
//         e um emissor ilegível (L0 vazio) é vermelho — pega remoção de chave no emissor (M5/M5b/M5c) e L0 vazio (M6).
//   P-L3  todo ponto de JSX que renderiza a SITUAÇÃO de uma vistoria (x.status, x["status"], x[k] com k do tipo "status",
//         `status` desestruturado, const local que o carrega, ou helper de situação por símbolo/alias) — "vistoria" decidida
//         pelo TIPO do receptor (ChecklistRunSummaryItem, ou a forma de resumo id/templateVersion/status/startedAt), nunca pelo
//         nome da variável — está sob uma DECISÃO (?:, &&, ||, ??, if) cuja condição lê o estado de substituição
//         (supersededByRunId/currentRunId/reopenedFromRunId), resolvendo const/função do mesmo arquivo. Receptor de tipo
//         desconhecido/any = vistoria (negar); ponto sem decisão = NÃO; L3/L4 vazios também negam.
// Camadas: L0 DTO · L1 espelho · L2 adapter · L3 pontos · L4 consumidores. Uso: node censo-v2.mjs <repo-root>
// TS_ROOT = diretório do frontend com node_modules + tsconfig.json (default <root>/frontend). Cópias temporárias (T13/T14)
// não têm node_modules: especificadores bare (react, react/jsx-runtime…) são resolvidos a partir do TS_ROOT.
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const TS_ROOT = resolve(process.env.TS_ROOT ?? join(root, "frontend"));
const require = createRequire(join(TS_ROOT, "package.json"));
const ts = require("typescript");

const DTO = "src/modules/impound/impound.checklist-link.dto.ts";
const TYPES = "frontend/src/modules/patios/processes/processes.types.ts";
const ADAPTER = "frontend/src/modules/patios/processes/processes.adapter.ts";
const PROCESSES_DIR = "frontend/src/modules/patios/processes";
const FRONTEND_SRC = "frontend/src";
const STATUS_HELPERS = new Set(["getChecklistRunStatusLabel", "getChecklistRunStatusTone"]);
const VERSION_FIELDS = new Set(["supersededByRunId", "currentRunId", "reopenedFromRunId"]);
const SUMMARY_SHAPE = ["id", "templateVersion", "status", "startedAt"];
const VISTORIA_TYPE = "ChecklistRunSummaryItem";

function parse(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walk(node, fn) { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); }
function line(sf, node) { return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1; }
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc); else if (/[.](ts|tsx)$/.test(name) && !/[.]d[.]ts$/.test(name)) acc.push(p);
  }
  return acc;
}

// ── L0 / L1 / L2 (AST sintática basta) ──
function dtoKeys() {
  const sf = parse(DTO); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "toChecklistRunSummaryListDto") walk(n, (m) => {
      if (ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === "map") {
        const arrow = m.arguments[0];
        if (arrow && ts.isArrowFunction(arrow)) {
          let body = arrow.body; if (ts.isParenthesizedExpression(body)) body = body.expression;
          if (ts.isObjectLiteralExpression(body)) for (const p of body.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
        }
      }
    });
  });
  return keys;
}
function mirrorKeys() {
  const sf = parse(TYPES); const keys = [];
  walk(sf, (n) => { if (ts.isTypeAliasDeclaration(n) && n.name.text === VISTORIA_TYPE && ts.isTypeLiteralNode(n.type)) for (const m of n.type.members) if (ts.isPropertySignature(m)) keys.push(m.name.getText(sf)); });
  return keys;
}
function adapterKeys() {
  const sf = parse(ADAPTER); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "adaptChecklistRun") walk(n, (m) => {
      if (ts.isReturnStatement(m) && m.expression && ts.isObjectLiteralExpression(m.expression)) for (const p of m.expression.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
    });
  });
  return keys;
}

// ── L3 / L4 com o checker de tipos ──
function importsAny(sf, names) {
  let hit = false;
  walk(sf, (n) => { if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) for (const e of n.importClause.namedBindings.elements) if (names.has(e.name.text)) hit = true; });
  return hit;
}
function l3Files() {
  const files = new Set(listFiles(join(root, PROCESSES_DIR)).map((p) => relative(root, p)));
  for (const p of listFiles(join(root, FRONTEND_SRC))) { const rel = relative(root, p); if (files.has(rel)) continue; const sf = parse(rel); if (importsAny(sf, new Set([VISTORIA_TYPE, "ChecklistRunsPanel"]))) files.add(rel); }
  return [...files].sort();
}
function buildProgram(files) {
  const cfg = ts.readConfigFile(join(TS_ROOT, "tsconfig.json"), ts.sys.readFile);
  if (cfg.error) throw new Error("tsconfig ilegível em TS_ROOT: " + ts.flattenDiagnosticMessageText(cfg.error.messageText, " "));
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, TS_ROOT);
  const options = { ...parsed.options, noEmit: true, skipLibCheck: true, composite: false, incremental: false, tsBuildInfoFile: undefined };
  const host = ts.createCompilerHost(options, true);
  const anchor = join(TS_ROOT, "src", "__censo_anchor__.ts"); // resolução de especificadores bare quando a cópia não tem node_modules
  host.resolveModuleNames = (names, containing, _reused, _redirect, opts) => names.map((name) => {
    const direct = ts.resolveModuleName(name, containing, opts, host).resolvedModule;
    if (direct || name.startsWith(".") || name.startsWith("/")) return direct;
    return ts.resolveModuleName(name, anchor, opts, host).resolvedModule;
  });
  host.resolveTypeReferenceDirectives = (names, containing, _redirect, opts) => names.map((n) => {
    const name = typeof n === "string" ? n : n.fileName;
    const direct = ts.resolveTypeReferenceDirective(name, containing, opts, host).resolvedTypeReferenceDirective;
    return direct ?? ts.resolveTypeReferenceDirective(name, anchor, opts, host).resolvedTypeReferenceDirective;
  });
  return ts.createProgram({ rootNames: files.map((f) => join(root, f)), options, host });
}
function enclosingFunction(node) { let p = node.parent; while (p && !(ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p))) p = p.parent; return p; }
function inJsx(n) { for (let p = n.parent; p; p = p.parent) if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxExpression(p) || ts.isJsxFragment(p)) return true; return false; }
function unwrapCasts(e) { while (e && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) || (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(e)))) e = e.expression; return e; } // o TIPO que vale é o da expressão por baixo do cast
// Ciclo 3 (§17.2, P-F1a) — a ORIGEM de um valor de situação, resolvida pelo CHECKER (nunca pelo nome da variável):
//   x.status · x?.status · x["status"] · x[k] com k de tipo literal "status" · `status` desestruturado de x (inclusive
//   renomeado, inclusive em parâmetro) · const local cujo inicializador é uma dessas. Devolve o nó cujo TIPO decide se é
//   vistoria, ou null. O NOME que declara (o binding em si) não é uso.
function declOf(checker, id) {
  let sym = checker.getSymbolAtLocation(id);
  if (sym && (sym.flags & ts.SymbolFlags.Alias)) { try { sym = checker.getAliasedSymbol(sym); } catch { /* fica o alias */ } }
  return { sym, decl: sym?.valueDeclaration ?? sym?.declarations?.[0] };
}
function isStatusKey(arg, checker) {
  const a = unwrapCasts(arg);
  if (ts.isStringLiteralLike(a)) return a.text === "status";
  const t = checker.getTypeAtLocation(a);
  const parts = t.isUnion && t.isUnion() ? t.types : [t];
  return parts.some((p) => p.isStringLiteral && p.isStringLiteral() && p.value === "status");
}
function statusOrigin(expr, checker, depth = 0) {
  const e = unwrapCasts(expr);
  if (!e || depth > 5) return null;
  if (ts.isPropertyAccessExpression(e) && e.name.text === "status") return e.expression;
  if (ts.isElementAccessExpression(e) && e.argumentExpression && isStatusKey(e.argumentExpression, checker)) return e.expression;
  if (ts.isIdentifier(e)) {
    const { decl } = declOf(checker, e);
    if (!decl || decl.name === e) return null;
    if (ts.isBindingElement(decl) && ts.isObjectBindingPattern(decl.parent)) {
      const prop = decl.propertyName ?? decl.name;
      return (ts.isIdentifier(prop) || ts.isStringLiteralLike(prop)) && prop.text === "status" ? decl.parent : null;
    }
    if (ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) && decl.initializer) return statusOrigin(decl.initializer, checker, depth + 1);
  }
  return null;
}
// helper de situação reconhecido pelo SÍMBOLO (alias de import e const que o reapelida resolvidos), não pelo texto do chamado
function isStatusHelperCall(n, checker) {
  if (!ts.isCallExpression(n)) return false;
  const callee = unwrapCasts(n.expression);
  let id = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
  for (let depth = 0; id && ts.isIdentifier(id) && depth <= 5; depth += 1) {
    if (STATUS_HELPERS.has(id.text)) return true;
    const { sym, decl } = declOf(checker, id);
    if (sym && STATUS_HELPERS.has(sym.name)) return true;
    if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer) return false;
    const init = unwrapCasts(decl.initializer);
    id = ts.isPropertyAccessExpression(init) ? init.name : init;
  }
  return false;
}
function typeIsVistoria(type) {
  if (!type) return "desconhecido";
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return "desconhecido";
  const parts = type.isUnion && type.isUnion() ? type.types : [type];
  for (const t of parts) {
    if (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) continue;
    const name = t.aliasSymbol?.name ?? t.symbol?.name;
    if (name === VISTORIA_TYPE) return "sim";
    if (SUMMARY_SHAPE.every((p) => t.getProperty(p))) return "sim";
  }
  return "nao";
}
function exprReadsVersion(expr, checker, seen, depth) {
  if (!expr || depth > 5) return false;
  let hit = false;
  walk(expr, (n) => {
    if (hit) return;
    if (ts.isPropertyAccessExpression(n) && VERSION_FIELDS.has(n.name.text)) { hit = true; return; }
    if (ts.isIdentifier(n) && VERSION_FIELDS.has(n.text) && ts.isBindingElement(n.parent)) { hit = true; return; }
    if (ts.isIdentifier(n)) {
      const sym = checker.getSymbolAtLocation(n); const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
      if (!decl || seen.has(decl)) return; seen.add(decl);
      if (ts.isVariableDeclaration(decl) && decl.initializer) { if (exprReadsVersion(decl.initializer, checker, seen, depth + 1)) hit = true; }
      else if ((ts.isFunctionDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) && decl.body) { if (exprReadsVersion(decl.body, checker, seen, depth + 1)) hit = true; }
    }
  });
  return hit;
}
// a DECISÃO sob a qual o ponto está: sobe do ponto até a função envolvente coletando condições de ?:, &&/||/??, if
function guardedByVersion(node, fn, checker) {
  const conds = [];
  for (let c = node, p = node.parent; p && p !== fn; c = p, p = p.parent) {
    if (ts.isConditionalExpression(p) && (p.whenTrue === c || p.whenFalse === c)) conds.push(p.condition);
    else if (ts.isBinaryExpression(p) && p.right === c) { const k = p.operatorToken.kind; if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) conds.push(p.left); }
    else if (ts.isIfStatement(p) && (p.thenStatement === c || p.elseStatement === c)) conds.push(p.expression);
  }
  return conds.some((cond) => exprReadsVersion(cond, checker, new Set(), 0));
}

function censo(files) {
  const program = buildProgram(files); const checker = program.getTypeChecker();
  const sites = []; const consumers = [];
  for (const rel of files) {
    const sf = program.getSourceFile(join(root, rel)); if (!sf) continue;
    walk(sf, (n) => {
      if (rel.endsWith(".tsx")) {
        let receptor = null; let unknownReceptor = false; // expressão cujo TIPO decide se é vistoria
        if (isStatusHelperCall(n, checker)) {
          const a = n.arguments[0];
          const helperReceiver = a ? statusOrigin(a, checker) : null;
          if (helperReceiver) receptor = helperReceiver; else { receptor = a ?? n; unknownReceptor = true; }
        } else if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isIdentifier(n)) {
          receptor = statusOrigin(n, checker); // invólucros (as, !, parênteses) não contam: o nó de dentro é visitado
        }
        if (receptor && inJsx(n)) {
          const ln = line(sf, n); const key = `${rel}:${ln}`;
          const vis = unknownReceptor ? "desconhecido" : typeIsVistoria(checker.getTypeAtLocation(unwrapCasts(receptor)));
          if (vis !== "nao") {
            const fn = enclosingFunction(n);
            const consulta = guardedByVersion(n, fn, checker) ? "sim" : "NÃO";
            const site = { key, file: rel, line: ln, receptor: unknownReceptor ? "?" : receptor.getText().slice(0, 40), tipo: vis, expr: n.getText(sf).slice(0, 60), consulta };
            // o ponto é a LINHA; com mais de um candidato na mesma linha vale o PIOR (desconhecido / sem decisão), nunca o 1º visitado
            const prev = sites.find((s) => s.key === key);
            if (!prev) sites.push(site);
            else {
              const piorTipo = site.tipo === "desconhecido" && prev.tipo !== "desconhecido";
              const piorConsulta = site.consulta !== "sim" && prev.consulta === "sim";
              if (piorTipo || piorConsulta) { prev.receptor = site.receptor; prev.expr = site.expr; }
              if (piorTipo) prev.tipo = site.tipo;
              if (piorConsulta) prev.consulta = site.consulta;
            }
          }
        }
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "ChecklistRunsPanel") {
        const runsAttr = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "runs");
        consumers.push({ file: rel, line: line(sf, n), runs: runsAttr ? runsAttr.initializer.getText(sf).slice(0, 40) : "(sem runs)" });
      }
    });
  }
  return { sites, consumers };
}

const t0 = Date.now();
const emitted = dtoKeys(), mirror = mirrorKeys(), consumed = adapterKeys();
const dropMirror = emitted.filter((k) => !mirror.includes(k)), dropAdapter = emitted.filter((k) => !consumed.includes(k));
const semEmissorMirror = mirror.filter((k) => !emitted.includes(k)), semEmissorAdapter = consumed.filter((k) => !emitted.includes(k));
const l0Vazio = emitted.length === 0;
const files = l3Files();
const { sites, consumers } = censo(files);
console.log(`# L0 DTO emite (${emitted.length}): ${emitted.join(", ")}`);
console.log(`# L1 espelho ${VISTORIA_TYPE} (${mirror.length}): ${mirror.join(", ")}`);
console.log(`# L2 adapter consome (${consumed.length}): ${consumed.join(", ")}`);
console.log(`# DESCARTADAS pelo espelho (${dropMirror.length}): ${dropMirror.join(", ") || "∅"}`);
console.log(`# DESCARTADAS pelo adapter (${dropAdapter.length}): ${dropAdapter.join(", ") || "∅"}`);
console.log(`# SEM EMISSOR no espelho (${semEmissorMirror.length}): ${semEmissorMirror.join(", ") || "∅"}`);
console.log(`# SEM EMISSOR no adapter (${semEmissorAdapter.length}): ${semEmissorAdapter.join(", ") || "∅"}`);
console.log(`# L0 VAZIO (emissor ilegível): ${l0Vazio ? "SIM" : "não"}`);
console.log(`# L3 arquivos varridos (${files.length}): ${files.join(" · ")}`);
console.log(`# L3 pontos de apresentação da situação de uma vistoria (${sites.length}):`);
for (const s of sites) console.log(`${s.file}:${s.line} | receptor=${s.receptor} | tipo vistoria: ${s.tipo} | ${s.expr} | consulta substituição: ${s.consulta}`);
const l3Vazio = sites.length === 0;
const desconhecidos = sites.filter((s) => s.tipo === "desconhecido");
console.log(`# L3 CANDIDATOS DESCONHECIDOS (${desconhecidos.length}): ${desconhecidos.map((s) => s.key).join(" · ") || "∅"}`);
console.log(`# L3 VAZIO: ${l3Vazio ? "SIM" : "não"}`);
console.log(`# L4 consumidores do painel (${consumers.length}):`);
for (const c of consumers) console.log(`${c.file}:${c.line} | runs=${c.runs}`);
const l4Vazio = consumers.length === 0;
console.log(`# L4 VAZIO: ${l4Vazio ? "SIM" : "não"}`);
const naoConsulta = sites.filter((s) => s.consulta !== "sim");
const total = dropMirror.length + dropAdapter.length + semEmissorMirror.length + semEmissorAdapter.length
  + (l0Vazio ? 1 : 0) + naoConsulta.length + desconhecidos.length + (l3Vazio ? 1 : 0) + (l4Vazio ? 1 : 0);
console.log(`# VEREDITO: descartadas=${dropMirror.length + dropAdapter.length} · sem emissor=${semEmissorMirror.length + semEmissorAdapter.length} · L0 vazio=${l0Vazio ? 1 : 0} · pontos sem consulta=${naoConsulta.length} · candidato desconhecido=${desconhecidos.length} · L3 vazio=${l3Vazio ? 1 : 0} · L4 vazio=${l4Vazio ? 1 : 0} · ${Date.now() - t0} ms`);
process.exitCode = total === 0 ? 0 : 1;
