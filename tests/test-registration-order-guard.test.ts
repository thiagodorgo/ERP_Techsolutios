import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-DB-FUSO-UTC, Emenda 4 (plano B-O6R-12-DRILL-ORDEM, J-554) — G-ORD: a ordem de registro do node:test.
//
// O defeito que esta guarda proíbe: o drill do B-O6R-12 registrava 2 testes, esperava dois `await import(...)` no
// nível de módulo e só então registrava os outros 10 e o `after()`. Quando os 2 primeiros terminavam dentro dessa
// janela, a raiz do runner ficava vazia e rodava o `after()` recém-registrado NO INÍCIO. Ele apagava o diretório
// temporário e não roda de novo; os testes de banco falhavam com clientes abertos e o processo não saía, travando o
// job `backend` do CI.
//
// A propriedade: todos os registros de um arquivo acontecem num trecho síncrono, que começa no carregamento do módulo
// ou no callback de um describe/suite/test/it. São duas regras, as duas pela AST do TypeScript:
//
//   Regra 1 — nenhum `await` de nível de módulo (inclusive `for await`) fica ENTRE dois registros. Corpo de função e
//             de classe não é nível de módulo; `if/else` são caminhos alternativos (o estado de saída é o pior dos
//             dois); laço é percorrido duas vezes.
//   Regra 2 — todo registro mora no nível de módulo (blocos, if/else, laços e try contam como nível de módulo) ou é
//             callback DIRETO de describe/suite/test/it. Registro dentro de qualquer outra função (IIFE assíncrona,
//             `.then`, timer, helper, método) é violação: ali ele pode vir depois de uma fronteira assíncrona que a
//             regra 1 não vê (crit-drill-cl, CD-1: a IIFE passava na regra 1 e travava 12 de 12).
//
// Registro é a chamada a test/it/describe/suite/before/after/beforeEach/afterEach pelo nome local que o arquivo
// importou de `node:test` (default, nomeado com ou sem alias, ou namespace), com no máximo um modificador `.skip`,
// `.only` ou `.todo`. Pelo default (e pelo namespace) também valem `test.describe(...)`, `nt.test(...)` e
// `nt.default(...)`. `test.mock.method(...)` não é registro.
//
// Limites declarados: a guarda não segue `require("node:test")`, acesso por colchetes (`test["skip"]`) nem registro
// feito por função de outro módulo; e não é guarda de vazamento de cliente (isso é a F2 do drill).
// -----------------------------------------------------------------------------------------------

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTROS = new Set(["test", "it", "describe", "suite", "before", "after", "beforeEach", "afterEach"]);
const ESTRUTURAIS = new Set(["test", "it", "describe", "suite"]);
const MODIFICADORES = new Set(["skip", "only", "todo"]);
const ARQUIVO_DE_TESTE = /\.test\.(ts|mts|tsx)$/;

type Achado = { regra: 1 | 2; linha: number; registro: string; detalhe: string };
type Analise = { registros: number; awaitsDeModulo: number[]; regra1: Achado | null; regra2: Achado | null };

function analisar(arquivo: string, texto: string): Analise {
  const src = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true);
  const linha = (no: ts.Node): number => src.getLineAndCharacterOfPosition(no.getStart(src)).line + 1;

  // Nomes locais que vêm de node:test. `diretos`: o nome chamado sozinho é um registro. `donos`: as propriedades
  // do nome são registros (o default e o `test` nomeado carregam `.describe`, `.it`, …; o namespace, todos).
  const diretos = new Map<string, string>();
  const donos = new Map<string, "funcao" | "namespace">();
  for (const st of src.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    if (!/^(node:)?test$/.test(st.moduleSpecifier.text) || !st.importClause || st.importClause.isTypeOnly) continue;
    const clausula = st.importClause;
    if (clausula.name) {
      diretos.set(clausula.name.text, "test");
      donos.set(clausula.name.text, "funcao");
    }
    const ligacoes = clausula.namedBindings;
    if (ligacoes && ts.isNamespaceImport(ligacoes)) donos.set(ligacoes.name.text, "namespace");
    if (ligacoes && ts.isNamedImports(ligacoes)) {
      for (const el of ligacoes.elements) {
        if (el.isTypeOnly) continue;
        const original = (el.propertyName ?? el.name).text;
        if (!REGISTROS.has(original)) continue;
        diretos.set(el.name.text, original);
        if (original === "test") donos.set(el.name.text, "funcao");
      }
    }
  }

  const registroDe = (chamada: ts.CallExpression): string | null => {
    let alvo: ts.Expression = chamada.expression;
    if (ts.isPropertyAccessExpression(alvo) && MODIFICADORES.has(alvo.name.text)) alvo = alvo.expression;
    if (ts.isIdentifier(alvo)) return diretos.get(alvo.text) ?? null;
    if (ts.isPropertyAccessExpression(alvo) && ts.isIdentifier(alvo.expression)) {
      const dono = donos.get(alvo.expression.text);
      if (!dono) return null;
      const membro = alvo.name.text;
      if (dono === "namespace" && membro === "default") return "test";
      return REGISTROS.has(membro) ? membro : null;
    }
    return null;
  };

  // Regra 1 — máquina de 3 estados por caminho: 0 nenhum registro; 1 já houve registro; 2 houve registro e DEPOIS
  // await de módulo. Registro no estado 2 é a violação.
  const awaitsDeModulo: number[] = [];
  let registros = 0;
  let primeiroRegistro = 0;
  let awaitDaJanela = 0;
  let regra1: Achado | null = null;
  const andar = (n: ts.Node, estado: number): number => {
    if (ts.isFunctionLike(n) || ts.isClassLike(n)) return estado; // corpo de função ou de classe não é nível de módulo
    if (ts.isIfStatement(n)) {
      const e = andar(n.expression, estado);
      const entao = andar(n.thenStatement, e);
      const senao = n.elseStatement ? andar(n.elseStatement, e) : e;
      return Math.max(entao, senao); // caminhos alternativos: vale o pior dos dois
    }
    if (ts.isIterationStatement(n, false)) {
      let e = estado;
      const forAwait = ts.isForOfStatement(n) && n.awaitModifier !== undefined;
      if (forAwait) awaitsDeModulo.push(linha(n));
      for (let volta = 0; volta < 2; volta += 1) {
        // `for await` espera antes de cada volta.
        if (forAwait && e >= 1) {
          if (e === 1) awaitDaJanela = linha(n);
          e = 2;
        }
        ts.forEachChild(n, (filho) => {
          e = andar(filho, e);
        });
      }
      return e;
    }
    if (ts.isCallExpression(n)) {
      const registro = registroDe(n);
      if (registro) {
        registros += 1;
        const l = linha(n);
        if (estado === 2 && !regra1) {
          regra1 = { regra: 1, linha: l, registro, detalhe: `registro l.${primeiroRegistro} -> await de módulo l.${awaitDaJanela} -> ${registro} l.${l}` };
        }
        if (!primeiroRegistro) primeiroRegistro = l;
        let e = Math.max(estado, 1);
        for (const argumento of n.arguments) e = andar(argumento, e);
        return e;
      }
    }
    let e = estado;
    ts.forEachChild(n, (filho) => {
      e = andar(filho, e);
    });
    if (ts.isAwaitExpression(n)) {
      const l = linha(n);
      if (!awaitsDeModulo.includes(l)) awaitsDeModulo.push(l);
      if (e === 1) awaitDaJanela = l; // o await que abre a janela
      if (e >= 1) e = 2;
    }
    return e;
  };
  andar(src, 0);

  // Regra 2 — o escopo de cada registro: nível de módulo, ou callback direto de describe/suite/test/it (e assim
  // por diante para cima). Qualquer outra função ou classe no caminho é violação.
  let regra2: Achado | null = null;
  const escopoProibido = (no: ts.Node): ts.Node | null => {
    for (let p: ts.Node | undefined = no.parent; p && !ts.isSourceFile(p); p = p.parent) {
      if (!(ts.isFunctionLike(p) || ts.isClassLike(p) || ts.isClassStaticBlockDeclaration(p))) continue;
      const chamada: ts.Node = p.parent;
      const funcao = p;
      const callbackDireto =
        (ts.isArrowFunction(funcao) || ts.isFunctionExpression(funcao)) &&
        ts.isCallExpression(chamada) &&
        chamada.arguments.some((argumento) => argumento === funcao) &&
        ESTRUTURAIS.has(registroDe(chamada) ?? "");
      if (!callbackDireto) return p;
      p = chamada; // sobe e confere o escopo do próprio describe/suite/test/it
    }
    return null;
  };
  const visitar = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && !regra2) {
      const registro = registroDe(n);
      const escopo = registro ? escopoProibido(n) : null;
      if (registro && escopo) {
        regra2 = {
          regra: 2,
          linha: linha(n),
          registro,
          detalhe: `${registro} l.${linha(n)} dentro de ${ts.SyntaxKind[escopo.kind]} l.${linha(escopo)}, que não é nível de módulo nem callback direto de describe/suite/test/it`,
        };
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(src);

  return { registros, awaitsDeModulo, regra1, regra2 };
}

function arquivosDeTeste(dir: string, saida: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "node_modules") arquivosDeTeste(caminho, saida);
    } else if (ARQUIVO_DE_TESTE.test(entrada.name)) {
      saida.push(caminho);
    }
  }
  return saida.sort();
}

const CONSERTO =
  "Conserto: troque o `await import(...)` de módulo por import estático (ou faça todos os `await` de módulo antes " +
  "do primeiro registro), e registre só no nível de módulo ou no callback direto de describe/suite/test/it.";

test("G-ORD-1 · nenhum arquivo de tests/ tem await de módulo entre registros nem registro fora do nível de módulo", () => {
  const arquivos = arquivosDeTeste(path.join(REPO, "tests"));
  assert.ok(arquivos.length >= 100, `a guarda leu só ${arquivos.length} arquivos de teste; esperava 100 ou mais`);
  const violacoes: string[] = [];
  for (const arquivo of arquivos) {
    const { regra1, regra2 } = analisar(arquivo, readFileSync(arquivo, "utf8"));
    const relativo = path.relative(REPO, arquivo).split(path.sep).join("/");
    for (const achado of [regra1, regra2]) if (achado) violacoes.push(`${relativo} (regra ${achado.regra}): ${achado.detalhe}`);
  }
  assert.deepEqual(violacoes, [], `${violacoes.join("\n")}\n${CONSERTO}`);
});

const POSITIVOS: { nome: string; regra: 1 | 2; texto: string }[] = [
  {
    nome: "a forma do drill de hoje: test, await import, test",
    regra: 1,
    texto: 'import test from "node:test";\ntest("a", () => {});\nconst os = await import("node:os");\ntest("b", () => {});\n',
  },
  {
    nome: "test, await, after",
    regra: 1,
    texto: 'import test, { after } from "node:test";\ntest("a", () => {});\nawait Promise.resolve();\nafter(() => {});\n',
  },
  {
    nome: "describe, await, it",
    regra: 1,
    texto: 'import { describe, it } from "node:test";\ndescribe("d", () => {});\nawait Promise.resolve();\nit("i", () => {});\n',
  },
  {
    nome: "import com alias",
    regra: 1,
    texto: 'import { test as caso } from "node:test";\ncaso("a", () => {});\nawait Promise.resolve();\ncaso("b", () => {});\n',
  },
  {
    nome: "import por namespace",
    regra: 1,
    texto: 'import * as nt from "node:test";\nnt.test("a", () => {});\nawait Promise.resolve();\nnt.test("b", () => {});\n',
  },
  {
    nome: "test.skip antes do await",
    regra: 1,
    texto: 'import test from "node:test";\ntest.skip("a", () => {});\nawait Promise.resolve();\ntest("b", () => {});\n',
  },
  {
    nome: "for await entre registros",
    regra: 1,
    texto: 'import test from "node:test";\ntest("a", () => {});\nfor await (const x of [Promise.resolve(1)]) void x;\ntest("b", () => {});\n',
  },
  {
    nome: "registro e await dentro de laço",
    regra: 1,
    texto: 'import test from "node:test";\nfor (const n of [1, 2]) {\n  test(`t${n}`, () => {});\n  await Promise.resolve();\n}\n',
  },
  {
    nome: "registro dentro de IIFE assíncrona",
    regra: 2,
    texto: 'import test, { after } from "node:test";\nvoid (async () => {\n  await import("node:os");\n  test("a", () => {});\n  after(() => {});\n})();\n',
  },
  {
    nome: "registro dentro de .then",
    regra: 2,
    texto: 'import test, { after } from "node:test";\nvoid Promise.resolve().then(() => {\n  test("a", () => {});\n  after(() => {});\n});\n',
  },
  {
    nome: "registro dentro de setTimeout",
    regra: 2,
    texto: 'import test from "node:test";\nsetTimeout(() => {\n  test("a", () => {});\n}, 0);\n',
  },
];

for (const controle of POSITIVOS) {
  test(`G-ORD-2 · controle positivo (regra ${controle.regra}): ${controle.nome} acusa exatamente 1 violação`, () => {
    const { regra1, regra2 } = analisar("controle.test.ts", controle.texto);
    assert.equal(regra1 !== null, controle.regra === 1, `regra 1: ${JSON.stringify(regra1)}`);
    assert.equal(regra2 !== null, controle.regra === 2, `regra 2: ${JSON.stringify(regra2)}`);
  });
}

const NEGATIVOS: { nome: string; texto: string }[] = [
  {
    nome: "todos os await antes do primeiro registro",
    texto: 'import test from "node:test";\nconst os = await import("node:os");\nawait Promise.resolve();\ntest("a", () => {});\ntest("b", () => {});\n',
  },
  {
    nome: "await só dentro de callback",
    texto: 'import test from "node:test";\ntest("a", async () => {\n  await Promise.resolve();\n});\ntest("b", () => {});\n',
  },
  {
    nome: "registro num ramo do if e await no outro",
    texto: 'import test from "node:test";\nif (!process.env.X) {\n  test.skip("a", () => {});\n} else {\n  await Promise.resolve();\n  test("b", () => {});\n}\n',
  },
  {
    nome: "await depois do último registro",
    texto: 'import test from "node:test";\ntest("a", () => {});\ntest("b", () => {});\nawait Promise.resolve();\n',
  },
  {
    nome: "await dentro de describe assíncrono (o Suite espera o callback)",
    texto: 'import { describe, it } from "node:test";\ndescribe("d", async () => {\n  await import("node:os");\n  it("a", () => {});\n});\n',
  },
  {
    nome: "test.mock.method depois de await não é registro",
    texto: 'import test from "node:test";\ntest("a", () => {});\nawait Promise.resolve();\ntest.mock.method(console, "log");\n',
  },
];

for (const controle of NEGATIVOS) {
  test(`G-ORD-3 · controle negativo: ${controle.nome} acusa 0`, () => {
    const { regra1, regra2 } = analisar("controle.test.ts", controle.texto);
    assert.equal(regra1, null, `regra 1: ${JSON.stringify(regra1)}`);
    assert.equal(regra2, null, `regra 2: ${JSON.stringify(regra2)}`);
  });
}
