#!/usr/bin/env node
// B-SAN3-11 — GERADOR (CE-G1) do censo de pontos da UI do dossiê de custódia que APRESENTAM uma vistoria, e do
// espelho DTO → adapter → tipo. PROPRIEDADE (não lista de nomes): "a UI apresenta uma vistoria como vigente sem
// consultar o estado de substituição" — todo ponto que renderiza a SITUAÇÃO de uma vistoria (`.status`, ou os helpers
// getChecklistRunStatusLabel/Tone) dentro de uma função cujo corpo NÃO lê `supersededByRunId`/`currentRunId` é
// membro da lista. Default do membro não previsto = NÃO consulta (negar).
//
// Camadas, todas GERADAS da fonte (AST do TypeScript, não regex de linha):
//   L0  chaves EMITIDAS pelo DTO do backend  ← src/modules/impound/impound.checklist-link.dto.ts (toChecklistRunSummaryListDto)
//   L1  chaves do ESPELHO do frontend        ← frontend/src/modules/patios/processes/processes.types.ts (ChecklistRunSummaryItem)
//   L2  chaves CONSUMIDAS pelo adapter       ← frontend/src/modules/patios/processes/processes.adapter.ts (adaptChecklistRun)
//   L3  pontos de APRESENTAÇÃO da situação   ← frontend/src/**/*.tsx que importam ChecklistRunSummaryItem ou ChecklistRunsPanel
//       + todo *.tsx/*.ts em frontend/src/modules/patios/processes/**; classificação por função envolvente.
//   L4  consumidores do painel (quem passa `runs`)  ← JSX <ChecklistRunsPanel runs=...>
// Uso: node san3-11-dossie-vistoria-censo.mjs <repo-root>     (sai 1 se houver ponto NÃO-CONSULTA ou chave descartada)
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
// TS_ROOT: de onde resolver o pacote `typescript` (default = o próprio repo; útil para rodar sobre uma cópia temporária)
const require = createRequire(join(process.env.TS_ROOT ?? root, "package.json"));
const ts = require("typescript");

const DTO = "src/modules/impound/impound.checklist-link.dto.ts";
const TYPES = "frontend/src/modules/patios/processes/processes.types.ts";
const ADAPTER = "frontend/src/modules/patios/processes/processes.adapter.ts";
const PROCESSES_DIR = "frontend/src/modules/patios/processes";
const FRONTEND_SRC = "frontend/src";
const STATUS_HELPERS = new Set(["getChecklistRunStatusLabel", "getChecklistRunStatusTone"]);
const VERSION_FIELDS = new Set(["supersededByRunId", "currentRunId"]);

function parse(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walk(node, fn) { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); }
function line(sf, node) { return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1; }
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc); else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) acc.push(p);
  }
  return acc;
}

// L0 — chaves emitidas pelo DTO: o object literal devolvido pela arrow dentro de `runs.map(...)` em toChecklistRunSummaryListDto
function dtoKeys() {
  const sf = parse(DTO); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "toChecklistRunSummaryListDto") {
      walk(n, (m) => {
        if (ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === "map") {
          const arrow = m.arguments[0];
          if (arrow && ts.isArrowFunction(arrow)) {
            let body = arrow.body; if (ts.isParenthesizedExpression(body)) body = body.expression;
            if (ts.isObjectLiteralExpression(body)) for (const p of body.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
          }
        }
      });
    }
  });
  return keys;
}
// L1 — membros do tipo espelho
function mirrorKeys() {
  const sf = parse(TYPES); const keys = [];
  walk(sf, (n) => { if (ts.isTypeAliasDeclaration(n) && n.name.text === "ChecklistRunSummaryItem" && ts.isTypeLiteralNode(n.type)) for (const m of n.type.members) if (ts.isPropertySignature(m)) keys.push(m.name.getText(sf)); });
  return keys;
}
// L2 — chaves do objeto devolvido por adaptChecklistRun
function adapterKeys() {
  const sf = parse(ADAPTER); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "adaptChecklistRun") walk(n, (m) => {
      if (ts.isReturnStatement(m) && m.expression && ts.isObjectLiteralExpression(m.expression)) for (const p of m.expression.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
    });
  });
  return keys;
}
// L3/L4 — pontos de apresentação e consumidores
function importsAny(sf, names) {
  let hit = false;
  walk(sf, (n) => { if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) for (const e of n.importClause.namedBindings.elements) if (names.has(e.name.text)) hit = true; });
  return hit;
}
function enclosingFunction(node) { let p = node.parent; while (p && !(ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p))) p = p.parent; return p; }
function functionReads(fn, fields) { let hit = false; if (!fn) return false; walk(fn, (n) => { if (ts.isPropertyAccessExpression(n) && fields.has(n.name.text)) hit = true; if (ts.isIdentifier(n) && fields.has(n.text) && ts.isBindingElement(n.parent)) hit = true; }); return hit; }
function censo() {
  const files = new Set(listFiles(join(root, PROCESSES_DIR)).map((p) => relative(root, p)));
  for (const p of listFiles(join(root, FRONTEND_SRC))) { const rel = relative(root, p); if (files.has(rel)) continue; const sf = parse(rel); if (importsAny(sf, new Set(["ChecklistRunSummaryItem", "ChecklistRunsPanel"]))) files.add(rel); }
  const sites = []; const consumers = [];
  for (const rel of [...files].sort()) {
    const sf = parse(rel);
    walk(sf, (n) => {
      // ponto de apresentação: `x.status` de um parâmetro de função, ou chamada aos helpers de situação, DENTRO de JSX
      let isStatusRead = false;
      if (ts.isPropertyAccessExpression(n) && n.name.text === "status" && ts.isIdentifier(n.expression) && rel.endsWith(".tsx")) isStatusRead = true;
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && STATUS_HELPERS.has(n.expression.text) && rel.endsWith(".tsx")) isStatusRead = true;
      if (isStatusRead) {
        let inJsx = false; for (let p = n.parent; p; p = p.parent) if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxExpression(p)) { inJsx = true; break; }
        if (!inJsx) return;
        const fn = enclosingFunction(n);
        // só vistorias: o receptor precisa ser parâmetro/variável tipada ou nomeada como run/checklist (evita process.status da custódia)
        const recv = ts.isPropertyAccessExpression(n) ? n.expression.text : (n.arguments[0] && ts.isPropertyAccessExpression(n.arguments[0]) && ts.isIdentifier(n.arguments[0].expression) ? n.arguments[0].expression.text : "?");
        if (!/run|checklist/i.test(recv)) return;
        const ln = line(sf, n); const key = `${rel}:${ln}`;
        if (sites.some((s) => s.key === key)) return; // um ponto por linha (nós aninhados da mesma expressão)
        sites.push({ key, file: rel, line: ln, receptor: recv, expr: n.getText(sf).slice(0, 60), consulta: functionReads(fn, VERSION_FIELDS) ? "sim" : "NÃO" });
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "ChecklistRunsPanel") {
        const runsAttr = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "runs");
        consumers.push({ file: rel, line: line(sf, n), runs: runsAttr ? runsAttr.initializer.getText(sf).slice(0, 40) : "(sem runs)" });
      }
    });
  }
  return { files: [...files].sort(), sites, consumers };
}

const emitted = dtoKeys(), mirror = mirrorKeys(), consumed = adapterKeys();
const dropMirror = emitted.filter((k) => !mirror.includes(k)), dropAdapter = emitted.filter((k) => !consumed.includes(k));
const { files, sites, consumers } = censo();
console.log(`# L0 DTO emite (${emitted.length}): ${emitted.join(", ")}`);
console.log(`# L1 espelho ChecklistRunSummaryItem (${mirror.length}): ${mirror.join(", ")}`);
console.log(`# L2 adapter consome (${consumed.length}): ${consumed.join(", ")}`);
console.log(`# DESCARTADAS pelo espelho (${dropMirror.length}): ${dropMirror.join(", ") || "∅"}`);
console.log(`# DESCARTADAS pelo adapter (${dropAdapter.length}): ${dropAdapter.join(", ") || "∅"}`);
console.log(`# L3 arquivos varridos (${files.length}): ${files.join(" · ")}`);
console.log(`# L3 pontos de apresentação da situação de uma vistoria (${sites.length}):`);
for (const s of sites) console.log(`${s.file}:${s.line} | receptor=${s.receptor} | ${s.expr} | consulta substituição: ${s.consulta}`);
console.log(`# L4 consumidores do painel (${consumers.length}):`);
for (const c of consumers) console.log(`${c.file}:${c.line} | runs=${c.runs}`);
const naoConsulta = sites.filter((s) => s.consulta !== "sim");
console.log(`# VEREDITO: descartadas=${dropMirror.length + dropAdapter.length} · pontos sem consulta=${naoConsulta.length}`);
process.exitCode = dropMirror.length + dropAdapter.length + naoConsulta.length === 0 ? 0 : 1;
