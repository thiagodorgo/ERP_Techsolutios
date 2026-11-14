// B-SEC-LOG-SANITIZA — o logger da fábrica (L) e as três classes do erro público (K).
//
// As variáveis de conexão SENTINELA entram em `process.env` ANTES do `await import(…)` dos módulos: o `env` é lido no
// import, e o saneador guarda os valores configurados (R3 e R4) na carga do módulo.
//
// L13, L14 e L15b precisam de OUTRA configuração (senha com `@`, `"` e `%`; os valores do CI; host IPv6). Rodam num
// processo filho com o env só daquele caso, que importa os mesmos módulos.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { Writable } from "node:stream";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  DATABASE_URL_SENTINELA,
  REDIS_URL_SENTINELA,
  medirPortaLivre,
  sentinelasEncontrados,
} from "./helpers/sec-log-sentinelas.js";

process.env.DATABASE_URL = DATABASE_URL_SENTINELA;
process.env.REDIS_URL = REDIS_URL_SENTINELA;
process.env.LOG_LEVEL = "info";

const { createHttpLogger, createLogger, SANITIZER_FAILED_MESSAGE } = await import("../src/infra/logging/logger.js");
const { classifyPublicError, PG_CONNECTION_LOST_MESSAGES } = await import("../src/infra/logging/public-error.js");
const { RedisClient, RedisCommandError } = await import("../src/infra/redis/redis.client.js");

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

// ---------------------------------------------------------------------------------------------------------------------
// Captura e formas de erro.
// ---------------------------------------------------------------------------------------------------------------------

function capturar() {
  const linhas: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      linhas.push(String(chunk));
      callback();
    },
  });
  return { logger: createLogger({ destination }), linhas, texto: () => linhas.join("") };
}

function ultimaLinha(linhas: readonly string[]): Record<string, unknown> {
  assert.ok(linhas.length > 0, "nenhuma linha de log");
  return JSON.parse(linhas[linhas.length - 1]) as Record<string, unknown>;
}

function assertSemSentinela(texto: string, extras: { readonly texto?: string[]; readonly numeros?: number[] } = {}) {
  const achados = sentinelasEncontrados(texto, { extrasTexto: extras.texto, extrasNumericos: extras.numeros });
  assert.deepEqual(achados, [], `sentinelas na saída: ${texto.slice(0, 600)}`);
}

const CLIENT_VERSION = "7.8.0";

function erroPrisma(message: string, code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: CLIENT_VERSION, meta });
}

function causaDoDriver(cause: Record<string, unknown>) {
  return { driverAdapterError: { name: "DriverAdapterError", cause } };
}

/** P2010 do `$queryRaw` com o banco em host que não responde (forma real, F1.0 do diário). */
function p2010Inalcancavel() {
  return erroPrisma(
    "\nInvalid `prisma.$queryRaw()` invocation:\n\n\nRaw query failed. Code: `N/A`. Message: `Can't reach database server at hstdb-sentinela:5439`",
    "P2010",
    causaDoDriver({ kind: "DatabaseNotReachable", host: "hstdb-sentinela", port: 5439 }),
  );
}

/** P1001 do modelo: caminho, trecho do fonte, host e porta na mensagem; `meta` com host e porta. */
function p1001Modelo() {
  return erroPrisma(
    "\nInvalid `prisma.tenant.findFirst()` invocation in\n/srv/app/src/modules/core-saas/core-saas-prisma.adapter.ts:131:9\n\n  128 const tenant = await prisma.tenant.findFirst(\n→ 131 \nCan't reach database server at hstdb-sentinela:5439\n\nPlease make sure your database server is running at hstdb-sentinela:5439.",
    "P1001",
    { modelName: "Tenant", ...causaDoDriver({ kind: "DatabaseNotReachable", host: "hstdb-sentinela", port: 5439 }) },
  );
}

function erroDeRede(message: string, code: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

// ---------------------------------------------------------------------------------------------------------------------
// Processo filho, para as configurações que não são a sentinela.
// ---------------------------------------------------------------------------------------------------------------------

function rodarNoFilho(env: Record<string, string>, corpo: string): Record<string, unknown> {
  const logger = pathToFileURL(`${RAIZ}src/infra/logging/logger.ts`).href;
  const sanitizer = pathToFileURL(`${RAIZ}src/infra/logging/log-sanitizer.ts`).href;
  const codigo = [
    'import { Writable } from "node:stream";',
    `const { createLogger } = await import(${JSON.stringify(logger)});`,
    `const { scrubConnectionText } = await import(${JSON.stringify(sanitizer)});`,
    "const linhas = [];",
    "const logger = createLogger({ destination: new Writable({ write(c, _e, cb) { linhas.push(String(c)); cb(); } }) });",
    "const saida = {};",
    corpo,
    "saida.linhas = linhas;",
    'process.stdout.write("@@SAIDA@@" + JSON.stringify(saida));',
  ].join("\n");
  const resultado = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", codigo], {
    cwd: RAIZ,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      ...env,
    },
    timeout: 60_000,
  });
  const marca = resultado.stdout.indexOf("@@SAIDA@@");
  assert.ok(marca >= 0, `o filho não respondeu (status ${resultado.status}): ${resultado.stderr.slice(0, 800)}`);
  return JSON.parse(resultado.stdout.slice(marca + "@@SAIDA@@".length)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------------------------------
// Servidor Redis falso (RESP), para as respostas reais do `RedisClient` do repo.
// ---------------------------------------------------------------------------------------------------------------------

async function erroDoRedisFalso(aoConectar: (socket: net.Socket) => void): Promise<unknown> {
  const servidor = net.createServer(aoConectar);
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", () => resolve()));
  const porta = (servidor.address() as net.AddressInfo).port;
  try {
    await new RedisClient(`redis://usrrd-sentinela:pwdrd-sentinela@127.0.0.1:${porta}/0`).ping();
    return undefined;
  } catch (error) {
    return error;
  } finally {
    servidor.close();
  }
}

function responde(linha: string) {
  return (socket: net.Socket) => socket.once("data", () => socket.write(`${linha}\r\n`));
}

async function erroDe(acao: () => Promise<unknown>): Promise<unknown> {
  try {
    await acao();
  } catch (error) {
    return error;
  }
  throw new Error("a ação não lançou");
}

// =====================================================================================================================
// L — o logger da fábrica.
// =====================================================================================================================

test("L1 { err: P2010 DatabaseNotReachable } sai com 0 sentinela e com type, code e driverKind", () => {
  const { logger, linhas, texto } = capturar();
  logger.error({ err: p2010Inalcancavel() }, "consulta falhou");
  assertSemSentinela(texto());
  const err = ultimaLinha(linhas).err as Record<string, unknown>;
  assert.equal(err.type, "PrismaClientKnownRequestError");
  assert.equal(err.code, "P2010");
  assert.equal(err.driverKind, "DatabaseNotReachable");
});

test("L2 { error: P2010 } sai com 0 sentinela e sem meta", () => {
  const { logger, linhas, texto } = capturar();
  logger.error({ error: p2010Inalcancavel() }, "consulta falhou");
  assertSemSentinela(texto());
  const error = ultimaLinha(linhas).error as Record<string, unknown>;
  assert.equal(error.code, "P2010");
  assert.equal("meta" in error, false);
});

test("L3 erro aninhado { failure: { inner: err } } sai com 0 sentinela", () => {
  const { logger, texto } = capturar();
  logger.warn({ failure: { inner: p1001Modelo() } }, "falha aninhada");
  assertSemSentinela(texto());
});

test("L4 logger.error(err, msg) sai com 0 sentinela, com o erro em err", () => {
  const { logger, linhas, texto } = capturar();
  logger.error(p1001Modelo(), "boot falhou");
  assertSemSentinela(texto());
  const linha = ultimaLinha(linhas);
  assert.equal(linha.msg, "boot falhou");
  assert.equal((linha.err as Record<string, unknown>).code, "P1001");
});

test("L5 erro de rede do Node: 0 sentinela; code e syscall ficam; address, port e hostname saem", () => {
  const { logger, linhas, texto } = capturar();
  const erro = erroDeRede("connect ECONNREFUSED hstrd-sentinela:6391", "ECONNREFUSED", {
    errno: -4078,
    syscall: "connect",
    address: "hstrd-sentinela",
    port: 6391,
    hostname: "hstrd-sentinela",
  });
  logger.error({ err: erro }, "redis");
  assertSemSentinela(texto());
  const err = ultimaLinha(linhas).err as Record<string, unknown>;
  assert.equal(err.code, "ECONNREFUSED");
  assert.equal(err.syscall, "connect");
  assert.equal(err.errno, -4078);
  for (const campo of ["address", "port", "hostname"]) assert.equal(campo in err, false, campo);
});

test("L6 texto já extraído { error: err.message } sai com 0 sentinela", () => {
  const { logger, texto } = capturar();
  logger.warn({ error: p1001Modelo().message }, "falha");
  assertSemSentinela(texto());
});

test("L7 mensagem por template com err.message sai com 0 sentinela", () => {
  const { logger, texto } = capturar();
  logger.warn(`falhou: ${p2010Inalcancavel().message}`);
  assertSemSentinela(texto());
});

test("L8 { url: DATABASE_URL } e { url: REDIS_URL } saem com 0 sentinela, inclusive a senha", () => {
  const { logger, texto } = capturar();
  logger.info({ url: DATABASE_URL_SENTINELA }, "banco");
  logger.info({ url: REDIS_URL_SENTINELA }, "redis");
  assertSemSentinela(texto());
});

test("L9 child({ dbUrl }) (binding) sai com 0 sentinela, pelo streamWrite", () => {
  // Com o L1b, o binding em texto já é limpo no child(). O que só o streamWrite pega é a URL dentro de uma instância de
  // classe, que o saneador deixa passar (escape E-5): o `URL` é serializado pelo próprio `toJSON`.
  const { logger, texto } = capturar();
  logger.child({ dbUrl: new URL(DATABASE_URL_SENTINELA) }).info("filho com URL");
  logger.child({ dbUrl: DATABASE_URL_SENTINELA }).info("filho com texto");
  assertSemSentinela(texto());
});

test("L9b child({ err }), neto e setBindings({ err }) saem com 0 sentinela; component é preservado", () => {
  const casos: Array<[string, (logger: ReturnType<typeof createLogger>) => void]> = [
    ["child({ err })", (logger) => logger.child({ err: p1001Modelo() }).error("x")],
    ["neto child().child({ error })", (logger) => logger.child({ a: 1 }).child({ error: p1001Modelo() }).warn("y")],
    [
      "setBindings({ err }) no filho",
      (logger) => {
        const filho = logger.child({ a: 1 });
        filho.setBindings({ err: p1001Modelo() });
        filho.info("z");
      },
    ],
    [
      "setBindings({ err }) na raiz",
      (logger) => {
        logger.setBindings({ err: p1001Modelo() });
        logger.info("z");
      },
    ],
  ];
  for (const [rotulo, caso] of casos) {
    const { logger, linhas, texto } = capturar();
    caso(logger);
    assert.ok(linhas.length > 0, rotulo);
    assert.deepEqual(sentinelasEncontrados(texto()), [], `${rotulo}: ${texto().slice(0, 400)}`);
  }
  const { logger, linhas } = capturar();
  logger.child({ component: "traccar-ingest" }).info("ok");
  assert.equal(ultimaLinha(linhas).component, "traccar-ingest");
});

test("L9c child({}, { msgPrefix }) com host e porta sai com 0 sentinela, direto e no neto", () => {
  const direto = capturar();
  direto.logger.child({}, { msgPrefix: "[hstdb-sentinela:5439] " }).info("ok");
  assertSemSentinela(direto.texto());
  assert.match(String(ultimaLinha(direto.linhas).msg), /ok$/);
  const neto = capturar();
  neto.logger.child({ a: 1 }).child({}, { msgPrefix: "[hstdb-sentinela:5439] " }).info("ok");
  assertSemSentinela(neto.texto());
});

test("L10 createHttpLogger({ redact }): req.log e res.err com 0 sentinela, authorization redigido, req.method presente", async () => {
  const linhas: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      linhas.push(String(chunk));
      callback();
    },
  });
  const middleware = createHttpLogger({ redact: ["req.headers.authorization"] }, { destination });
  const servidor = http.createServer((request, response) => {
    middleware(request, response);
    request.log.warn({ error: p1001Modelo() }, "falhou no meio");
    response.err = p2010Inalcancavel();
    response.statusCode = 500;
    response.end("x");
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", () => resolve()));
  const porta = (servidor.address() as net.AddressInfo).port;
  try {
    await fetch(`http://127.0.0.1:${porta}/rota?x=1`, { headers: { authorization: "Bearer segredo-123" } }).then((r) =>
      r.text(),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    servidor.close();
  }
  const texto = linhas.join("");
  assert.ok(linhas.length >= 2, `linhas: ${linhas.length}`);
  assertSemSentinela(texto);
  assert.ok(texto.includes('"authorization":"[Redacted]"'), "authorization não foi redigido");
  assert.equal(texto.includes("segredo-123"), false);
  assert.ok(texto.includes('"method":"GET"'), "req.method sumiu");
});

test("L11 getter que lança no payload: sai logSanitizerFailed com 0 sentinela", () => {
  const { logger, linhas, texto } = capturar();
  const payload = {
    detalhe: "falha em hstdb-sentinela",
    get explode(): string {
      throw new Error("getter com hstdb-sentinela");
    },
  };
  logger.error(payload, "com getter");
  assertSemSentinela(texto());
  const linha = ultimaLinha(linhas);
  assert.equal(linha.logSanitizerFailed, true);
  assert.equal(linha.msg, SANITIZER_FAILED_MESSAGE);
});

test("L12 TypeError fetch failed com cause ECONNREFUSED: 0 sentinela; cause.code fica", () => {
  const erro = Object.assign(new TypeError("fetch failed"), {
    cause: erroDeRede("connect ECONNREFUSED hstdb-sentinela:5439", "ECONNREFUSED", {
      address: "hstdb-sentinela",
      port: 5439,
    }),
  });
  const { logger, linhas, texto } = capturar();
  logger.error({ error: erro }, "provedor");
  logger.error({ err: erro }, "provedor");
  assertSemSentinela(texto());
  const error = JSON.parse(linhas[0]).error as { cause: { code: string } };
  assert.equal(error.cause.code, "ECONNREFUSED");
});

test("L13 senha com @, aspas e %, codificada e decodificada, sai com 0 sentinela", () => {
  const senha = 'p@ss"w%rd-sentinela';
  const codificada = encodeURIComponent(senha);
  const saida = rodarNoFilho(
    {
      DATABASE_URL: `postgresql://usrdb-sentinela:${codificada}@hstdb-sentinela:5439/bcodb-sentinela`,
      REDIS_URL: REDIS_URL_SENTINELA,
    },
    [
      `logger.warn({ url: ${JSON.stringify(`postgresql://usrdb-sentinela:${codificada}@hstdb-sentinela:5439/bcodb-sentinela`)} }, "url");`,
      `logger.warn({ txt: ${JSON.stringify(`senha ${senha}`)} }, "decodificada");`,
      `logger.warn({ txt: ${JSON.stringify(`senha ${codificada}`)} }, "codificada");`,
    ].join("\n"),
  );
  const texto = (saida.linhas as string[]).join("");
  assert.equal((saida.linhas as string[]).length, 3);
  for (const forma of ["p@ss", codificada, JSON.stringify(senha).slice(1, -1)]) {
    assert.equal(texto.includes(forma), false, `${forma} na saída: ${texto}`);
  }
  assertSemSentinela(texto);
});

test("L14 contra a sobre-redação: com os valores do CI, mensagens comuns saem idênticas", () => {
  const mensagens = [
    "Título obrigatório.",
    "ERP Techsolutions API listening",
    "PostgreSQL 16 pronto",
    "porta 3597 em uso",
    "valor 15432 recebido",
    "erp_techsolutions_runtime",
  ];
  const saida = rodarNoFilho(
    {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public",
      REDIS_URL: "redis://localhost:6379",
    },
    [
      `const mensagens = ${JSON.stringify(mensagens)};`,
      "saida.texto = mensagens.map((m) => scrubConnectionText(m));",
      "for (const m of mensagens) logger.info(m);",
    ].join("\n"),
  );
  assert.deepEqual(saida.texto, mensagens);
  assert.deepEqual(
    (saida.linhas as string[]).map((linha) => (JSON.parse(linha) as { msg: string }).msg),
    mensagens,
  );
});

test("L15 host configurado numa frase livre (só a R3 pega) sai com 0 sentinela", () => {
  const { logger, texto } = capturar();
  logger.warn("falha ao falar com hstdb-sentinela agora");
  logger.warn({ detalhe: "o redis hstrd-sentinela não respondeu" }, "redis");
  assertSemSentinela(texto());
});

test("L15b host IPv6 configurado ([::1]) numa frase livre, escrito sem colchetes, sai com 0 sentinela", () => {
  const saida = rodarNoFilho(
    {
      DATABASE_URL: "postgresql://usrdb-sentinela:pwddb-sentinela@[::1]:5439/bcodb-sentinela",
      REDIS_URL: REDIS_URL_SENTINELA,
    },
    'logger.warn("conexao recusada em ::1 agora"); logger.warn("e tambem em [::1] depois");',
  );
  const texto = (saida.linhas as string[]).join("");
  assert.equal((saida.linhas as string[]).length, 2);
  assert.equal(texto.includes("::1"), false, texto);
});

test("L16 host NÃO configurado na frase do Prisma (só a R5 pega) sai com 0 sentinela", () => {
  const { logger, texto } = capturar();
  logger.error({ err: new Error("Can't reach database server at outro-sentinela:5440") }, "banco");
  assertSemSentinela(texto(), { texto: ["outro-sentinela"], numeros: [5440] });
});

test("L16b connect ECONNREFUSED fd00::5:6379 (IPv6 não configurado) sai com 0 sentinela", () => {
  const { logger, texto } = capturar();
  logger.error({ err: erroDeRede("connect ECONNREFUSED fd00::5:6379", "ECONNREFUSED") }, "redis");
  assertSemSentinela(texto(), { texto: ["fd00::5"], numeros: [6379] });
});

test("L17 AggregateError real (RedisClient do repo contra localhost, porta fechada): 0 sentinela e errors[].code", async () => {
  const porta = await medirPortaLivre();
  const erro = await erroDe(() => new RedisClient(`redis://usrrd-sentinela:pwdrd-sentinela@localhost:${porta}/0`).ping());
  const { logger, linhas, texto } = capturar();
  logger.error({ err: erro }, "redis");
  assertSemSentinela(texto(), { texto: [`127.0.0.1:${porta}`, `::1:${porta}`], numeros: [porta] });
  const err = ultimaLinha(linhas).err as { type: string; code: string; errors?: Array<{ code: string }> };
  assert.equal(err.code, "ECONNREFUSED");
  if (err.type === "AggregateError") {
    assert.ok(err.errors && err.errors.length > 0, "errors[] sumiu");
    for (const item of err.errors ?? []) assert.equal(item.code, "ECONNREFUSED");
  }
});

test("L17b AggregateError sem code no topo, com errors[] de rede, sai com 0 sentinela", () => {
  const erro = new AggregateError(
    [
      erroDeRede("connect ECONNREFUSED hstrd-sentinela:6391", "ECONNREFUSED", { address: "hstrd-sentinela", port: 6391 }),
      erroDeRede("connect ECONNREFUSED hstdb-sentinela:5439", "ECONNREFUSED", { address: "hstdb-sentinela", port: 5439 }),
    ],
    "",
  );
  const { logger, linhas, texto } = capturar();
  logger.error({ err: erro }, "agregado");
  logger.error({ error: erro }, "agregado");
  assertSemSentinela(texto());
  const error = JSON.parse(linhas[1]).error as { errors: Array<{ code: string }> };
  assert.deepEqual(
    error.errors.map((item) => item.code),
    ["ECONNREFUSED", "ECONNREFUSED"],
  );
});

test("L18 cadeia de 5 cause com o host na última: 0 sentinela, e a saída tem [profundidade]", () => {
  let erro: Error = erroDeRede("connect ECONNREFUSED hstdb-sentinela:5439", "ECONNREFUSED", {
    address: "hstdb-sentinela",
    port: 5439,
  });
  for (let nivel = 0; nivel < 5; nivel += 1) erro = new Error(`nivel ${nivel}`, { cause: erro });
  const { logger, texto } = capturar();
  logger.error({ err: erro }, "cadeia");
  logger.error({ error: erro }, "cadeia");
  assertSemSentinela(texto());
  assert.ok(texto().includes("[profundidade]"), "a marca de profundidade sumiu");
});

// =====================================================================================================================
// K — as três classes do erro público.
// =====================================================================================================================

type Caso = readonly [string, unknown];

function conferirClasse(casos: readonly Caso[], esperada: string) {
  const errados = casos
    .map(([rotulo, erro]) => [rotulo, classifyPublicError(erro)] as const)
    .filter(([, classe]) => classe !== esperada);
  assert.deepEqual(errados, [], `deveriam ser ${esperada}`);
}

async function formasDoRedisFalso(linhas: readonly string[]): Promise<Caso[]> {
  const casos: Caso[] = [];
  for (const linha of linhas) casos.push([`Redis ${linha.slice(0, 30)}`, await erroDoRedisFalso(responde(linha))]);
  return casos;
}

test("K1 matriz infra_down: as formas reais de queda", async () => {
  const portaFechada = await medirPortaLivre();
  const redisLocalhost = await erroDe(() =>
    new RedisClient(`redis://usrrd-sentinela:pwdrd-sentinela@localhost:${portaFechada}/0`).ping(),
  );
  const redis127 = await erroDe(() =>
    new RedisClient(`redis://usrrd-sentinela:pwdrd-sentinela@127.0.0.1:${portaFechada}/0`).ping(),
  );
  const fetchFechado = await erroDe(() => fetch(`http://127.0.0.1:${portaFechada}/x`));
  const fin = await erroDoRedisFalso((socket) => socket.once("data", () => socket.end()));
  const quedasRedis = await formasDoRedisFalso([
    "-LOADING Redis is loading the dataset in memory",
    "-OOM command not allowed when used memory > 'maxmemory'.",
    "-BUSY Redis is busy running a script.",
    "-MASTERDOWN Link with MASTER is down and replica-serve-stale-data is set to 'no'.",
    "-CLUSTERDOWN The cluster is down",
    "-TRYAGAIN Multiple keys request during rehashing of slot",
    "-READONLY You can't write against a read only replica.",
  ]);

  let cadeia: Error = erroDeRede("connect ECONNREFUSED hstdb-sentinela:5439", "ECONNREFUSED");
  for (let nivel = 0; nivel < 5; nivel += 1) cadeia = new Error(`nivel ${nivel}`, { cause: cadeia });

  const casos: Caso[] = [
    ["P1001 modelo, host inexistente", p1001Modelo()],
    ["P2010 DatabaseNotReachable", p2010Inalcancavel()],
    ["P1000 AuthenticationFailed 28P01", erroPrisma("Authentication failed", "P1000", causaDoDriver({ kind: "AuthenticationFailed", originalCode: "28P01" }))],
    ["P2010 28P01", erroPrisma("Raw query failed. Code: `28P01`.", "P2010", causaDoDriver({ kind: "AuthenticationFailed", originalCode: "28P01" }))],
    ["P1003 DatabaseDoesNotExist 3D000", erroPrisma("Database `bcodb-sentinela` does not exist", "P1003", causaDoDriver({ kind: "DatabaseDoesNotExist", originalCode: "3D000" }))],
    ["P2010 57P01, banco derrubado no meio (fast)", erroPrisma("Raw query failed. Code: `57P01`.", "P2010", causaDoDriver({ kind: "postgres", originalCode: "57P01" }))],
    ["P2010 57P03, chamada seguinte com o banco desligando", erroPrisma("Raw query failed. Code: `57P03`.", "P2010", causaDoDriver({ kind: "postgres", originalCode: "57P03" }))],
    ["DriverAdapterError solto, 57P03", Object.assign(new Error("the database system is shutting down"), { name: "DriverAdapterError", cause: { kind: "postgres", originalCode: "57P03" } })],
    ["P2010 ConnectionClosed (immediate)", erroPrisma("Raw query failed. Code: `N/A`. Message: `Server has closed the connection.`", "P2010", causaDoDriver({ kind: "ConnectionClosed" }))],
    ["P2010 57014, statement timeout", erroPrisma("Raw query failed. Code: `57014`.", "P2010", causaDoDriver({ kind: "postgres", originalCode: "57014" }))],
    ["PrismaClientInitializationError", new Prisma.PrismaClientInitializationError("Can't reach database server", CLIENT_VERSION)],
    ["Redis 127.0.0.1 porta fechada (real)", redis127],
    ["AggregateError real (Redis localhost)", redisLocalhost],
    ["AggregateError sem code no topo", new AggregateError([erroDeRede("connect ECONNREFUSED 127.0.0.1:6391", "ECONNREFUSED")], "")],
    ["Redis host inexistente (ENOTFOUND)", erroDeRede("getaddrinfo ENOTFOUND hstrd-sentinela", "ENOTFOUND", { errno: -3008, syscall: "getaddrinfo", hostname: "hstrd-sentinela" })],
    ["fetch failed, porta fechada (real)", fetchFechado],
    ["Error de domínio que embrulha o fetch", new Error("falha ao consultar o provedor", { cause: fetchFechado })],
    ["S3 porta fechada", erroDeRede("connect ECONNREFUSED 127.0.0.1:6391", "ECONNREFUSED", { syscall: "connect", errno: -4078 })],
    ["S3 503 SlowDown", Object.assign(new Error("bucket bcodb-sentinela"), { name: "SlowDown", $fault: "server", $metadata: { httpStatusCode: 503 } })],
    ["cadeia de 5 cause, ECONNREFUSED na última", cadeia],
    // Emenda 1 (R2-01): o banco derrubado com chamada em voo, sem código, só a frase do `pg`.
    ["forma a: modelo em voo", Object.assign(new Error("Connection terminated unexpectedly"), { clientVersion: CLIENT_VERSION })],
    ["forma b: tx interativa, 2ª consulta $queryRaw", Object.assign(new Error("Client has encountered a connection error and is not queryable"), { clientVersion: CLIENT_VERSION })],
    ["forma c: tx interativa, modelo em voo", Object.assign(new Error("Connection terminated unexpectedly"), { clientVersion: CLIENT_VERSION })],
    ["forma d: tx interativa que só faz COMMIT (sem clientVersion)", new Error("Client has encountered a connection error and is not queryable")],
    ["forma e: tx em lote", Object.assign(new Error("Client has encountered a connection error and is not queryable"), { clientVersion: CLIENT_VERSION })],
    ["forma h: tx interativa, 2ª consulta de modelo", Object.assign(new Error("Client has encountered a connection error and is not queryable"), { clientVersion: CLIENT_VERSION })],
    ...[...PG_CONNECTION_LOST_MESSAGES].map((frase): Caso => [`frase do pg: ${frase}`, new Error(frase)]),
    // Emenda 1 (R2-04): a transação que não conseguiu conexão no prazo.
    ["P2028 de início (pool cheio)", erroPrisma("Transaction API error: Unable to start a transaction in the given time.", "P2028")],
    // Emenda 1 (R2-05): as 9 quedas do Redis.
    ["Redis FIN antes da resposta (real)", fin],
    ["Redis command timed out.", new RedisCommandError("Redis command timed out.")],
    ...quedasRedis,
  ];
  assert.equal(casos.length, 44);
  assert.equal((fin as Error).message, "Redis connection ended before a complete response.");
  conferirClasse(casos, "infra_down");
});

test("K2 matriz opaque: driver, sistema e SDK que não são queda", async () => {
  const enoent = await erroDe(() => readFile(`${RAIZ}nao-existe/hstdb-sentinela.txt`));
  const respostasRedis = await formasDoRedisFalso([
    "-NOAUTH Authentication required.",
    "-WRONGTYPE Operation against a key holding the wrong kind of value",
    "-ERR unknown command 'FOO'",
    "-WRONGPASS invalid username-password pair or user is disabled.",
    "-NOPERM this user has no permissions to run the 'ping' command",
    "-LOADINGX nao e prefixo inteiro",
    "?lixo",
  ]);
  const p2010 = (sqlState: string, kind: string) =>
    erroPrisma(`Raw query failed. Code: \`${sqlState}\`. Message: \`...\``, "P2010", causaDoDriver({ kind, originalCode: sqlState }));
  const casos: Caso[] = [
    ["22P02 $queryRaw (P2010)", p2010("22P02", "InvalidInputValue")],
    ["22P02 modelo (P2007)", erroPrisma("Invalid input value", "P2007", { modelName: "Tenant", ...causaDoDriver({ kind: "InvalidInputValue", originalCode: "22P02" }) })],
    ["22012 divisão por zero", p2010("22012", "postgres")],
    ["22001 texto longo", p2010("22001", "LengthMismatch")],
    ["23505 unique", p2010("23505", "UniqueConstraintViolation")],
    ["23503 fk", p2010("23503", "ForeignKeyConstraintViolation")],
    ["23502 not null", p2010("23502", "NullConstraintViolation")],
    ["42P01 tabela inexistente", p2010("42P01", "TableDoesNotExist")],
    ["P2025 não encontrado", erroPrisma("No record was found for an update.", "P2025", { modelName: "Tenant", operation: "an update" })],
    ["PrismaClientValidationError", new Prisma.PrismaClientValidationError("Unknown argument `campo`", { clientVersion: CLIENT_VERSION })],
    ["readFile ENOENT (real)", enoent],
    ["S3 404 NoSuchKey", Object.assign(new Error("bucket bcodb-sentinela"), { name: "NoSuchKey", $fault: "client", $metadata: { httpStatusCode: 404 } })],
    ["S3 403 AccessDenied", Object.assign(new Error("bucket bcodb-sentinela"), { name: "AccessDenied", $fault: "client", $metadata: { httpStatusCode: 403 } })],
    ["pg DatabaseError fora das classes de queda", Object.assign(new Error("duplicate key"), { code: "23505", severity: "ERROR" })],
    // Emenda 1: a transação que expirou continua 400; o Redis que não é queda volta a 400.
    ["P2028 de transação expirada", erroPrisma("Transaction API error: A commit cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms.", "P2028")],
    ...respostasRedis,
  ];
  assert.equal(casos.length, 22);
  assert.equal((respostasRedis[0][1] as Error).name, "RedisCommandError");
  conferirClasse(casos, "opaque");
});

test("K3 matriz text: erro de domínio, e a regra do pg é fechada", () => {
  const zod = z.object({ nome: z.string() }).safeParse({ nome: 1 });
  assert.equal(zod.success, false);
  class ErroDoDominio extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ErroDoDominio";
    }
  }
  const casos: Caso[] = [
    ["Error de domínio", new Error("Título obrigatório.")],
    ["ZodError", zod.success ? undefined : zod.error],
    ["Error com cause que não é erro", new Error("falhou", { cause: { detalhe: "texto" } })],
    ["frase do pg com sufixo (não é igual)", new Error("Connection terminated unexpectedly: detalhe")],
    ["classe própria com a frase exata", new ErroDoDominio("Connection terminated unexpectedly")],
    ["frase do pg com code de aplicação", Object.assign(new Error("Connection terminated"), { code: "X_APP" })],
  ];
  conferirClasse(casos, "text");
});
