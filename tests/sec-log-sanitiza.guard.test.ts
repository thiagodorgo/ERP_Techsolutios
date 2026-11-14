// B-SEC-LOG-SANITIZA — as travas (G1 a G4) e a prova de que elas mordem (GF1 a GF4).
//
// A regra de cada trava enuncia a PROPRIEDADE, não a forma (plano v2 §3.3 e Emenda 1 §E3):
// - G1: ninguém fora da fábrica (`src/infra/logging/logger.ts`) alcança o `pino`: nem por import de valor, nem por
//   `require`/`import()` (literal ou não), nem por `createRequire`, nem por chamada cuja assinatura resolvida é a do
//   `pino` (pega o reexport).
// - G2: todo `pino-http` recebe um logger da fábrica: o import de valor só em 2 lugares, e toda chamada com um objeto
//   literal que tem `logger` definido, sem spread depois.
// - G3: nada em `src/` escreve fora do logger: nenhuma referência de VALOR ao `console` global nem a `process.stdout`,
//   `process.stderr`, `process.emitWarning`, `process._rawDebug` ou `process.mainModule`, por nome, por alias, por
//   desestruturação ou por chave literal (regra por símbolo resolvido); nenhum acesso por chave que só se conhece em
//   execução sobre `globalThis`, `global` ou `process`; nenhum import de `console`/`node:console`. Posição de tipo é
//   permitida.
// - G4 (por execução): a última camada de `createApp` e de `createPortalApp` é o `finalErrorHandler`, de 4 argumentos.
//
// As fixtures (`tests/fixtures/sec-log-guard/`) são as do plano: 35 formas que a trava tem de reprovar e 5 controles que
// ela tem de deixar passar. O escape declarado (`Reflect.get(globalThis, "console")`, E-13) NÃO está entre elas.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = path.join(RAIZ, "tests", "fixtures", "sec-log-guard");
const FABRICA = "src/infra/logging/logger.ts";
const PINO_HTTP_PERMITIDO: ReadonlySet<string> = new Set([FABRICA, "src/integrations/traccar/traccar-ingest.logger.ts"]);
const PROPRIEDADES_DE_SAIDA: ReadonlySet<string> = new Set(["stdout", "stderr", "emitWarning", "_rawDebug", "mainModule"]);

type Violacao = { readonly regra: string; readonly arquivo: string; readonly linha: number; readonly detalhe: string };

const normalizar = (arquivo: string) => arquivo.split(path.sep).join("/");

function opcoesDoRepo(): { readonly arquivos: string[]; readonly opcoes: ts.CompilerOptions } {
  const lido = ts.readConfigFile(path.join(RAIZ, "tsconfig.json"), (arquivo) => ts.sys.readFile(arquivo));
  assert.equal(lido.error, undefined, "tsconfig.json ilegível");
  const config = ts.parseJsonConfigFileContent(lido.config, ts.sys, RAIZ);
  return { arquivos: config.fileNames, opcoes: config.options };
}

const ePino = (modulo: string) => modulo === "pino" || modulo.startsWith("pino/");
const ePinoHttp = (modulo: string) => modulo === "pino-http" || modulo.startsWith("pino-http/");
const eConsole = (modulo: string) => modulo === "console" || modulo === "node:console";

function importaValor(declaracao: ts.ImportDeclaration): boolean {
  const clausula = declaracao.importClause;
  if (!clausula) return true;
  if (clausula.isTypeOnly) return false;
  if (clausula.name) return true;
  const ligacoes = clausula.namedBindings;
  if (!ligacoes) return false;
  if (ts.isNamespaceImport(ligacoes)) return true;
  return ligacoes.elements.some((elemento) => !elemento.isTypeOnly);
}

function emPosicaoDeTipo(no: ts.Node): boolean {
  for (let pai = no.parent; pai; pai = pai.parent) {
    if (pai.kind >= ts.SyntaxKind.FirstTypeNode && pai.kind <= ts.SyntaxKind.LastTypeNode) return true;
    if (ts.isExpressionWithTypeArguments(pai) && ts.isHeritageClause(pai.parent)) return true;
    if (ts.isStatement(pai)) return false;
  }
  return false;
}

/** Analisa os arquivos com o checker do TypeScript. `relativo` dá o nome que vai na violação. */
function analisar(arquivos: readonly string[], opcoes: ts.CompilerOptions, emSrc: boolean): Violacao[] {
  const programa = ts.createProgram(arquivos, { ...opcoes, noEmit: true });
  const checker = programa.getTypeChecker();
  const violacoes: Violacao[] = [];

  const declaradoNoNode = (simbolo: ts.Symbol) =>
    (simbolo.declarations ?? []).some((d) => normalizar(d.getSourceFile().fileName).includes("/node_modules/@types/node/"));

  function resolver(simbolo: ts.Symbol | undefined): ts.Symbol | undefined {
    if (simbolo && simbolo.flags & ts.SymbolFlags.Alias) {
      try {
        return checker.getAliasedSymbol(simbolo);
      } catch {
        return simbolo;
      }
    }
    return simbolo;
  }

  /** O que o símbolo alcança, se for uma saída proibida (G3s) ou o `createRequire` (G1c). */
  function saidaProibida(simboloBruto: ts.Symbol | undefined): string | undefined {
    const simbolo = resolver(simboloBruto);
    if (!simbolo || !declaradoNoNode(simbolo)) return undefined;
    for (const declaracao of simbolo.declarations ?? []) {
      if (!normalizar(declaracao.getSourceFile().fileName).includes("/node_modules/@types/node/")) continue;
      if (simbolo.name === "console" && ts.isVariableDeclaration(declaracao)) return "G3s:console";
      if (
        PROPRIEDADES_DE_SAIDA.has(simbolo.name) &&
        declaracao.parent &&
        ts.isInterfaceDeclaration(declaracao.parent) &&
        declaracao.parent.name.text === "Process"
      ) {
        return `G3s:process.${simbolo.name}`;
      }
      if (simbolo.name === "createRequire") return "G1c:createRequire";
    }
    return undefined;
  }

  function baseSensivel(expressao: ts.Expression): string | undefined {
    let atual: ts.Expression = expressao;
    while (
      ts.isParenthesizedExpression(atual) ||
      ts.isAsExpression(atual) ||
      ts.isNonNullExpression(atual) ||
      ts.isTypeAssertionExpression(atual) ||
      ts.isSatisfiesExpression(atual)
    ) {
      atual = atual.expression;
    }
    if (!ts.isIdentifier(atual)) return undefined;
    if (atual.text === "globalThis") return "globalThis";
    const simbolo = resolver(checker.getSymbolAtLocation(atual));
    if (simbolo && declaradoNoNode(simbolo) && (simbolo.name === "process" || simbolo.name === "global")) return simbolo.name;
    return undefined;
  }

  function tipoRuimDeLogger(no: ts.Expression): boolean {
    const tipo = checker.getTypeAtLocation(no);
    const partes = tipo.isUnion() ? tipo.types : [tipo];
    const ruins = ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Void;
    return partes.some((parte) => (parte.flags & ruins) !== 0);
  }

  for (const fonte of programa.getSourceFiles()) {
    if (fonte.isDeclarationFile) continue;
    const relativo = normalizar(path.relative(RAIZ, fonte.fileName));
    if (emSrc ? !relativo.startsWith("src/") : !relativo.startsWith("tests/fixtures/sec-log-guard/")) continue;
    const arquivo = emSrc ? relativo : path.basename(relativo);
    const naFabrica = emSrc && relativo === FABRICA;
    const pinoHttpPermitido = emSrc && PINO_HTTP_PERMITIDO.has(relativo);
    const registra = (regra: string, no: ts.Node, detalhe: string) =>
      violacoes.push({ regra, arquivo, linha: fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1, detalhe });

    const visitar = (no: ts.Node): void => {
      // G1a, G2a, G3 (módulo console): import e export de valor.
      if ((ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) {
        const modulo = no.moduleSpecifier.text;
        const valor = ts.isImportDeclaration(no) ? importaValor(no) : !no.isTypeOnly;
        if (valor && ePino(modulo) && !naFabrica) registra("G1a", no, `import de valor de ${modulo}`);
        if (valor && ePinoHttp(modulo) && !pinoHttpPermitido) registra("G2a", no, `import de valor de ${modulo}`);
        if (valor && eConsole(modulo)) registra("G3", no, `import de ${modulo}`);
      }

      if (ts.isCallExpression(no)) {
        const chamado = no.expression;
        const dinamico = chamado.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(chamado) && chamado.text === "require");
        if (dinamico) {
          const argumento = no.arguments[0];
          if (!argumento || !ts.isStringLiteralLike(argumento)) registra("G1a", no, "require/import() com argumento não literal");
          else {
            if (ePino(argumento.text) && !naFabrica) registra("G1a", no, `carga de ${argumento.text}`);
            if (ePinoHttp(argumento.text) && !pinoHttpPermitido) registra("G2a", no, `carga de ${argumento.text}`);
            if (eConsole(argumento.text)) registra("G3", no, `carga de ${argumento.text}`);
          }
        }
        const assinatura = checker.getResolvedSignature(no);
        const declaracao = assinatura?.declaration;
        const arquivoDaDeclaracao = declaracao ? normalizar(declaracao.getSourceFile().fileName) : "";
        if (
          !naFabrica &&
          declaracao &&
          arquivoDaDeclaracao.endsWith("/node_modules/pino/pino.d.ts") &&
          "name" in declaracao &&
          declaracao.name !== undefined &&
          (declaracao.name as ts.Node).getText() === "pino"
        ) {
          registra("G1b", no, "chamada com a assinatura do pino");
        }
        if (arquivoDaDeclaracao.includes("/node_modules/pino-http/")) {
          const opcoes = no.arguments[0];
          let ok = false;
          if (opcoes && ts.isObjectLiteralExpression(opcoes)) {
            const indice = opcoes.properties.findIndex(
              (p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText() === "logger",
            );
            if (indice >= 0) {
              const propriedade = opcoes.properties[indice];
              const valor = ts.isPropertyAssignment(propriedade) ? propriedade.initializer : (propriedade as ts.ShorthandPropertyAssignment).name;
              const spreadDepois = opcoes.properties.slice(indice + 1).some((p) => ts.isSpreadAssignment(p));
              ok = !spreadDepois && !tipoRuimDeLogger(valor);
            }
          }
          if (!ok) registra("G2b", no, "pino-http sem logger da fábrica");
        }
      }

      // G3, a forma: o identificador `console` em posição de valor e o texto `process.stdout|stderr`.
      if (ts.isIdentifier(no) && no.text === "console") {
        const pai = no.parent;
        let valor = true;
        if (ts.isTypeReferenceNode(pai) || ts.isTypeQueryNode(pai) || ts.isQualifiedName(pai)) valor = false;
        if (ts.isPropertyAccessExpression(pai) && pai.name === no) {
          valor = ["globalThis", "global", "window", "self"].includes(pai.expression.getText());
        }
        if (
          (ts.isPropertyAssignment(pai) || ts.isPropertySignature(pai) || ts.isPropertyDeclaration(pai) || ts.isParameter(pai) || ts.isVariableDeclaration(pai)) &&
          pai.name === no
        ) {
          valor = false;
        }
        if (valor && !emPosicaoDeTipo(no)) registra("G3", no, "referência de valor ao console");
      }
      if (
        ts.isPropertyAccessExpression(no) &&
        no.expression.getText() === "process" &&
        (no.name.text === "stdout" || no.name.text === "stderr") &&
        !emPosicaoDeTipo(no)
      ) {
        registra("G3", no, `process.${no.name.text}`);
      }

      // G3s e G1c, por símbolo resolvido.
      if (ts.isIdentifier(no) && !emPosicaoDeTipo(no)) {
        const achado = saidaProibida(checker.getSymbolAtLocation(no));
        if (achado) registra(achado.split(":")[0], no, achado);
      }
      if (ts.isElementAccessExpression(no) && !emPosicaoDeTipo(no)) {
        if (ts.isStringLiteralLike(no.argumentExpression)) {
          const achado = saidaProibida(checker.getSymbolAtLocation(no.argumentExpression));
          if (achado) registra(achado.split(":")[0], no, achado);
        } else {
          const base = baseSensivel(no.expression);
          if (base) registra("G3e", no, `chave não literal sobre ${base}`);
        }
      }
      if (ts.isBindingElement(no) && ts.isObjectBindingPattern(no.parent)) {
        const nome = (no.propertyName ?? no.name).getText();
        const propriedade = checker.getTypeAtLocation(no.parent).getProperty(nome);
        const achado = saidaProibida(propriedade);
        if (achado) registra(achado.split(":")[0], no, achado);
      }

      ts.forEachChild(no, visitar);
    };
    visitar(fonte);
  }
  return violacoes;
}

const { arquivos: ARQUIVOS_DO_REPO, opcoes: OPCOES_DO_REPO } = opcoesDoRepo();
const VIOLACOES_SRC = analisar(ARQUIVOS_DO_REPO, OPCOES_DO_REPO, true);

const ARQUIVOS_DAS_FIXTURES = fs
  .readdirSync(FIXTURES)
  .filter((nome) => nome.endsWith(".ts"))
  .map((nome) => path.join(FIXTURES, nome));
const VIOLACOES_FIXTURES = analisar(ARQUIVOS_DAS_FIXTURES, { ...OPCOES_DO_REPO, rootDir: undefined }, false);

function daRegra(violacoes: readonly Violacao[], prefixos: readonly string[]): Violacao[] {
  return violacoes.filter((v) => prefixos.some((prefixo) => v.regra === prefixo));
}

function conferirFixtures(nomes: readonly string[], regras: readonly string[]) {
  const existentes = new Set(ARQUIVOS_DAS_FIXTURES.map((arquivo) => path.basename(arquivo)));
  const semArquivo = nomes.filter((nome) => !existentes.has(nome));
  assert.deepEqual(semArquivo, [], "fixtures que não existem");
  const acusadas = new Set(daRegra(VIOLACOES_FIXTURES, regras).map((v) => v.arquivo));
  const passaram = nomes.filter((nome) => !acusadas.has(nome));
  assert.deepEqual(passaram, [], `formas que a trava deixou passar (regras ${regras.join(", ")})`);
}

// =====================================================================================================================

test("G1 ninguém fora da fábrica alcança o pino (import, require/import(), createRequire, assinatura)", () => {
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G1a", "G1b", "G1c"]), []);
});

test("G2 todo pino-http recebe um logger da fábrica (lugar do import e forma da chamada)", () => {
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G2a", "G2b"]), []);
});

test("G3 nada em src/ escreve fora do logger (console, saída padrão, por forma e por símbolo)", () => {
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G3", "G3s", "G3e"]), []);
});

test("G4 a última camada de createApp e de createPortalApp é o finalErrorHandler, de 4 argumentos", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, { createPortalApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/portal-app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);
  type Camada = { readonly handle: { readonly length: number; readonly name: string } };
  const ultima = (app: unknown) => {
    const pilha = (app as { router: { stack: readonly Camada[] } }).router.stack;
    const camada = pilha[pilha.length - 1];
    return { aridade: camada.handle.length, nome: camada.handle.name };
  };
  const esperado = { aridade: 4, nome: "finalErrorHandler" };
  assert.deepEqual(ultima(createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())))), esperado);
  assert.deepEqual(ultima(createPortalApp()), esperado);
});

// GF — a trava morde. Cada forma do plano tem de ser acusada; cada controle, não.

test("GF1 as 11 formas de G1 são acusadas", () => {
  conferirFixtures(
    [
      "v_a_m2.ts",
      "v_b_alias_var.ts",
      "v_c_dynamic.ts",
      "v_d_named.ts",
      "v_e_ns.ts",
      "v_k_require.ts",
      "v_l_import_nao_literal.ts",
      "v_p1_reexporta.ts",
      "v_p2_chama_reexport.ts",
      "n01_createrequire_pino.ts",
      "p05_namespace_module.ts",
      "p06_mainmodule.ts",
    ],
    ["G1a", "G1b", "G1c", "G3s"],
  );
});

test("GF2 as 4 formas de G2 são acusadas", () => {
  conferirFixtures(["v_f_pinohttp_undef.ts", "v_q_spread_depois.ts", "v_r_opcoes_nao_literais.ts", "v_s_logger_talvez.ts"], ["G2a", "G2b"]);
});

test("GF3 as 19 formas de G3 são acusadas", () => {
  conferirFixtures(
    [
      "v_g_console_var.ts",
      "v_h_console_arg.ts",
      "v_i_console_direct.ts",
      "v_j_class_field.ts",
      "v_m_globalthis_console.ts",
      "v_n_stdout_write.ts",
      "v_o_node_console.ts",
      "n02_createrequire_console.ts",
      "n03_destructure_stderr.ts",
      "n04_import_node_process.ts",
      "n05_globalthis_process.ts",
      "n06_globalthis_elemento.ts",
      "n07_globalthis_parenteses.ts",
      "n08_emitwarning.ts",
      "p01_globalthis_nao_literal.ts",
      "p02_alias_process.ts",
      "p03_destructure_globalthis.ts",
      "p04_default_import_process.ts",
      "p08_globalthis_elem_naoliteral_puro.ts",
    ],
    ["G3", "G3s", "G3e", "G1c"],
  );
});

test("GF4 os 5 controles verdes dão 0 violação", () => {
  const controles = [
    "v_t_VERDE_so_tipo.ts",
    "v_u_VERDE_tipo_console.ts",
    "v_v_VERDE_tipo_inline.ts",
    "c01_controle_tipo.ts",
    "c02_controle_process_env.ts",
  ];
  const existentes = new Set(ARQUIVOS_DAS_FIXTURES.map((arquivo) => path.basename(arquivo)));
  assert.deepEqual(controles.filter((nome) => !existentes.has(nome)), [], "controles que não existem");
  assert.deepEqual(
    VIOLACOES_FIXTURES.filter((v) => controles.includes(v.arquivo)),
    [],
  );
  assert.equal(ARQUIVOS_DAS_FIXTURES.length, 40, "as fixtures são 40 (35 formas e 5 controles)");
});
