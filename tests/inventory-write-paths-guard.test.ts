import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a (Ω6R-DAT-002 / DAT-003 / P-020) — T-D: GUARDS FAIL-CLOSED (CE-G1), em memória.
//
// CICLO 2 (C2-01, C2-02, C2-05, C2-06, C2-08): os guards D1/D2/D5 eram ENUMERAÇÕES DE TEXTO — D1 por
// GRAFIAS de `stockMovement.<m>(`, D2 por uma LISTA DE NOMES do que "decide", D5 só dentro de uma classe —
// depois de um removedor de comentários caseiro. O jurado mostrou 9 formas de escritor em arquivo novo
// passando (inclusive uma regex literal que "abria comentário" e apagava o código seguinte), uma via nova
// lendo saldo com outro nome antes do lock (20/20 aceitas, saldo −10), N locks numa transação e transições
// de status em arquivo novo. Aqui cada guard é uma PROPRIEDADE GERADA do código, pela AST e pelo CHECKER
// do TypeScript — a identidade vem do TIPO que o Prisma gera, nunca da grafia:
//
//   D1  todo ESCRITOR de `stock_movements`: membro ∉ leitura de um receptor de tipo `StockMovementDelegate`
//       (em qualquer forma sintática: alias, `?.`, `["…"]`, cadeia em N linhas), escrita ANINHADA pelo TIPO
//       do input (`^StockMovement(Unchecked)?(Create|Update|Upsert|Delete)…`) e SQL cru pelo template
//       inteiro (tabela dinâmica = NEGAR). Universo publicado = allowlist literal.
//   D1′ o classificador contra as 16 formas do jurado + 4 controles, em fixture compilada EM MEMÓRIA.
//   D2  R1–R6 sobre `PrismaInventoryRepository`, com o universo W (quem alcança `insertMovement`) GERADO.
//   D2′ R1/R2/R5/R6 contra as formas do jurado, em fixture.
//   D3  o token `ItemWriteLock` nas assinaturas de `insertMovement` e de toda leitura `*Locked`.
//   D4  o fechamento só escreve dentro de unidades (`uow.run`), com `abortClose` no `catch` (S-01).
//   D5  GLOBAL: todo escritor de `CycleCount`/`CycleCountEntry` está no dono, e lá toda transição é CAS.
//   D6  os `catch` de V3/V4/V5 classificam pela IDENTIDADE do índice (`isUniqueViolationOf`), nunca pelo
//       código genérico.
//   D7  toda porta pública dos wrappers RLS (e a porta de UoW) mapeia falha transitória para 503.
//   D8  a sobreposição da I9 é derivada de `TERMINAL_CYCLE_COUNT_STATUSES`; nenhuma cópia da classificação
//       de status fora de `cycle-count.types.ts`.
//   D9  nenhuma suíte `-db` do bloco faz DDL fora do drill em base própria (T-04).
// A mutação que deixa cada guard vermelho foi executada uma vez pelo dev e está na ata do bloco.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

const INVENTORY_PRISMA = "src/modules/inventory/inventory-prisma.repository.ts";
const CYCLE_COUNT_PRISMA = "src/modules/inventory/cycle-count-prisma.repository.ts";
const CYCLE_COUNT_MEMORY = "src/modules/inventory/cycle-count.repository.ts";
const CYCLE_COUNT_SERVICE = "src/modules/inventory/cycle-count.service.ts";
const CYCLE_COUNT_TYPES = "src/modules/inventory/cycle-count.types.ts";
const UOW_PRISMA = "src/modules/inventory/inventory-uow-prisma.ts";

/**
 * DETECTOR DE TRAVAMENTO — NÃO é orçamento de desempenho (plano da bateria §2.6c).
 *
 * O que vivia aqui era `PROGRAM_BUDGET_MS = 60_000` afirmado contra `analysis.ms`. A análise é CPU
 * pura (cria o programa do TypeScript e varre `src/`), logo o número mede a VIZINHANÇA, não o
 * produto. Medido no head `bc3e736b`: 11.861 ms sem carga e 45.772 ms com a máquina disputada —
 * margem de 1,31x contra os 60 s, a mais fina do bloco. Um vermelho ali não diria nada sobre o
 * código: diria que outro processo estava usando os núcleos.
 *
 * O teto não sai de vez porque o runner NÃO passa `--test-timeout` (pendência
 * `P-RUNNER-SEM-TEST-TIMEOUT`): sem rede nenhuma, uma análise que não termina pendura a bateria
 * inteira PARA SEMPRE — sem vermelho e sem diagnóstico. Então a propriedade afirmada muda de "a
 * análise é rápida" para "a análise TERMINA", contra um teto de outra ordem de grandeza: 13x acima
 * do pior valor já medido, que carga plausível nenhuma alcança. "A análise é rápida" vira SÉRIE
 * PUBLICADA (a linha `[T-D]` de toda execução), que é como se vê tendência sem fabricar vermelho.
 */
const PROGRAM_HANG_TIMEOUT_MS = 600_000;

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8").replace(/\r\n/g, "\n");
}

function posix(fileName: string): string {
  return fileName.split(String.fromCharCode(92)).join("/");
}

function walk(relativeDir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  const absolute = path.join(ROOT, relativeDir);
  let names: string[] = [];
  try {
    names = readdirSync(absolute);
  } catch {
    return out;
  }
  for (const name of names) {
    if (name === "node_modules" || name === "generated" || name === "dist") continue;
    const full = path.join(absolute, name);
    const rel = path.posix.join(relativeDir, name);
    if (statSync(full).isDirectory()) {
      if (rel === "prisma/migrations") continue; // DDL versionada; o censo dela é provado no drill (T-C′)
      out.push(...walk(rel, extensions));
    } else if (extensions.some((extension) => name.endsWith(extension))) {
      out.push(rel);
    }
  }
  return out;
}

// =================================================================================================
// O CLASSIFICADOR (AST + checker). Nenhuma remoção de comentários: comentário não é nó.
// =================================================================================================

/** Membros de LEITURA de um delegate do Prisma. Tudo o que não está aqui ESCREVE (default NEGAR). */
const READ_MEMBERS: ReadonlySet<string> = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "findFirstOrThrow",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "fields",
]);

/** Os modelos vigiados e as suas tabelas (para o SQL cru). */
const WATCHED_MODELS: Readonly<Record<string, string>> = {
  StockMovement: "stock_movements",
  CycleCount: "cycle_counts",
  CycleCountEntry: "cycle_count_entries",
};

/** Verbo de escrita + tabela, no template INTEIRO (cruza linhas). `TABLE` é substituído por modelo. */
const SQL_WRITE = String.raw`\b(insert\s+into|update|delete\s+from|truncate(?:\s+table)?|copy|merge\s+into)\s+(?:"?public"?\s*\.\s*)?"?TABLE"?\b`;

/** Marcador de substituição (`${…}`) dentro de um template de SQL cru. */
const DYNAMIC = "\u0000";

type Writer = {
  readonly model: string;
  readonly file: string;
  readonly line: number;
  readonly member: string | undefined;
  readonly why: string;
};

type Analysis = {
  readonly program: ts.Program;
  readonly checker: ts.TypeChecker;
  readonly writers: readonly Writer[];
  readonly ms: number;
  readonly files: number;
};

function typeNames(checker: ts.TypeChecker, type: ts.Type | undefined): Set<string> {
  const out = new Set<string>();
  const seen = new Set<ts.Type>();
  const visit = (candidate: ts.Type | undefined): void => {
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    if (candidate.aliasSymbol) {
      out.add(candidate.aliasSymbol.name);
      (candidate.aliasTypeArguments ?? []).forEach(visit);
    }
    if (candidate.symbol) out.add(candidate.symbol.name);
    if (candidate.isUnionOrIntersection()) candidate.types.forEach(visit);
  };
  visit(type);
  return out;
}

function constituents(type: ts.Type): ts.Type[] {
  return type.isUnionOrIntersection() ? type.types.flatMap(constituents) : [type];
}

function lineOf(node: ts.Node): number {
  return node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

function relOf(sourceFile: ts.SourceFile): string {
  return posix(sourceFile.fileName).replace(`${posix(ROOT)}/`, "");
}

/**
 * O nome do método/função que CONTÉM o nó (a allowlist do D1 é por MEMBRO, não por linha — linha se move).
 * O escopo que vale é o da função; o nome de variável só entra quando não há função nenhuma acima (topo de
 * módulo). Antes, `const movement = await …create(…)` publicava "movement" em vez de "insertMovement".
 */
function enclosingMember(node: ts.Node): string | undefined {
  let fallback: string | undefined;
  for (let current: ts.Node | undefined = node; current; current = current.parent) {
    if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (ts.isConstructorDeclaration(current)) return "constructor";
    if (ts.isPropertyDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
    if (fallback === undefined && ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) fallback = current.name.text;
  }
  return fallback;
}

/** O texto de um template/string literal; cada `${…}` vira um marcador opaco. */
function templateText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((span) => DYNAMIC + span.literal.text).join("");
  }
  return undefined;
}

/** Quais modelos este SQL cru ESCREVE (tabela dinâmica após verbo de escrita = negar). */
function rawWritesOf(sql: string): string[] {
  const hits: string[] = [];
  for (const [model, table] of Object.entries(WATCHED_MODELS)) {
    if (new RegExp(SQL_WRITE.replace("TABLE", table), "i").test(sql)) hits.push(model);
  }
  if (new RegExp(SQL_WRITE.replace(String.raw`"?TABLE"?\b`, DYNAMIC), "i").test(sql)) hits.push("<tabela dinâmica>");
  return hits;
}

const WRITE_INPUT = (model: string): RegExp => new RegExp(`^${model}(Unchecked)?(Create|Update|Upsert|Delete)`);

/**
 * O universo de escritores dos modelos vigiados, GERADO do programa. Três vias, todas por TIPO:
 *   (a) membro ∉ leitura de um receptor cujo tipo é `<Model>Delegate` (qualquer forma sintática);
 *   (b) escrita ANINHADA: o literal do argumento é caminhado contra o tipo declarado do parâmetro, e uma
 *       propriedade cujo tipo se chame `^<Model>(Unchecked)?(Create|Update|Upsert|Delete)…` é escritor;
 *   (c) SQL cru: o template INTEIRO contra verbo-de-escrita + tabela; dinâmico na posição da tabela = negar.
 * Argumento não literal, chave computada ou declaração não resolvida → NEGAR (`<literal não resolvido>`).
 */
function collectWriters(program: ts.Program, checker: ts.TypeChecker): Writer[] {
  const writers: Writer[] = [];
  const add = (model: string, node: ts.Node, why: string): void => {
    const sourceFile = node.getSourceFile();
    writers.push({ model, file: relOf(sourceFile), line: lineOf(node), member: enclosingMember(node), why });
  };

  let prismaNamespaceMemo: ts.Symbol | undefined | null = null;
  const prismaNamespace = (): ts.Symbol | undefined => {
    if (prismaNamespaceMemo !== null) return prismaNamespaceMemo;
    const declaration = program.getSourceFiles().find((file) => posix(file.fileName).endsWith(".prisma/client/index.d.ts"));
    const moduleSymbol = declaration ? checker.getSymbolAtLocation(declaration) : undefined;
    prismaNamespaceMemo = moduleSymbol?.exports?.get("Prisma" as ts.__String);
    return prismaNamespaceMemo;
  };

  const flagTypes = (types: readonly ts.Type[], node: ts.Node, key: string): void => {
    const names = new Set(types.flatMap((type) => [...typeNames(checker, type)]));
    for (const model of Object.keys(WATCHED_MODELS)) {
      const hit = [...names].find((name) => WRITE_INPUT(model).test(name));
      if (hit) add(model, node, `aninhado:${key}:${hit}`);
    }
  };

  const walkTypeProperties = (types: readonly ts.Type[], node: ts.Node, depth: number): void => {
    if (depth > 2) return; // recursão irrestrita em tipos NOMEADOS do Prisma pendura o programa (medido)
    for (const constituent of types.flatMap(constituents)) {
      if (!(constituent.flags & ts.TypeFlags.Object)) continue;
      const properties = constituent.getProperties();
      if (properties.length > 80) continue;
      for (const property of properties) {
        const propertyType = checker.getTypeOfSymbolAtLocation(property, node);
        flagTypes([propertyType], node, `...${property.name}`);
        const anonymous = constituents(propertyType).filter(
          (type) =>
            (type.flags & ts.TypeFlags.Object) !== 0 &&
            !type.aliasSymbol &&
            ((type.symbol?.flags ?? 0) & (ts.SymbolFlags.TypeLiteral | ts.SymbolFlags.ObjectLiteral)) !== 0,
        );
        if (anonymous.length > 0) walkTypeProperties(anonymous, node, depth + 1);
      }
    }
  };

  const walkLiteral = (literal: ts.ObjectLiteralExpression, types: readonly ts.Type[]): void => {
    for (const property of literal.properties) {
      if (ts.isSpreadAssignment(property)) {
        walkTypeProperties([checker.getTypeAtLocation(property.expression)], property, 0);
        continue;
      }
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        add("<literal não resolvido>", property, "membro não inspecionável em argumento de escrita");
        continue;
      }
      if (ts.isPropertyAssignment(property) && ts.isComputedPropertyName(property.name)) {
        add("<literal não resolvido>", property, "chave computada em argumento de escrita");
        continue;
      }
      const key = ts.isShorthandPropertyAssignment(property)
        ? property.name.text
        : property.name.getText().replace(/^["'`]|["'`]$/g, "");
      const propertyTypes = types.flatMap(constituents).flatMap((constituent) => {
        const symbol = checker.getPropertyOfType(constituent, key);
        return symbol ? [checker.getTypeOfSymbolAtLocation(symbol, property)] : [];
      });
      flagTypes(propertyTypes, property, key);
      const value = ts.isPropertyAssignment(property) ? property.initializer : undefined;
      if (!value) continue;
      const inner = propertyTypes
        .flatMap(constituents)
        .filter((type) => !(type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)));
      if (ts.isObjectLiteralExpression(value)) walkLiteral(value, inner);
      else if (ts.isArrayLiteralExpression(value)) {
        const elementTypes = inner.flatMap((type) => {
          const indexType = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
          return indexType ? [indexType] : [];
        });
        for (const element of value.elements) if (ts.isObjectLiteralExpression(element)) walkLiteral(element, elementTypes);
      } else walkTypeProperties(inner, property, 0);
    }
  };

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || posix(sourceFile.fileName).includes("node_modules")) continue;

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
        const callee = node.expression;
        const receiverType = checker.getTypeAtLocation(callee.expression);
        const receiverNames = typeNames(checker, receiverType);

        // (a) membro do delegate do modelo vigiado
        for (const model of Object.keys(WATCHED_MODELS)) {
          if (!receiverNames.has(`${model}Delegate`)) continue;
          let member: string | undefined;
          if (ts.isPropertyAccessExpression(callee)) member = callee.name.text;
          else if (ts.isStringLiteral(callee.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(callee.argumentExpression)) {
            member = callee.argumentExpression.text;
          }
          if (member === undefined || !READ_MEMBERS.has(member)) add(model, node, member ?? "<membro dinâmico>");
        }

        // (c) SQL cru `*Unsafe` (argumento não literal = negar)
        if (ts.isPropertyAccessExpression(callee) && /^\$(executeRawUnsafe|queryRawUnsafe)$/.test(callee.name.text)) {
          const text = node.arguments[0] ? templateText(node.arguments[0]!) : undefined;
          if (text === undefined) add("<sql dinâmico>", node, `${callee.name.text}(<não literal>)`);
          else for (const model of rawWritesOf(text)) add(model, node, "raw");
        }

        // (b) escrita ANINHADA em QUALQUER delegate, pelo TIPO do argumento
        if (ts.isPropertyAccessExpression(callee) && [...receiverNames].some((name) => name.endsWith("Delegate")) && !READ_MEMBERS.has(callee.name.text)) {
          const signature = checker.getResolvedSignature(node);
          const declaration =
            signature?.declaration ??
            constituents(receiverType)
              .flatMap((constituent) => constituent.getProperty(callee.name.text)?.declarations ?? [])
              .find((candidate) => ts.isMethodSignature(candidate) || ts.isMethodDeclaration(candidate));
          let constraint =
            declaration && (ts.isMethodSignature(declaration) || ts.isMethodDeclaration(declaration))
              ? declaration.typeParameters?.[0]?.constraint
              : undefined;
          if (!constraint) {
            for (const constituent of constituents(receiverType)) {
              const member = constituent.symbol?.members
                ?.get(callee.name.text as ts.__String)
                ?.declarations?.find((candidate) => ts.isMethodSignature(candidate) || ts.isMethodDeclaration(candidate));
              const candidate =
                member && (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) ? member.typeParameters?.[0]?.constraint : undefined;
              if (candidate) {
                constraint = candidate;
                break;
              }
            }
          }
          if (!constraint && ts.isPropertyAccessExpression(callee.expression)) {
            // Receptor OPACO (tipo declarado à mão e ligado por `as unknown as`): o modelo vem do NOME da
            // propriedade no cliente (`checklistTemplate` → `ChecklistTemplateDelegate`), convenção do gerador.
            const modelName = callee.expression.name.text.replace(/^[a-z]/, (char) => char.toUpperCase());
            const namespace = prismaNamespace();
            const declared = namespace?.exports
              ?.get(`${modelName}Delegate` as ts.__String)
              ?.declarations?.find(ts.isInterfaceDeclaration);
            const method = declared?.members.find(
              (candidate) => ts.isMethodSignature(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === callee.name.text,
            );
            if (method && ts.isMethodSignature(method) && method.typeParameters?.[0]?.constraint) {
              constraint = method.typeParameters[0].constraint;
            }
          }
          const argumentType = constraint ? checker.getTypeFromTypeNode(constraint) : undefined;
          const first = node.arguments[0];
          if (first) {
            if (!argumentType) add("<literal não resolvido>", node, "delegate de escrita sem tipo de argumento resolvido");
            else if (ts.isObjectLiteralExpression(first)) walkLiteral(first, [argumentType]);
            else add("<literal não resolvido>", node, `argumento de escrita não é literal (${ts.SyntaxKind[first.kind]})`);
          }
        }
      }

      // (c) SQL cru tagged
      if (ts.isTaggedTemplateExpression(node) && ts.isPropertyAccessExpression(node.tag) && /^\$(executeRaw|queryRaw)$/.test(node.tag.name.text)) {
        const text = templateText(node.template);
        if (text !== undefined) for (const model of rawWritesOf(text)) add(model, node, "raw-tagged");
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return writers;
}

// ------------------------------------------------------------------ o programa real (memoizado)

let analysisMemo: Analysis | undefined;

function analyze(): Analysis {
  if (analysisMemo) return analysisMemo;
  const startedAt = Date.now();
  const roots = [...walk("src", [".ts"]), ...walk("prisma", [".ts"]), ...walk("scripts", [".ts", ".mts"])];
  const config = ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  const program = ts.createProgram({
    rootNames: roots.map((file) => path.join(ROOT, file)),
    options: { ...parsed.options, noEmit: true, rootDir: undefined },
  });
  const checker = program.getTypeChecker();
  const writers = collectWriters(program, checker);
  analysisMemo = { program, checker, writers, ms: Date.now() - startedAt, files: roots.length };
  // A DURAÇÃO é publicada, nunca afirmada (§2.6c): é a série que mostra tendência. A margem sai
  // junto para que "a análise dobrou de tempo" seja legível no TAP sem ninguém ter de calcular.
  console.log(
    `[T-D] programa: ${roots.length} raízes, ${analysisMemo.ms} ms ` +
      `(detector de travamento ${PROGRAM_HANG_TIMEOUT_MS} ms · margem ${(PROGRAM_HANG_TIMEOUT_MS / Math.max(1, analysisMemo.ms)).toFixed(1)}x)`,
  );
  return analysisMemo;
}

/** Um programa pequeno com arquivos VIRTUAIS na raiz do repo (resolvem `@prisma/client` normalmente). */
function fixtureAnalysis(files: Readonly<Record<string, string>>): Analysis {
  const startedAt = Date.now();
  const config = ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  const options = { ...parsed.options, noEmit: true, rootDir: undefined };
  const host = ts.createCompilerHost(options, true);
  const virtual = new Map(Object.entries(files).map(([name, text]) => [posix(path.join(ROOT, name)), text]));
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const text = virtual.get(posix(fileName));
    return text === undefined
      ? originalGetSourceFile(fileName, languageVersion, onError, shouldCreate)
      : ts.createSourceFile(fileName, text, languageVersion, true);
  };
  host.fileExists = (fileName) => virtual.has(posix(fileName)) || originalFileExists(fileName);
  host.readFile = (fileName) => virtual.get(posix(fileName)) ?? originalReadFile(fileName);
  const program = ts.createProgram({ rootNames: [...virtual.keys()], options, host });
  const checker = program.getTypeChecker();
  return { program, checker, writers: collectWriters(program, checker), ms: Date.now() - startedAt, files: virtual.size };
}

// =================================================================================================
// D2 — as regras estruturais da classe que escreve movimento (R1–R6).
// =================================================================================================

type RepositoryRules = {
  readonly universe: string[];
  readonly identification: string[];
  readonly notIdentification: string[];
  readonly violations: Record<string, string[]>;
};

function findClass(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration {
  let found: ts.ClassDeclaration | undefined;
  sourceFile.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === className) found = node;
  });
  assert.ok(found, `classe ${className} não encontrada`);
  return found!;
}

function analyzeRepository(checker: ts.TypeChecker, sourceFile: ts.SourceFile, className: string, writerMember: string): RepositoryRules {
  const declaration = findClass(sourceFile, className);
  const methods = new Map<string, ts.MethodDeclaration>();
  for (const member of declaration.members) if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) methods.set(member.name.text, member);

  const thisCalls = (method: ts.MethodDeclaration): { name: string; node: ts.CallExpression; inLoop: boolean }[] => {
    const out: { name: string; node: ts.CallExpression; inLoop: boolean }[] = [];
    const visit = (node: ts.Node, inLoop: boolean): void => {
      const loop =
        inLoop ||
        ts.isForStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^(map|forEach|reduce|flatMap)$/.test(node.expression.name.text));
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
        out.push({ name: node.expression.name.text, node, inLoop: loop });
      }
      ts.forEachChild(node, (child) => visit(child, loop));
    };
    if (method.body) visit(method.body, false);
    return out;
  };

  const touchesDbMemo = new Map<string, boolean>();
  const touchesDb = (name: string, stack = new Set<string>()): boolean => {
    if (touchesDbMemo.has(name)) return touchesDbMemo.get(name)!;
    if (stack.has(name)) return false;
    stack.add(name);
    const method = methods.get(name);
    if (!method?.body) return false;
    let direct = false;
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword && node.name.text === "client") direct = true;
      ts.forEachChild(node, visit);
    };
    visit(method.body);
    const result = direct || thisCalls(method).some((call) => touchesDb(call.name, stack));
    touchesDbMemo.set(name, result);
    return result;
  };

  const reaches = (name: string, target: string, seen = new Set<string>()): boolean => {
    if (seen.has(name)) return false;
    seen.add(name);
    const method = methods.get(name);
    if (!method) return false;
    return thisCalls(method).some((call) => call.name === target || reaches(call.name, target, seen));
  };

  const universe = [...methods.keys()].filter((name) => name !== writerMember && reaches(name, writerMember));

  const lockCount = (name: string, seen = new Set<string>()): number => {
    if (seen.has(name)) return 0;
    seen.add(name);
    const method = methods.get(name);
    if (!method) return 0;
    let total = 0;
    for (const call of thisCalls(method)) {
      if (call.name === "lockItemForUpdate") total += call.inLoop ? 99 : 1;
      else if (universe.includes(call.name)) total += (call.inLoop ? 99 : 1) * lockCount(call.name, new Set(seen));
    }
    return total;
  };

  const hasLockToken = (method: ts.MethodDeclaration): boolean =>
    method.parameters.some((parameter) => parameter.type !== undefined && /\bItemWriteLock\b/.test(parameter.type.getText()));

  /** Leitura de IDENTIFICAÇÃO: UM único acesso ao banco, e ele é a busca de UMA linha. */
  const identification = (name: string): { ok: boolean; why: string } => {
    const method = methods.get(name);
    if (!method?.body) return { ok: false, why: "sem corpo" };
    if (universe.includes(name)) return { ok: false, why: "é escritor" };
    if (hasLockToken(method)) return { ok: false, why: "exige token (leitura sob lock)" };
    const operations: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const receiver = node.expression.expression;
        if (
          ts.isPropertyAccessExpression(receiver) &&
          ts.isPropertyAccessExpression(receiver.expression) &&
          receiver.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
          receiver.expression.name.text === "client"
        ) {
          operations.push(node.expression.name.text);
        }
        if (/^\$(executeRaw|queryRaw)(Unsafe)?$/.test(node.expression.name.text)) operations.push(node.expression.name.text);
      }
      if (ts.isTaggedTemplateExpression(node) && ts.isPropertyAccessExpression(node.tag) && /^\$(executeRaw|queryRaw)$/.test(node.tag.name.text)) {
        operations.push(node.tag.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(method.body);
    const dbCalls = thisCalls(method)
      .filter((call) => touchesDb(call.name))
      .map((call) => call.name);
    if (dbCalls.length > 0) return { ok: false, why: `chama membro que acessa o banco: ${dbCalls.join(",")}` };
    if (operations.length !== 1) return { ok: false, why: `acessos ao banco: ${operations.length} (${operations.join(",")})` };
    if (!/^(findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow)$/.test(operations[0]!)) {
      return { ok: false, why: `acesso não é busca de UMA linha: ${operations[0]}` };
    }
    return { ok: true, why: operations[0]! };
  };

  const violations: Record<string, string[]> = {};
  for (const name of universe) {
    const found: string[] = [];
    const method = methods.get(name)!;
    const body = method.body!;
    const total = lockCount(name);
    if (total !== 1) found.push(`R1 locks por transação = ${total} (esperado 1)`);

    const statements = body.statements;
    let lockIndex = -1;
    let lockVariable: string | undefined;
    statements.forEach((statement, index) => {
      if (/\bthis\.lockItemForUpdate\(/.test(statement.getText()) && lockIndex < 0) {
        lockIndex = index;
        if (ts.isVariableStatement(statement)) {
          const first = statement.declarationList.declarations[0];
          if (first && ts.isIdentifier(first.name)) lockVariable = first.name.text;
        }
      }
    });
    const directLocks = thisCalls(method).filter((call) => call.name === "lockItemForUpdate");
    if (directLocks.length > 0 && lockIndex < 0) found.push("R1 lock existe mas não é statement de topo do corpo");

    if (lockIndex >= 0) {
      const preLockVariables = new Map<string, ts.Symbol>();
      for (let index = 0; index < lockIndex; index += 1) {
        const statement = statements[index]!;
        if (ts.isVariableStatement(statement)) {
          for (const declared of statement.declarationList.declarations) {
            const initializer = declared.initializer;
            if (!initializer) continue;
            const text = initializer.getText();
            if (!/\bawait\b/.test(text) && !/\bthis\./.test(text)) continue; // constante local: inofensiva
            if (
              ts.isAwaitExpression(initializer) &&
              ts.isCallExpression(initializer.expression) &&
              ts.isPropertyAccessExpression(initializer.expression.expression) &&
              initializer.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
            ) {
              const callee = initializer.expression.expression.name.text;
              const verdict = identification(callee);
              if (verdict.ok) {
                if (ts.isIdentifier(declared.name)) {
                  const symbol = checker.getSymbolAtLocation(declared.name);
                  if (symbol) preLockVariables.set(declared.name.text, symbol);
                }
                continue;
              }
              found.push(`R2 antes do lock: this.${callee}(...) não é leitura de identificação (${verdict.why})`);
              continue;
            }
            found.push(`R2 antes do lock: acesso ao banco fora do padrão de identificação: ${text.slice(0, 60)}`);
          }
        } else if (ts.isIfStatement(statement)) {
          const condition = statement.expression.getText().replace(/\s/g, "");
          const guard = /^!(\w+)(\?\.\w+)*$/.exec(condition) ?? /^(\w+)===undefined$/.exec(condition) ?? /^(\w+)==null$/.exec(condition);
          const branch = ts.isBlock(statement.thenStatement) ? statement.thenStatement.statements : [statement.thenStatement];
          const onlyExit = branch.length === 1 && (ts.isReturnStatement(branch[0]!) || ts.isThrowStatement(branch[0]!));
          if (!guard || !preLockVariables.has(guard[1]!) || !onlyExit || statement.elseStatement) {
            found.push(`R2 antes do lock: decisão que não é guarda de existência: if (${statement.expression.getText().slice(0, 50)})`);
          }
        } else {
          found.push(`R2 antes do lock: statement não permitido: ${statement.getText().slice(0, 50)}`);
        }
      }

      for (let index = lockIndex + 1; index < statements.length; index += 1) {
        const visitAfter = (node: ts.Node): void => {
          if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const callee = node.expression.name.text;
            if (callee !== "lockItemForUpdate" && touchesDb(callee) && !node.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === lockVariable)) {
              found.push(`R3 depois do lock: this.${callee}(...) sem o token`);
            }
          }
          if (ts.isIdentifier(node) && preLockVariables.has(node.text)) {
            const symbol = checker.getSymbolAtLocation(node);
            if (symbol && symbol === preLockVariables.get(node.text)) {
              found.push(`R5 valor lido ANTES do lock usado depois: ${node.text} (l.${lineOf(node)})`);
            }
          }
          ts.forEachChild(node, visitAfter);
        };
        visitAfter(statements[index]!);
      }
    }

    if (found.length > 0) violations[name] = [...new Set(found)];
  }

  return {
    universe: [...universe].sort(),
    identification: [...methods.keys()].filter((name) => !universe.includes(name) && identification(name).ok).sort(),
    notIdentification: [...methods.keys()]
      .filter((name) => !universe.includes(name) && touchesDb(name) && !identification(name).ok)
      .map((name) => `${name}: ${identification(name).why}`)
      .sort(),
    violations,
  };
}

/** R6 — todo callback de `InventoryUnitOfWork.run` escreve item NO MÁXIMO uma vez, fora de laço. */
function unitOfWorkViolations(program: ts.Program, checker: ts.TypeChecker, universe: readonly string[]): string[] {
  const out: string[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || posix(sourceFile.fileName).includes("node_modules")) continue;
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "run" &&
        typeNames(checker, checker.getTypeAtLocation(node.expression.expression)).has("InventoryUnitOfWork")
      ) {
        const callback = node.arguments[1];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          const found: { name: string; inLoop: boolean; line: number }[] = [];
          const visitCallback = (child: ts.Node, inLoop: boolean): void => {
            const loop =
              inLoop ||
              ts.isForStatement(child) ||
              ts.isForOfStatement(child) ||
              ts.isForInStatement(child) ||
              ts.isWhileStatement(child) ||
              ts.isDoStatement(child);
            if (
              ts.isCallExpression(child) &&
              ts.isPropertyAccessExpression(child.expression) &&
              universe.includes(child.expression.name.text) &&
              [...typeNames(checker, checker.getTypeAtLocation(child.expression.expression))].some((name) => /InventoryRepository$/.test(name))
            ) {
              found.push({ name: child.expression.name.text, inLoop: loop, line: lineOf(child) });
            }
            ts.forEachChild(child, (grandChild) => visitCallback(grandChild, loop));
          };
          visitCallback(callback.body, false);
          if (found.length > 1 || found.some((entry) => entry.inLoop)) {
            out.push(
              `R6 ${relOf(sourceFile)}:${lineOf(node)} uow.run com ${found.length} escrita(s) de item: ` +
                found.map((entry) => `${entry.name}@${entry.line}${entry.inLoop ? "(laço)" : ""}`).join(", "),
            );
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return out;
}

// =================================================================================================
// As fixtures do jurado (D1′ e D2′), compiladas EM MEMÓRIA — nada é escrito em `src/`.
// =================================================================================================

const FIXTURE_HEAD = [
  'import type { Prisma } from "@prisma/client";',
  "",
  "export async function mut(tx: Prisma.TransactionClient, tenantId: string, itemId: string, ccId: string): Promise<unknown> {",
  "  void ccId;",
  "",
].join("\n");

const ROW = '{ tenant_id: tenantId, item_id: itemId, type: "saida", quantidade_sinalizada: -5 }';
const BACKTICK = String.fromCharCode(96);
const BACKSLASH = String.fromCharCode(92);
const raw = (sql: string): string => `  return tx.$executeRaw${BACKTICK}${sql}${BACKTICK};`;
const fixture = (body: string): string => `${FIXTURE_HEAD}${body}\n}\n`;

/** As formas do jurado (C2-02/C2-08) + as 4 grafias já conhecidas do D-01. ESCRITORES. */
const D1_WRITERS: Readonly<Record<string, string>> = {
  "createManyAndReturn": `  return tx.stockMovement.createManyAndReturn({ data: [${ROW}] });`,
  "updateManyAndReturn": `  return tx.stockMovement.updateManyAndReturn({ where: { tenant_id: tenantId, item_id: itemId }, data: { quantidade_sinalizada: -5 } });`,
  "upsert": `  return tx.stockMovement.upsert({ where: { id: itemId }, create: ${ROW}, update: {} });`,
  "deleteMany": `  return tx.stockMovement.deleteMany({ where: { tenant_id: tenantId } });`,
  "raw-public-quoted": raw(
    `INSERT INTO "public"."stock_movements" (tenant_id, item_id, type, quantidade_sinalizada) VALUES ` +
      "${tenantId}::uuid, ${itemId}::uuid, 'saida', -5)",
  ),
  "raw-lowercase": raw("insert into stock_movements (tenant_id, item_id) values (${tenantId}::uuid, ${itemId}::uuid)"),
  "raw-multilinha": raw("\n    INSERT INTO\n      stock_movements (tenant_id, item_id)\n    VALUES (${tenantId}::uuid, ${itemId}::uuid)"),
  "raw-tabela-interpolada":
    `  const TABLE = "stock_movements";\n  return tx.$executeRawUnsafe(${BACKTICK}INSERT INTO ` +
    "${TABLE}" +
    ` (tenant_id, item_id) VALUES ($1::uuid, $2::uuid)${BACKTICK}, tenantId, itemId);`,
  "cadeia-multilinha": `  return tx.stockMovement\n    .create({ data: ${ROW} });`,
  "alias": `  const ledger = tx.stockMovement;\n  return ledger.create({ data: ${ROW} });`,
  "optional-chaining": `  return tx.stockMovement?.create({ data: ${ROW} });`,
  "bracket": `  return tx["stockMovement"].create({ data: ${ROW} });`,
  "regex-literal-esconde":
    `  const semBarra = String(ccId).replace(/${BACKSLASH}/*$/, "");\n  void semBarra;\n` +
    `  await tx.stockMovement.create({ data: ${ROW} });\n  /** fim */\n  return undefined;`,
  "aninhado-inventoryItem":
    `  return tx.inventoryItem.update({\n    where: { tenant_id_id: { tenant_id: tenantId, id: itemId } },\n` +
    `    data: { movements: { createMany: { data: [{ type: "saida", quantidade_sinalizada: -5 }] } } },\n  });`,
  "aninhado-cycleCount":
    `  return tx.cycleCount.update({\n    where: { tenant_id_id: { tenant_id: tenantId, id: ccId } },\n` +
    `    data: { movements: { createMany: { data: [{ item_id: itemId, type: "ajuste", quantidade_sinalizada: -5 }] } } },\n  });`,
  "aninhado-tenant":
    `  return tx.tenant.update({\n    where: { id: tenantId },\n` +
    `    data: { stock_movements: { createMany: { data: [{ item_id: itemId, type: "saida", quantidade_sinalizada: -5 }] } } },\n  });`,
  "aninhado-connect":
    `  return tx.inventoryItem.update({ where: { tenant_id_id: { tenant_id: tenantId, id: itemId } }, data: { movements: { connect: [{ id: ccId }] } } });`,
  "aninhado-createMany-array":
    `  return tx.tenant.update({ where: { id: tenantId }, data: { stock_movements: { createMany: { data: [` +
    `{ item_id: itemId, type: "saida", quantidade_sinalizada: -5 }, { item_id: itemId, type: "saida", quantidade_sinalizada: -1 }] } } } });`,
};

/** Controles: LEITURA (e um escritor que só existe dentro de comentário). NÃO são escritores. */
const D1_CONTROLS: Readonly<Record<string, string>> = {
  "ctl-findMany": `  return tx.stockMovement.findMany({ where: { tenant_id: tenantId, item_id: itemId } });`,
  "ctl-include": `  return tx.inventoryItem.findFirst({ where: { tenant_id: tenantId, id: itemId }, include: { movements: { take: 5 } } });`,
  "ctl-where-some": `  return tx.inventoryItem.findMany({ where: { tenant_id: tenantId, movements: { some: { type: "saida" } } } });`,
  "ctl-so-comentario": `  // return tx.stockMovement.create({ data: ${ROW} });\n  return tx.stockMovement.count({ where: { tenant_id: tenantId } });`,
};

/** A fixture do D2′: a MESMA estrutura da classe real, com as formas que o jurado usou. */
const D2_FIXTURE = `import type { Prisma } from "@prisma/client";

type Executor = Prisma.TransactionClient;
declare const Brand: unique symbol;
export type ItemWriteLock = { readonly [Brand]: true; readonly item: { readonly id: string; readonly tenantId: string } };
export interface InventoryRepository { createMovement(tenantId: string, itemId: string, quantidade: number): Promise<unknown>; }
export interface InventoryUnitOfWork { run<T>(tenantId: string, work: (ctx: { inventory: InventoryRepository }) => Promise<T>): Promise<T>; }

export class ZzFixtureRepository {
  constructor(private readonly client: Executor) {}

  private async lockItemForUpdate(tenantId: string, itemId: string): Promise<ItemWriteLock | undefined> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>\`SELECT * FROM "inventory_items" WHERE "tenant_id" = \${tenantId}::uuid AND "id" = \${itemId}::uuid FOR UPDATE\`;
    return rows[0] ? ({ item: { id: itemId, tenantId } } as unknown as ItemWriteLock) : undefined;
  }

  private async insertMovement(lock: ItemWriteLock, tenantId: string, itemId: string, quantidade: number): Promise<unknown> {
    return this.client.stockMovement.create({ data: { tenant_id: tenantId, item_id: itemId, type: "saida", quantidade_sinalizada: quantidade, custody_type: "base" } });
  }

  async findMovementById(tenantId: string, movementId: string): Promise<{ itemId: string } | undefined> {
    const row = await this.client.stockMovement.findFirst({ where: { tenant_id: tenantId, id: movementId } });
    return row ? { itemId: row.item_id } : undefined;
  }

  private async saldoLocked(lock: ItemWriteLock): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({ where: { tenant_id: lock.item.tenantId, item_id: lock.item.id }, _sum: { quantidade_sinalizada: true } });
    return Number(aggregate._sum.quantidade_sinalizada ?? 0);
  }

  private async sumByItem(tenantId: string, itemIds: readonly string[]): Promise<Map<string, number>> {
    const rows = await this.client.stockMovement.groupBy({ by: ["item_id"], where: { tenant_id: tenantId, item_id: { in: [...itemIds] } }, _sum: { quantidade_sinalizada: true } });
    return new Map(rows.map((row) => [row.item_id, Number(row._sum.quantidade_sinalizada ?? 0)]));
  }

  private async saldoComposto(tenantId: string, itemId: string): Promise<number> {
    const identificado = await this.findMovementById(tenantId, itemId);
    const saldos = await this.sumByItem(tenantId, [itemId]);
    return identificado ? (saldos.get(itemId) ?? 0) : 0;
  }

  /** CONFORME: identificação → lock → tudo sob o lock. */
  async criarOk(tenantId: string, movementId: string, quantidade: number): Promise<unknown> {
    const identificado = await this.findMovementById(tenantId, movementId);
    if (!identificado) return undefined;
    const lock = await this.lockItemForUpdate(tenantId, movementId);
    if (!lock) return undefined;
    const saldo = await this.saldoLocked(lock);
    if (saldo + quantidade < 0) throw new Error("saldo");
    return this.insertMovement(lock, tenantId, movementId, quantidade);
  }

  /** B2 — decide por um leitor de saldo com OUTRO nome, antes do lock. */
  async consumeFastSumByItem(tenantId: string, itemId: string, quantidade: number): Promise<unknown> {
    const saldoAtual = (await this.sumByItem(tenantId, [itemId])).get(itemId) ?? 0;
    if (saldoAtual + quantidade < 0) throw new Error("saldo");
    const lock = await this.lockItemForUpdate(tenantId, itemId);
    if (!lock) return undefined;
    return this.insertMovement(lock, tenantId, itemId, quantidade);
  }

  /** B3 — decide por um membro COMPOSTO (que chama outros leitores), antes do lock. */
  async consumeFastComposto(tenantId: string, itemId: string, quantidade: number): Promise<unknown> {
    const saldoAtual = await this.saldoComposto(tenantId, itemId);
    if (saldoAtual + quantidade < 0) throw new Error("saldo");
    const lock = await this.lockItemForUpdate(tenantId, itemId);
    if (!lock) return undefined;
    return this.insertMovement(lock, tenantId, itemId, quantidade);
  }

  /** B5 (controle do jurado) — decide por um nome que a LISTA antiga conhecia. Também é vermelho. */
  async consumeFastListado(tenantId: string, itemId: string, quantidade: number): Promise<unknown> {
    if (quantidade < 0) throw new Error("saldo");
    const lock = await this.lockItemForUpdate(tenantId, itemId);
    if (!lock) return undefined;
    return this.insertMovement(lock, tenantId, itemId, quantidade);
  }

  /** R1 — dois locks na MESMA transação. */
  async doisLocks(tenantId: string, itemA: string, itemB: string): Promise<unknown> {
    const lockA = await this.lockItemForUpdate(tenantId, itemA);
    if (!lockA) return undefined;
    const lockB = await this.lockItemForUpdate(tenantId, itemB);
    if (!lockB) return undefined;
    return this.insertMovement(lockA, tenantId, itemA, -1);
  }

  /** R1 — lock DENTRO de laço (N locks por transação). */
  async lockEmLaco(tenantId: string, itemIds: readonly string[]): Promise<unknown> {
    for (const itemId of itemIds) {
      const lock = await this.lockItemForUpdate(tenantId, itemId);
      if (lock) await this.insertMovement(lock, tenantId, itemId, -1);
    }
    return undefined;
  }

  /** R1 transitivo (B7) — N escritas compostas na mesma transação. */
  async adjustMany(tenantId: string, itemIds: readonly string[]): Promise<unknown> {
    for (const itemId of itemIds) await this.criarOk(tenantId, itemId, -1);
    return undefined;
  }

  /** R5 — o valor lido ANTES do lock é usado DEPOIS dele. */
  async usaValorPreLock(tenantId: string, movementId: string): Promise<unknown> {
    const identificado = await this.findMovementById(tenantId, movementId);
    if (!identificado) return undefined;
    const lock = await this.lockItemForUpdate(tenantId, identificado.itemId);
    if (!lock) return undefined;
    return this.insertMovement(lock, tenantId, identificado.itemId, -1);
  }
}

/** R6 (B8) — duas escritas de item na MESMA unidade. */
export async function unidadeComDuasEscritas(uow: InventoryUnitOfWork, tenantId: string, itemA: string, itemB: string): Promise<unknown> {
  return uow.run(tenantId, async (ctx) => {
    await ctx.inventory.createMovement(tenantId, itemA, -1);
    await ctx.inventory.createMovement(tenantId, itemB, -1);
    return undefined;
  });
}
`;

// =================================================================================================
// Os casos.
// =================================================================================================

test("D1 — todo escritor de stock_movements (delegate em qualquer forma, escrita aninhada por TIPO, SQL cru) está na allowlist", () => {
  const analysis = analyze();
  const writers = analysis.writers.filter((writer) => writer.model === "StockMovement");
  const unresolved = analysis.writers.filter((writer) => writer.model.startsWith("<"));
  const published = writers.map((writer) => `${writer.file}:${writer.line} (${writer.member ?? "—"}) ${writer.why}`).sort();
  console.log(`[D1] universo de escritores de stock_movements (${writers.length}):\n  ${published.join("\n  ")}`);
  console.log(`[D1] não classificados (têm de ser ZERO): ${unresolved.length}`);

  // Default NEGAR: nada pode ficar "não resolvido" (argumento não literal, chave computada, tabela dinâmica).
  assert.deepEqual(
    unresolved.map((writer) => `${writer.model} ${writer.file}:${writer.line} ${writer.why}`),
    [],
    "sítio que o classificador não resolve = escritor em potencial sem classificação",
  );

  const outside = writers.filter((writer) => writer.file !== INVENTORY_PRISMA && writer.file !== "prisma/seed-fleet.ts");
  assert.deepEqual(outside.map((writer) => `${writer.file}:${writer.line} ${writer.why}`), [], "escritor de stock_movements fora da allowlist");

  const inRepository = writers.filter((writer) => writer.file === INVENTORY_PRISMA);
  assert.deepEqual([...new Set(inRepository.map((writer) => writer.member))], ["insertMovement"], "o único escritor do repositório é insertMovement");
  const inSeed = writers.filter((writer) => writer.file === "prisma/seed-fleet.ts");
  assert.ok(inSeed.length >= 1, "a semente (prisma/seed-fleet.ts) é o outro escritor conhecido");

  // (d) scripts sem checker: texto, fail-closed.
  const scripts = walk("scripts", [".mjs", ".cjs", ".sql"]);
  const suspicious = scripts.filter((file) => {
    const code = read(file).replace(/--[^\n]*/g, "").replace(/\/\/[^\n]*/g, "");
    return new RegExp(SQL_WRITE.replace("TABLE", "stock_movements"), "i").test(code) || /\bstockMovement\b/.test(code);
  });
  assert.deepEqual(suspicious, [], "script sem checker mencionando stock_movements/stockMovement");

  // DETECTOR DE TRAVAMENTO, não orçamento de desempenho (ver `PROGRAM_HANG_TIMEOUT_MS`): o que se
  // afirma aqui é que a análise TERMINA. Quanto ela demorou está na linha `[T-D]` de toda execução.
  assert.ok(
    analysis.ms < PROGRAM_HANG_TIMEOUT_MS,
    `T-D não terminou dentro do detector de travamento: ${analysis.ms} ms de ${PROGRAM_HANG_TIMEOUT_MS} ms`,
  );
});

test("D1′ — o classificador contra as formas do jurado: 18 escritores flagrados em arquivo novo, 4 leituras de controle não", () => {
  const files: Record<string, string> = {};
  for (const [name, body] of Object.entries(D1_WRITERS)) files[`zz-fixture-d1-${name}.ts`] = fixture(body);
  for (const [name, body] of Object.entries(D1_CONTROLS)) files[`zz-fixture-d1-${name}.ts`] = fixture(body);
  const analysis = fixtureAnalysis(files);
  const flagged = new Set(analysis.writers.filter((writer) => writer.model === "StockMovement" || writer.model.startsWith("<")).map((writer) => writer.file));
  console.log(`[D1′] fixture em memória: ${Object.keys(files).length} formas em ${analysis.ms} ms; flagradas: ${[...flagged].sort().join(", ")}`);

  for (const name of Object.keys(D1_WRITERS)) {
    assert.ok(flagged.has(`zz-fixture-d1-${name}.ts`), `forma NÃO flagrada (escritor passaria): ${name}`);
  }
  for (const name of Object.keys(D1_CONTROLS)) {
    assert.equal(flagged.has(`zz-fixture-d1-${name}.ts`), false, `leitura flagrada por engano (falso positivo): ${name}`);
  }
  assert.ok(Object.keys(D1_WRITERS).length >= 18, "as formas do jurado + as grafias conhecidas");
});

test("D2 — R1..R6 sobre PrismaInventoryRepository: universo gerado, 1 lock por transação, nada decide nem sobrevive ao lock", () => {
  const analysis = analyze();
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, INVENTORY_PRISMA));
  assert.ok(sourceFile, "o repositório do estoque está no programa");
  const rules = analyzeRepository(analysis.checker, sourceFile!, "PrismaInventoryRepository", "insertMovement");
  console.log(`[D2] universo W (alcança insertMovement): ${rules.universe.join(", ")}`);
  console.log(`[D2] leituras de identificação: ${rules.identification.join(", ")}`);
  console.log(`[D2] NÃO identificação (motivo): ${rules.notIdentification.join(" · ")}`);

  for (const via of ["createMovement", "createTransfer", "reverseMovement", "createExitForSource", "removeExitForSource"]) {
    assert.ok(rules.universe.includes(via), `via ${via} ausente do universo gerado`);
  }
  assert.deepEqual(rules.violations, {}, "R1–R5 violadas");

  const uow = unitOfWorkViolations(analysis.program, analysis.checker, rules.universe);
  console.log(`[D2] unidades de UoW com mais de uma escrita de item: ${uow.length}`);
  assert.deepEqual(uow, [], "R6: unidade com mais de uma escrita de item (ou escrita em laço)");
});

test("D2′ — as formas do jurado contra as regras: via que decide antes do lock, 2 locks, lock em laço, composição e valor pré-lock ficam VERMELHAS", () => {
  const analysis = fixtureAnalysis({ "zz-fixture-d2.ts": D2_FIXTURE });
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, "zz-fixture-d2.ts"));
  assert.ok(sourceFile, "a fixture do D2′ está no programa");
  const rules = analyzeRepository(analysis.checker, sourceFile!, "ZzFixtureRepository", "insertMovement");
  console.log(`[D2′] violações: ${JSON.stringify(rules.violations, null, 1)}`);

  assert.equal(rules.violations["criarOk"], undefined, "a via CONFORME não pode ser acusada (falso positivo)");
  const expected: Readonly<Record<string, RegExp>> = {
    consumeFastSumByItem: /R2 antes do lock[\s\S]*this\.sumByItem/,
    consumeFastComposto: /R2 antes do lock: this\.saldoComposto/,
    consumeFastListado: /R2 antes do lock: decisão que não é guarda de existência/,
    doisLocks: /R1 locks por transação = 2/,
    lockEmLaco: /R1 lock existe mas não é statement de topo do corpo|R1 locks por transação = 99/,
    adjustMany: /R1 locks por transação = 99/,
    usaValorPreLock: /R5 valor lido ANTES do lock usado depois/,
  };
  for (const [method, pattern] of Object.entries(expected)) {
    const found = (rules.violations[method] ?? []).join(" | ");
    assert.match(found, pattern, `${method}: a regra não pegou a forma do jurado`);
  }

  const uow = unitOfWorkViolations(analysis.program, analysis.checker, ["createMovement"]);
  assert.match(uow.join(" | "), /uow\.run com 2 escrita\(s\) de item/, "R6: a unidade com duas escritas tinha de ser vermelha");
});

test("D3 — o token ItemWriteLock está na assinatura de insertMovement e de toda leitura *Locked", () => {
  const analysis = analyze();
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, INVENTORY_PRISMA))!;
  const declaration = findClass(sourceFile, "PrismaInventoryRepository");
  const methods = declaration.members.filter(ts.isMethodDeclaration);
  const nameOf = (method: ts.MethodDeclaration): string => (ts.isIdentifier(method.name) ? method.name.text : "");
  const hasToken = (method: ts.MethodDeclaration): boolean =>
    method.parameters.some((parameter) => parameter.type !== undefined && /\bItemWriteLock\b/.test(parameter.type.getText()));

  const lockedReaders = methods.filter((method) => nameOf(method).endsWith("Locked"));
  console.log(`[D3] leituras *Locked: ${lockedReaders.map(nameOf).join(", ")}`);
  assert.ok(lockedReaders.length >= 5, "as leituras sob o lock");
  for (const method of [...lockedReaders, methods.find((method) => nameOf(method) === "insertMovement")!]) {
    assert.ok(hasToken(method), `${nameOf(method)}: assinatura sem o token ItemWriteLock`);
  }
  const producer = methods.find((method) => nameOf(method) === "lockItemForUpdate")!;
  assert.ok(
    producer.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword),
    "lockItemForUpdate é o produtor privado do token",
  );
});

test("D4 — o fechamento escreve só por unidades (uow.run), com abortClose no catch e total do finishClose", () => {
  const analysis = analyze();
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, CYCLE_COUNT_SERVICE))!;
  const declaration = findClass(sourceFile, "CycleCountService");
  const close = declaration.members.find((member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === "close")!;
  const text = close.getText();

  const runAt = text.indexOf("this.uow.run(");
  assert.ok(runAt > 0, "close sem uow.run");
  const loopAt = text.search(/\bfor \(/);
  assert.ok(loopAt >= 0 && loopAt < runAt, "a unidade tem de ser UMA por item (uow.run DENTRO do laço)");
  for (const writer of [".createMovement(", ".stampEntry("]) {
    assert.ok(text.indexOf(writer) > runAt, `${writer} tem de estar DENTRO da unidade`);
  }
  for (const outer of ["beginClose(", "finishClose(", "abortClose("]) {
    assert.ok(text.includes(outer), `close não chama ${outer}`);
  }
  assert.equal(text.includes("findItemById("), false, "close não lê avg_cost por item (S-02: o total vem do finishClose)");
  assert.equal(/avgCost/.test(text), false, "close não acumula avgCost");
  const catchClause = /catch \([\s\S]*?abortClose\([\s\S]*?throw error/.test(text);
  assert.ok(catchClause, "o catch do laço chama abortClose (S-01) e propaga o erro original");

  // `applyClose` por AST: declaração ou chamada. Em TEXTO, o próprio comentário que diz que ele morreu
  // deixaria o guard vermelho (e, no ciclo 1, um comentário escondia código real do D1).
  const applyClose: string[] = [];
  for (const file of analysis.program.getSourceFiles()) {
    if (file.isDeclarationFile || posix(file.fileName).includes("node_modules")) continue;
    const visit = (node: ts.Node): void => {
      const named =
        (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isPropertyDeclaration(node)) &&
        node.name !== undefined &&
        ts.isIdentifier(node.name) &&
        node.name.text === "applyClose";
      const called = ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "applyClose";
      if (named || called) applyClose.push(`${relOf(file)}:${lineOf(node)}`);
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  assert.deepEqual(applyClose, [], "applyClose (status sem condição) não existe mais");
});

test("D5 — GLOBAL: todo escritor de CycleCount/CycleCountEntry está no dono, e lá toda transição de status é CAS", () => {
  const analysis = analyze();
  const writers = analysis.writers.filter((writer) => writer.model === "CycleCount" || writer.model === "CycleCountEntry");
  const published = writers.map((writer) => `${writer.model} ${writer.file}:${writer.line} (${writer.member ?? "—"}) ${writer.why}`).sort();
  console.log(`[D5] universo de escritores da contagem (${writers.length}):\n  ${published.join("\n  ")}`);

  const outside = writers.filter((writer) => writer.file !== CYCLE_COUNT_PRISMA);
  assert.deepEqual(outside, [], "escritor de cycle_counts/cycle_count_entries fora do repositório dono");

  // CAS por AST, no dono: todo `cycleCount.update*` tem `status` no `where`.
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, CYCLE_COUNT_PRISMA))!;
  const transitions: string[] = [];
  const entryWrites: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression;
      const receiver = callee.expression;
      const model = ts.isPropertyAccessExpression(receiver) ? receiver.name.text : undefined;
      const argument = node.arguments[0];
      if ((model === "cycleCount" || model === "cycleCountEntry") && /^(update|updateMany|updateManyAndReturn|upsert)$/.test(callee.name.text) && argument && ts.isObjectLiteralExpression(argument)) {
        const where = argument.properties.find(
          (property) => ts.isPropertyAssignment(property) && property.name.getText() === "where",
        ) as ts.PropertyAssignment | undefined;
        const data = argument.properties.find(
          (property) => ts.isPropertyAssignment(property) && property.name.getText() === "data",
        ) as ts.PropertyAssignment | undefined;
        const whereText = where?.initializer.getText() ?? "";
        const member = enclosingMember(node) ?? "—";
        if (model === "cycleCount") {
          assert.match(whereText, /\bstatus:/, `${member}: ${callee.name.text} de cycle_counts sem status no where (não é CAS)`);
          transitions.push(member);
        } else if (/counted_quantity|adjustment_movement_id|variance/.test(data?.initializer.getText() ?? "")) {
          assert.match(whereText, /adjustment_movement_id/, `${member}: escrita em cycle_count_entries sem o predicado do carimbo no where`);
          entryWrites.push(member);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  console.log(`[D5] transições CAS: ${[...new Set(transitions)].sort().join(", ")} · escritas de entrada: ${[...new Set(entryWrites)].sort().join(", ")}`);
  assert.deepEqual([...new Set(transitions)].sort(), ["abortClose", "beginClose", "cancelSession", "finishClose"]);
  assert.deepEqual([...new Set(entryWrites)].sort(), ["recordEntryCount", "stampEntry"]);

  // E nenhum UPDATE cru dessas tabelas em lugar nenhum (o classificador já cobriria, mas o pino é explícito).
  for (const file of [...walk("src", [".ts"]), ...walk("prisma", [".ts"])]) {
    assert.equal(/UPDATE\s+"?cycle_counts"?|UPDATE\s+"?cycle_count_entries"?/i.test(read(file)), false, `${file}: UPDATE cru da contagem`);
  }
});

test("D6 — os catch de V3/V4/V5 classificam pela IDENTIDADE do índice (isUniqueViolationOf), nunca pelo código genérico", () => {
  const analysis = analyze();
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, INVENTORY_PRISMA))!;
  const wrapper = findClass(sourceFile, "RlsPrismaInventoryRepository");
  const inner = findClass(sourceFile, "PrismaInventoryRepository");

  const classified: string[] = [];
  for (const member of wrapper.members) {
    if (!ts.isMethodDeclaration(member) || !ts.isIdentifier(member.name)) continue;
    const name = member.name.text;
    if (!["reverseMovement", "createExitForSource", "removeExitForSource"].includes(name)) continue;
    const text = member.getText();
    assert.match(text, /isUniqueViolationOf\(\s*error,\s*STOCK_MOVEMENT_UNIQUE_INDEXES\.\w+/, `wrapper ${name}: catch sem a identidade do índice`);
    assert.equal(/[^O]isUniqueViolation\(/.test(text), false, `wrapper ${name}: ainda classifica pelo código genérico`);
    classified.push(name);
  }
  console.log(`[D6] wrappers que classificam pela identidade do índice: ${classified.sort().join(", ")}`);
  assert.deepEqual(classified.sort(), ["createExitForSource", "removeExitForSource", "reverseMovement"]);

  // Dentro da transação, nenhum dos dois (o catch lá deixava a transação abortada — 25P02).
  for (const member of inner.members) {
    if (!ts.isMethodDeclaration(member) || !ts.isIdentifier(member.name)) continue;
    const text = member.getText();
    if (!/this\.insertMovement\(/.test(text)) continue;
    assert.equal(/isUniqueViolation(Of)?\(/.test(text), false, `${member.name.text}: catch de violação DENTRO da transação (25P02)`);
  }

  // A tabela de índices é pinada ao catálogo pelo C9 (T-C) — aqui só a forma.
  const source = read(INVENTORY_PRISMA);
  for (const index of ["stock_movements_reversal_active_key", "stock_movements_source_active_key", "stock_movements_cycle_count_item_key"]) {
    assert.ok(source.includes(index), `STOCK_MOVEMENT_UNIQUE_INDEXES sem ${index}`);
  }
});

test("D7 — toda porta pública dos wrappers RLS e a porta de UoW passam pelo mapeamento de falha transitória (503)", () => {
  const analysis = analyze();
  for (const [file, className] of [
    [INVENTORY_PRISMA, "RlsPrismaInventoryRepository"],
    [CYCLE_COUNT_PRISMA, "RlsPrismaCycleCountRepository"],
  ] as const) {
    const declaration = findClass(analysis.program.getSourceFile(path.join(ROOT, file))!, className);
    const methods = declaration.members.filter(ts.isMethodDeclaration).filter((method) => ts.isIdentifier(method.name));
    const isPrivate = (method: ts.MethodDeclaration): boolean =>
      Boolean(method.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword));
    const publicMethods = methods.filter((method) => !isPrivate(method));
    const missing = publicMethods.filter((method) => !/this\.tx\(/.test(method.getText())).map((method) => (method.name as ts.Identifier).text);
    console.log(`[D7] ${className}: ${publicMethods.length - missing.length}/${publicMethods.length} portas públicas por this.tx`);
    assert.deepEqual(missing, [], `${className}: porta pública sem this.tx (sem o mapeamento 503)`);

    const tx = methods.find((method) => (method.name as ts.Identifier).text === "tx")!;
    assert.ok(isPrivate(tx), `${className}: tx privado`);
    assert.match(tx.getText(), /mapTransientDbFailure\(/, `${className}.tx sem mapTransientDbFailure`);
    const rawCalls = methods
      .filter((method) => (method.name as ts.Identifier).text !== "tx" && /withTenantRls\(/.test(method.getText()))
      .map((method) => (method.name as ts.Identifier).text);
    assert.deepEqual(rawCalls, [], `${className}: withTenantRls fora de tx`);
  }

  const uow = findClass(analysis.program.getSourceFile(path.join(ROOT, UOW_PRISMA))!, "PrismaInventoryUnitOfWork");
  const run = uow.members.find((member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === "run")!;
  assert.match(run.getText(), /mapTransientDbFailure\(/, "PrismaInventoryUnitOfWork.run sem o mapeamento 503");
});

test("D8 — a sobreposição da I9 é DERIVADA da classificação de status, e nenhuma cópia dela vive fora de cycle-count.types.ts", () => {
  const analysis = analyze();
  const sourceFile = analysis.program.getSourceFile(path.join(ROOT, CYCLE_COUNT_PRISMA))!;
  const declaration = findClass(sourceFile, "PrismaCycleCountRepository");
  const createSession = declaration.members.find(
    (member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === "createSession",
  )! as ts.MethodDeclaration;

  // (a) o lock da linha do tenant antes do create; a sobreposição entre eles.
  const text = createSession.getText();
  const createAt = text.indexOf("cycleCount.create(");
  const tenantLockAt = text.search(/FROM "tenants"[^`]*FOR NO KEY UPDATE/);
  assert.ok(tenantLockAt >= 0 && tenantLockAt < createAt, "lock NO KEY UPDATE da linha do tenant antes do create");
  assert.equal(
    /FROM "?tenants"?[^`]*FOR UPDATE/.test(text.replace(/FOR NO KEY UPDATE/g, "")),
    false,
    "FOR UPDATE na linha do tenant conflitaria com todo INSERT do tenant (KEY SHARE)",
  );

  // (b) o predicado da sobreposição é o lado FECHADO e vem da tabela de classificação — nenhum literal.
  const templates: ts.TemplateLiteral[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isTaggedTemplateExpression(node)) templates.push(node.template);
    ts.forEachChild(node, visit);
  };
  visit(createSession);
  const overlap = templates.find((template) => /cycle_count_entries/.test(template.getText()));
  assert.ok(overlap, "createSession sem a consulta de sobreposição (I9)");
  assert.match(overlap!.getText(), /status NOT IN \(/, "a sobreposição tem de ser pelo lado FECHADO (NOT IN terminais)");
  assert.match(overlap!.getText(), /TERMINAL_CYCLE_COUNT_STATUSES/, "a lista de terminais tem de vir da classificação, não de literais");
  const overlapAt = text.indexOf(overlap!.getText());
  assert.ok(overlapAt >= 0 && overlapAt < createAt, "a sobreposição é lida ANTES do create");
  assert.ok(tenantLockAt < overlapAt, "a sobreposição é lida DEPOIS do lock do tenant");
  for (const template of templates) {
    assert.equal(
      /'(aberta|fechando|concluida|cancelada)'/.test(template.getText()),
      false,
      `literal de status dentro de SQL em createSession: ${template.getText().slice(0, 80)}`,
    );
  }

  // (c) a classificação é UMA: nenhuma CÓPIA da partição terminal/não-terminal vive fora de
  //     cycle-count.types.ts. CÓPIA = qualquer CONSTRUTO QUE AGRUPE ≥ 2 status distintos num só lugar:
  //     a cadeia `&&`/`||`, o LITERAL DE ARRANJO (que é como um `new Set([...])`/`[...].includes(...)`
  //     nasce), o UNIVERSO de um template de SQL e a UNIÃO DE TIPOS. A regra não é "nenhum literal de
  //     status": a máquina de estados legítima (`aberta` → `fechando` → `concluida`) usa um literal por
  //     vez, em propriedades diferentes de um CAS — isso continua permitido, e só isso.
  //     Por que a forma importa: a versão anterior desta alínea só olhava `&&`/`||` e deixava passar
  //     `new Set(["aberta", "fechando"])` de volta na memória — medido pelo dev do ciclo 2, VERDE. Era a
  //     mesma falha que o C2-03 acusou (allowlist com um lado de fora) reintroduzida dentro do conserto dela.
  const STATUS = /"(aberta|fechando|concluida|cancelada)"/g;
  const agrupa = (node: ts.Node): boolean =>
    (ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken)) ||
    ts.isArrayLiteralExpression(node) ||
    ts.isUnionTypeNode(node) ||
    ts.isTemplateExpression(node) ||
    ts.isNoSubstitutionTemplateLiteral(node);
  for (const file of [CYCLE_COUNT_MEMORY, CYCLE_COUNT_SERVICE, CYCLE_COUNT_PRISMA]) {
    const checked = analysis.program.getSourceFile(path.join(ROOT, file))!;
    const pairs: string[] = [];
    const visitPairs = (node: ts.Node): void => {
      if (agrupa(node)) {
        const literals = new Set(node.getText().match(STATUS) ?? []);
        if (literals.size >= 2) pairs.push(`${file}:${lineOf(node)} ${node.getText().replace(/\s+/g, " ").slice(0, 70)}`);
      }
      ts.forEachChild(node, visitPairs);
    };
    visitPairs(checked);
    assert.deepEqual(pairs, [], "cópia da classificação de status fora de cycle-count.types.ts");
  }
  const types = read(CYCLE_COUNT_TYPES);
  assert.match(types, /satisfies Record<CycleCountStatus, "terminal" \| "non_terminal">/, "a tabela de classificação é exaustiva por construção");
  assert.match(types, /TERMINAL_CYCLE_COUNT_STATUSES = CYCLE_COUNT_STATUSES\.filter/, "os terminais são DERIVADOS da tabela");
  assert.match(types, /WRITABLE_CYCLE_COUNT_STATUSES = CYCLE_COUNT_STATUSES\.filter/, "os escrevíveis são DERIVADOS da tabela");
});

test("D9 — nenhuma suíte -db do bloco faz DDL fora do drill em base própria", () => {
  const suites = readdirSync(path.join(ROOT, "tests")).filter(
    (name) => /^inventory-.*-db\.test\.ts$/.test(name) && name !== "inventory-migration-drill-db.test.ts",
  );
  console.log(`[D9] suítes -db do bloco sem DDL: ${suites.join(", ")}`);
  assert.ok(suites.length >= 3, "as três suítes -db de base compartilhada");
  for (const suite of suites) {
    const text = read(`tests/${suite}`);
    assert.equal(/DROP\s+INDEX|CREATE\s+(UNIQUE\s+)?INDEX|ALTER\s+TABLE/i.test(text), false, `${suite} faz DDL na base compartilhada`);
  }
});
