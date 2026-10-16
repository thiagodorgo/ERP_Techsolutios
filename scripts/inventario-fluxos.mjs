#!/usr/bin/env node
// =================================================================================================
// inventario-fluxos.mjs — frente 1 do refino (pedido do dono, 2026-10-15): o inventário
// "QUEM MANDA E QUEM RECEBE", GERADO A PARTIR DO CÓDIGO.
//
// O que ele lê (nada é escrito à mão; o que não consegue ler vai para a lista de "não lido"):
//   * Web     — rotas de frontend/src/App.tsx (caminho, componente, PermissionGuard), o menu de
//               frontend/src/layouts/appSidebarNav.ts (item → rota → grupo → tipo de perfil), o mapeamento
//               papel → rótulo de UI e os aliases de permissão de frontend/src/modules/auth/auth.adapter.ts, e,
//               para cada página, as chamadas ao backend alcançáveis a partir do componente (grafo de
//               referências pelo compilador TypeScript: página → hooks → services/adapters → apiRequest).
//   * Backend — as rotas Express montadas a partir de src/app.ts e src/portal-app.ts (método, caminho,
//               middleware de permissão), o catálogo de permissões por papel
//               (src/modules/core-saas/permissions/catalog.ts, transpilado e executado — é código sem import),
//               o registro do menu do backend (src/modules/navigation/navigation.registry.ts) e, para cada rota,
//               os efeitos alcançáveis a partir do handler (auditoria, notificação, despacho, financeiro, outbox,
//               gravação Prisma), pelo mesmo grafo de chamadas.
//   * RBAC_MATRIX.md — os 9 papéis canônicos, a matriz-base e as notas "**verbo** → papéis".
//
// Saída: docs/refino/inventario-fluxos.md e docs/refino/inventario-fluxos.json.
//
// Uso (Node puro; precisa só do pacote `typescript`):
//   node scripts/inventario-fluxos.mjs
//   TYPESCRIPT_PATH=<caminho de typescript.js> node scripts/inventario-fluxos.mjs   (checkout sem node_modules)
//   node scripts/inventario-fluxos.mjs --check   (não grava; falha se os arquivos versionados divergirem)
// =================================================================================================

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT_PADRAO = path.resolve(SCRIPT_DIR, "..");

// ------------------------------------------------------------------------------------------------
// Configuração DECLARADA (pontes que o código não diz sozinho). Tudo aqui sai impresso no relatório.
// ------------------------------------------------------------------------------------------------

// Funções do cliente HTTP do front que disparam requisição; o 2º argumento é o objeto de opções.
export const FUNCOES_API = { apiRequest: "GET", apiData: "GET", apiBlobRequest: "GET", apiFormDataRequest: "POST" };

// Categorias de "quem recebe": padrão (no texto da chamada ou no nome do modelo Prisma gravado) → destino.
// `telas` = rotas web onde o efeito aparece; os perfis que o veem são CALCULADOS a partir dessas rotas.
export const CATEGORIAS_EFEITO = [
  { id: "auditoria", rotulo: "Auditoria (audit_logs; nos portais, portal_access_logs)", telas: ["/audit", "/controle/usuarios/logs"] },
  { id: "notificacao", rotulo: "Notificação (inbox / agendada)", telas: ["/notifications", "/controle/notificacoes"] },
  { id: "notificacao_legal", rotulo: "Notificação legal do processo (pátio)", telas: ["/patios/processos/:processId"] },
  { id: "despacho", rotulo: "Despacho (app do técnico + console de despacho)", telas: ["/operations/dispatches", "/dispatch/console"] },
  { id: "timeline_os", rotulo: "Linha do tempo da OS", telas: ["/work-orders/:workOrderId"] },
  { id: "custodia", rotulo: "Cadeia de custódia (dossiê do pátio)", telas: ["/patios/processos/:processId"] },
  { id: "financeiro", rotulo: "Financeiro / extrato", telas: ["/finance", "/finance/charges", "/finance/payments", "/fleet/statement", "/finance/commissions"] },
  { id: "aprovacao", rotulo: "Fila de aprovações", telas: ["/approvals"] },
  { id: "estoque", rotulo: "Estoque", telas: ["/inventory"] },
  { id: "acesso", rotulo: "Acesso de usuários (usuários, papéis, sessões)", telas: ["/users", "/controle/usuarios/sessoes"] },
  { id: "telemetria", rotulo: "Telemetria / mapa", telas: ["/telemetria/rastreamento", "/operations/map"] },
  { id: "outbox", rotulo: "Outbox (integração assíncrona)", telas: [] },
  { id: "tempo_real", rotulo: "Evento em tempo real (stream)", telas: ["/operations/map", "/dispatch/console"] },
];

// Modelo Prisma gravado → categoria (só quando o modelo, sozinho, já diz quem recebe).
const MODELO_PARA_CATEGORIA = [
  [/^auditLogs?$/, "auditoria"],
  [/AccessLog$/, "auditoria"],
  [/^processNotification$/, "notificacao_legal"],
  [/notification/i, "notificacao"],
  [/^fieldDispatch/, "despacho"],
  [/^workOrderEvent$/, "timeline_os"],
  [/^custodyEvent$/, "custodia"],
  [/^(financial|settlement|processCharge|cheque|commission|workOrderFinancial|professionalStatement|expense|payable)/i, "financeiro"],
  [/approval/i, "aprovacao"],
  [/^(stockMovement|cycleCount|inventoryItem)/, "estoque"],
  [/^(userRoleAssignment|role|user|localAuthCredential|authSession)$/, "acesso"],
  [/^(telemetryEvent|fieldOperatorLocation)$/, "telemetria"],
];

// Ponte DECLARADA entre a linha da matriz-base do RBAC_MATRIX.md e o prefixo das permissões do catálogo.
// Só entram linhas cuja correspondência é inequívoca; as demais ficam fora da checagem (listadas no relatório).
export const PONTE_MATRIZ = {
  "Customer registry (Cadastros - Clientes)": ["customers"],
  "Vehicle registry (Cadastros - Viaturas)": ["vehicles"],
  "Team registry (Cadastros - Equipes)": ["teams"],
  "Service catalog (Cadastros - Serviços)": ["service_catalog"],
  "Price tables (Configurações - Tabela de Valores)": ["price_tables"],
  "Configurable checklist templates": ["tenant_checklists"],
  "Checklist executions and answers": ["checklist_runs"],
  "Work orders / service orders": ["work_orders"],
  "Field operator location": ["field_location"],
  "Cloud usage metering": ["platform:cloud-usage"],
  "Cloud cost import": ["platform:cloud-costs"],
  "Cloud cost allocation": ["platform:cloud-cost-allocation"],
  "Cloud charge markup rules": ["platform:cloud-charge-rules", "platform:cloud-charges"],
  "Audit logs": ["audit"],
  "Dashboard and operational overview": ["dashboard"],
};

const VERBOS_LEITURA = new Set(["read", "read_own", "history", "view"]);

// ------------------------------------------------------------------------------------------------
// TypeScript
// ------------------------------------------------------------------------------------------------

export function loadTypeScript(repoRoot = REPO_ROOT_PADRAO) {
  const tentativas = [];
  try {
    return createRequire(path.join(repoRoot, "package.json"))("typescript");
  } catch (error) {
    tentativas.push(`require("typescript") a partir de ${repoRoot}: ${error.code ?? error.message}`);
  }
  const envPath = process.env.TYPESCRIPT_PATH;
  if (envPath) {
    return createRequire(import.meta.url)(path.resolve(envPath));
  }
  throw new Error(
    `Pacote typescript não encontrado. Rode no checkout com node_modules ou exporte TYPESCRIPT_PATH.\n${tentativas.join("\n")}`,
  );
}

const norm = (p) => p.replace(/\\/g, "/");
const chaveArquivo = (p) => norm(p).replace(/^[a-zA-Z]:/, "").toLowerCase();

/** Programa TypeScript. `files` (opcional) = arquivos virtuais {caminho: texto} — usado pelos testes. */
export function criarPrograma(ts, rootNames, files) {
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    noEmit: true,
    skipLibCheck: true,
    allowJs: false,
    lib: ["lib.es2022.d.ts"],
    types: [],
    allowImportingTsExtensions: true,
    strict: false,
  };
  const host = ts.createCompilerHost(options, true);
  if (files) {
    const mapa = new Map(Object.entries(files).map(([k, v]) => [chaveArquivo(k), v]));
    const original = { getSourceFile: host.getSourceFile, fileExists: host.fileExists, readFile: host.readFile };
    host.getSourceFile = (nome, versao, onError, criarNovo) => {
      const texto = mapa.get(chaveArquivo(nome));
      if (texto !== undefined) {
        const kind = nome.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
        return ts.createSourceFile(nome, texto, versao, true, kind);
      }
      return original.getSourceFile(nome, versao, onError, criarNovo);
    };
    host.fileExists = (nome) => mapa.has(chaveArquivo(nome)) || original.fileExists(nome);
    host.readFile = (nome) => mapa.get(chaveArquivo(nome)) ?? original.readFile(nome);
    const diretorioExiste = host.directoryExists?.bind(host);
    host.directoryExists = (d) => {
      const k = chaveArquivo(d).replace(/\/?$/, "/");
      for (const chave of mapa.keys()) if (chave.startsWith(k)) return true;
      return diretorioExiste ? diretorioExiste(d) : false;
    };
  }
  const program = ts.createProgram(rootNames, options, host);
  program.__hostInventario = host;
  return program;
}

export function criarContexto(ts, program, root, escopo) {
  return {
    ts,
    program,
    checker: program.getTypeChecker(),
    root,
    escopo: chaveArquivo(escopo),
    cacheDireto: new Map(),
    implIndex: null,
  };
}

function relativo(ctx, arquivo) {
  const r = norm(path.relative(ctx.root, arquivo));
  return r.startsWith("..") ? norm(arquivo) : r;
}
function linhaDe(node) {
  const sf = node.getSourceFile();
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}
function localDe(ctx, node) {
  return `${relativo(ctx, node.getSourceFile().fileName)}:${linhaDe(node)}`;
}
function textoCurto(node, max = 90) {
  const t = node.getText().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
function noProjeto(ctx, sf) {
  if (!sf || sf.isDeclarationFile) return false;
  const k = chaveArquivo(sf.fileName);
  return k.startsWith(ctx.escopo) && !k.includes("/node_modules/");
}

function desembrulhar(ts, node) {
  let n = node;
  while (
    n &&
    (ts.isParenthesizedExpression(n) ||
      ts.isAsExpression(n) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n)) ||
      ts.isTypeAssertionExpression(n) ||
      ts.isNonNullExpression(n) ||
      ts.isAwaitExpression(n))
  ) {
    n = n.expression;
  }
  return n;
}

function declaracoesDe(ctx, node) {
  const { ts, checker } = ctx;
  let sym = null;
  try {
    sym = checker.getSymbolAtLocation(node);
    if (!sym && node.parent && ts.isShorthandPropertyAssignment(node.parent)) {
      sym = checker.getShorthandAssignmentValueSymbol(node.parent);
    }
    if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  } catch {
    return [];
  }
  return sym?.declarations ?? [];
}

// ------------------------------------------------------------------------------------------------
// Avaliador estático de literais (objetos, arrays, strings) — segue identificadores pelo compilador.
// ------------------------------------------------------------------------------------------------

const NAO_LIDO = (node) => ({ __naoLido: textoCurto(node) });
export const ehNaoLido = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && "__naoLido" in v;

function nomePropriedade(ts, nome) {
  if (ts.isIdentifier(nome) || ts.isStringLiteral(nome) || ts.isNumericLiteral(nome)) return nome.text;
  if (ts.isComputedPropertyName(nome) && ts.isStringLiteral(nome.expression)) return nome.expression.text;
  return null;
}

function valoresLiteraisDoTipo(ctx, node) {
  try {
    const tipo = ctx.checker.getTypeAtLocation(node);
    const membros = tipo.isUnion() ? tipo.types : [tipo];
    const out = [];
    for (const m of membros) {
      if (m.isStringLiteral()) out.push(m.value);
      else return null;
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export function avaliarLiteral(ctx, node, profundidade = 0) {
  const { ts } = ctx;
  if (!node) return null;
  if (profundidade > 14) return NAO_LIDO(node);
  const n = desembrulhar(ts, node);
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(n)) {
    const out = [];
    for (const el of n.elements) {
      if (ts.isSpreadElement(el)) {
        const v = avaliarLiteral(ctx, el.expression, profundidade + 1);
        if (Array.isArray(v)) out.push(...v);
        else out.push(NAO_LIDO(el));
      } else out.push(avaliarLiteral(ctx, el, profundidade + 1));
    }
    return out;
  }
  if (ts.isObjectLiteralExpression(n)) {
    const obj = {};
    for (const p of n.properties) {
      if (ts.isPropertyAssignment(p)) {
        const nome = nomePropriedade(ts, p.name);
        if (nome !== null) obj[nome] = avaliarLiteral(ctx, p.initializer, profundidade + 1);
      } else if (ts.isShorthandPropertyAssignment(p)) {
        obj[p.name.text] = avaliarLiteral(ctx, p.name, profundidade + 1);
      } else if (ts.isSpreadAssignment(p)) {
        const v = avaliarLiteral(ctx, p.expression, profundidade + 1);
        if (v && typeof v === "object" && !Array.isArray(v) && !ehNaoLido(v)) Object.assign(obj, v);
      }
    }
    return obj;
  }
  if (ts.isNewExpression(n) && n.expression.getText() === "Set" && n.arguments?.length === 1) {
    return avaliarLiteral(ctx, n.arguments[0], profundidade + 1);
  }
  if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) {
    const literal = valoresLiteraisDoTipo(ctx, n);
    if (literal && literal.length === 1) return literal[0];
    for (const d of declaracoesDe(ctx, ts.isPropertyAccessExpression(n) ? n.name : n)) {
      if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d) || ts.isParameter(d)) && d.initializer) {
        const v = avaliarLiteral(ctx, d.initializer, profundidade + 1);
        if (!ehNaoLido(v) || !literal) return v;
        break;
      }
    }
    if (literal) return literal;
  }
  return NAO_LIDO(n);
}

/** Avalia uma expressão que deve dar string(s) — lista de permissões, nome de evento etc. */
export function avaliarStrings(ctx, node) {
  const n = node ? desembrulhar(ctx.ts, node) : node;
  if (n && ctx.ts.isConditionalExpression(n)) {
    const a = avaliarStrings(ctx, n.whenTrue);
    const b = avaliarStrings(ctx, n.whenFalse);
    return { valores: [...new Set([...a.valores, ...b.valores])], naoLidos: [...a.naoLidos, ...b.naoLidos], condicional: true };
  }
  const v = avaliarLiteral(ctx, node);
  const out = [];
  const naoLidos = [];
  const visitar = (x) => {
    if (typeof x === "string") out.push(x);
    else if (Array.isArray(x)) x.forEach(visitar);
    else if (ehNaoLido(x)) naoLidos.push(x.__naoLido);
  };
  visitar(v);
  if (!out.length && !naoLidos.length) naoLidos.push(textoCurto(node));
  return { valores: out, naoLidos };
}

// Avaliador booleano de funções-regra (if (...) return "x"), sobre conjuntos de papéis/permissões.
function avaliarCondicao(ctx, node, amb) {
  const { ts } = ctx;
  const n = desembrulhar(ts, node);
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) {
    const v = avaliarCondicao(ctx, n.operand, amb);
    return v === null ? null : !v;
  }
  if (ts.isBinaryExpression(n)) {
    const op = n.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
      const a = avaliarCondicao(ctx, n.left, amb);
      const b = avaliarCondicao(ctx, n.right, amb);
      if (a === null || b === null) return null;
      return op === ts.SyntaxKind.AmpersandAmpersandToken ? a && b : a || b;
    }
    if (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken) {
      const esquerda = ts.isIdentifier(n.left) ? n.left.text : null;
      const direita = avaliarLiteral(ctx, n.right);
      if (esquerda && esquerda in amb.vars && typeof direita === "string") return amb.vars[esquerda] === direita;
      return null;
    }
  }
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "includes") {
    const receptor = n.expression.expression.getText();
    const alvo = avaliarLiteral(ctx, n.arguments[0]);
    const conjunto = /permissions$/i.test(receptor) ? amb.permissoes : /roles$/i.test(receptor) ? amb.papeis : null;
    if (conjunto && typeof alvo === "string") return conjunto.has(alvo);
  }
  return null;
}

/** Executa uma função-regra simples (cadeia de if → return literal) sobre um ambiente. */
export function executarFuncaoRegra(ctx, fn, amb) {
  const { ts } = ctx;
  if (!fn?.body) return { valor: null, naoLido: "função sem corpo" };
  const corpo = ts.isBlock(fn.body) ? fn.body.statements : [ts.factory.createReturnStatement(fn.body)];
  if (!ts.isBlock(fn.body)) {
    const v = avaliarCondicao(ctx, fn.body, amb);
    return v === null ? { valor: null, naoLido: textoCurto(fn.body) } : { valor: v };
  }
  for (const st of corpo) {
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && amb.param !== undefined) amb.vars[d.name.text] = amb.param;
      }
      continue;
    }
    if (ts.isIfStatement(st)) {
      const c = avaliarCondicao(ctx, st.expression, amb);
      if (c === null) return { valor: null, naoLido: textoCurto(st.expression) };
      if (c) {
        const ret = ts.isReturnStatement(st.thenStatement)
          ? st.thenStatement
          : ts.isBlock(st.thenStatement)
            ? st.thenStatement.statements.find((s) => ts.isReturnStatement(s))
            : null;
        if (!ret) return { valor: null, naoLido: textoCurto(st) };
        return { valor: avaliarLiteral(ctx, ret.expression) };
      }
      continue;
    }
    if (ts.isReturnStatement(st)) {
      const lit = avaliarLiteral(ctx, st.expression);
      if (typeof lit === "string") return { valor: lit };
      const c = avaliarCondicao(ctx, st.expression, amb);
      return c === null ? { valor: null, naoLido: textoCurto(st) } : { valor: c };
    }
  }
  return { valor: null, naoLido: "sem retorno" };
}

function acharDeclaracaoTopo(ctx, sf, nome) {
  const { ts } = ctx;
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name?.text === nome) return st;
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === nome) return d;
    }
  }
  return null;
}

// ------------------------------------------------------------------------------------------------
// Grafo de chamadas / referências (compartilhado por front e back)
// ------------------------------------------------------------------------------------------------

function ehFuncao(ts, n) {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isArrowFunction(n) ||
    ts.isFunctionExpression(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isConstructorDeclaration(n)
  );
}

function indiceImplementacoes(ctx) {
  if (ctx.implIndex) return ctx.implIndex;
  const { ts } = ctx;
  const porInterface = new Map();
  const metodosPorDir = new Map();
  for (const sf of ctx.program.getSourceFiles()) {
    if (!noProjeto(ctx, sf)) continue;
    const dir = chaveArquivo(path.dirname(sf.fileName));
    const visitar = (n) => {
      if (ts.isClassDeclaration(n)) {
        for (const h of n.heritageClauses ?? []) {
          for (const t of h.types) {
            const nome = t.expression.getText().split(".").pop();
            if (!porInterface.has(nome)) porInterface.set(nome, []);
            porInterface.get(nome).push(n);
          }
        }
        for (const m of n.members) {
          if ((ts.isMethodDeclaration(m) || ts.isPropertyDeclaration(m)) && m.name && ts.isIdentifier(m.name)) {
            const k = `${dir}::${m.name.text}`;
            if (!metodosPorDir.has(k)) metodosPorDir.set(k, []);
            metodosPorDir.get(k).push(m);
          }
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(sf);
  }
  ctx.implIndex = { porInterface, metodosPorDir };
  return ctx.implIndex;
}

/** Para uma assinatura de interface/tipo, devolve as implementações (classes que a implementam). */
function implementacoesDe(ctx, decl) {
  const { ts } = ctx;
  const nomeMetodo = decl.name && ts.isIdentifier(decl.name) ? decl.name.text : null;
  if (!nomeMetodo) return { decls: [], modo: "sem-nome" };
  let dono = decl.parent;
  let nomeDono = null;
  if (ts.isInterfaceDeclaration(dono)) nomeDono = dono.name.text;
  else if (ts.isTypeLiteralNode(dono) && ts.isTypeAliasDeclaration(dono.parent)) nomeDono = dono.parent.name.text;
  const idx = indiceImplementacoes(ctx);
  const out = [];
  if (nomeDono) {
    for (const cls of idx.porInterface.get(nomeDono) ?? []) {
      for (const m of cls.members) {
        if ((ts.isMethodDeclaration(m) || ts.isPropertyDeclaration(m)) && m.name?.getText() === nomeMetodo) out.push(m);
      }
    }
  }
  if (out.length) return { decls: out, modo: "implements" };
  const k = `${chaveArquivo(path.dirname(decl.getSourceFile().fileName))}::${nomeMetodo}`;
  const porNome = idx.metodosPorDir.get(k) ?? [];
  return { decls: porNome, modo: porNome.length ? "nome-no-modulo" : "nenhuma" };
}

/** Converte uma declaração em nós a percorrer (corpo executável). */
function alvosDeDeclaracao(ctx, d, profundidade = 0) {
  const { ts } = ctx;
  if (!d || profundidade > 4 || !noProjeto(ctx, d.getSourceFile())) return { alvos: [], fraco: false };
  if (ehFuncao(ts, d) || ts.isClassDeclaration(d)) return { alvos: [d], fraco: false };
  if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d) || ts.isPropertyDeclaration(d)) && d.initializer) {
    return { alvos: [d.initializer], fraco: false };
  }
  if (ts.isParameter(d) && d.initializer) {
    const init = desembrulhar(ts, d.initializer);
    if (ts.isIdentifier(init) || ts.isPropertyAccessExpression(init)) {
      const res = { alvos: [], fraco: false };
      for (const dd of declaracoesDe(ctx, ts.isPropertyAccessExpression(init) ? init.name : init)) {
        const r = alvosDeDeclaracao(ctx, dd, profundidade + 1);
        res.alvos.push(...r.alvos);
      }
      return res;
    }
    return { alvos: [init], fraco: false };
  }
  if (ts.isMethodSignature(d) || ts.isPropertySignature(d)) {
    const impl = implementacoesDe(ctx, d);
    const res = { alvos: [], fraco: impl.modo === "nome-no-modulo" };
    for (const m of impl.decls) {
      if (ts.isPropertyDeclaration(m)) {
        if (m.initializer) res.alvos.push(m.initializer);
      } else res.alvos.push(m);
    }
    return res;
  }
  return { alvos: [], fraco: false };
}

function calleeIdentificador(ts, expr) {
  const e = desembrulhar(ts, expr);
  if (ts.isPropertyAccessExpression(e)) return e.name;
  if (ts.isIdentifier(e)) return e;
  return null;
}

const RE_RECEPTOR_PROJETO = /(service|repo|repository|controller|store|adapter|writer)\b/i;

/**
 * Informação direta de um nó: chamadas, alvos das chamadas (modo "chamadas") ou de toda referência
 * (modo "referencias"), e elos não resolvidos.
 */
export function infoDireta(ctx, raiz, modo) {
  const chave = `${modo}`;
  let porNo = ctx.cacheDireto.get(raiz);
  if (!porNo) {
    porNo = {};
    ctx.cacheDireto.set(raiz, porNo);
  }
  if (porNo[chave]) return porNo[chave];
  const { ts } = ctx;
  const info = { chamadas: [], alvos: new Set(), naoResolvidos: [], fracos: [] };
  porNo[chave] = info;
  const adicionarAlvos = (decls, origem) => {
    for (const d of decls) {
      const r = alvosDeDeclaracao(ctx, d);
      for (const a of r.alvos) {
        // `new Classe()` executa só o construtor — não a classe inteira (senão todo método "seria chamado").
        if (modo === "chamadas" && ts.isClassDeclaration(a)) {
          for (const m of a.members) if (ts.isConstructorDeclaration(m)) info.alvos.add(m);
        } else info.alvos.add(a);
      }
      if (r.fraco) info.fracos.push(origem);
    }
  };
  const visitar = (n) => {
    if (modo === "chamadas" && ts.isTaggedTemplateExpression(n)) info.chamadas.push(n);
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      if (ts.isCallExpression(n)) info.chamadas.push(n);
      const id = calleeIdentificador(ts, n.expression);
      if (id && modo === "chamadas") {
        const decls = declaracoesDe(ctx, id);
        if (decls.length) adicionarAlvos(decls, localDe(ctx, n));
        else if (ts.isPropertyAccessExpression(desembrulhar(ts, n.expression))) {
          const recv = desembrulhar(ts, n.expression).expression.getText();
          if (RE_RECEPTOR_PROJETO.test(recv)) info.naoResolvidos.push(`${textoCurto(n.expression, 60)} @ ${localDe(ctx, n)}`);
        }
      }
    }
    if (modo === "referencias" && ts.isIdentifier(n)) {
      const pai = n.parent;
      const ehNomeDeclarado =
        pai && (ts.isPropertyAssignment(pai) || ts.isMethodDeclaration(pai) || ts.isPropertyDeclaration(pai)) && pai.name === n;
      if (!ehNomeDeclarado) {
        const decls = declaracoesDe(ctx, n);
        adicionarAlvos(decls, localDe(ctx, n));
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(raiz);
  info.alvos.delete(raiz);
  return info;
}

/** Percorre o grafo a partir de nós-raiz; devolve as chamadas encontradas em todo o alcance. */
export function alcancar(ctx, raizes, modo, limite = 4000) {
  const vistos = new Set();
  const fila = [...raizes];
  const chamadas = [];
  const naoResolvidos = new Set();
  const fracos = new Set();
  while (fila.length && vistos.size < limite) {
    const n = fila.shift();
    if (vistos.has(n)) continue;
    vistos.add(n);
    const info = infoDireta(ctx, n, modo);
    for (const c of info.chamadas) chamadas.push(c);
    for (const x of info.naoResolvidos) naoResolvidos.add(x);
    for (const x of info.fracos) fracos.add(x);
    for (const a of info.alvos) if (!vistos.has(a)) fila.push(a);
  }
  return { chamadas, naoResolvidos: [...naoResolvidos], fracos: [...fracos], nos: vistos.size, truncado: fila.length > 0 };
}

// ------------------------------------------------------------------------------------------------
// BACKEND — rotas Express
// ------------------------------------------------------------------------------------------------

const METODOS_HTTP = new Set(["get", "post", "put", "patch", "delete", "all"]);
const RE_MIDDLEWARE_PERMISSAO = /^require\w*(Permission|Permissions|Admin)$/;

function juntarCaminho(a, b) {
  const s = `${a}/${b}`.replace(/\/+/g, "/");
  return s.length > 1 ? s.replace(/\/$/, "") : s;
}

function corpoDeFuncao(ctx, decl) {
  const { ts } = ctx;
  if (ehFuncao(ts, decl)) return decl.body ?? null;
  if (ts.isVariableDeclaration(decl) && decl.initializer) {
    const i = desembrulhar(ts, decl.initializer);
    if (ts.isArrowFunction(i) || ts.isFunctionExpression(i)) return i.body;
  }
  return null;
}

function criaRouter(ctx, corpo) {
  const { ts } = ctx;
  let achou = false;
  const visitar = (n) => {
    if (achou) return;
    if (ts.isCallExpression(n) && /(^|\.)Router$|^express$/.test(n.expression.getText())) achou = true;
    else ts.forEachChild(n, visitar);
  };
  visitar(corpo);
  return achou;
}

function variaveisRouter(ctx, corpo) {
  const { ts } = ctx;
  const nomes = new Set();
  const visitar = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)) {
      const i = desembrulhar(ts, n.initializer);
      if (ts.isCallExpression(i) && /(^|\.)Router$|^express$/.test(i.expression.getText())) nomes.add(n.name.text);
    }
    if (n !== corpo && ehFuncao(ts, n)) return;
    ts.forEachChild(n, visitar);
  };
  visitar(corpo);
  return nomes;
}

/** Resolve a permissão exigida por uma chamada de middleware `requireX(...)`. */
export function resolverMiddlewarePermissao(ctx, chamada, profundidade = 0) {
  const { ts } = ctx;
  const nome = calleeIdentificador(ts, chamada.expression)?.text ?? "";
  const resultado = { middleware: nome, tipo: "tenant", permissoes: [], condicional: false, naoLidos: [] };
  if (/Platform/.test(nome)) resultado.tipo = "platform";
  if (/^require(Any)?(\w*)Permissions?$/.test(nome) && chamada.arguments.length > 0) {
    for (const a of chamada.arguments) {
      const r = avaliarStrings(ctx, a);
      resultado.permissoes.push(...r.valores);
      resultado.naoLidos.push(...r.naoLidos);
    }
    return resultado;
  }
  // Middleware composto (ex.: requireStatusPermission(), requirePlatformAdmin()): lê o corpo.
  if (profundidade > 2) {
    resultado.naoLidos.push(textoCurto(chamada));
    return resultado;
  }
  const id = calleeIdentificador(ts, chamada.expression);
  const decls = id ? declaracoesDe(ctx, id) : [];
  const corpo = decls.map((d) => corpoDeFuncao(ctx, d)).find(Boolean);
  if (!corpo) {
    resultado.naoLidos.push(textoCurto(chamada));
    return resultado;
  }
  resultado.condicional = true;
  const internas = [];
  const visitar = (n) => {
    if (ts.isCallExpression(n) && RE_MIDDLEWARE_PERMISSAO.test(calleeIdentificador(ts, n.expression)?.text ?? "")) internas.push(n);
    ts.forEachChild(n, visitar);
  };
  visitar(corpo);
  for (const i of internas) {
    const r = resolverMiddlewarePermissao(ctx, i, profundidade + 1);
    if (r.tipo === "platform") resultado.tipo = "platform";
    resultado.permissoes.push(...r.permissoes);
    resultado.naoLidos.push(...r.naoLidos);
    // permissão condicional: avaliarStrings de expressão condicional já devolve os dois ramos
  }
  // Também colhe literais de permissão passados por expressão condicional dentro do corpo.
  if (!internas.length) resultado.naoLidos.push(textoCurto(chamada));
  resultado.permissoes = [...new Set(resultado.permissoes)];
  return resultado;
}

/** Extrai a árvore de rotas a partir de uma função-fábrica (createApp, createXRouter). */
export function extrairRotasBackend(ctx, fabricas) {
  const { ts } = ctx;
  const rotas = [];
  const naoLidos = [];
  const visitadas = new Set();

  const processarFabrica = (decl, prefixo, origemMontagem) => {
    // Router de módulo (`export const healthRouter = Router()` + `healthRouter.get(...)` no topo do arquivo).
    const moduloRouter = ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) && decl.initializer &&
      ts.isCallExpression(desembrulhar(ts, decl.initializer)) && /(^|\.)Router$/.test(desembrulhar(ts, decl.initializer).expression.getText());
    const corpo = moduloRouter ? decl.getSourceFile() : corpoDeFuncao(ctx, decl);
    if (!corpo) {
      naoLidos.push({ onde: localDe(ctx, decl), motivo: "fábrica de router sem corpo legível" });
      return;
    }
    const chave = `${localDe(ctx, decl)}|${prefixo}`;
    if (visitadas.has(chave)) return;
    visitadas.add(chave);
    const routers = moduloRouter ? new Set([decl.name.text]) : variaveisRouter(ctx, corpo);
    const permissoesNivelRouter = [];
    const visitar = (n) => {
      if (n !== corpo && ehFuncao(ts, n)) return;
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const recv = n.expression.expression;
        const metodo = n.expression.name.text;
        if (ts.isIdentifier(recv) && routers.has(recv.text)) {
          if (METODOS_HTTP.has(metodo)) {
            registrarRota(n, metodo, prefixo, permissoesNivelRouter, origemMontagem);
            return;
          }
          if (metodo === "use") {
            processarUse(n, prefixo, permissoesNivelRouter);
            return;
          }
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(corpo);
  };

  const fabricaDeRouter = (expr) => {
    const e = desembrulhar(ts, expr);
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) return fabricaDeRouter(e.right);
    if (ts.isIdentifier(e)) {
      for (const d of declaracoesDe(ctx, e)) {
        if (ts.isVariableDeclaration(d) && d.initializer && noProjeto(ctx, d.getSourceFile())) {
          const i = desembrulhar(ts, d.initializer);
          if (ts.isCallExpression(i) && /(^|\.)Router$/.test(i.expression.getText())) return d;
        }
      }
      return null;
    }
    if (!ts.isCallExpression(e)) return null;
    const id = calleeIdentificador(ts, e.expression);
    if (!id) return null;
    for (const d of declaracoesDe(ctx, id)) {
      const corpo = corpoDeFuncao(ctx, d);
      if (corpo && noProjeto(ctx, d.getSourceFile()) && criaRouter(ctx, corpo)) return d;
    }
    return null;
  };

  const processarUse = (chamada, prefixo, permissoesNivelRouter) => {
    let args = [...chamada.arguments];
    let sub = "";
    if (args.length && (ts.isStringLiteral(args[0]) || ts.isNoSubstitutionTemplateLiteral(args[0]))) {
      sub = args[0].text;
      args = args.slice(1);
    }
    for (const a of args) {
      const e = desembrulhar(ts, a);
      if (ts.isCallExpression(e) && RE_MIDDLEWARE_PERMISSAO.test(calleeIdentificador(ts, e.expression)?.text ?? "")) {
        permissoesNivelRouter.push({ escopo: juntarCaminho(prefixo, sub), ...resolverMiddlewarePermissao(ctx, e) });
        continue;
      }
      const fab = fabricaDeRouter(a);
      if (fab) processarFabrica(fab, juntarCaminho(prefixo, sub), localDe(ctx, chamada));
      else if (ts.isIdentifier(e) && /router/i.test(e.text)) {
        naoLidos.push({ onde: localDe(ctx, chamada), motivo: `router montado por variável não resolvida (${e.text})` });
      }
    }
  };

  const registrarRota = (chamada, metodo, prefixo, permissoesNivelRouter, origemMontagem) => {
    const [arg0, ...resto] = chamada.arguments;
    const caminho = arg0 ? avaliarLiteral(ctx, arg0) : null;
    if (typeof caminho !== "string") {
      naoLidos.push({ onde: localDe(ctx, chamada), motivo: `caminho não literal (${arg0 ? textoCurto(arg0, 50) : "?"})` });
      return;
    }
    const completo = juntarCaminho(prefixo, caminho);
    const guardas = permissoesNivelRouter
      .filter((p) => completo === p.escopo || completo.startsWith(`${p.escopo}/`) || p.escopo === prefixo)
      .map((p) => ({ ...p, nivel: "router" }));
    const handlers = [];
    for (const a of resto) {
      const e = desembrulhar(ts, a);
      if (ts.isCallExpression(e) && RE_MIDDLEWARE_PERMISSAO.test(calleeIdentificador(ts, e.expression)?.text ?? "")) {
        guardas.push({ ...resolverMiddlewarePermissao(ctx, e), nivel: "rota" });
      } else handlers.push(a);
    }
    const permissoes = [...new Set(guardas.flatMap((g) => g.permissoes))];
    rotas.push({
      metodo: metodo.toUpperCase(),
      caminho: completo,
      local: localDe(ctx, chamada),
      montadoEm: origemMontagem,
      tipoGuarda: guardas.length ? (guardas.some((g) => g.tipo === "platform") ? "platform" : "tenant") : "nenhuma",
      permissoes,
      guardaCondicional: guardas.some((g) => g.condicional),
      middlewares: guardas.map((g) => g.middleware),
      guardaNaoLida: guardas.flatMap((g) => g.naoLidos),
      _handlers: handlers,
    });
  };

  for (const f of fabricas) processarFabrica(f.decl, f.prefixo ?? "", f.origem ?? localDe(ctx, f.decl));
  return { rotas, naoLidos };
}

/** Acha, num arquivo, as funções que criam `express()` (raízes de app). */
export function fabricasRaiz(ctx, arquivo) {
  const { ts } = ctx;
  const sf = ctx.program.getSourceFile(arquivo);
  if (!sf) return [];
  const out = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.body) {
      let temExpress = false;
      const v = (n) => {
        if (ts.isCallExpression(n) && n.expression.getText() === "express") temExpress = true;
        if (!temExpress) ts.forEachChild(n, v);
      };
      v(st.body);
      if (temExpress) out.push({ decl: st, prefixo: "", origem: localDe(ctx, st) });
    }
  }
  return out;
}

// ---- Efeitos ("quem recebe") --------------------------------------------------------------------

const RE_PRISMA_ESCRITA = /(?:^|\.)(?:client|tx|trx|prisma|db|transaction|prismaClient|database)\.([a-zA-Z]\w*)\.(create|createMany|createManyAndReturn|upsert|update|updateMany|updateManyAndReturn|delete|deleteMany)$/;
// Auditoria: o texto da chamada cita "audit" E o último nome é verbo de gravação (record/write/log/save/append/
// insert/create). Fábricas (…Service/…Repository/…Factory) e utilitários (sanitize/clone/…) não contam.
const RE_VERBO_GRAVACAO = /^(audit$|(record|write|log|save|append|insert|create|createMany)(?![a-z])\w*$)/;
const RE_NOME_EVENTO = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const RE_FABRICA = /(Service|Repository|Factory|Client|Context|Writer)$|^create(Default|Memory|Prisma|Runtime)/;

function extrairAcaoDeAuditoria(ctx, chamada) {
  const { ts } = ctx;
  const acoes = [];
  let dinamica = false;
  const visitar = (n) => {
    if (ehFuncao(ts, n)) return;
    if (ts.isPropertyAssignment(n) && nomePropriedade(ts, n.name) === "action") {
      const r = avaliarStrings(ctx, n.initializer);
      const init = desembrulhar(ts, n.initializer);
      if (ts.isConditionalExpression(init)) {
        for (const ramo of [init.whenTrue, init.whenFalse]) {
          const rr = avaliarStrings(ctx, ramo);
          acoes.push(...rr.valores);
          if (rr.naoLidos.length) dinamica = true;
        }
      } else if (r.valores.length > 1 && !ts.isStringLiteral(init)) {
        // Um TIPO união (ex.: `input.action`) diz o que PODERIA vir, não o que esta rota grava: dinâmico.
        dinamica = true;
      } else {
        acoes.push(...r.valores);
        if (r.naoLidos.length) dinamica = true;
      }
      return;
    }
    ts.forEachChild(n, visitar);
  };
  for (const a of chamada.arguments) visitar(a);
  // Embrulho do tipo this.audit(request, "evento.nome", …): o nome vem como argumento literal.
  for (const a of chamada.arguments ?? []) {
    const e = desembrulhar(ts, a);
    if ((ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && RE_NOME_EVENTO.test(e.text)) acoes.push(e.text);
    if (ts.isConditionalExpression(e)) {
      for (const ramo of [e.whenTrue, e.whenFalse]) {
        const r = desembrulhar(ts, ramo);
        if (ts.isStringLiteral(r) && RE_NOME_EVENTO.test(r.text)) acoes.push(r.text);
      }
    }
  }
  return { acoes: [...new Set(acoes)], dinamica: dinamica || acoes.length === 0 };
}

/** Classifica as chamadas alcançadas a partir de um handler em efeitos. */
export function classificarEfeitos(ctx, chamadas) {
  const { ts } = ctx;
  const efeitos = [];
  const vistos = new Set();
  // Um efeito por (categoria, padrão, alvo); os nomes de evento de auditoria se somam.
  const porChave = new Map();
  const add = (e) => {
    const k = `${e.categoria}|${e.padrao}|${e.alvo}`;
    const ja = porChave.get(k);
    if (ja) {
      if (e.acoes?.length) ja.acoes = [...new Set([...(ja.acoes ?? []), ...e.acoes])];
      if (e.acoes && !e.dinamica) ja.dinamica = Boolean(ja.dinamica && !ja.acoes?.length);
      return;
    }
    porChave.set(k, e);
    vistos.add(k);
    efeitos.push(e);
  };
  for (const c of chamadas) {
    const local = localDe(ctx, c);
    // SQL cru em template marcado: tx.$executeRaw`INSERT INTO tabela …` → tabela gravada.
    if (ts.isTaggedTemplateExpression(c)) {
      if (!/\$executeRaw/.test(c.tag.getText())) continue;
      const sql = c.template.getText();
      const m = /\b(?:insert\s+into|update|delete\s+from)\s+"?([a-z_]+)"?/i.exec(sql);
      if (!m) continue; // SELECT set_config(...), SET LOCAL etc. não gravam dado de negócio
      const tabela = m[1];
      const modelo = tabela.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      const cat = MODELO_PARA_CATEGORIA.find(([re]) => re.test(modelo) || re.test(modelo.replace(/s$/, "")))?.[1] ?? "gravacao";
      add({ categoria: cat, padrao: "SQL cru ($executeRaw)", alvo: tabela, local, ...(cat === "auditoria" ? { acoes: [], dinamica: true } : {}) });
      continue;
    }
    const texto = c.expression.getText().replace(/\s+/g, "").replace(/\?\./g, ".");
    const ultimo = texto.split(".").pop() ?? "";
    const prisma = RE_PRISMA_ESCRITA.exec(texto);
    if (prisma) {
      const modelo = prisma[1];
      const cat = MODELO_PARA_CATEGORIA.find(([re]) => re.test(modelo))?.[1] ?? "gravacao";
      const ev = { categoria: cat, padrao: /AccessLog$/.test(modelo) ? "gravação Prisma (trilha de acesso do portal, não audit_logs)" : "gravação Prisma", alvo: `${modelo}.${prisma[2]}`, local };
      if (cat === "auditoria") Object.assign(ev, extrairAcaoDeAuditoria(ctx, c));
      add(ev);
      continue;
    }
    if (/\$(executeRaw|executeRawUnsafe)/.test(texto)) {
      add({ categoria: "gravacao", padrao: "SQL cru ($executeRaw)", alvo: "SQL", local });
      continue;
    }
    if (RE_FABRICA.test(ultimo)) continue;
    if (/audit|accessLog/i.test(texto) && RE_VERBO_GRAVACAO.test(ultimo) && !ts.isNewExpression(c)) {
      const padrao = /audit/i.test(texto) ? "chamada de auditoria" : "trilha de acesso do portal (portal_access_logs, não audit_logs)";
      add({ categoria: "auditoria", padrao, alvo: textoCurto(c.expression, 60), local, ...extrairAcaoDeAuditoria(ctx, c) });
      continue;
    }
    if (/outbox/i.test(texto) && /(create|append|enqueue|insert|write|record|add|push|publish)/i.test(ultimo)) {
      add({ categoria: "outbox", padrao: "outbox", alvo: textoCurto(c.expression, 60), local });
      continue;
    }
    if (/notif/i.test(texto) && /^(create|send|schedule|enqueue|notify|dispatch|emit|publish|fire|deliver)/i.test(ultimo)) {
      add({ categoria: /process/i.test(texto) ? "notificacao_legal" : "notificacao", padrao: "notificação", alvo: textoCurto(c.expression, 60), local });
      continue;
    }
    if (/approval/i.test(texto) && /^(create|request|open|submit|insert)/i.test(ultimo)) {
      add({ categoria: "aprovacao", padrao: "aprovação", alvo: textoCurto(c.expression, 60), local });
      continue;
    }
    if (/^(publish|broadcast|emit)/i.test(ultimo) && /(event|realtime|stream|bus|hub|sse)/i.test(texto)) {
      add({ categoria: "tempo_real", padrao: "publicação de evento", alvo: textoCurto(c.expression, 60), local });
    }
  }
  return efeitos;
}

export function analisarEfeitosDaRota(ctx, rota) {
  const raizes = [];
  for (const h of rota._handlers) {
    raizes.push(h);
    const e = desembrulhar(ctx.ts, h);
    if (ctx.ts.isIdentifier(e) || ctx.ts.isPropertyAccessExpression(e)) {
      for (const d of declaracoesDe(ctx, ctx.ts.isPropertyAccessExpression(e) ? e.name : e)) {
        raizes.push(...alvosDeDeclaracao(ctx, d).alvos);
      }
    }
  }
  const alc = alcancar(ctx, raizes, "chamadas");
  return {
    efeitos: classificarEfeitos(ctx, alc.chamadas),
    elosNaoResolvidos: alc.naoResolvidos,
    elosPorNome: alc.fracos,
    nosPercorridos: alc.nos,
    truncado: alc.truncado,
  };
}

// ------------------------------------------------------------------------------------------------
// FRONT — rotas, menu, chamadas
// ------------------------------------------------------------------------------------------------

function atributoJsx(ts, el, nome) {
  const attrs = (ts.isJsxElement(el) ? el.openingElement : el).attributes;
  for (const p of attrs.properties) if (ts.isJsxAttribute(p) && p.name.getText() === nome) return p;
  return null;
}
function valorAtributo(ts, attr) {
  if (!attr?.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer;
  if (ts.isJsxExpression(attr.initializer)) return attr.initializer.expression ?? null;
  return null;
}
function nomeTag(ts, el) {
  return (ts.isJsxElement(el) ? el.openingElement : el).tagName.getText();
}
function filhosJsx(ts, el) {
  if (!ts.isJsxElement(el)) return [];
  return el.children.filter((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c));
}

/** Resolve o componente (identificador JSX) até a declaração da página, inclusive `lazy(() => import(...))`. */
function resolverComponente(ctx, tagNode) {
  const { ts } = ctx;
  for (const d of declaracoesDe(ctx, tagNode)) {
    if (ts.isVariableDeclaration(d) && d.initializer) {
      let especificador = null;
      let exportado = null;
      const v = (n) => {
        if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
          especificador = n.arguments[0].text;
        }
        if (ts.isPropertyAssignment(n) && nomePropriedade(ts, n.name) === "default" && ts.isPropertyAccessExpression(n.initializer)) {
          exportado = n.initializer.name.text;
        }
        ts.forEachChild(n, v);
      };
      v(d.initializer);
      if (especificador) {
        const res = ts.resolveModuleName(especificador, d.getSourceFile().fileName, ctx.program.getCompilerOptions(), ctx.program.__hostInventario ?? ts.sys);
        const arq = res.resolvedModule?.resolvedFileName;
        const sf = arq ? ctx.program.getSourceFile(arq) : null;
        if (!sf) return { decl: null, motivo: `import dinâmico não resolvido (${especificador})` };
        const alvo = acharDeclaracaoTopo(ctx, sf, exportado ?? "default");
        return alvo ? { decl: alvo, arquivo: relativo(ctx, sf.fileName), nome: exportado } : { decl: null, motivo: `export ${exportado} não achado em ${relativo(ctx, sf.fileName)}` };
      }
    }
    if (ts.isFunctionDeclaration(d) || ts.isVariableDeclaration(d) || ts.isClassDeclaration(d)) {
      return { decl: d, arquivo: relativo(ctx, d.getSourceFile().fileName), nome: d.name?.getText() };
    }
  }
  return { decl: null, motivo: `componente ${tagNode.getText()} não resolvido` };
}

/** Rotas do App.tsx: caminho, layout, guarda, componente. */
export function extrairRotasFront(ctx, arquivoApp) {
  const { ts } = ctx;
  const sf = ctx.program.getSourceFile(arquivoApp);
  const rotas = [];
  const naoLidos = [];
  if (!sf) return { rotas, naoLidos: [{ onde: arquivoApp, motivo: "arquivo não encontrado" }] };
  const visitar = (n, layout) => {
    if ((ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) && nomeTag(ts, n) === "Route") {
      const caminhoAttr = valorAtributo(ts, atributoJsx(ts, n, "path"));
      const elementoExpr = valorAtributo(ts, atributoJsx(ts, n, "element"));
      const elemento = elementoExpr ? desembrulhar(ts, elementoExpr) : null;
      if (!caminhoAttr) {
        const novoLayout = elemento && (ts.isJsxElement(elemento) || ts.isJsxSelfClosingElement(elemento)) ? nomeTag(ts, elemento) : layout;
        for (const f of filhosJsx(ts, n)) visitar(f, novoLayout);
        return;
      }
      const caminho = avaliarLiteral(ctx, caminhoAttr);
      if (typeof caminho !== "string") {
        naoLidos.push({ onde: localDe(ctx, n), motivo: "path não literal" });
        return;
      }
      const rota = { caminho, layout, local: localDe(ctx, n), guarda: null, componente: null, redireciona: null, _decl: null };
      if (!elemento || !(ts.isJsxElement(elemento) || ts.isJsxSelfClosingElement(elemento))) {
        naoLidos.push({ onde: rota.local, motivo: "element não é JSX" });
      } else {
        let alvo = elemento;
        if (nomeTag(ts, elemento) === "PermissionGuard") {
          const perms = avaliarStrings(ctx, valorAtributo(ts, atributoJsx(ts, elemento, "permissions")));
          rota.guarda = { componente: "PermissionGuard", permissoes: perms.valores, naoLidos: perms.naoLidos };
          alvo = filhosJsx(ts, elemento)[0] ?? null;
        }
        if (alvo && nomeTag(ts, alvo) === "Navigate") {
          rota.redireciona = avaliarLiteral(ctx, valorAtributo(ts, atributoJsx(ts, alvo, "to")));
        } else if (alvo) {
          const tag = (ts.isJsxElement(alvo) ? alvo.openingElement : alvo).tagName;
          const r = resolverComponente(ctx, tag);
          rota.componente = tag.getText();
          if (r.decl) {
            rota._decl = r.decl;
            rota.arquivoComponente = r.arquivo;
          } else naoLidos.push({ onde: rota.local, motivo: r.motivo });
        }
      }
      rotas.push(rota);
      return;
    }
    ts.forEachChild(n, (c) => visitar(c, layout));
  };
  visitar(sf, null);
  return { rotas, naoLidos };
}

/** Menu lateral (appSidebarNav.ts): itens por tipo de perfil, allowlist e função papel→tipo. */
export function extrairMenu(ctx, arquivoNav) {
  const sf = ctx.program.getSourceFile(arquivoNav);
  if (!sf) return { porTipo: {}, allowlist: null, naoLidos: [{ onde: arquivoNav, motivo: "arquivo não encontrado" }], _roleKindFor: null };
  const naoLidos = [];
  const navDecl = acharDeclaracaoTopo(ctx, sf, "NAV_BY_ROLE");
  const porTipo = {};
  if (navDecl?.initializer) {
    const v = avaliarLiteral(ctx, navDecl.initializer);
    for (const [tipo, grupos] of Object.entries(v ?? {})) {
      porTipo[tipo] = [];
      for (const g of Array.isArray(grupos) ? grupos : []) {
        for (const it of Array.isArray(g?.items) ? g.items : []) {
          if (it && typeof it.path === "string") porTipo[tipo].push({ grupo: g.label, rotulo: it.label, caminho: it.path });
          else naoLidos.push({ onde: localDe(ctx, navDecl), motivo: `item de menu não lido no tipo ${tipo}` });
        }
      }
    }
  } else naoLidos.push({ onde: relativo(ctx, arquivoNav), motivo: "NAV_BY_ROLE não achado" });
  const allowDecl = acharDeclaracaoTopo(ctx, sf, "MVP_NAV_PATHS");
  const allow = allowDecl?.initializer ? avaliarLiteral(ctx, allowDecl.initializer) : null;
  return {
    porTipo,
    allowlist: Array.isArray(allow) ? allow.filter((x) => typeof x === "string") : null,
    naoLidos,
    _roleKindFor: acharDeclaracaoTopo(ctx, sf, "roleKindFor"),
    localNav: navDecl ? localDe(ctx, navDecl) : relativo(ctx, arquivoNav),
  };
}

/** Papel do backend → rótulo de UI, aliases de permissão e bypass de plataforma da UI. */
export function extrairCamadaPapeisUi(ctx, arquivoAuthAdapter, arquivoNavTypes) {
  const out = { mapBackendRole: null, aliases: {}, sempre: [], isPlatformAdmin: null, naoLidos: [] };
  const sf = ctx.program.getSourceFile(arquivoAuthAdapter);
  if (sf) {
    out.mapBackendRole = acharDeclaracaoTopo(ctx, sf, "mapBackendRole");
    const al = acharDeclaracaoTopo(ctx, sf, "frontendPermissionAliases");
    const v = al?.initializer ? avaliarLiteral(ctx, al.initializer) : null;
    if (v && typeof v === "object") for (const [k, lst] of Object.entries(v)) out.aliases[k] = Array.isArray(lst) ? lst.filter((x) => typeof x === "string") : [];
    else out.naoLidos.push({ onde: relativo(ctx, arquivoAuthAdapter), motivo: "frontendPermissionAliases não lido" });
    const fn = acharDeclaracaoTopo(ctx, sf, "resolveFrontendPermissionsFromBackend");
    if (fn) {
      const v2 = (n) => {
        if (ctx.ts.isArrayLiteralExpression(n)) for (const e of n.elements) if (ctx.ts.isStringLiteral(e)) out.sempre.push(e.text);
        ctx.ts.forEachChild(n, v2);
      };
      v2(fn);
    }
    if (!out.mapBackendRole) out.naoLidos.push({ onde: relativo(ctx, arquivoAuthAdapter), motivo: "mapBackendRole não achada" });
  } else out.naoLidos.push({ onde: arquivoAuthAdapter, motivo: "arquivo não encontrado" });
  const sf2 = arquivoNavTypes ? ctx.program.getSourceFile(arquivoNavTypes) : null;
  if (sf2) out.isPlatformAdmin = acharDeclaracaoTopo(ctx, sf2, "isPlatformAdmin");
  return out;
}

// ---- chamadas HTTP do front ---------------------------------------------------------------------

const U = "\u0001";

function avaliarCaminho(ctx, node, amb, profundidade = 0) {
  const { ts } = ctx;
  if (!node || profundidade > 10) return [U];
  const n = desembrulhar(ts, node);
  const limitar = (arr) => [...new Set(arr)].slice(0, 8);
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [n.text];
  if (ts.isNumericLiteral(n)) return [n.text];
  if (ts.isTemplateExpression(n)) {
    let acc = [n.head.text];
    for (const span of n.templateSpans) {
      const t = span.expression.getText();
      const vs = /^apiBaseUrl\(\)$/.test(t) ? [""] : avaliarCaminho(ctx, span.expression, amb, profundidade + 1);
      const prox = [];
      for (const a of acc) for (const v of vs) prox.push(a + v + span.literal.text);
      acc = limitar(prox);
    }
    return acc;
  }
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const out = [];
    for (const a of avaliarCaminho(ctx, n.left, amb, profundidade + 1)) for (const b of avaliarCaminho(ctx, n.right, amb, profundidade + 1)) out.push(a + b);
    return limitar(out);
  }
  if (ts.isConditionalExpression(n)) {
    return limitar([...avaliarCaminho(ctx, n.whenTrue, amb, profundidade + 1), ...avaliarCaminho(ctx, n.whenFalse, amb, profundidade + 1)]);
  }
  if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) {
    const lit = valoresLiteraisDoTipo(ctx, n);
    if (lit) return limitar(lit);
    for (const d of declaracoesDe(ctx, ts.isPropertyAccessExpression(n) ? n.name : n)) {
      if (ts.isParameter(d)) return amb.has(d) ? amb.get(d) : [U];
      if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) return avaliarCaminho(ctx, d.initializer, amb, profundidade + 1);
    }
    return [U];
  }
  if (ts.isCallExpression(n)) {
    const id = calleeIdentificador(ts, n.expression);
    if (!id || /^(encodeURIComponent|String|encodeURI)$/.test(id.text)) return [U];
    for (const d of declaracoesDe(ctx, id)) {
      let fn = d;
      if (ts.isVariableDeclaration(d) && d.initializer) fn = desembrulhar(ts, d.initializer);
      if (!(ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) || !fn.body) continue;
      if (!noProjeto(ctx, fn.getSourceFile())) continue;
      const novoAmb = new Map(amb);
      fn.parameters.forEach((p, i) => {
        novoAmb.set(p, n.arguments[i] ? avaliarCaminho(ctx, n.arguments[i], amb, profundidade + 1) : p.initializer ? avaliarCaminho(ctx, p.initializer, amb, profundidade + 1) : [U]);
      });
      if (!ts.isBlock(fn.body)) return avaliarCaminho(ctx, fn.body, novoAmb, profundidade + 1);
      const rets = [];
      const v = (x) => {
        if (x !== fn.body && ehFuncao(ts, x)) return;
        if (ts.isReturnStatement(x) && x.expression) rets.push(x.expression);
        ts.forEachChild(x, v);
      };
      v(fn.body);
      const out = [];
      for (const r of rets) out.push(...avaliarCaminho(ctx, r, novoAmb, profundidade + 1));
      return out.length ? limitar(out) : [U];
    }
    return [U];
  }
  return [U];
}

/** Normaliza um caminho avaliado: tira query, troca trechos dinâmicos por :param. null = não lido. */
export function normalizarCaminhoFront(bruto) {
  let s = bruto.split("?")[0];
  const notas = [];
  if (s.startsWith("/api/v1/")) s = s.slice("/api/v1".length);
  if (!s.startsWith("/")) return { caminho: null, notas: ["caminho começa dinâmico"] };
  const segs = s.split("/").slice(1);
  const out = [];
  segs.forEach((seg, i) => {
    if (seg === U) out.push(":param");
    else if (seg.includes(U)) {
      if (i === segs.length - 1 && !seg.startsWith(U) && seg.endsWith(U) && seg.indexOf(U) === seg.length - 1) {
        out.push(seg.slice(0, -1));
        notas.push("sufixo dinâmico tratado como query");
      } else {
        out.push(":param");
        notas.push("segmento parcialmente dinâmico");
      }
    } else out.push(seg);
  });
  let caminho = `/${out.join("/")}`.replace(/\/+$/, "");
  if (!caminho) caminho = "/";
  return { caminho, notas };
}

function metodoDaChamada(ctx, chamada, padrao) {
  const { ts } = ctx;
  const opt = chamada.arguments[1];
  if (!opt) return { metodos: [padrao] };
  const o = desembrulhar(ts, opt);
  if (ts.isObjectLiteralExpression(o)) {
    const p = o.properties.find((x) => ts.isPropertyAssignment(x) && nomePropriedade(ts, x.name) === "method");
    if (!p) return { metodos: [padrao] };
    const r = avaliarStrings(ctx, p.initializer);
    return r.valores.length ? { metodos: r.valores.map((m) => m.toUpperCase()) } : { metodos: [], naoLido: textoCurto(p) };
  }
  return { metodos: [padrao], nota: "opções por expressão: método padrão assumido" };
}

/** Todas as chamadas HTTP do front num conjunto de chamadas (CallExpression). */
export function lerChamadaApi(ctx, chamada) {
  const { ts } = ctx;
  const id = calleeIdentificador(ts, chamada.expression);
  if (!id) return null;
  const nome = id.text;
  let padrao;
  if (Object.hasOwn(FUNCOES_API, nome)) padrao = FUNCOES_API[nome];
  else if (nome === "fetch" && ts.isIdentifier(desembrulhar(ts, chamada.expression))) {
    const a0 = chamada.arguments[0];
    const t = a0?.getText() ?? "";
    if (!/apiBaseUrl\(\)|["'`]\/api\/v1/.test(t)) return null;
    padrao = "GET";
  } else return null;
  // Embrulhos (o próprio cliente HTTP repassando `path`) não são chamadas: ignorados.
  const a0 = chamada.arguments[0];
  if (!a0) return null;
  const e0 = desembrulhar(ts, a0);
  if (ts.isIdentifier(e0)) {
    const d = declaracoesDe(ctx, e0)[0];
    if (d && ts.isParameter(d)) {
      let f = d.parent;
      const nomeF = f?.name?.getText?.() ?? (f?.parent && ts.isVariableDeclaration(f.parent) ? f.parent.name.getText() : "");
      if (Object.hasOwn(FUNCOES_API, nomeF)) return null;
    }
  }
  let metodo;
  if (nome === "fetch") {
    const opt = chamada.arguments[1] ? desembrulhar(ts, chamada.arguments[1]) : null;
    const p = opt && ts.isObjectLiteralExpression(opt) ? opt.properties.find((x) => ts.isPropertyAssignment(x) && nomePropriedade(ts, x.name) === "method") : null;
    const r = p ? avaliarStrings(ctx, p.initializer) : { valores: ["GET"] };
    metodo = { metodos: r.valores.map((m) => m.toUpperCase()) };
  } else metodo = metodoDaChamada(ctx, chamada, padrao);
  const brutos = avaliarCaminho(ctx, a0, new Map());
  const caminhos = [];
  const notas = [];
  const naoLidos = [];
  for (const b of brutos) {
    const r = normalizarCaminhoFront(b);
    if (r.caminho) caminhos.push(r.caminho);
    else naoLidos.push(textoCurto(a0, 70));
    notas.push(...r.notas);
  }
  return {
    funcao: nome,
    metodos: metodo.metodos,
    caminhos: [...new Set(caminhos)],
    local: localDe(ctx, chamada),
    notas: [...new Set([...notas, ...(metodo.nota ? [metodo.nota] : [])])],
    naoLido: naoLidos.length || !metodo.metodos.length ? [...new Set([...naoLidos, ...(metodo.naoLido ? [metodo.naoLido] : [])])] : null,
    _no: chamada,
  };
}

/** Lê todas as chamadas HTTP de todos os arquivos do front no programa. */
export function todasChamadasFront(ctx) {
  const { ts } = ctx;
  const porNo = new Map();
  // O arquivo que DECLARA as funções do cliente HTTP (apiRequest…) só as embrulha: não é chamada de tela.
  const arquivosCliente = new Set();
  for (const sf of ctx.program.getSourceFiles()) {
    if (!noProjeto(ctx, sf)) continue;
    for (const nome of Object.keys(FUNCOES_API)) if (acharDeclaracaoTopo(ctx, sf, nome)) arquivosCliente.add(sf.fileName);
  }
  for (const sf of ctx.program.getSourceFiles()) {
    if (!noProjeto(ctx, sf) || arquivosCliente.has(sf.fileName)) continue;
    if (/\.(test|spec)\.tsx?$/.test(sf.fileName) || /\/__tests__\//.test(norm(sf.fileName))) continue;
    const v = (n) => {
      if (ts.isCallExpression(n)) {
        const r = lerChamadaApi(ctx, n);
        if (r) porNo.set(n, r);
      }
      ts.forEachChild(n, v);
    };
    v(sf);
  }
  return porNo;
}

/** Literais de permissão consultados no código alcançável de uma tela (esconde-fino provável). */
function literaisDePermissao(ctx, chamadas, conhecidas) {
  const { ts } = ctx;
  const out = new Set();
  for (const c of chamadas) {
    for (const a of c.arguments) {
      const v = (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && conhecidas.has(n.text)) out.add(n.text);
        if (!ehFuncao(ts, n)) ts.forEachChild(n, v);
      };
      v(a);
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Casamento chamada ↔ rota do backend
// ------------------------------------------------------------------------------------------------

function segmentos(c) {
  return c.split("/").filter(Boolean);
}

/** Casa (método, caminho do front) com as rotas do backend (caminho sem /api/v1). */
export function casarRota(metodo, caminho, rotasBack) {
  const sf = segmentos(caminho);
  let melhor = null;
  for (const r of rotasBack) {
    if (r.metodo !== metodo && r.metodo !== "ALL") continue;
    const sb = segmentos(r.caminhoRelativo);
    if (sb.length !== sf.length) continue;
    let pontos = 0;
    let ok = true;
    for (let i = 0; i < sb.length; i++) {
      const b = sb[i];
      const f = sf[i];
      if (b.startsWith(":")) pontos += f === ":param" ? 2 : 1;
      else if (f === ":param") pontos += 0;
      else if (b === f) pontos += 3;
      else {
        ok = false;
        break;
      }
    }
    if (ok && (!melhor || pontos > melhor.pontos)) melhor = { rota: r, pontos };
  }
  return melhor?.rota ?? null;
}

// ------------------------------------------------------------------------------------------------
// RBAC_MATRIX.md
// ------------------------------------------------------------------------------------------------

export function lerMatriz(texto) {
  const linhas = texto.split(/\r?\n/);
  const papeis = [];
  let emPapeis = false;
  const tabela = [];
  let cabecalho = null;
  const notas = [];
  linhas.forEach((l, i) => {
    if (/^##\s+Roles/.test(l)) {
      emPapeis = true;
      return;
    }
    if (emPapeis) {
      const m = /^-\s+([a-z_]+)\s*$/.exec(l);
      if (m) papeis.push(m[1]);
      else if (/^##/.test(l)) emPapeis = false;
    }
    if (/^\|/.test(l)) {
      const cel = l.split("|").slice(1, -1).map((c) => c.trim());
      if (!cabecalho && cel[0] === "Module / Capability") cabecalho = cel;
      else if (cabecalho && !/^-+$/.test(cel[0])) tabela.push({ linha: i + 1, capacidade: cel[0], niveis: Object.fromEntries(cabecalho.slice(1).map((p, k) => [p, cel[k + 1] ?? ""])) });
    }
    if (/^-\s/.test(l) && /→/.test(l)) notas.push({ linha: i + 1, texto: l });
  });
  return { papeis, tabela, notas };
}

/** Extrai das notas da matriz as declarações "**verbo** → papéis" por permissão. */
export function declaracoesDaMatriz(notas, papeisConhecidos, naoLidas = []) {
  const out = [];
  const reRole = new RegExp(`\\b(${[...papeisConhecidos].sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
  for (const { linha, texto: original } of notas) {
    const familias = [...original.matchAll(/`([a-z_]+):([a-z_]+)`/g)].map((m) => m[1]);
    if (!familias.length) continue;
    // Tira parênteses (inclusive aninhados) antes de ler "**verbo** [+ **verbo**] → papéis".
    let texto = original;
    for (let i = 0; i < 4; i++) texto = texto.replace(/\([^()]*\)/g, " ");
    const re = /((?:\*\*`?[a-z_:+ ]+?`?\*\*\s*\+?\s*)+)→\s*([^;]*)/g;
    let achou = 0;
    for (const m of texto.matchAll(re)) {
      const verbos = [...m[1].matchAll(/\*\*`?([a-z_:+ ]+?)`?\*\*/g)].flatMap((x) => x[1].split("+")).map((v) => v.trim()).filter(Boolean);
      const segmento = m[2].split(/\.\s|\s—\s/)[0];
      const papeis = [...new Set([...segmento.matchAll(reRole)].map((x) => x[1]))];
      if (!papeis.length) continue;
      for (const v of verbos) {
        let perm;
        if (v.includes(":")) perm = v;
        else {
          const fam = familias.find((f) => original.includes(`\`${f}:${v}\``)) ?? familias[0];
          perm = `${fam}:${v}`;
        }
        out.push({ linha, permissao: perm, papeis });
        achou++;
      }
    }
    if (!achou && /\*\*[^*]+\*\*\s*→/.test(texto)) naoLidas.push({ linha, motivo: "nota com \"**…** →\" sem papel reconhecido" });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Catálogo (transpilado e executado — catalog.ts não tem import)
// ------------------------------------------------------------------------------------------------

export async function carregarCatalogo(ts, arquivo) {
  const fonte = fs.readFileSync(arquivo, "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  return {
    papeis: [...mod.DEFAULT_ROLES],
    papeisPlataforma: [...mod.PLATFORM_ROLES],
    permissoes: [...mod.PERMISSION_CATALOG],
    porPapel: Object.fromEntries(Object.entries(mod.ROLE_PERMISSIONS).map(([k, v]) => [k, [...v]])),
  };
}

export async function carregarRegistroMenu(ts, arquivo) {
  const fonte = fs.readFileSync(arquivo, "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const semImport = js.replace(/^import .*$/gm, "");
  const mod = await import(`data:text/javascript;base64,${Buffer.from(semImport).toString("base64")}`);
  return mod.NAVIGATION_REGISTRY;
}

// ------------------------------------------------------------------------------------------------
// Montagem do inventário
// ------------------------------------------------------------------------------------------------

function achatar(itens) {
  const out = [];
  const v = (lst) => {
    for (const i of lst ?? []) {
      out.push(i);
      v(i.children);
    }
  };
  v(itens);
  return out;
}

function menuBackendDoPapel(registro, papel, permissoes, papeisPlataforma) {
  const ehPlataforma = papeisPlataforma.includes(papel);
  return achatar(registro).filter((i) => {
    if (i.platformOnly && !ehPlataforma) return false;
    return !i.requiredPermissions?.length || i.requiredPermissions.some((p) => permissoes.has(p));
  });
}

function casarRotaFront(caminho, rotasFront) {
  const s = segmentos(caminho);
  return (
    rotasFront.find((r) => r.caminho === caminho) ??
    rotasFront.find((r) => {
      const t = segmentos(r.caminho);
      return t.length === s.length && t.every((x, i) => x.startsWith(":") || x === s[i]);
    }) ??
    null
  );
}

function prefixoDoBackend(caminho) {
  if (caminho.startsWith("/api/v1")) return { app: "api", relativo: caminho.slice("/api/v1".length) || "/" };
  if (caminho.startsWith("/portal/")) return { app: "portal", relativo: caminho };
  return { app: "outro", relativo: caminho };
}

/**
 * Monta o inventário. Entradas já extraídas (para que os testes possam montar amostras pequenas).
 */
export function montarInventario(e) {
  const {
    rotasBack,
    rotasFront,
    chamadasPorTela,
    todasChamadas,
    catalogo,
    papeisCanonicos,
    menu,
    camadaUi,
    registroMenu,
    matriz,
  } = e;

  const permsCatalogo = new Set([...catalogo.permissoes, ...(catalogo.permissoesPlataforma ?? [])]);
  const papeisPlataforma = catalogo.papeisPlataforma;

  // ---- Backend: rotas com papéis que passam ----
  const backend = rotasBack.map((r) => {
    const { app, relativo } = prefixoDoBackend(r.caminho);
    let papeis;
    if (r.tipoGuarda === "platform") papeis = papeisCanonicos.filter((p) => papeisPlataforma.includes(p));
    else if (r.tipoGuarda === "tenant") papeis = papeisCanonicos.filter((p) => (catalogo.porPapel[p] ?? []).some((x) => r.permissoes.includes(x)));
    else papeis = [...papeisCanonicos];
    return { ...r, app, caminhoRelativo: relativo, papeis, muta: ["POST", "PUT", "PATCH", "DELETE"].includes(r.metodo) };
  });
  const backendApi = backend.filter((r) => r.app === "api");

  // ---- Papéis: rótulo de UI, permissões de UI, tipo de menu ----
  const perfis = {};
  for (const p of papeisCanonicos) {
    const permsBack = new Set(catalogo.porPapel[p] ?? []);
    const rotulo = camadaUi.rotuloDe(p);
    const permsUi = new Set([...camadaUi.sempre, ...permsBack]);
    for (const x of permsBack) for (const a of camadaUi.aliases[x] ?? []) permsUi.add(a);
    const bypass = camadaUi.bypassPlataforma(rotulo ? [rotulo] : [], permsUi);
    const tipo = camadaUi.tipoMenu(rotulo ? [rotulo] : []);
    perfis[p] = { papel: p, noCatalogo: p in catalogo.porPapel, rotuloUi: rotulo, tipoMenu: tipo, bypassPlataformaUi: bypass, _permsBack: permsBack, _permsUi: permsUi };
  }

  const guardaPassa = (perfil, rota) => {
    if (!rota.guarda) return true;
    if (perfil.bypassPlataformaUi) return true;
    return rota.guarda.permissoes.some((x) => perfil._permsUi.has(x));
  };
  const backPassa = (perfil, rotaB) => rotaB.papeis.includes(perfil.papel);

  // ---- Telas ----
  const governados = new Set(achatar(registroMenu).map((i) => i.path));
  const planejados = new Set(achatar(registroMenu).filter((i) => i.status === "planned").map((i) => i.path));
  const telas = rotasFront.map((rf) => {
    const chamadas = (chamadasPorTela.get(rf) ?? []).map((c) => {
      const casadas = [];
      for (const m of c.metodos) for (const cam of c.caminhos) {
        const rb = casarRota(m, cam, backendApi);
        casadas.push({ metodo: m, caminho: cam, rotaBackend: rb });
      }
      return { ...c, casadas };
    });
    return { ...rf, chamadas };
  });

  // Menu visível por perfil
  for (const p of Object.values(perfis)) {
    const itens = menu.porTipo[p.tipoMenu] ?? [];
    const menuBack = new Set(menuBackendDoPapel(registroMenu, p.papel, p._permsBack, papeisPlataforma).map((i) => i.path));
    p.menu = itens
      .filter((i) => !menu.allowlist || menu.allowlist.includes(i.caminho))
      .filter((i) => !planejados.has(i.caminho))
      .filter((i) => !governados.has(i.caminho) || menuBack.has(i.caminho))
      .map((i) => ({ ...i }));
    p.menuEscondidoPeloBackend = itens.filter((i) => governados.has(i.caminho) && !menuBack.has(i.caminho)).map((i) => i.caminho);
  }

  const quebras = { a: [], b: [], c: [], d: [], e: [], f: [] };

  // (a) item de menu que o guard ou o backend recusa
  for (const p of Object.values(perfis)) {
    for (const item of p.menu) {
      const tela = casarRotaFront(item.caminho, telas);
      if (!tela) {
        quebras.d.push({ gravidade: 1, perfil: p.papel, descricao: `item de menu "${item.rotulo}" aponta para ${item.caminho}, que não tem rota no App.tsx`, local: menu.localNav });
        continue;
      }
      if (!guardaPassa(p, tela)) {
        quebras.a.push({
          gravidade: 1,
          perfil: p.papel,
          tela: tela.caminho,
          descricao: `menu de ${p.papel} mostra "${item.rotulo}" (${item.caminho}), mas o PermissionGuard exige ${tela.guarda.permissoes.join(" ou ")} → "acesso não permitido"`,
          local: tela.local,
        });
        continue;
      }
      const leituras = tela.chamadas.flatMap((c) => c.casadas.filter((x) => x.metodo === "GET" && x.rotaBackend).map((x) => ({ c, x })));
      const negadas = leituras.filter(({ x }) => !backPassa(p, x.rotaBackend));
      if (leituras.length && negadas.length === leituras.length) {
        quebras.a.push({
          gravidade: 1,
          perfil: p.papel,
          tela: tela.caminho,
          descricao: `menu de ${p.papel} mostra "${item.rotulo}" (${item.caminho}); o guard deixa entrar, mas o backend recusa TODAS as ${leituras.length} leituras da tela (${[...new Set(negadas.map(({ x }) => `${x.metodo} ${x.rotaBackend.caminhoRelativo} exige ${x.rotaBackend.permissoes.join("/") || x.rotaBackend.tipoGuarda}`))].slice(0, 3).join("; ")})`,
          local: negadas[0].c.local,
        });
      } else if (negadas.length) {
        quebras.a.push({
          gravidade: 3,
          perfil: p.papel,
          tela: tela.caminho,
          descricao: `menu de ${p.papel} mostra "${item.rotulo}" (${item.caminho}); o backend recusa ${negadas.length} de ${leituras.length} leituras (parte da tela fica vazia/erro): ${[...new Set(negadas.map(({ x }) => `${x.metodo} ${x.rotaBackend.caminhoRelativo} [${x.rotaBackend.permissoes.join("/") || x.rotaBackend.tipoGuarda}]`))].slice(0, 4).join("; ")}`,
          local: negadas[0].c.local,
        });
      }
    }
  }

  // (b) ação (mutação) na tela cuja rota exige permissão que o perfil (que entra na tela) não tem
  const vistosB = new Set();
  for (const tela of telas) {
    for (const c of tela.chamadas) {
      for (const x of c.casadas) {
        if (!x.rotaBackend || !x.rotaBackend.muta) continue;
        const semPermissao = Object.values(perfis).filter((p) => guardaPassa(p, tela) && !backPassa(p, x.rotaBackend));
        if (!semPermissao.length) continue;
        const consultada = x.rotaBackend.permissoes.some((perm) => (tela.permissoesConsultadas ?? []).includes(perm));
        const chaveB = `${tela.caminho}|${x.metodo} ${x.rotaBackend.caminhoRelativo}`;
        if (vistosB.has(chaveB)) continue;
        vistosB.add(chaveB);
        quebras.b.push({
          gravidade: consultada ? 4 : 2,
          tela: tela.caminho,
          perfis: semPermissao.map((p) => p.papel),
          acao: `${x.metodo} ${x.caminho}`,
          exige: x.rotaBackend.permissoes.length ? x.rotaBackend.permissoes : [x.rotaBackend.tipoGuarda],
          escondeFino: consultada,
          descricao: `tela ${tela.caminho}: ${x.metodo} ${x.caminho} exige ${x.rotaBackend.permissoes.join(" ou ") || x.rotaBackend.tipoGuarda}; entram na tela sem ela: ${semPermissao.map((p) => p.papel).join(", ")}${consultada ? " (a tela consulta essa permissão — esconde-fino provável)" : " (a tela não consulta essa permissão — o botão tende a aparecer e dar 403)"}`,
          local: c.local,
        });
      }
    }
  }

  // (c) rota mutante sem auditoria
  for (const r of backend) {
    if (!r.muta) continue;
    const temAuditoria = (r.efeitos ?? []).some((x) => x.categoria === "auditoria");
    if (!temAuditoria) {
      const elos = (r.elosNaoResolvidos ?? []).length;
      quebras.c.push({
        gravidade: elos ? 3 : 2,
        rota: `${r.metodo} ${r.caminho}`,
        permissoes: r.permissoes,
        cadeiaCompleta: !elos,
        descricao: `${r.metodo} ${r.caminho} muda dado e nenhum evento de auditoria foi achado no caminho do handler${elos ? ` (há ${elos} elo(s) não resolvido(s) — confira à mão)` : " (cadeia lida inteira)"}`,
        local: r.local,
      });
    }
  }

  // (d) chamada do front a rota inexistente; rota do backend sem tela
  const chamadasCasadas = new Set();
  const telasPorChamada = new Map();
  for (const t of telas) for (const c of t.chamadas) {
    if (!telasPorChamada.has(c.local)) telasPorChamada.set(c.local, new Set());
    telasPorChamada.get(c.local).add(t.caminho);
  }
  const usoPorRota = new Map();
  for (const c of todasChamadas) {
    for (const m of c.metodos) for (const cam of c.caminhos) {
      const rb = casarRota(m, cam, backendApi);
      if (rb) {
        chamadasCasadas.add(c.local);
        const telasDaChamada = telasPorChamada.get(c.local);
        const uso = usoPorRota.get(rb) ?? { telas: new Set(), foraDeTela: false };
        if (telasDaChamada?.size) telasDaChamada.forEach((x) => uso.telas.add(x));
        else uso.foraDeTela = true;
        usoPorRota.set(rb, uso);
      } else {
        const telasDaChamada = [...(telasPorChamada.get(c.local) ?? [])];
        quebras.d.push({
          gravidade: telasDaChamada.length ? 1 : 3,
          descricao: `${m} ${cam} não existe no backend${telasDaChamada.length ? ` (usado por ${telasDaChamada.join(", ")})` : " (código sem tela que o alcance)"}`,
          local: c.local,
          sentido: "front→back",
        });
      }
    }
  }
  for (const r of backend) {
    const uso = usoPorRota.get(r);
    r.telas = uso ? [...uso.telas].sort() : [];
    r.usadaForaDeTela = Boolean(uso?.foraDeTela);
    let consumidor;
    if (r.telas.length) consumidor = "tela web";
    else if (r.usadaForaDeTela) consumidor = "front fora de tela (shell/sessão)";
    else if (r.app === "portal") consumidor = "portal externo (fora do web)";
    else if (/^\/mobile(\/|$)/.test(r.caminhoRelativo)) consumidor = "app de campo (fora desta entrega)";
    else consumidor = "nenhum consumidor web achado";
    r.consumidor = consumidor;
    if (consumidor === "nenhum consumidor web achado") {
      quebras.d.push({ gravidade: 4, descricao: `${r.metodo} ${r.caminho} não é chamada por nenhuma tela web`, local: r.local, sentido: "back→front" });
    }
  }

  // (e) permissão da UI ≠ permissão do backend para a mesma ação
  // "Mesma ação" = mesma família de permissão (o recurso antes do verbo). Leitura de OUTRO recurso pela tela
  // (ex.: a lista de viaturas num formulário) não é divergência de vocabulário — aparece em (a) quando nega.
  const familia = (perm) => perm.replace(/[:.][^:.]+$/, "");
  const vistosE = new Set();
  for (const tela of telas) {
    if (!tela.guarda) continue;
    for (const c of tela.chamadas) for (const x of c.casadas) {
      if (!x.rotaBackend || x.rotaBackend.tipoGuarda !== "tenant") continue;
      // Leitura: compara com o guard da rota. Mutação: compara com as permissões que o código da tela consulta
      // (esconde-fino do botão); mutação sem consulta na mesma família é caso de (b), não de (e).
      const ui = x.rotaBackend.muta ? tela.permissoesConsultadas ?? [] : tela.guarda.permissoes;
      const g = new Set(ui);
      if (x.rotaBackend.permissoes.some((p) => g.has(p))) continue;
      const mesmaFamilia = x.rotaBackend.permissoes.some((b) => ui.some((gp) => familia(gp) === familia(b)));
      if (!mesmaFamilia) continue;
      if (x.rotaBackend.muta) {
        const k2 = `${tela.caminho}|${x.metodo} ${x.rotaBackend.caminhoRelativo}`;
        if (vistosE.has(k2)) continue;
        vistosE.add(k2);
        const consultadas = ui.filter((gp) => x.rotaBackend.permissoes.some((b) => familia(gp) === familia(b)));
        quebras.e.push({
          gravidade: 3,
          descricao: `tela ${tela.caminho}: o código da tela consulta ${consultadas.join(", ")}, mas ${x.metodo} ${x.rotaBackend.caminhoRelativo} exige ${x.rotaBackend.permissoes.join(" ou ")} — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui)`,
          local: c.local,
        });
        continue;
      }
      const k = `${tela.caminho}|${x.metodo} ${x.rotaBackend.caminhoRelativo}`;
      if (vistosE.has(k)) continue;
      vistosE.add(k);
      const entram = Object.values(perfis).filter((p) => guardaPassa(p, tela)).map((p) => p.papel);
      const backAceita = new Set(x.rotaBackend.papeis);
      const entramSemBack = entram.filter((p) => !backAceita.has(p));
      const efeitoIgual = !entramSemBack.length;
      quebras.e.push({
        gravidade: efeitoIgual ? 5 : x.metodo === "GET" ? 3 : 2,
        descricao: `tela ${tela.caminho}: o guard pede ${tela.guarda.permissoes.join(" ou ")}; ${x.metodo} ${x.rotaBackend.caminhoRelativo} exige ${x.rotaBackend.permissoes.join(" ou ")}${efeitoIgual ? " (vocabulário diferente, mesmo efeito para os 9 perfis)" : ` — entram na tela e o backend recusa: ${entramSemBack.join(", ")}`}`,
        local: c.local,
      });
    }
  }
  for (const item of achatar(registroMenu)) {
    const tela = telas.find((t) => t.caminho === item.path);
    if (!tela?.guarda || !item.requiredPermissions?.length) continue;
    if (!item.requiredPermissions.some((p) => tela.guarda.permissoes.includes(p))) {
      quebras.e.push({
        gravidade: 3,
        descricao: `menu do backend (${item.id}) libera ${item.path} por ${item.requiredPermissions.join(" ou ")}; o guard da rota pede ${tela.guarda.permissoes.join(" ou ")}`,
        local: tela.local,
      });
    }
  }
  const aliasesProduzidos = new Set(Object.values(camadaUi.aliases).flat().concat(camadaUi.sempre));
  const permsDeUi = new Map();
  for (const t of telas) for (const perm of t.guarda?.permissoes ?? []) if (!permsDeUi.has(perm)) permsDeUi.set(perm, t.local);
  for (const [perm, local] of permsDeUi) {
    if (permsCatalogo.has(perm)) continue;
    const algumPerfil = Object.values(perfis).filter((p) => p._permsUi.has(perm)).map((p) => p.papel);
    quebras.e.push({
      gravidade: algumPerfil.length ? 5 : 3,
      descricao: `permissão "${perm}" usada em guard de tela não existe no catálogo do backend (nem em PLATFORM_PERMISSIONS)${aliasesProduzidos.has(perm) ? ` (é alias de UI; perfis que a recebem: ${algumPerfil.join(", ") || "nenhum"})` : " e nenhum alias a produz"}`,
      local,
    });
  }

  // (f) catálogo × RBAC_MATRIX.md
  const papeisCatalogo = new Set(catalogo.papeis);
  for (const p of papeisCanonicos) if (!papeisCatalogo.has(p)) quebras.f.push({ gravidade: 2, descricao: `papel ${p} está no RBAC_MATRIX.md e não no catálogo`, local: "RBAC_MATRIX.md" });
  for (const p of catalogo.papeis) if (!papeisCanonicos.includes(p)) quebras.f.push({ gravidade: 5, descricao: `papel ${p} existe no catálogo e não está entre os 9 do RBAC_MATRIX.md`, local: e.localCatalogo });
  const notasNaoLidas = [];
  const decls = declaracoesDaMatriz(matriz.notas, papeisCatalogo, notasNaoLidas);
  for (const d of decls) {
    if (!permsCatalogo.has(d.permissao)) {
      quebras.f.push({ gravidade: 4, descricao: `a matriz cita ${d.permissao}, que não existe no catálogo`, local: `RBAC_MATRIX.md:${d.linha}` });
      continue;
    }
    const temNoCatalogo = new Set(catalogo.papeis.filter((p) => (catalogo.porPapel[p] ?? []).includes(d.permissao)));
    const faltam = d.papeis.filter((p) => !temNoCatalogo.has(p));
    const sobram = [...temNoCatalogo].filter((p) => !d.papeis.includes(p));
    if (faltam.length) quebras.f.push({ gravidade: 2, descricao: `${d.permissao}: a matriz concede a ${faltam.join(", ")}, o catálogo não`, local: `RBAC_MATRIX.md:${d.linha}` });
    if (sobram.length) quebras.f.push({ gravidade: 3, descricao: `${d.permissao}: o catálogo concede a ${sobram.join(", ")}, que a nota da matriz não lista`, local: `RBAC_MATRIX.md:${d.linha}` });
  }
  const temPrefixo = (perm, pref) => perm === pref || perm.startsWith(`${pref}:`) || perm.startsWith(`${pref}.`);
  for (const linha of matriz.tabela) {
    const prefs = PONTE_MATRIZ[linha.capacidade];
    if (!prefs) continue;
    for (const p of papeisCanonicos) {
      const nivel = (linha.niveis[p] ?? "").trim();
      if (!nivel) continue;
      const tem = (catalogo.porPapel[p] ?? []).filter((perm) => prefs.some((pf) => temPrefixo(perm, pf)));
      const escrita = tem.filter((perm) => !VERBOS_LEITURA.has(perm.split(/[:.]/).pop()));
      if (nivel === "none" && tem.length) {
        quebras.f.push({ gravidade: 2, descricao: `"${linha.capacidade}" para ${p}: a matriz diz none, o catálogo dá ${tem.join(", ")}`, local: `RBAC_MATRIX.md:${linha.linha}` });
      } else if (nivel !== "none" && !tem.length) {
        quebras.f.push({ gravidade: 3, descricao: `"${linha.capacidade}" para ${p}: a matriz diz ${nivel}, o catálogo não dá nenhuma permissão ${prefs.join("/")}`, local: `RBAC_MATRIX.md:${linha.linha}` });
      } else if (/^(read|full-read|read-history|audit-full-read|[a-z-]*view)$/.test(nivel) && escrita.length) {
        quebras.f.push({ gravidade: 2, descricao: `"${linha.capacidade}" para ${p}: a matriz diz ${nivel} (só leitura), o catálogo dá escrita ${escrita.join(", ")}`, local: `RBAC_MATRIX.md:${linha.linha}` });
      }
    }
  }

  // ---- "quem recebe": categoria → perfis que abrem a tela de destino ----
  const perfisQueVeem = (caminhoTela) => {
    const t = casarRotaFront(caminhoTela, telas);
    if (!t) return [];
    return Object.values(perfis).filter((p) => guardaPassa(p, t)).map((p) => p.papel);
  };
  const destinos = Object.fromEntries(
    CATEGORIAS_EFEITO.map((c) => [c.id, { rotulo: c.rotulo, telas: c.telas, perfis: [...new Set(c.telas.flatMap(perfisQueVeem))] }]),
  );
  destinos.gravacao = { rotulo: "Gravação de dado (sem destinatário declarado)", telas: [], perfis: [] };

  // ---- Ações por perfil ----
  for (const p of Object.values(perfis)) {
    const telasPerfil = telas.filter((t) => guardaPassa(p, t) && !t.redireciona);
    p.telas = telasPerfil.map((t) => ({ caminho: t.caminho, noMenu: p.menu.some((m) => m.caminho === t.caminho), menu: p.menu.find((m) => m.caminho === t.caminho)?.grupo ?? null }));
    const acoes = new Map();
    for (const t of telasPerfil) for (const c of t.chamadas) for (const x of c.casadas) {
      if (x.rotaBackend?.muta && backPassa(p, x.rotaBackend)) {
        const k = `${x.metodo} ${x.rotaBackend.caminhoRelativo}`;
        if (!acoes.has(k)) acoes.set(k, new Set());
        acoes.get(k).add(t.caminho);
      }
    }
    p.acoes = [...acoes.entries()].map(([acao, ts]) => ({ acao, telas: [...ts].sort() })).sort((a, b) => a.acao.localeCompare(b.acao));
  }

  return { perfis, telas, backend, quebras, destinos, declaracoesMatriz: decls, notasMatrizNaoLidas: notasNaoLidas };
}

// ------------------------------------------------------------------------------------------------
// Execução completa sobre o repositório
// ------------------------------------------------------------------------------------------------

export async function gerarInventario({ ts, root = REPO_ROOT_PADRAO, files } = {}) {
  const p = (...x) => path.join(root, ...x);
  const naoLidos = [];

  // Backend
  const progBack = criarPrograma(ts, [p("src/app.ts"), p("src/portal-app.ts")], files);
  const ctxB = criarContexto(ts, progBack, root, p("src"));
  const fabricas = [...fabricasRaiz(ctxB, p("src/app.ts")), ...fabricasRaiz(ctxB, p("src/portal-app.ts"))];
  const { rotas: rotasBack, naoLidos: nlB } = extrairRotasBackend(ctxB, fabricas);
  naoLidos.push(...nlB.map((x) => ({ ...x, camada: "backend: rota" })));
  for (const r of rotasBack) {
    if (r.guardaNaoLida.length) naoLidos.push({ camada: "backend: permissão", onde: r.local, motivo: `permissão não resolvida: ${r.guardaNaoLida.join("; ")}` });
    const ef = analisarEfeitosDaRota(ctxB, r);
    r.efeitos = ef.efeitos.map(({ ...x }) => x);
    r.elosNaoResolvidos = ef.elosNaoResolvidos;
    r.elosPorNome = ef.elosPorNome.length;
    r.truncado = ef.truncado;
    if (ef.truncado) naoLidos.push({ camada: "backend: efeitos", onde: r.local, motivo: "grafo de chamadas truncado no limite" });
    delete r._handlers;
  }

  // Front
  const progFront = criarPrograma(ts, [p("frontend/src/App.tsx")], files);
  const ctxF = criarContexto(ts, progFront, root, p("frontend/src"));
  const { rotas: rotasFront, naoLidos: nlF } = extrairRotasFront(ctxF, p("frontend/src/App.tsx"));
  naoLidos.push(...nlF.map((x) => ({ ...x, camada: "front: rota" })));
  const menu = extrairMenu(ctxF, p("frontend/src/layouts/appSidebarNav.ts"));
  naoLidos.push(...menu.naoLidos.map((x) => ({ ...x, camada: "front: menu" })));
  const ui = extrairCamadaPapeisUi(ctxF, p("frontend/src/modules/auth/auth.adapter.ts"), p("frontend/src/navigation/types.ts"));
  naoLidos.push(...ui.naoLidos.map((x) => ({ ...x, camada: "front: papéis" })));

  const todas = todasChamadasFront(ctxF);
  const catalogo = await carregarCatalogo(ts, p("src/modules/core-saas/permissions/catalog.ts"));
  // Permissões nominais da plataforma (requirePlatformPermission decide pelo PAPEL de plataforma).
  const sfPlat = progBack.getSourceFile(p("src/modules/platform/platform-permissions.ts"));
  const declPlat = sfPlat ? acharDeclaracaoTopo(ctxB, sfPlat, "PLATFORM_PERMISSIONS") : null;
  const permsPlat = declPlat?.initializer ? avaliarLiteral(ctxB, declPlat.initializer) : null;
  catalogo.permissoesPlataforma = Array.isArray(permsPlat) ? permsPlat.filter((x) => typeof x === "string") : [];
  if (!Array.isArray(permsPlat)) naoLidos.push({ camada: "backend: permissão", onde: "src/modules/platform/platform-permissions.ts", motivo: "PLATFORM_PERMISSIONS não lido" });
  const conhecidas = new Set([...catalogo.permissoes, ...Object.keys(ui.aliases), ...Object.values(ui.aliases).flat()]);
  const chamadasPorTela = new Map();
  for (const rf of rotasFront) {
    if (!rf._decl) continue;
    const alc = alcancar(ctxF, [rf._decl], "referencias");
    const lista = [];
    const vistos = new Set();
    for (const c of alc.chamadas) {
      const r = todas.get(c);
      if (r && !vistos.has(r.local)) {
        vistos.add(r.local);
        lista.push(r);
      }
    }
    chamadasPorTela.set(rf, lista);
    rf.permissoesConsultadas = [...literaisDePermissao(ctxF, alc.chamadas, conhecidas)].sort();
    rf.nosPercorridos = alc.nos;
    if (alc.truncado) naoLidos.push({ camada: "front: alcance", onde: rf.local, motivo: "grafo de referências truncado no limite" });
  }
  for (const c of todas.values()) {
    if (c.naoLido) naoLidos.push({ camada: "front: chamada", onde: c.local, motivo: `requisição não lida: ${c.naoLido.join("; ")}` });
  }

  const matrizTexto = fs.readFileSync(p("RBAC_MATRIX.md"), "utf8");
  const matriz = lerMatriz(matrizTexto);
  const registroMenu = await carregarRegistroMenu(ts, p("src/modules/navigation/navigation.registry.ts"));

  const ctxUi = ctxF;
  const camadaUi = {
    aliases: ui.aliases,
    sempre: ui.sempre,
    rotuloDe: (papel) => {
      if (!ui.mapBackendRole) return null;
      const r = executarFuncaoRegra(ctxUi, ui.mapBackendRole, { vars: {}, param: papel, papeis: new Set(), permissoes: new Set() });
      if (r.naoLido) naoLidos.push({ camada: "front: papéis", onde: localDe(ctxUi, ui.mapBackendRole), motivo: `mapBackendRole(${papel}) não avaliada: ${r.naoLido}` });
      return typeof r.valor === "string" ? r.valor : null;
    },
    tipoMenu: (rotulos) => {
      if (!menu._roleKindFor) return null;
      const r = executarFuncaoRegra(ctxUi, menu._roleKindFor, { vars: {}, papeis: new Set(rotulos), permissoes: new Set() });
      if (r.naoLido) naoLidos.push({ camada: "front: menu", onde: localDe(ctxUi, menu._roleKindFor), motivo: `roleKindFor não avaliada: ${r.naoLido}` });
      return typeof r.valor === "string" ? r.valor : null;
    },
    bypassPlataforma: (rotulos, perms) => {
      if (!ui.isPlatformAdmin) return false;
      const r = executarFuncaoRegra(ctxUi, ui.isPlatformAdmin, { vars: {}, papeis: new Set(rotulos), permissoes: perms });
      return r.valor === true;
    },
  };

  const inv = montarInventario({
    rotasBack,
    rotasFront,
    chamadasPorTela,
    todasChamadas: [...todas.values()],
    catalogo,
    papeisCanonicos: matriz.papeis,
    menu,
    camadaUi,
    registroMenu,
    matriz,
    localCatalogo: "src/modules/core-saas/permissions/catalog.ts",
  });

  for (const n of inv.notasMatrizNaoLidas) naoLidos.push({ camada: "matriz: nota", onde: `RBAC_MATRIX.md:${n.linha}`, motivo: n.motivo });
  const chamadasLidas = [...todas.values()].filter((c) => !c.naoLido).length;
  inv.cobertura = {
    matriz: {
      papeis: matriz.papeis.length,
      linhasDaMatrizBase: matriz.tabela.length,
      linhasComparadas: matriz.tabela.filter((l) => PONTE_MATRIZ[l.capacidade]).length,
      notasComSeta: matriz.notas.length,
      declaracoesLidas: inv.declaracoesMatriz.length,
    },
    backend: {
      rotas: rotasBack.length,
      rotasComPermissaoResolvida: rotasBack.filter((r) => r.tipoGuarda !== "nenhuma" && !r.guardaNaoLida.length).length,
      rotasSemGuarda: rotasBack.filter((r) => r.tipoGuarda === "nenhuma").length,
      rotasComElosNaoResolvidos: rotasBack.filter((r) => r.elosNaoResolvidos.length).length,
      rotasComElosPorNome: rotasBack.filter((r) => r.elosPorNome).length,
    },
    front: {
      rotas: rotasFront.length,
      rotasComComponenteResolvido: rotasFront.filter((r) => r._decl).length,
      redirecionamentos: rotasFront.filter((r) => r.redireciona).length,
      chamadasHttp: todas.size,
      chamadasLidas,
      chamadasNaoLidas: todas.size - chamadasLidas,
      chamadasEmTelas: new Set([...chamadasPorTela.values()].flat().map((c) => c.local)).size,
    },
    naoLidos,
  };
  inv.fontes = {
    app: "src/app.ts, src/portal-app.ts",
    rotasFront: "frontend/src/App.tsx",
    menu: "frontend/src/layouts/appSidebarNav.ts",
    papeisUi: "frontend/src/modules/auth/auth.adapter.ts (mapBackendRole, frontendPermissionAliases), frontend/src/navigation/types.ts (isPlatformAdmin)",
    catalogo: "src/modules/core-saas/permissions/catalog.ts",
    registroMenu: "src/modules/navigation/navigation.registry.ts",
    matriz: "RBAC_MATRIX.md",
  };
  inv.matriz = matriz;
  inv.catalogo = catalogo;
  return inv;
}

// ------------------------------------------------------------------------------------------------
// Saída
// ------------------------------------------------------------------------------------------------

export const celula = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

const TIPOS_QUEBRA = {
  a: "Tela no menu de um perfil que o guard ou o backend recusa",
  b: "Ação na tela cuja rota do backend exige permissão que o perfil não tem",
  c: "Rota do backend que muda dado e não grava evento de auditoria",
  d: "Chamada do front para rota inexistente / rota do backend sem tela",
  e: "Permissão da UI diferente da permissão do backend",
  f: "Catálogo de permissões × RBAC_MATRIX.md",
};

/** Nomes de evento de auditoria de uma rota; "(nome dinâmico)" só quando há auditoria e nenhum nome legível. */
export function nomesDeAuditoria(rota) {
  const efs = rota.efeitos.filter((e) => e.categoria === "auditoria");
  const nomes = [...new Set(efs.flatMap((e) => e.acoes ?? []))].sort();
  if (nomes.length) return nomes;
  return efs.length ? ["(nome dinâmico)"] : [];
}

function listaPerfis(papeis, inv) {
  const total = Object.keys(inv.perfis).length;
  if (papeis.length === total) return `todos os ${total}`;
  return papeis.length ? papeis.join(", ") : "nenhum";
}

/**
 * As n mais graves: por gravidade crescente; dentro da mesma gravidade, alterna os tipos (a, d, c, b, e, f)
 * para a lista não ser tomada por um só tipo. Dentro de um tipo, ordem alfabética (determinística).
 */
export function maisGraves(quebras, n = 10) {
  const ordemTipo = ["a", "d", "c", "b", "e", "f"];
  const todas = Object.entries(quebras).flatMap(([tipo, lst]) => lst.map((q) => ({ tipo, ...q })));
  const gravidades = [...new Set(todas.map((q) => q.gravidade))].sort((x, y) => x - y);
  const out = [];
  for (const g of gravidades) {
    const filas = ordemTipo.map((t) =>
      todas.filter((q) => q.gravidade === g && q.tipo === t).sort((x, y) => x.descricao.localeCompare(y.descricao)),
    );
    while (out.length < n && filas.some((f) => f.length)) {
      for (const f of filas) if (f.length && out.length < n) out.push(f.shift());
    }
    if (out.length >= n) break;
  }
  return out;
}

export function paraJson(inv) {
  const perfis = Object.fromEntries(
    Object.entries(inv.perfis).map(([k, p]) => [
      k,
      {
        papel: p.papel,
        noCatalogo: p.noCatalogo,
        rotuloUi: p.rotuloUi,
        tipoMenu: p.tipoMenu,
        bypassPlataformaUi: p.bypassPlataformaUi,
        permissoesBackend: [...p._permsBack].sort(),
        menu: p.menu,
        menuEscondidoPeloBackend: p.menuEscondidoPeloBackend,
        telas: p.telas,
        acoes: p.acoes,
      },
    ]),
  );
  const telas = inv.telas.map((t) => ({
    caminho: t.caminho,
    layout: t.layout,
    local: t.local,
    componente: t.componente,
    arquivoComponente: t.arquivoComponente ?? null,
    redireciona: t.redireciona,
    guarda: t.guarda,
    permissoesConsultadas: t.permissoesConsultadas ?? [],
    chamadas: t.chamadas.map((c) => ({
      funcao: c.funcao,
      local: c.local,
      notas: c.notas,
      casadas: c.casadas.map((x) => ({
        metodo: x.metodo,
        caminho: x.caminho,
        rotaBackend: x.rotaBackend ? `${x.rotaBackend.metodo} ${x.rotaBackend.caminho}` : null,
      })),
    })),
  }));
  const backend = inv.backend.map((r) => ({
    metodo: r.metodo,
    caminho: r.caminho,
    local: r.local,
    tipoGuarda: r.tipoGuarda,
    permissoes: r.permissoes,
    guardaCondicional: r.guardaCondicional,
    papeis: r.papeis,
    muta: r.muta,
    consumidor: r.consumidor,
    telas: r.telas,
    efeitos: r.efeitos,
    elosNaoResolvidos: r.elosNaoResolvidos,
  }));
  return {
    gerado: "GERADO por scripts/inventario-fluxos.mjs — não edite à mão",
    escopo: "web (React) + backend; mobile (Flutter) fora desta entrega",
    fontes: inv.fontes,
    totais: totais(inv),
    perfis,
    telas,
    backend,
    destinos: inv.destinos,
    quebras: inv.quebras,
    cobertura: inv.cobertura,
  };
}

/** JSON legível e enxuto: indenta até a profundidade 3; abaixo disso (e arrays de primitivos) fica em uma linha. */
export function jsonCompacto(valor, nivel = 0) {
  const pad = "  ".repeat(nivel);
  const inline = (v) => JSON.stringify(v);
  if (valor === null || typeof valor !== "object") return inline(valor);
  if (Array.isArray(valor)) {
    if (!valor.length || nivel >= 3 || valor.every((x) => x === null || typeof x !== "object")) return inline(valor);
    return `[\n${valor.map((x) => `${pad}  ${jsonCompacto(x, nivel + 1)}`).join(",\n")}\n${pad}]`;
  }
  const chaves = Object.keys(valor).filter((k) => valor[k] !== undefined);
  if (!chaves.length || nivel >= 3) return inline(valor);
  return `{\n${chaves.map((k) => `${pad}  ${JSON.stringify(k)}: ${jsonCompacto(valor[k], nivel + 1)}`).join(",\n")}\n${pad}}`;
}

function totais(inv) {
  return {
    perfis: Object.keys(inv.perfis).length,
    telas: inv.telas.filter((t) => !t.redireciona).length,
    rotasWeb: inv.telas.length,
    rotasBackend: inv.backend.length,
    rotasBackendApi: inv.backend.filter((r) => r.app === "api").length,
    rotasBackendMutantes: inv.backend.filter((r) => r.muta).length,
    chamadasHttpFront: inv.cobertura?.front.chamadasHttp ?? null,
    quebras: Object.fromEntries(Object.entries(inv.quebras).map(([k, v]) => [k, v.length])),
  };
}

export function paraMarkdown(inv) {
  const L = [];
  const t = totais(inv);
  const cob = inv.cobertura;
  L.push("<!-- GERADO — não edite à mão. Fonte: scripts/inventario-fluxos.mjs (node scripts/inventario-fluxos.mjs). -->");
  L.push("# Inventário de fluxos — quem manda e quem recebe");
  L.push("");
  L.push("> **GERADO — não edite à mão.** Saída de `scripts/inventario-fluxos.mjs`, lida do código (frente 1 do refino, pedido do dono de 2026-10-15). Para atualizar, rode o script; o que ele não conseguiu ler está na seção **Cobertura**, para ninguém confundir \"não vi\" com \"não existe\".");
  L.push(">");
  L.push("> **Escopo:** console web (React, `frontend/`) e backend (`src/`). **O app de campo (Flutter, `mobile/flutter_app/`) fica FORA desta entrega** (decisão do dono: depois do web); rotas `/mobile/*` aparecem só como \"consumidor: app de campo\".");
  L.push("");
  L.push("## Números");
  L.push("");
  L.push(`| Perfis | Telas (rotas web com componente) | Rotas web (inclui redirecionamento) | Rotas do backend | — das quais /api/v1 | — das quais mudam dado | Chamadas HTTP no front |`);
  L.push("| --- | --- | --- | --- | --- | --- | --- |");
  L.push(`| ${t.perfis} | ${t.telas} | ${t.rotasWeb} | ${t.rotasBackend} | ${t.rotasBackendApi} | ${t.rotasBackendMutantes} | ${t.chamadasHttpFront} |`);
  L.push("");
  L.push("| Quebra | Tipo | Quantidade |");
  L.push("| --- | --- | --- |");
  for (const [k, rot] of Object.entries(TIPOS_QUEBRA)) L.push(`| ${k} | ${celula(rot)} | ${t.quebras[k]} |`);
  L.push("");
  L.push("## Como ler");
  L.push("");
  L.push("- **Perfil** = um dos 9 papéis canônicos do `RBAC_MATRIX.md`. As permissões vêm de `ROLE_PERMISSIONS` do catálogo (executado). Na UI elas são acrescidas dos aliases de `frontendPermissionAliases` e de `dashboard:view`; o rótulo de UI vem de `mapBackendRole` e o tipo de menu, de `roleKindFor` (as duas executadas sobre o código).");
  L.push("- **Menu do perfil** = itens de `NAV_BY_ROLE[tipo]` ∩ `MVP_NAV_PATHS`, menos os caminhos `planned` do registro do backend e menos os caminhos governados pelo registro que o menu do backend não entrega ao papel (esconde-fino). Supõe todos os módulos provisionados para a organização.");
  L.push("- **Guard** = `PermissionGuard` da rota (`hasAny`, com o bypass de `isPlatformAdmin`). **Backend** = middleware de permissão da rota Express (`requirePermission`/`requireAnyPermission`/`requirePlatformPermission` e compostos).");
  L.push("- **Requisições da tela** = chamadas `apiRequest`/`apiData`/`apiBlobRequest`/`apiFormDataRequest`/`fetch(apiBaseUrl…)` alcançáveis a partir do componente da página pelo grafo de referências do compilador TypeScript (página → hooks → services/adapters). Uma requisição alcançável não é necessariamente disparada em toda visita (pode estar atrás de botão ou condição).");
  L.push("- **Efeitos (quem recebe)** = chamadas alcançáveis a partir do handler da rota, classificadas por padrão: gravação Prisma (`client|tx|prisma.<modelo>.<create|update|…>`), chamada de auditoria (texto com `audit`, ex. `recordRequestAuditBestEffort`, `auditLog.create`), notificação (`notif…` + `create|send|schedule…`), outbox, aprovação, publicação de evento. O padrão usado aparece em cada efeito. Os perfis que recebem são os que abrem a tela de destino da categoria (tabela abaixo).");
  L.push("");
  L.push("### Destino de cada categoria de efeito (ponte declarada no script; perfis calculados)");
  L.push("");
  L.push("| Categoria | Telas onde aparece | Perfis que abrem essas telas |");
  L.push("| --- | --- | --- |");
  for (const [, d] of Object.entries(inv.destinos)) L.push(`| ${celula(d.rotulo)} | ${celula(d.telas.join(", ") || "—")} | ${celula(d.perfis.join(", ") || "—")} |`);
  L.push("");

  // QUEBRAS primeiro (a parte mais importante)
  L.push("## QUEBRAS");
  L.push("");
  L.push("Gravidade: 1 = quebra o uso (tela/ação inacessível ou rota inexistente); 2 = falha de controle (403 visível, mutação sem auditoria, concessão divergente); 3 = parcial ou a conferir; 4–5 = informativo.");
  L.push("");
  L.push("### As 10 mais graves");
  L.push("");
  maisGraves(inv.quebras).forEach((q, i) => L.push(`${i + 1}. **(${q.tipo})** ${q.descricao} — \`${q.local}\``));
  L.push("");
  for (const [k, rot] of Object.entries(TIPOS_QUEBRA)) {
    const lst = [...inv.quebras[k]].sort((x, y) => x.gravidade - y.gravidade || x.descricao.localeCompare(y.descricao));
    L.push(`### (${k}) ${rot} — ${lst.length}`);
    L.push("");
    if (!lst.length) {
      L.push("Nenhuma.");
      L.push("");
      continue;
    }
    const tabela = (itens) => {
      L.push("| Grav. | Descrição | Onde |");
      L.push("| --- | --- | --- |");
      for (const q of itens) L.push(`| ${q.gravidade} | ${celula(q.descricao)} | \`${celula(q.local)}\` |`);
      L.push("");
    };
    const altas = lst.filter((q) => q.gravidade <= 3);
    const info = lst.filter((q) => q.gravidade > 3);
    if (altas.length) tabela(altas);
    if (info.length) {
      L.push(`<details><summary>${info.length} informativa(s) (gravidade 4–5)</summary>`);
      L.push("");
      tabela(info);
      L.push("</details>");
      L.push("");
    }
  }

  // Por perfil
  L.push("## Por perfil");
  L.push("");
  for (const p of Object.values(inv.perfis)) {
    L.push(`### ${p.papel}`);
    L.push("");
    L.push(`- Rótulo de UI: **${p.rotuloUi ?? "— (sem rótulo)"}** · tipo de menu: **${p.tipoMenu ?? "—"}** · bypass de plataforma na UI: **${p.bypassPlataformaUi ? "sim" : "não"}** · no catálogo: **${p.noCatalogo ? "sim" : "NÃO"}** · permissões no backend: **${p._permsBack.size}**`);
    if (p.menuEscondidoPeloBackend.length) L.push(`- Itens do menu do tipo escondidos pelo menu do backend: ${p.menuEscondidoPeloBackend.map((x) => `\`${x}\``).join(", ")}`);
    L.push("");
    L.push("| Tela (rota) | No menu (grupo) |");
    L.push("| --- | --- |");
    for (const tl of p.telas) L.push(`| \`${celula(tl.caminho)}\` | ${tl.noMenu ? celula(tl.menu) : "— (só por link)"} |`);
    const naoAbre = p.menu.filter((m) => !p.telas.some((tl) => tl.caminho === m.caminho));
    for (const m of naoAbre) L.push(`| \`${celula(m.caminho)}\` | ${celula(m.grupo)} — **no menu, mas o guard recusa** |`);
    L.push("");
    L.push(`Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): ${p.acoes.length}`);
    L.push("");
    if (p.acoes.length) {
      L.push("| Ação | Telas |");
      L.push("| --- | --- |");
      for (const a of p.acoes) L.push(`| \`${celula(a.acao)}\` | ${celula(a.telas.join(", "))} |`);
      L.push("");
    }
  }

  // Por tela
  L.push("## Por tela");
  L.push("");
  const backPorChave = new Map(inv.backend.map((r) => [r, r]));
  for (const tl of inv.telas) {
    L.push(`### \`${tl.caminho}\``);
    L.push("");
    if (tl.redireciona) {
      L.push(`Redireciona para \`${tl.redireciona}\` — \`${tl.local}\``);
      L.push("");
      continue;
    }
    const perfisTela = Object.values(inv.perfis).filter((p) => p.telas.some((x) => x.caminho === tl.caminho)).map((p) => p.papel);
    L.push(`- Componente: \`${tl.componente ?? "?"}\` (${tl.arquivoComponente ? `\`${tl.arquivoComponente}\`` : "não resolvido"}) · layout: ${tl.layout ?? "—"} · rota em \`${tl.local}\``);
    L.push(`- Permissão (guard): ${tl.guarda ? tl.guarda.permissoes.map((x) => `\`${x}\``).join(" ou ") : "**sem guard**"}`);
    L.push(`- Perfis que entram: ${perfisTela.join(", ") || "nenhum dos 9"}`);
    if (tl.permissoesConsultadas?.length) L.push(`- Permissões consultadas no código da tela: ${tl.permissoesConsultadas.map((x) => `\`${x}\``).join(", ")}`);
    L.push("");
    if (!tl.chamadas.length) {
      L.push("Nenhuma requisição ao backend alcançada a partir do componente.");
      L.push("");
      continue;
    }
    L.push("| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |");
    L.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const c of tl.chamadas) for (const x of c.casadas) {
      const rb = x.rotaBackend ? backPorChave.get(x.rotaBackend) : null;
      if (!rb) {
        L.push(`| \`${celula(`${x.metodo} ${x.caminho}`)}\` | **não existe** | — | — | — | — | \`${celula(c.local)}\` |`);
        continue;
      }
      const cats = [...new Set(rb.efeitos.map((e) => e.categoria))].filter((k) => k !== "auditoria" && k !== "gravacao");
      const efeitos = !rb.muta ? "—" : cats.length ? cats.map((k) => inv.destinos[k]?.rotulo ?? k).join("; ") : "gravação sem destinatário achado";
      const acoes = rb.muta ? nomesDeAuditoria(rb) : [];
      const recusa = perfisTela.filter((p) => !rb.papeis.includes(p));
      L.push(
        `| \`${celula(`${x.metodo} ${x.caminho}`)}\` | \`${celula(rb.caminho)}\` | ${celula(rb.permissoes.join(" ou ") || rb.tipoGuarda)} | ${celula(recusa.join(", ") || "—")} | ${celula(efeitos)} | ${celula(acoes.join(", ") || (rb.muta ? "**nenhum**" : "—"))} | \`${celula(c.local)}\` |`,
      );
    }
    L.push("");
  }

  // Backend (todas as rotas)
  L.push("## Rotas do backend");
  L.push("");
  L.push("Efeitos só nas rotas que mudam dado: `categoria(alvo)`; a lista completa, com o padrão e o local de cada efeito, está no JSON.");
  L.push("");
  L.push("| Método e caminho | Permissão | Perfis | Consumidor | Efeitos — quem recebe | Auditoria | Definida em |");
  L.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of inv.backend) {
    const destino = r.efeitos.filter((e) => !["auditoria", "gravacao"].includes(e.categoria)).map((e) => `${e.categoria}(${e.alvo})`);
    const gravacoes = new Set(r.efeitos.filter((e) => e.categoria === "gravacao").map((e) => e.alvo)).size;
    const unicos = [...new Set(destino)];
    const ef = !r.muta
      ? "—"
      : [unicos.slice(0, 4).join("; ") + (unicos.length > 4 ? ` (+${unicos.length - 4})` : ""), gravacoes ? `${gravacoes} gravação(ões)` : ""].filter(Boolean).join("; ") || "—";
    const au = r.muta ? nomesDeAuditoria(r) : [];
    L.push(
      `| \`${celula(`${r.metodo} ${r.caminho}`)}\` | ${celula(r.permissoes.join(" ou ") || r.tipoGuarda)}${r.guardaCondicional ? " (condicional)" : ""} | ${celula(listaPerfis(r.papeis, inv))} | ${celula(r.consumidor)}${r.telas.length ? `: ${celula(r.telas.join(", "))}` : ""} | ${celula(ef)} | ${celula(au.join(", ") || (r.muta ? "**nenhum**" : "—"))} | \`${celula(r.local)}\` |`,
    );
  }
  L.push("");

  // Matriz
  L.push("## Ponte declarada matriz-base → prefixo de permissão");
  L.push("");
  L.push("Só estas linhas da matriz-base são comparadas com o catálogo (correspondência inequívoca). As demais linhas não são checadas por este script:");
  L.push("");
  for (const [k, v] of Object.entries(PONTE_MATRIZ)) L.push(`- ${k} → ${v.map((x) => `\`${x}\``).join(", ")}`);
  const fora = inv.matriz.tabela.filter((l) => !PONTE_MATRIZ[l.capacidade]).map((l) => l.capacidade);
  L.push("");
  L.push(`Fora da checagem: ${fora.join("; ")}.`);
  L.push("");
  L.push(`Declarações "**verbo** → papéis" lidas das notas da matriz: ${inv.declaracoesMatriz.length}.`);
  L.push("");

  // Cobertura
  L.push("## Cobertura do próprio script");
  L.push("");
  L.push("| Camada | Reconhecido | Não lido / incompleto |");
  L.push("| --- | --- | --- |");
  L.push(`| Rotas do backend | ${cob.backend.rotas} rotas; ${cob.backend.rotasComPermissaoResolvida} com permissão resolvida; ${cob.backend.rotasSemGuarda} sem middleware de permissão | ${cob.naoLidos.filter((x) => x.camada.startsWith("backend: rota") || x.camada.startsWith("backend: permissão")).length} |`);
  L.push(`| Efeitos das rotas (grafo de chamadas) | ${cob.backend.rotas - cob.backend.rotasComElosNaoResolvidos} rotas com cadeia lida inteira | ${cob.backend.rotasComElosNaoResolvidos} rotas com elo não resolvido; ${cob.backend.rotasComElosPorNome} com elo resolvido só por nome no módulo |`);
  L.push(`| Rotas web | ${cob.front.rotas} (${cob.front.rotasComComponenteResolvido} com componente resolvido, ${cob.front.redirecionamentos} redirecionamentos) | ${cob.naoLidos.filter((x) => x.camada === "front: rota").length} |`);
  L.push(`| Chamadas HTTP do front | ${cob.front.chamadasLidas} de ${cob.front.chamadasHttp} lidas (método + caminho); ${cob.front.chamadasEmTelas} alcançadas por alguma tela | ${cob.front.chamadasNaoLidas} |`);
  L.push("");
  L.push("### Lista do que não foi lido");
  L.push("");
  if (!cob.naoLidos.length) L.push("Nada.");
  else {
    L.push("| Camada | Onde | Motivo |");
    L.push("| --- | --- | --- |");
    for (const n of cob.naoLidos) L.push(`| ${celula(n.camada)} | \`${celula(n.onde)}\` | ${celula(n.motivo)} |`);
  }
  L.push("");
  const comElo = inv.backend.filter((r) => r.elosNaoResolvidos.length);
  if (comElo.length) {
    L.push("### Rotas com elo não resolvido no grafo de chamadas");
    L.push("");
    L.push("| Rota | Elos (chamada @ local) |");
    L.push("| --- | --- |");
    for (const r of comElo) L.push(`| \`${celula(`${r.metodo} ${r.caminho}`)}\` | ${celula(r.elosNaoResolvidos.slice(0, 4).join("; "))}${r.elosNaoResolvidos.length > 4 ? ` (+${r.elosNaoResolvidos.length - 4})` : ""} |`);
    L.push("");
  }
  L.push("### Limites conhecidos");
  L.push("");
  L.push("- O catálogo é a fonte das permissões por papel; o RBAC persistido no banco (seed) não é lido.");
  L.push("- Supõe todos os módulos provisionados (o filtro de módulos do menu do backend não é simulado).");
  L.push("- Opções de requisição montadas por expressão (`{ ...ctx }` sem `method`) assumem o método padrão da função do cliente HTTP.");
  L.push("- Um alcance pelo grafo é um limite superior: código alcançável a partir da tela pode não rodar em toda visita.");
  L.push("- A auditoria de NEGAÇÃO (`recordPermissionDenied` no middleware) não conta como auditoria da ação.");
  L.push("- Efeitos são um limite superior: o grafo segue toda chamada alcançável (inclusive ramos condicionais) e, quando o alvo é uma interface, todas as classes que a implementam.");
  return `${L.join("\n").replace(/\n+$/, "")}\n`;
}

// ------------------------------------------------------------------------------------------------
// main
// ------------------------------------------------------------------------------------------------

async function main() {
  const root = REPO_ROOT_PADRAO;
  const ts = loadTypeScript(root);
  const inv = await gerarInventario({ ts, root });
  const md = paraMarkdown(inv);
  const json = `${jsonCompacto(paraJson(inv))}\n`;
  const dir = path.join(root, "docs", "refino");
  const alvoMd = path.join(dir, "inventario-fluxos.md");
  const alvoJson = path.join(dir, "inventario-fluxos.json");
  if (process.argv.includes("--check")) {
    const atualMd = fs.existsSync(alvoMd) ? fs.readFileSync(alvoMd, "utf8").replace(/\r\n/g, "\n") : "";
    const atualJson = fs.existsSync(alvoJson) ? fs.readFileSync(alvoJson, "utf8").replace(/\r\n/g, "\n") : "";
    if (atualMd !== md || atualJson !== json) {
      console.error("inventario-fluxos: docs/refino está defasado em relação ao código; rode node scripts/inventario-fluxos.mjs");
      process.exit(1);
    }
    console.log("inventario-fluxos: em dia.");
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(alvoMd, md);
  fs.writeFileSync(alvoJson, json);
  const t = totais(inv);
  console.log(
    `inventario-fluxos: ${t.perfis} perfis · ${t.telas} telas · ${t.rotasWeb} rotas web · ${t.rotasBackend} rotas do backend · ${t.chamadasHttpFront} chamadas HTTP · quebras ${JSON.stringify(t.quebras)} · não lidos ${inv.cobertura.naoLidos.length}`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
