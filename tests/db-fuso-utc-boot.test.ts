import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import {
  assertDatabaseSessionTimezoneUtc,
  SessionTimezoneProbeError,
  type SessionTimezoneBootstrapClient,
  type SessionTimezoneBootstrapLogger,
} from "../src/database/session-timezone.bootstrap.js";
import {
  acceptsSessionTimezoneUtc,
  DATABASE_SESSION_TIMEZONE_NOT_UTC,
  DatabaseSessionTimezoneError,
} from "../src/database/session-timezone.js";
import { startTraccarIngestListenerIfEnabled } from "../src/integrations/traccar/traccar-ingest.bootstrap.js";

type LogEntry = { readonly level: "info" | "warn" | "error"; readonly payload: Record<string, unknown>; readonly message: string };

function spyLogger(): { logger: SessionTimezoneBootstrapLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    logger: {
      info: (payload, message) => entries.push({ level: "info", payload, message }),
      warn: (payload, message) => entries.push({ level: "warn", payload, message }),
      error: (payload, message) => entries.push({ level: "error", payload, message }),
    },
  };
}

function serializeEntries(entries: LogEntry[]): string {
  return JSON.stringify(entries, (_key, value) => {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
  });
}

function fakeClient(answer: () => unknown): {
  client: SessionTimezoneBootstrapClient;
  calls: () => number;
  disconnects: () => number;
} {
  let calls = 0;
  let disconnects = 0;

  return {
    client: {
      async $queryRawUnsafe<T>(): Promise<T> {
        calls += 1;
        const value = answer();
        if (value instanceof Error) throw value;
        return value as T;
      },
      async $disconnect(): Promise<void> {
        disconnects += 1;
      },
    },
    calls: () => calls,
    disconnects: () => disconnects,
  };
}

function connectionError(): Error {
  const error = new Error(
    "\nInvalid `prisma.$queryRawUnsafe()` invocation:\n\n\nRaw query failed. Code: `N/A`. Message: `Can't reach database server at db.interno.exemplo.com:5432`",
  );
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P2010", meta: { driverAdapterError: { cause: { kind: "DatabaseNotReachable" } } } });
  return error;
}

const SENTINEL_HOST = "h0st-sentinela";
const SENTINEL_PORT = "5439";
const SENTINEL_USER = "us3r-sentinela";
const SENTINEL_PASSWORD = "s3nha-sentinela";

function sentinelAuthError(): Error {
  const error = new Error(
    `Raw query failed. Code: \`28P01\`. Message: \`authentication failed for user "${SENTINEL_USER}" (password ${SENTINEL_PASSWORD}) at ${SENTINEL_HOST}:${SENTINEL_PORT}\``,
  );
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P2010", meta: { driverAdapterError: { cause: { kind: "DatabaseAccessDenied" } } } });
  return error;
}
for (const timezone of ["UTC", "Etc/UTC"]) {
  test(`B1 · aceita \`${timezone}\` e loga o veredito`, async () => {
    const fake = fakeClient(() => [{ tz: timezone }]);
    const { logger, entries } = spyLogger();

    await assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client });

    assert.equal(fake.calls(), 1);
    assert.equal(fake.disconnects(), 0, "sessão em UTC não desconecta o client que o app vai usar");
    const verdict = entries.find((entry) => entry.message === "database session timezone verified");
    assert.ok(verdict, JSON.stringify(entries));
    assert.deepEqual(verdict.payload, { guard: "timezone", timezone });
  });
}

for (const timezone of ["America/Sao_Paulo", "Europe/London", "GMT0"]) {
  test(`B2 · recusa \`${timezone}\``, async () => {
    const fake = fakeClient(() => [{ tz: timezone }]);
    const { logger, entries } = spyLogger();

    await assert.rejects(
      () => assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client }),
      (error: unknown) => {
        assert.ok(error instanceof DatabaseSessionTimezoneError, String(error));
        assert.equal(error.code, DATABASE_SESSION_TIMEZONE_NOT_UTC);
        assert.equal(error.timezone, timezone);
        return true;
      },
    );
    assert.equal(fake.disconnects(), 1, "a recusa tem de fechar a conexão");
    const refusal = entries.find((entry) => entry.level === "error");
    assert.ok(refusal, JSON.stringify(entries));
    assert.deepEqual(refusal.payload, { guard: "timezone", timezone });
  });
}

// B2b (J-554, C2-A1): o aceite é a comparação EXATA com os literais `UTC` e `Etc/UTC`, depois do `trim`. Outra caixa
// não é o literal e é recusada; normalizar a caixa (`toUpperCase`) faria `utc` e `etc/utc` passarem.
for (const timezone of ["utc", "etc/utc", "Etc/utc", "ETC/UTC"]) {
  test(`B2b · recusa \`${timezone}\` (outra caixa não é o literal)`, async () => {
    const fake = fakeClient(() => [{ tz: timezone }]);
    const { logger, entries } = spyLogger();

    await assert.rejects(
      () => assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client }),
      (error: unknown) => {
        assert.ok(error instanceof DatabaseSessionTimezoneError, String(error));
        assert.equal(error.code, DATABASE_SESSION_TIMEZONE_NOT_UTC);
        assert.equal(error.timezone, timezone);
        return true;
      },
    );
    assert.equal(fake.disconnects(), 1, "a recusa tem de fechar a conexão");
    const refusal = entries.find((entry) => entry.level === "error");
    assert.ok(refusal, JSON.stringify(entries));
    assert.deepEqual(refusal.payload, { guard: "timezone", timezone });
  });
}

test("B2b · o aceite compara depois do `trim`: espaço em volta do literal passa, o miolo não muda", () => {
  assert.equal(acceptsSessionTimezoneUtc(" UTC "), true);
  assert.equal(acceptsSessionTimezoneUtc("\tEtc/UTC\n"), true);
  assert.equal(acceptsSessionTimezoneUtc(" utc "), false);
  assert.equal(acceptsSessionTimezoneUtc("Etc/ UTC"), false);
});

test("B3 · recusa fuso vazio", async () => {
  const fake = fakeClient(() => [{ tz: "" }]);
  const { logger, entries } = spyLogger();

  await assert.rejects(
    () => assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client }),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseSessionTimezoneError, String(error));
      assert.equal(error.code, DATABASE_SESSION_TIMEZONE_NOT_UTC);
      return true;
    },
  );
  assert.equal(fake.disconnects(), 1);
  const refusal = entries.find((entry) => entry.level === "error");
  assert.ok(refusal);
  assert.deepEqual(refusal.payload, { guard: "timezone", timezone: "" });
});
test("B4 · erro de CONEXÃO: 5 sondas, esperas 2s/4s/8s/16s, recusa sanitizada e $disconnect", async () => {
  const fake = fakeClient(() => connectionError());
  const { logger, entries } = spyLogger();
  const waits: number[] = [];

  await assert.rejects(
    () =>
      assertDatabaseSessionTimezoneUtc({
        logger,
        loadClient: async () => fake.client,
        sleep: async (ms) => {
          waits.push(ms);
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof SessionTimezoneProbeError, String(error));
      assert.equal(error.code, "SESSION_TIMEZONE_PROBE_FAILED");
      assert.equal(error.attempts, 5);
      assert.equal(error.driverKind, "DatabaseNotReachable");
      assert.doesNotMatch(error.message, /db\.interno\.exemplo\.com|5432/);
      return true;
    },
  );
  assert.equal(fake.calls(), 5);
  assert.deepEqual(waits, [2_000, 4_000, 8_000, 16_000]);
  assert.equal(fake.disconnects(), 1);
  assert.doesNotMatch(serializeEntries(entries), /db\.interno\.exemplo\.com|5432|postgresql:\/\//);
});
test("B5 · erro que NÃO é de conexão: 1 sonda só; log e mensagem sem host/porta/usuário/senha", async () => {
  const fake = fakeClient(() => sentinelAuthError());
  const { logger, entries } = spyLogger();
  const waits: number[] = [];

  await assert.rejects(
    () =>
      assertDatabaseSessionTimezoneUtc({
        logger,
        loadClient: async () => fake.client,
        sleep: async (ms) => {
          waits.push(ms);
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof SessionTimezoneProbeError, String(error));
      assert.equal(error.sqlState, "28P01");
      assert.equal(error.attempts, 1);
      assert.equal(error.driverKind, "DatabaseAccessDenied");
      assert.doesNotMatch(error.message, new RegExp(`${SENTINEL_HOST}|${SENTINEL_PORT}|${SENTINEL_USER}|${SENTINEL_PASSWORD}`));
      return true;
    },
  );
  assert.equal(fake.calls(), 1);
  assert.deepEqual(waits, []);
  assert.equal(fake.disconnects(), 1);
  assert.doesNotMatch(serializeEntries(entries), new RegExp(`${SENTINEL_HOST}|${SENTINEL_PORT}|${SENTINEL_USER}|${SENTINEL_PASSWORD}`));
});

// B6 (Emenda 3, E3.4) confere a chamada pela AST do TypeScript, não pelo texto: comentário não é nó, então a linha
// comentada não conta. A trava tem de ser um `await` de CallExpression, direto no corpo de `main` (fora de bloco
// condicional ou de função aninhada), com o identificador importado do bootstrap e só `{ logger }` de argumento,
// depois da trava de papel e antes de `createCoreSaasService`.
function calleeName(call: ts.CallExpression): string | undefined {
  return ts.isIdentifier(call.expression) ? call.expression.text : undefined;
}

// B6 (J-554, C2-A3) também confere a LIGAÇÃO do identificador, pelo checker do TypeScript: a forma sintática não basta,
// porque uma declaração local homônima dentro de `main` (`const assertDatabaseSessionTimezoneUtc = async () => {}`)
// sombreia o import, deixa a chamada no lugar e desliga a trava. O checker resolve o identificador chamado
// (`getSymbolAtLocation`); ele tem de ser o alias do import de `./database/session-timezone.bootstrap.js`, e o alias tem
// de resolver (`getAliasedSymbol`) para a declaração `assertDatabaseSessionTimezoneUtc` em
// `src/database/session-timezone.bootstrap.ts`. O programa só enxerga `src/` (sem lib nem node_modules): o que a
// ligação precisa está ali, e o que ficar fora não resolve, então a falha fecha.
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVER_TS = fileURLToPath(new URL("../src/server.ts", import.meta.url));
const TIMEZONE_BOOTSTRAP_REL = "src/database/session-timezone.bootstrap.ts";

function repoRelative(fileName: string): string {
  return path.relative(REPO_ROOT, fileName).split(path.sep).join("/");
}

let serverProgramCache: { readonly source: ts.SourceFile; readonly checker: ts.TypeChecker } | undefined;

function serverProgram(): { readonly source: ts.SourceFile; readonly checker: ts.TypeChecker } {
  if (serverProgramCache !== undefined) return serverProgramCache;
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    noLib: true,
    types: [],
  };
  const host = ts.createCompilerHost(options, true);
  const insideSrc = (fileName: string): boolean => repoRelative(fileName).startsWith("src/");
  const fileExists = host.fileExists.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => insideSrc(fileName) && fileExists(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) =>
    insideSrc(fileName) ? getSourceFile(fileName, languageVersion, onError, shouldCreate) : undefined;
  const program = ts.createProgram({ rootNames: [SERVER_TS], options, host });
  const source = program.getSourceFile(SERVER_TS);
  assert.ok(source, "o programa do checker carrega src/server.ts");
  serverProgramCache = { source, checker: program.getTypeChecker() };
  return serverProgramCache;
}

// O que o checker diz do identificador chamado: de onde vem (import ou declaração local) e para onde resolve.
function describeBinding(checker: ts.TypeChecker, callee: ts.Expression): {
  readonly viaImportFrom: string | undefined;
  readonly resolvesTo: string[];
} {
  const symbol = checker.getSymbolAtLocation(callee);
  if (symbol === undefined) return { viaImportFrom: undefined, resolvesTo: [] };

  const specifier = symbol.declarations?.find(ts.isImportSpecifier);
  const viaImportFrom =
    (symbol.flags & ts.SymbolFlags.Alias) !== 0 &&
    specifier !== undefined &&
    ts.isStringLiteral(specifier.parent.parent.parent.moduleSpecifier)
      ? specifier.parent.parent.parent.moduleSpecifier.text
      : undefined;
  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
  const resolvesTo = (target.declarations ?? []).map(
    (declaration) =>
      `${ts.SyntaxKind[declaration.kind]} ${
        ts.isFunctionDeclaration(declaration) ? (declaration.name?.text ?? "") : ""
      }@${repoRelative(declaration.getSourceFile().fileName)}`,
  );
  return { viaImportFrom, resolvesTo };
}

test("B6 · server.ts chama a trava de fuso depois do papel e antes de createCoreSaasService (pela AST)", () => {
  const { source, checker } = serverProgram();

  const imported = source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "./database/session-timezone.bootstrap.js" &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) => element.name.text === "assertDatabaseSessionTimezoneUtc" && element.propertyName === undefined,
      ),
  );
  assert.ok(imported, "server.ts importa assertDatabaseSessionTimezoneUtc do bootstrap da trava de fuso, sem alias");

  const main = source.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === "main" && statement.body !== undefined,
  );
  assert.ok(main?.body, "server.ts declara a função main");

  // As chamadas `await f(...)` que são, elas mesmas, um comando do corpo de `main` (incondicionais).
  const awaitedStatements: Array<{ readonly name: string; readonly pos: number; readonly call: ts.CallExpression }> = [];
  for (const statement of main.body.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isAwaitExpression(statement.expression) &&
      ts.isCallExpression(statement.expression.expression)
    ) {
      const call = statement.expression.expression;
      const name = calleeName(call);
      if (name !== undefined) awaitedStatements.push({ name, pos: call.getStart(source), call });
    }
  }

  // Toda chamada de `createCoreSaasService` em qualquer ponto de `main`.
  const servicePositions: number[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && calleeName(node) === "createCoreSaasService") {
      servicePositions.push(node.getStart(source));
    }
    ts.forEachChild(node, visit);
  };
  visit(main.body);

  const role = awaitedStatements.find((entry) => entry.name === "assertRuntimeDatabaseRoleIfEnforced");
  const timezone = awaitedStatements.filter((entry) => entry.name === "assertDatabaseSessionTimezoneUtc");

  assert.ok(role, "main deve fazer `await assertRuntimeDatabaseRoleIfEnforced(...)` como comando próprio");
  assert.equal(timezone.length, 1, "main deve fazer `await assertDatabaseSessionTimezoneUtc(...)` uma vez, como comando próprio");
  assert.ok(servicePositions.length > 0, "main deve criar o serviço");

  const [timezoneCall] = timezone;
  const args = timezoneCall!.call.arguments;
  assert.equal(args.length, 1, "a trava de fuso recebe um argumento só");
  const [arg] = args;
  assert.ok(
    arg !== undefined &&
      ts.isObjectLiteralExpression(arg) &&
      arg.properties.length === 1 &&
      ts.isShorthandPropertyAssignment(arg.properties[0]!) &&
      arg.properties[0].name.text === "logger",
    "a trava de fuso roda com `{ logger }` e as dependências reais (sem cliente injetado)",
  );

  assert.ok(role.pos < timezoneCall!.pos, "a trava de fuso vem depois da trava de papel");
  assert.ok(
    servicePositions.every((pos) => timezoneCall!.pos < pos),
    "a trava de fuso vem antes de createCoreSaasService",
  );

  // A ligação (J-554, C2-A3): o identificador chamado é o do import, e o import resolve para a trava de verdade.
  assert.deepEqual(
    describeBinding(checker, timezoneCall!.call.expression),
    {
      viaImportFrom: "./database/session-timezone.bootstrap.js",
      resolvesTo: [`FunctionDeclaration assertDatabaseSessionTimezoneUtc@${TIMEZONE_BOOTSTRAP_REL}`],
    },
    "o identificador chamado em main resolve para o import de session-timezone.bootstrap (sem declaração local homônima)",
  );
});

test("B6 · controle do leitor da ligação: o import resolve para a trava; a declaração local homônima não", () => {
  const { checker, source } = serverProgram();
  const importSpecifier = source.statements
    .filter(ts.isImportDeclaration)
    .flatMap((statement) =>
      statement.importClause?.namedBindings !== undefined && ts.isNamedImports(statement.importClause.namedBindings)
        ? [...statement.importClause.namedBindings.elements]
        : [],
    )
    .find((element) => element.name.text === "assertDatabaseSessionTimezoneUtc");
  assert.ok(importSpecifier, "server.ts tem o import nomeado da trava de fuso");
  assert.deepEqual(describeBinding(checker, importSpecifier.name).resolvesTo, [
    `FunctionDeclaration assertDatabaseSessionTimezoneUtc@${TIMEZONE_BOOTSTRAP_REL}`,
  ]);

  // Um programa só em memória, com o mesmo import e a sombra dentro de `main`: o checker tem de ver a sombra.
  const shadowed = ts.createSourceFile(
    "sombra.ts",
    [
      'import { assertDatabaseSessionTimezoneUtc } from "./database/session-timezone.bootstrap.js";',
      "async function main(): Promise<void> {",
      "  const assertDatabaseSessionTimezoneUtc = async (_options: { logger: unknown }): Promise<void> => {};",
      "  await assertDatabaseSessionTimezoneUtc({ logger: undefined });",
      "}",
      "void main;",
    ].join("\n"),
    ts.ScriptTarget.Latest,
    true,
  );
  const memoryHost = ts.createCompilerHost({ noLib: true });
  memoryHost.getSourceFile = (fileName) => (fileName === "sombra.ts" ? shadowed : undefined);
  memoryHost.fileExists = (fileName) => fileName === "sombra.ts";
  const memoryProgram = ts.createProgram({ rootNames: ["sombra.ts"], options: { noLib: true, noEmit: true }, host: memoryHost });
  const memoryChecker = memoryProgram.getTypeChecker();
  const calls: ts.CallExpression[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && calleeName(node) === "assertDatabaseSessionTimezoneUtc") calls.push(node);
    ts.forEachChild(node, collect);
  };
  collect(shadowed);
  assert.equal(calls.length, 1);
  const binding = describeBinding(memoryChecker, calls[0]!.expression);
  assert.equal(binding.viaImportFrom, undefined, "a sombra não é o import");
  assert.equal(binding.resolvesTo.length, 1, JSON.stringify(binding));
  assert.match(binding.resolvesTo[0]!, /^VariableDeclaration /, "a sombra resolve para a declaração local");
});

test("B6 · controle do leitor da AST: a chamada comentada some, a chamada real aparece", () => {
  const ler = (codigo: string): string[] => {
    const file = ts.createSourceFile("x.ts", codigo, ts.ScriptTarget.Latest, true);
    const names: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const name = calleeName(node);
        if (name !== undefined) names.push(name);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return names;
  };

  assert.deepEqual(ler("async function main() {\n  // await assertDatabaseSessionTimezoneUtc({ logger });\n}\n"), []);
  assert.deepEqual(ler("async function main() {\n  /* await assertDatabaseSessionTimezoneUtc({ logger }); */\n}\n"), []);
  assert.deepEqual(ler("async function main() {\n  await assertDatabaseSessionTimezoneUtc({ logger });\n}\n"), [
    "assertDatabaseSessionTimezoneUtc",
  ]);
});

test("B7 · listener do Traccar recusa banco fora de UTC → timezone_refused, loga só o código", async () => {
  const { logger, entries } = spyLogger();
  let appCreated = false;

  const result = await startTraccarIngestListenerIfEnabled({
    logger: logger as unknown as Parameters<typeof startTraccarIngestListenerIfEnabled>[0]["logger"],
    config: { enabled: true, host: "127.0.0.1", port: 0 },
    probeTimezone: async () => {
      throw new DatabaseSessionTimezoneError("America/Sao_Paulo");
    },
    createIngestApp: async () => {
      appCreated = true;
      throw new Error("não devia chegar aqui");
    },
  });

  assert.deepEqual(result, { status: "timezone_refused" });
  assert.equal(appCreated, false, "fora de UTC o listener não cria o app nem sobe");
  const refusal = entries.find((entry) => entry.level === "error");
  assert.ok(refusal, JSON.stringify(entries));
  assert.deepEqual(refusal.payload, { code: DATABASE_SESSION_TIMEZONE_NOT_UTC });
});
