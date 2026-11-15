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
// - G1u/G3u (J-571, C3-A1), fail-closed: o símbolo que o checker NÃO resolve (tipo apagado por `any`, `unknown` e cast)
//   com forma de saída (`console`, `stdout`, `stderr`, `emitWarning`, `_rawDebug`, `mainModule`, `createRequire`, ou a
//   carga de `pino`/`pino-http`/`console` por chamada não tipada) é reprovado, salvo em `EXCECOES_NAO_RESOLVIDO`, que é
//   explícita e vazia. A forma sobre um objeto global atravessa parênteses e casts. Também caem: `tty.WriteStream`, a
//   reflexão (`Reflect.*`, `Object.*`) sobre um objeto global e a escrita por descritor do `node:fs`.
// - G4 (por execução): a última camada de `createApp` e de `createPortalApp` é o `finalErrorHandler`, de 4 argumentos.
// - G4e (J-571, C3-A2), pela propriedade: TODO `express()` de `src/` (assinatura resolvida no `@types/express`) vai
//   para uma variável, e a função dele termina com `installFinalErrorHandler(<app>, …); return <app>;`.
//
// As fixtures (`tests/fixtures/sec-log-guard/`): as 35 formas do plano e as 9 da J-571 (as 8 da C3 e o app sem o
// tratador final), que a trava tem de reprovar, e 6 controles que ela tem de deixar passar.
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
/** J-571 (C3-A1): o nome de membro que, com o símbolo não resolvido, conta como saída. */
const NOMES_DE_SAIDA: ReadonlySet<string> = new Set(["console", ...PROPRIEDADES_DE_SAIDA, "createRequire"]);
const OBJETOS_GLOBAIS: ReadonlySet<string> = new Set(["globalThis", "global", "window", "self"]);
/** J-571 (C3-A1): a escrita do `node:fs` que recebe um descritor (1 e 2 são a saída padrão). */
const ESCRITA_POR_DESCRITOR: ReadonlySet<string> = new Set(["write", "writeSync", "writev", "writevSync"]);
const ESCRITA_DE_ARQUIVO: ReadonlySet<string> = new Set(["writeFile", "writeFileSync", "appendFile", "appendFileSync"]);
/**
 * J-571 (C3-A1): exceções às regras de símbolo não resolvido, por `arquivo:linha:regra`. É explícita e VAZIA: uma
 * entrada aqui muda o teste G3 e aparece no diff.
 */
const EXCECOES_NAO_RESOLVIDO: ReadonlySet<string> = new Set<string>([]);
const INSTALADOR_DO_TRATADOR = "src/infra/http/final-error-handler.ts";
/**
 * Emenda 1.7 (J-571, C3-A2): os apps Express que NÃO terminam com `installFinalErrorHandler`, por `arquivo#função`, com
 * o motivo. A lista é FECHADA: uma entrada sem app em `src/` (ou cujo app já tem o tratador final) fica vermelha, e o
 * comportamento de cada entrada tem prova própria (`tests/sec-log-traccar-tratador.test.ts`).
 */
const EXCECOES_G4E: ReadonlyMap<string, string> = new Map([
  [
    "src/integrations/traccar/traccar-ingest.app.ts#createTraccarIngestApp",
    "tratador próprio de 4 argumentos do #454: responde só o código e loga só o código",
  ],
]);

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

/** Tira parênteses, casts, `!` e `satisfies`: `(globalThis as any)` é `globalThis`. */
function semCasca(expressao: ts.Expression): ts.Expression {
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
  return atual;
}

type AppExpress = { readonly chave: string; readonly local: string; readonly comTratadorFinal: boolean };
type Analise = { readonly violacoes: Violacao[]; readonly apps: AppExpress[] };

/** Analisa os arquivos com o checker do TypeScript. `relativo` dá o nome que vai na violação. */
function analisar(arquivos: readonly string[], opcoes: ts.CompilerOptions, emSrc: boolean): Analise {
  const programa = ts.createProgram(arquivos, { ...opcoes, noEmit: true });
  const checker = programa.getTypeChecker();
  const violacoes: Violacao[] = [];
  const apps: AppExpress[] = [];

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
      // J-571 (C3-A1, forma f): o `tty.WriteStream` abre a saída padrão pelo descritor.
      if (
        simbolo.name === "WriteStream" &&
        normalizar(declaracao.getSourceFile().fileName).endsWith("/node_modules/@types/node/tty.d.ts")
      ) {
        return "G3s:tty.WriteStream";
      }
    }
    return undefined;
  }

  /** O objeto global que a expressão é, atravessando parênteses e casts: `globalThis`, `global`, `window`, `self` ou `process`. */
  function baseSensivel(expressao: ts.Expression): string | undefined {
    const atual = semCasca(expressao);
    if (!ts.isIdentifier(atual)) return undefined;
    if (atual.text === "globalThis") return "globalThis";
    const simbolo = resolver(checker.getSymbolAtLocation(atual));
    // `window` e `self` só contam quando não são uma variável do próprio código (sem símbolo, ou declarados num `.d.ts`).
    if (
      (atual.text === "window" || atual.text === "self") &&
      (!simbolo || (simbolo.declarations ?? []).every((d) => d.getSourceFile().isDeclarationFile))
    ) {
      return atual.text;
    }
    if (simbolo && declaradoNoNode(simbolo) && (simbolo.name === "process" || simbolo.name === "global")) return simbolo.name;
    return undefined;
  }

  /** A declaração da assinatura resolvida da chamada, ou `undefined` quando o chamado não tem tipo (`any`). */
  function declaracaoDaChamada(no: ts.CallLikeExpression): ts.Declaration | undefined {
    return checker.getResolvedSignature(no)?.declaration ?? undefined;
  }

  const nomeDaDeclaracao = (declaracao: ts.Declaration | undefined): string =>
    declaracao && "name" in declaracao && declaracao.name !== undefined ? (declaracao.name as ts.Node).getText() : "";

  /** O nome da função que contém o nó: a declaração, a variável que recebe a arrow/expressão, ou o método. */
  function nomeDaFuncao(no: ts.Node): string {
    for (let atual: ts.Node | undefined = no.parent; atual; atual = atual.parent) {
      if (!ts.isFunctionLike(atual)) continue;
      if ((ts.isFunctionDeclaration(atual) || ts.isMethodDeclaration(atual) || ts.isFunctionExpression(atual)) && atual.name) {
        return atual.name.getText();
      }
      if (ts.isVariableDeclaration(atual.parent) && ts.isIdentifier(atual.parent.name)) return atual.parent.name.text;
      return "<anônima>";
    }
    return "<topo>";
  }

  /** G4e: o `express()` vai para uma variável, e a função termina com `installFinalErrorHandler(<app>, …); return <app>;`. */
  function temTratadorFinal(chamada: ts.CallExpression): boolean {
    const declaracaoDoApp = chamada.parent;
    if (!ts.isVariableDeclaration(declaracaoDoApp) || !ts.isIdentifier(declaracaoDoApp.name)) return false;
    const simboloDoApp = checker.getSymbolAtLocation(declaracaoDoApp.name);
    let corpo: ts.Node | undefined = declaracaoDoApp;
    while (corpo && !(ts.isBlock(corpo) && corpo.parent && ts.isFunctionLike(corpo.parent))) corpo = corpo.parent;
    if (!corpo || !ts.isBlock(corpo)) return false;
    const eOApp = (expressao: ts.Expression | undefined) =>
      expressao !== undefined && ts.isIdentifier(expressao) && checker.getSymbolAtLocation(expressao) === simboloDoApp;
    const instrucoes = corpo.statements;
    const indiceDoReturn = instrucoes.findIndex((instrucao) => ts.isReturnStatement(instrucao) && eOApp(instrucao.expression));
    if (indiceDoReturn < 1 || indiceDoReturn !== instrucoes.length - 1) return false;
    const anterior = instrucoes[indiceDoReturn - 1];
    if (!ts.isExpressionStatement(anterior) || !ts.isCallExpression(anterior.expression)) return false;
    const instalacao = anterior.expression;
    const declaracao = declaracaoDaChamada(instalacao);
    return (
      declaracao !== undefined &&
      normalizar(declaracao.getSourceFile().fileName).endsWith(`/${INSTALADOR_DO_TRATADOR}`) &&
      nomeDaDeclaracao(declaracao) === "installFinalErrorHandler" &&
      eOApp(instalacao.arguments[0])
    );
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
    const registra = (regra: string, no: ts.Node, detalhe: string) => {
      const linha = fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1;
      if ((regra === "G1u" || regra === "G3u") && EXCECOES_NAO_RESOLVIDO.has(`${arquivo}:${linha}:${regra}`)) return;
      violacoes.push({ regra, arquivo, linha, detalhe });
    };
    /** J-571 (C3-A1): membro de saída cujo símbolo o checker não resolve (o tipo foi apagado). */
    const membroNaoResolvido = (no: ts.Node, nome: string, simbolo: ts.Symbol | undefined) => {
      if (!NOMES_DE_SAIDA.has(nome) || simbolo !== undefined || emPosicaoDeTipo(no)) return;
      registra(nome === "createRequire" ? "G1u" : "G3u", no, `símbolo não resolvido com forma de saída: ${nome}`);
    };
    /** J-571 (C3-A1): o membro de saída sobre um objeto global, atravessando parênteses e casts. */
    const membroDeObjetoGlobal = (no: ts.Node, base: ts.Expression, nome: string) => {
      if (emPosicaoDeTipo(no)) return;
      const objeto = baseSensivel(base);
      if (!objeto) return;
      if (nome === "console" && objeto !== "process") registra("G3", no, `${objeto}.console`);
      if (PROPRIEDADES_DE_SAIDA.has(nome) && objeto === "process") registra("G3", no, `process.${nome}`);
    };

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
        // J-571 (C3-A1): carga de pino, pino-http ou console por uma chamada cujo chamado não tem tipo.
        if (!declaracao && !dinamico) {
          const argumento = no.arguments[0];
          if (argumento && ts.isStringLiteralLike(argumento) && (ePino(argumento.text) || ePinoHttp(argumento.text) || eConsole(argumento.text))) {
            registra("G1u", no, `carga de ${argumento.text} por chamada não tipada`);
          }
        }
        // J-571 (C3-A1, forma g): reflexão (`Reflect.*`, `Object.*`) que recebe um objeto global.
        if (ts.isPropertyAccessExpression(chamado) && ts.isIdentifier(chamado.expression)) {
          const dono = chamado.expression.text;
          const simboloDoDono = resolver(checker.getSymbolAtLocation(chamado.expression));
          const doLib = simboloDoDono !== undefined && (simboloDoDono.declarations ?? []).every((d) => d.getSourceFile().isDeclarationFile);
          if ((dono === "Reflect" || dono === "Object") && doLib) {
            const objeto = no.arguments.map((argumento) => baseSensivel(argumento)).find((base) => base !== undefined);
            if (objeto) registra("G3e", no, `${dono}.${chamado.name.text} sobre ${objeto}`);
          }
        }
        // J-571 (C3-A1, forma h): a escrita do `node:fs` por descritor (1 e 2 são a saída padrão).
        if (declaracao && arquivoDaDeclaracao.endsWith("/node_modules/@types/node/fs.d.ts")) {
          const funcao = nomeDaDeclaracao(declaracao);
          const primeiro = no.arguments[0];
          if (ESCRITA_POR_DESCRITOR.has(funcao)) registra("G3f", no, `fs.${funcao} (escrita por descritor)`);
          if (ESCRITA_DE_ARQUIVO.has(funcao) && primeiro && ts.isNumericLiteral(semCasca(primeiro))) {
            registra("G3f", no, `fs.${funcao} com descritor numérico`);
          }
        }
        // J-571 (C3-A2): todo `express()` de `src/`, pela assinatura resolvida.
        if (
          declaracao &&
          arquivoDaDeclaracao.endsWith("/node_modules/@types/express/index.d.ts") &&
          ts.isFunctionDeclaration(declaracao) &&
          nomeDaDeclaracao(declaracao) === "e"
        ) {
          const app: AppExpress = {
            chave: `${arquivo}#${nomeDaFuncao(no)}`,
            local: `${arquivo}:${fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1}`,
            comTratadorFinal: temTratadorFinal(no),
          };
          apps.push(app);
          if (!app.comTratadorFinal && !EXCECOES_G4E.has(app.chave)) {
            registra("G4e", no, `app Express sem installFinalErrorHandler(app, …) antes do return app (${app.chave})`);
          }
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
          // J-571 (C3-A1, forma c): a base atravessa parênteses e casts.
          const base = semCasca(pai.expression);
          valor = ts.isIdentifier(base) && OBJETOS_GLOBAIS.has(base.text);
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
      // J-571 (C3-A1): membro de saída por acesso com ponto, sobre objeto global (com cast) ou com o símbolo não resolvido.
      if (ts.isPropertyAccessExpression(no)) {
        membroDeObjetoGlobal(no, no.expression, no.name.text);
        membroNaoResolvido(no, no.name.text, checker.getSymbolAtLocation(no.name));
      }
      if (ts.isElementAccessExpression(no) && ts.isStringLiteralLike(no.argumentExpression)) {
        membroDeObjetoGlobal(no, no.expression, no.argumentExpression.text);
        membroNaoResolvido(no, no.argumentExpression.text, checker.getSymbolAtLocation(no.argumentExpression));
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
  return { violacoes, apps };
}

const { arquivos: ARQUIVOS_DO_REPO, opcoes: OPCOES_DO_REPO } = opcoesDoRepo();
const { violacoes: VIOLACOES_SRC, apps: APPS_SRC } = analisar(ARQUIVOS_DO_REPO, OPCOES_DO_REPO, true);

const ARQUIVOS_DAS_FIXTURES = fs
  .readdirSync(FIXTURES)
  .filter((nome) => nome.endsWith(".ts"))
  .map((nome) => path.join(FIXTURES, nome));
const { violacoes: VIOLACOES_FIXTURES } = analisar(ARQUIVOS_DAS_FIXTURES, { ...OPCOES_DO_REPO, rootDir: undefined }, false);

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

test("G1 ninguém fora da fábrica alcança o pino (import, require/import(), createRequire, assinatura, não resolvido)", () => {
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G1a", "G1b", "G1c", "G1u"]), []);
});

test("G2 todo pino-http recebe um logger da fábrica (lugar do import e forma da chamada)", () => {
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G2a", "G2b"]), []);
});

test("G3 nada em src/ escreve fora do logger (console, saída padrão, por forma, por símbolo e não resolvido)", () => {
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G3", "G3s", "G3e", "G3u", "G3f"]), []);
  assert.equal(EXCECOES_NAO_RESOLVIDO.size, 0, "a lista de exceção do símbolo não resolvido é vazia (J-571, C3-A1)");
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

test("G4e todo express() de src/ termina com installFinalErrorHandler(app, …) antes do return app, salvo a lista fechada (pela propriedade)", () => {
  // O enumerador acha os 2 apps conhecidos; sem isso a trava seria vazia.
  for (const conhecido of ["src/app.ts#createApp", "src/portal-app.ts#createPortalApp"]) {
    assert.ok(APPS_SRC.some((app) => app.chave === conhecido && app.comTratadorFinal), `o enumerador não achou ${conhecido} com o tratador final`);
  }
  assert.deepEqual(daRegra(VIOLACOES_SRC, ["G4e"]), []);
  // Emenda 1.7: a lista de exceção não apodrece. Cada entrada tem um app em src/, e esse app não tem o tratador final.
  const orfas = [...EXCECOES_G4E.keys()].filter((chave) => !APPS_SRC.some((app) => app.chave === chave && !app.comTratadorFinal));
  assert.deepEqual(orfas, [], "exceção da G4e sem app em src/ (ou cujo app já tem o tratador final)");
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

test("GF4 os 6 controles verdes dão 0 violação", () => {
  const controles = [
    "v_t_VERDE_so_tipo.ts",
    "v_u_VERDE_tipo_console.ts",
    "v_v_VERDE_tipo_inline.ts",
    "c01_controle_tipo.ts",
    "c02_controle_process_env.ts",
    "c03_controle_app_com_tratador.ts",
  ];
  const existentes = new Set(ARQUIVOS_DAS_FIXTURES.map((arquivo) => path.basename(arquivo)));
  assert.deepEqual(controles.filter((nome) => !existentes.has(nome)), [], "controles que não existem");
  assert.deepEqual(
    VIOLACOES_FIXTURES.filter((v) => controles.includes(v.arquivo)),
    [],
  );
  assert.equal(ARQUIVOS_DAS_FIXTURES.length, 50, "as fixtures são 50 (35 formas do plano, 9 da J-571 e 6 controles)");
});

test("GF5 as 8 formas da C3 da J-571 são acusadas (tipo apagado, cast estrutural, tty, reflexão e descritor)", () => {
  conferirFixtures(
    [
      "c3f_a_globalthis_any.ts",
      "c3f_b_process_any.ts",
      "c3f_c_cast_estrutural.ts",
      "c3f_d_any_createrequire.ts",
      "c3f_e_record_literal.ts",
      "c3f_f_tty_fd2.ts",
      "c3f_g_reflect.ts",
      "c3f_h_writesync.ts",
    ],
    ["G1a", "G1b", "G1c", "G1u", "G3", "G3s", "G3e", "G3u", "G3f"],
  );
});

test("GF6 o app Express sem o tratador final é acusado pela G4e (J-571, C3-A2)", () => {
  conferirFixtures(["j571_app_sem_tratador.ts"], ["G4e"]);
});
