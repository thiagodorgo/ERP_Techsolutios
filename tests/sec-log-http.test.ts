// B-SEC-LOG-SANITIZA — a resposta HTTP (H1 a H4f) e o texto de erro dos custos de nuvem (H8a a H8d).
//
// As variáveis de conexão SENTINELA entram em `process.env` ANTES do `await import(…)` dos módulos: o `env` é lido no
// import, e o saneador guarda os valores configurados (R3 e R4) na carga do módulo.
//
// O log do `sendRouteError` sai pelo logger do próprio módulo (`createLogger()` na carga de `http.ts`). Para lê-lo de
// dentro do teste, o `process.stdout.write` é trocado ANTES do import: o pino, quando acha o `write` trocado, escreve por
// ele (em vez de abrir o descritor 1 direto). A troca só guarda as linhas JSON do pino enquanto uma captura está aberta;
// todo o resto passa para o stdout de verdade.
//
// O H4f lê o log do sync de estoque num processo filho (`tests/fixtures/sec-log-h4f-material.mts`), como os testes B.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Prisma } from "@prisma/client";
import {
  DATABASE_URL_SENTINELA,
  REDIS_URL_SENTINELA,
  contarSentinelas,
  medirPortaLivre,
  sentinelasEncontrados,
} from "./helpers/sec-log-sentinelas.js";

process.env.DATABASE_URL = DATABASE_URL_SENTINELA;
process.env.REDIS_URL = REDIS_URL_SENTINELA;
process.env.LOG_LEVEL = "info";
process.env.CORE_SAAS_PERSISTENCE ??= "memory";

// ---------------------------------------------------------------------------------------------------------------------
// Captura das linhas do pino que saem pelo stdout (instalada antes de qualquer `createLogger()`).
// ---------------------------------------------------------------------------------------------------------------------

let captura: string[] | undefined;
const escreverNoStdout = process.stdout.write.bind(process.stdout);
process.stdout.write = ((pedaco: string | Uint8Array, ...resto: unknown[]) => {
  const texto = typeof pedaco === "string" ? pedaco : Buffer.from(pedaco).toString("utf8");
  if (captura && texto.startsWith('{"level":')) {
    captura.push(texto);
    return true;
  }
  return escreverNoStdout(pedaco as string, ...(resto as []));
}) as typeof process.stdout.write;

const { sendRouteError } = await import("../src/modules/core-saas/routes/http.js");
const { CoreSaasError } = await import("../src/modules/core-saas/types/core-saas.types.js");
const { RedisClient, RedisCommandError } = await import("../src/infra/redis/redis.client.js");
const { STORED_ERROR_FALLBACK, publicStoredError } = await import("../src/infra/logging/public-error.js");
const { syncMobileWorkOrderActions } = await import("../src/modules/mobile/mobile-work-order-sync.js");
const { syncMobileChecklistActions } = await import("../src/modules/mobile/mobile-checklist-sync.js");
const { syncMobileEvidenceActions } = await import("../src/modules/mobile/mobile-evidence-sync.js");
const { syncMobileInventoryActions } = await import("../src/modules/mobile/mobile-inventory-sync.js");
const { sanitizeCloudChargeError } = await import("../src/modules/cloud-charges/cloud-charge.service.js");
const { sanitizeCloudCostAllocationError } = await import(
  "../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"
);
const { sanitizeErrorMessage } = await import("../src/modules/cloud-costs/aws-cur.service.js");

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

type LinhaDeLog = { readonly level: number; readonly [campo: string]: unknown };

/** Roda `acao` e devolve as linhas do pino escritas no stdout enquanto ela corria. */
async function comLog<T>(acao: () => T | Promise<T>): Promise<{ readonly valor: T; readonly linhas: LinhaDeLog[] }> {
  const linhas: string[] = [];
  captura = linhas;
  try {
    const valor = await acao();
    return { valor, linhas: linhas.map((linha) => JSON.parse(linha) as LinhaDeLog) };
  } finally {
    captura = undefined;
  }
}

function assertSemSentinela(texto: string, rotulo = "saída") {
  assert.deepEqual(sentinelasEncontrados(texto), [], `sentinelas na ${rotulo}: ${texto.slice(0, 600)}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Formas de erro (as do F1.0 do diário do dev e as da Emenda 1).
// ---------------------------------------------------------------------------------------------------------------------

const CLIENT_VERSION = "7.8.0";

function erroPrisma(message: string, code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: CLIENT_VERSION, meta });
}

function causaDoDriver(cause: Record<string, unknown>) {
  return { driverAdapterError: { name: "DriverAdapterError", cause } };
}

/** P1001 do modelo: caminho, trecho do fonte, host e porta na mensagem; `meta` com host e porta. */
function p1001Modelo() {
  return erroPrisma(
    "\nInvalid `prisma.tenant.findFirst()` invocation in\n/srv/app/src/modules/core-saas/core-saas-prisma.adapter.ts:131:9\n\n  128 const tenant = await prisma.tenant.findFirst(\n→ 131 \nCan't reach database server at hstdb-sentinela:5439\n\nPlease make sure your database server is running at hstdb-sentinela:5439.",
    "P1001",
    { modelName: "Tenant", ...causaDoDriver({ kind: "DatabaseNotReachable", host: "hstdb-sentinela", port: 5439 }) },
  );
}

/** O texto que uma versão antiga gravou em `errorMessage` (P1001 do modelo, com caminho e host). */
const TEXTO_GRAVADO_ANTIGO =
  "\nInvalid `prisma.tenantCloudCharge.createMany()` invocation in\n/srv/app/src/modules/cloud-charges/cloud-charge-prisma.repository.ts:131:9\n\nCan't reach database server at hstdb-sentinela:5439";

async function erroDe(acao: () => Promise<unknown>): Promise<unknown> {
  try {
    await acao();
  } catch (error) {
    return error;
  }
  throw new Error("a ação não lançou");
}

/** O erro real do `RedisClient` do repo contra `localhost` numa porta fechada (`AggregateError` quando há 2 endereços). */
async function erroRedisLocalhost(): Promise<unknown> {
  const porta = await medirPortaLivre();
  return erroDe(() => new RedisClient(`redis://usrrd-sentinela:pwdrd-sentinela@localhost:${porta}/0`).ping());
}

/** Forma a do §E4.1 (modelo em voo): só a frase do `pg`, com `clientVersion`. */
function formaA() {
  return Object.assign(new Error("Connection terminated unexpectedly"), { clientVersion: CLIENT_VERSION });
}

/** Forma d do §E4.1 (transação que só faz COMMIT depois da queda): a frase do `pg`, SEM `clientVersion`. */
function formaD() {
  return new Error("Client has encountered a connection error and is not queryable");
}

// ---------------------------------------------------------------------------------------------------------------------
// A resposta do `sendRouteError`, numa resposta falsa que guarda o status e o corpo.
// ---------------------------------------------------------------------------------------------------------------------

type Corpo = { readonly error: { readonly code: string; readonly reason: string; readonly message: string } };

type RespostaFalsa = {
  statusCode: number;
  corpo: Corpo | undefined;
  readonly req: { readonly method: string; readonly originalUrl: string };
  status(codigo: number): RespostaFalsa;
  json(corpo: Corpo): RespostaFalsa;
};

function respostaFalsa(): RespostaFalsa {
  return {
    statusCode: 0,
    corpo: undefined,
    req: { method: "POST", originalUrl: "/api/v1/work-orders?filtro=hstdb-sentinela" },
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(corpo) {
      this.corpo = corpo;
      return this;
    },
  };
}

async function responder(error: unknown) {
  const resposta = respostaFalsa();
  const { linhas } = await comLog(() => sendRouteError(resposta as never, error));
  const corpo = JSON.stringify(resposta.corpo);
  return { status: resposta.statusCode, corpo: resposta.corpo, texto: corpo, linhas };
}

const CORPO_500: Corpo = { error: { code: "INTERNAL_SERVER_ERROR", reason: "unknown_error", message: "Unexpected error." } };
const CORPO_400_FIXO: Corpo = { error: { code: "BAD_REQUEST", reason: "invalid_request", message: "Invalid request." } };

const NIVEL_ERROR = 50;
const NIVEL_WARN = 40;

// =====================================================================================================================
// H1 a H3b — `sendRouteError`.
// =====================================================================================================================

test("H1 sendRouteError(P1001): 500 fixo, 0 sentinela, e 1 linha error saneada no log", async () => {
  const r = await responder(p1001Modelo());
  assert.equal(r.status, 500);
  assert.deepEqual(r.corpo, CORPO_500);
  assertSemSentinela(r.texto, "resposta");
  assert.equal(r.linhas.length, 1, `linhas de log: ${JSON.stringify(r.linhas)}`);
  const linha = r.linhas[0];
  assert.equal(linha.level, NIVEL_ERROR);
  assertSemSentinela(JSON.stringify(linha), "linha de log");
  assert.equal((linha.err as { code?: string }).code, "P1001");
  assert.equal(linha.method, "POST");
  assert.equal(linha.path, "/api/v1/work-orders");
});

test("H1b sendRouteError(AggregateError real do RedisClient contra localhost): 500 fixo", async () => {
  const erro = await erroRedisLocalhost();
  const r = await responder(erro);
  assert.equal(r.status, 500, `classe errada para ${(erro as Error).name}: ${r.texto}`);
  assert.deepEqual(r.corpo, CORPO_500);
  assertSemSentinela(r.texto + JSON.stringify(r.linhas));
});

test("H1c sendRouteError(P1001 forma modelo, com caminho e trecho do fonte): corpo sem prisma., sem caminho, sem host", async () => {
  const r = await responder(p1001Modelo());
  for (const proibido of ["prisma.", "/srv/app", "core-saas-prisma.adapter", "findFirst", "hstdb-sentinela", "5439"]) {
    assert.equal(r.texto.includes(proibido), false, `${proibido} no corpo: ${r.texto}`);
  }
});

test("H1d sendRouteError(22P02): 400 Invalid request., sem Raw query failed, 1 linha warn", async () => {
  const erro = erroPrisma(
    "\nInvalid `prisma.$queryRaw()` invocation:\n\n\nRaw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: \"nao-e-uuid\"`",
    "P2010",
    causaDoDriver({ kind: "InvalidInputValue", originalCode: "22P02" }),
  );
  const r = await responder(erro);
  assert.equal(r.status, 400);
  assert.deepEqual(r.corpo, CORPO_400_FIXO);
  assert.equal(r.texto.includes("Raw query failed"), false, r.texto);
  assert.equal(r.linhas.length, 1, `linhas de log: ${JSON.stringify(r.linhas)}`);
  assert.equal(r.linhas[0].level, NIVEL_WARN);
});

test("H1e sendRouteError(ENOENT com caminho) e (S3 NoSuchKey com bucket): 400 fixo, corpo sem o caminho e sem o bucket", async () => {
  const enoent = await erroDe(() => readFile(`${RAIZ}nao-existe-h1e/arquivo-h1e.txt`));
  const s3 = Object.assign(new Error("The specified key does not exist. Bucket: bucket-h1e-privado, key: chave-h1e"), {
    name: "NoSuchKey",
    $fault: "client",
    $metadata: { httpStatusCode: 404 },
  });
  for (const [rotulo, erro, proibidos] of [
    ["ENOENT", enoent, ["nao-existe-h1e", "arquivo-h1e"]],
    ["S3 NoSuchKey", s3, ["bucket-h1e-privado", "chave-h1e"]],
  ] as const) {
    const r = await responder(erro);
    assert.equal(r.status, 400, rotulo);
    assert.deepEqual(r.corpo, CORPO_400_FIXO, rotulo);
    for (const proibido of proibidos) assert.equal(r.texto.includes(proibido), false, `${rotulo}: ${r.texto}`);
  }
});

test("H1f sendRouteError(forma a com clientVersion) e (forma d sem clientVersion): 500 fixo nas duas, 1 linha error", async () => {
  for (const [rotulo, erro] of [
    ["forma a", formaA()],
    ["forma d", formaD()],
  ] as const) {
    const r = await responder(erro);
    assert.equal(r.status, 500, `${rotulo}: ${r.texto}`);
    assert.deepEqual(r.corpo, CORPO_500, rotulo);
    assert.equal(r.linhas.length, 1, `${rotulo}: ${JSON.stringify(r.linhas)}`);
    assert.equal(r.linhas[0].level, NIVEL_ERROR, rotulo);
  }
});

test("H1g sendRouteError(RedisCommandError NOAUTH): 400 fixo sem NOAUTH; (LOADING): 500 fixo", async () => {
  const noauth = await responder(new RedisCommandError("NOAUTH Authentication required."));
  assert.equal(noauth.status, 400, noauth.texto);
  assert.deepEqual(noauth.corpo, CORPO_400_FIXO);
  assert.equal(noauth.texto.includes("NOAUTH"), false, noauth.texto);
  const loading = await responder(new RedisCommandError("LOADING Redis is loading the dataset in memory"));
  assert.equal(loading.status, 500, loading.texto);
  assert.deepEqual(loading.corpo, CORPO_500);
});

test("H1h sendRouteError(P2028 de início): 500 fixo; (P2028 de transação expirada): 400 fixo", async () => {
  const inicio = await responder(
    erroPrisma("Transaction API error: Unable to start a transaction in the given time.", "P2028"),
  );
  assert.equal(inicio.status, 500, inicio.texto);
  assert.deepEqual(inicio.corpo, CORPO_500);
  const expirada = await responder(
    erroPrisma(
      "Transaction API error: A commit cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms.",
      "P2028",
    ),
  );
  assert.equal(expirada.status, 400, expirada.texto);
  assert.deepEqual(expirada.corpo, CORPO_400_FIXO);
});

test("H2 sendRouteError(Error de domínio): 400 com a mensagem intacta, sem log", async () => {
  const r = await responder(new Error("Título obrigatório."));
  assert.equal(r.status, 400);
  assert.deepEqual(r.corpo, { error: { code: "BAD_REQUEST", reason: "invalid_request", message: "Título obrigatório." } });
  assert.equal(r.linhas.length, 0);
});

test("H3 sendRouteError(Error com URL de conexão na mensagem): 400 e 0 sentinela", async () => {
  const r = await responder(new Error(`falha em ${DATABASE_URL_SENTINELA} e em ${REDIS_URL_SENTINELA}`));
  assert.equal(r.status, 400);
  assert.equal(r.corpo?.error.code, "BAD_REQUEST");
  assert.equal(r.corpo?.error.reason, "invalid_request");
  assertSemSentinela(r.texto, "resposta");
});

test("H3b sendRouteError(erro de domínio que embrulha getaddrinfo ENOTFOUND): o status do domínio, mensagem fixa", async () => {
  const dominio = await responder(new CoreSaasError(409, "CONFLICT", "tenant_conflict", "falhou: getaddrinfo ENOTFOUND db.interno"));
  assert.equal(dominio.status, 409);
  assert.deepEqual(dominio.corpo, { error: { code: "CONFLICT", reason: "tenant_conflict", message: "Unexpected error." } });
  const formaDeRota = await responder({
    statusCode: 503,
    code: "SERVICE_UNAVAILABLE",
    reason: "sync_busy",
    message: "falhou: getaddrinfo ENOTFOUND db.interno",
  });
  assert.equal(formaDeRota.status, 503);
  assert.deepEqual(formaDeRota.corpo, {
    error: { code: "SERVICE_UNAVAILABLE", reason: "sync_busy", message: "Unexpected error." },
  });
});

// =====================================================================================================================
// H4a a H4f — o ramo genérico dos 4 syncs do app, pela função pública.
// =====================================================================================================================

type Ator = Parameters<typeof syncMobileWorkOrderActions>[0];

function ator(roles: readonly string[], permissions: readonly string[]): Ator {
  return { userId: randomUUID(), tenantId: randomUUID(), roles, permissions, explicitPermissions: true } as unknown as Ator;
}

/** Serviço falso em que todo método lança `erro()`. */
function servicoQueLanca(erro: () => unknown) {
  return new Proxy(
    {},
    {
      get: (_alvo, chave) =>
        chave === "then"
          ? undefined
          : async () => {
              throw erro();
            },
    },
  );
}

const AGORA = "2026-11-12T12:00:00.000Z";

type Rejeitada = { readonly status?: string; readonly error?: { readonly reason?: string; readonly message?: string } };

function rejeitadas(saida: unknown): readonly Rejeitada[] {
  return (saida as { rejected?: readonly Rejeitada[] }).rejected ?? [];
}

function conferirRejeitadaFixa(rotulo: string, saida: unknown) {
  const texto = JSON.stringify(saida);
  const lista = rejeitadas(saida);
  assert.equal(lista.length, 1, `${rotulo}: ${texto.slice(0, 400)}`);
  assert.equal(lista[0].status, "rejected", rotulo);
  assert.equal(lista[0].error?.message, "Unexpected error.", `${rotulo}: ${texto.slice(0, 400)}`);
  assertSemSentinela(texto, `saída do ${rotulo}`);
}

async function syncOrdemDeServico(erro: () => unknown) {
  return syncMobileWorkOrderActions(
    ator(["manager"], ["work_orders:status", "work_orders:create", "work_orders:assign", "work_orders:update"]),
    {
      client_batch_id: randomUUID(),
      actions: [
        {
          client_action_id: randomUUID(),
          type: "work_order.status_change",
          payload: { work_order_id: randomUUID(), status: "en_route" },
          local_created_at: AGORA,
        },
      ],
    },
    async () => servicoQueLanca(erro) as never,
  );
}

test("H4a sync de OS com serviço que lança P1001: rejected, Unexpected error., 0 sentinela", async () => {
  conferirRejeitadaFixa("sync de OS", await syncOrdemDeServico(p1001Modelo));
});

test("H4b sync de vistoria com serviço que lança P1001: rejected, Unexpected error., 0 sentinela", async () => {
  const saida = await syncMobileChecklistActions(
    ator(["manager"], ["checklist_runs:complete", "checklist_runs:update", "checklist_runs:create"]),
    {
      client_batch_id: randomUUID(),
      actions: [
        {
          client_action_id: randomUUID(),
          type: "checklist.complete",
          payload: { run_id: randomUUID() },
          local_created_at: AGORA,
        },
      ],
    },
    async () => servicoQueLanca(p1001Modelo) as never,
  );
  conferirRejeitadaFixa("sync de vistoria", saida);
});

test("H4c sync de evidência com serviço que lança P1001: rejected, Unexpected error., 0 sentinela", async () => {
  const saida = await syncMobileEvidenceActions(
    ator(["manager"], ["work_orders:update"]),
    {
      client_batch_id: randomUUID(),
      actions: [
        {
          client_evidence_id: randomUUID(),
          type: "evidence.work_order_photo",
          payload: { work_order_id: randomUUID() },
          local_created_at: AGORA,
        },
      ],
    },
    async () => servicoQueLanca(p1001Modelo) as never,
  );
  conferirRejeitadaFixa("sync de evidência", saida);
});

test("H4d sync de estoque, ramo genérico (quantity lança P1001 na 2ª leitura): rejected, invalid_action, Unexpected error., 0 sentinela", async () => {
  const nunca = servicoQueLanca(() => new Error("o serviço não deveria ser chamado"));
  for (const tipo of ["inventory.reserve", "inventory.consume", "inventory.shortage_report"]) {
    const payload: Record<string, unknown> = { item_id: "itm-h4d", warehouse_id: "wh-h4d", sku: "ELE-0102" };
    let leituras = 0;
    Object.defineProperty(payload, "quantity", {
      enumerable: true,
      get() {
        leituras += 1;
        if (leituras <= 1) return 1;
        throw p1001Modelo();
      },
    });
    const saida = await syncMobileInventoryActions(
      ator(["inventory"], ["inventory.read", "inventory.manage"]),
      { client_batch_id: randomUUID(), actions: [{ client_action_id: randomUUID(), type: tipo, local_created_at: AGORA, payload }] },
      { inventory: nunca as never, workOrders: nunca as never, workOrdersModuleEnabled: async () => true },
    );
    conferirRejeitadaFixa(`sync de estoque (${tipo})`, saida);
    assert.equal(rejeitadas(saida)[0].error?.reason, "invalid_action", tipo);
    assert.ok(leituras >= 2, `${tipo}: o caminho não chegou à 2ª leitura do quantity (${leituras})`);
  }
});

test("H4e sync de OS com o AggregateError real e com a forma d: rejected, mensagem fixa (nunca vazia)", async () => {
  const agregado = await erroRedisLocalhost();
  for (const [rotulo, erro] of [
    [`erro real do Redis (${(agregado as Error).name})`, agregado],
    ["forma d", formaD()],
  ] as const) {
    conferirRejeitadaFixa(`sync de OS, ${rotulo}`, await syncOrdemDeServico(() => erro));
  }
});

test("H4f material do sync de estoque com serviço que lança P1001: o lote lança 500 fixo, e o log tem 0 sentinela", () => {
  const filho = spawnSync(process.execPath, ["--import", "tsx", "tests/fixtures/sec-log-h4f-material.mts"], {
    cwd: RAIZ,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      DATABASE_URL: DATABASE_URL_SENTINELA,
      REDIS_URL: REDIS_URL_SENTINELA,
      CORE_SAAS_PERSISTENCE: "memory",
      LOG_LEVEL: "info",
      NODE_ENV: "test",
    },
    timeout: 120_000,
  });
  const saida = `${filho.stdout ?? ""}${filho.stderr ?? ""}`;
  const linhas = saida.split(/\r?\n/);
  const resultados = linhas
    .filter((linha) => linha.startsWith("R "))
    .map((linha) => JSON.parse(linha.slice(2)) as Record<string, unknown>);
  const observado = {
    status: filho.status,
    resultados: resultados.map(({ caso, lancou, statusCode, code, reason, message }) => ({
      caso,
      lancou,
      statusCode,
      code,
      reason,
      message,
    })),
    sentinelas: contarSentinelas(saida),
    linhasDeLog: linhas.filter((linha) => linha.includes('"event":"mobile_inventory_sync.material_failure"')).length,
  };
  const esperadoPorCaso = (caso: string) => ({
    caso,
    lancou: true,
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    reason: "unexpected_error",
    message: "Unexpected error.",
  });
  assert.deepStrictEqual(
    observado,
    {
      status: 0,
      resultados: [esperadoPorCaso("work_order_material.add"), esperadoPorCaso("work_order_material.remove")],
      sentinelas: 0,
      linhasDeLog: 2,
    },
    `saída do filho:\n${saida.slice(0, 3000)}`,
  );
});

// =====================================================================================================================
// H8a a H8d — o texto de erro dos custos de nuvem.
// =====================================================================================================================

const SEGREDOS = "token Bearer abc.def-123 e chave AKIAABCDEFGHIJKLMNOP";

function conferirFuncaoDeCusto(rotulo: string, sanear: (error: unknown) => string, mensagemFixa: string) {
  const driver = sanear(p1001Modelo());
  assert.equal(driver, mensagemFixa, `${rotulo}: ${driver}`);
  for (const proibido of ["hstdb-sentinela", "5439", "/srv/app", "prisma."]) {
    assert.equal(driver.includes(proibido), false, `${rotulo}: ${proibido}`);
  }
  assert.equal(sanear(new Error("Invalid AWS CUR CSV at data row 2.")), "Invalid AWS CUR CSV at data row 2.", rotulo);
  const comSegredo = sanear(new Error(`falhou: ${SEGREDOS}`));
  assert.equal(comSegredo.includes("abc.def-123"), false, `${rotulo}: ${comSegredo}`);
  assert.equal(comSegredo.includes("AKIAABCDEFGHIJKLMNOP"), false, `${rotulo}: ${comSegredo}`);
  assert.ok(comSegredo.includes("Bearer [REDACTED]"), `${rotulo}: ${comSegredo}`);
  assert.ok(comSegredo.includes("[REDACTED_AWS_ACCESS_KEY]"), `${rotulo}: ${comSegredo}`);
}

test("H8a sanitizeCloudChargeError: P1001 vira a mensagem fixa do módulo; domínio passa; Bearer e AKIA redigidos", () => {
  conferirFuncaoDeCusto("cobrança", sanitizeCloudChargeError, "Cloud charge calculation failed.");
});

test("H8b sanitizeCloudCostAllocationError: P1001 vira a mensagem fixa do módulo; domínio passa; Bearer e AKIA redigidos", () => {
  conferirFuncaoDeCusto("rateio", sanitizeCloudCostAllocationError, "Cloud cost allocation failed.");
});

test("H8c sanitizeErrorMessage (AWS CUR): P1001 vira a mensagem fixa do módulo; domínio passa; Bearer e AKIA redigidos", () => {
  conferirFuncaoDeCusto("AWS CUR", sanitizeErrorMessage, "AWS CUR import failed.");
});

test("H8d publicStoredError: texto antigo de driver vira a mensagem fixa; undefined e null voltam como vieram; domínio passa", () => {
  assert.equal(publicStoredError(TEXTO_GRAVADO_ANTIGO), STORED_ERROR_FALLBACK);
  assert.equal(STORED_ERROR_FALLBACK, "Execution failed. See server logs.");
  assert.equal(publicStoredError(undefined), undefined);
  assert.equal(publicStoredError(null), null);
  assert.equal(publicStoredError("Invalid AWS CUR CSV at data row 2."), "Invalid AWS CUR CSV at data row 2.");
});
