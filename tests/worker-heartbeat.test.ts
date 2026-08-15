import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  WORKER_HEALTH_MEASURE,
  WORKER_HEARTBEAT_KEY,
  WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL,
  WORKER_HEARTBEAT_TTL_SECONDS,
  WORKER_HEARTBEAT_WRITE_INTERVAL_MS,
  WorkerHeartbeatWriter,
  evaluateWorkerHealth,
  getWorkerHealthReport,
  publishWorkerHealthSource,
  resetWorkerHealthSourceForTests,
} from "../src/infra/jobs/job.heartbeat.js";
import { JobQueue } from "../src/infra/jobs/job.queue.js";
import { JobRegistry } from "../src/infra/jobs/job.registry.js";
import { JobWorker } from "../src/infra/jobs/job.worker.js";
import { getRedisClient } from "../src/infra/redis/redis.client.js";

// B-O6R-05 (Ω6R-DIN-006) — sinal de vida do worker de jobs + GET /api/v1/health/worker.
//
// Todo teste de tempo usa RELÓGIO INJETADO; nenhum `sleep` no arquivo. As duas metades são
// testadas separadas de propósito: o estado do PROCESSO (o que o endpoint responde) e a ESCRITA
// no Redis (o contrato que o B-O6R-08 vai ler).

const BASE = new Date("2026-08-15T12:00:00.000Z");
const silentLogger = { info() {}, warn() {}, error() {} };

function at(offsetMs: number): Date {
  return new Date(BASE.getTime() + offsetMs);
}

// ---------------------------------------------------------------------------------------------
// Núcleo puro — os quatro estados
// ---------------------------------------------------------------------------------------------

test("tick resolvido há menos de 60s ⇒ up/200 com a idade em segundos", () => {
  const report = evaluateWorkerHealth({
    expected: "local",
    lastSuccessfulTickAt: at(-8_000),
    startedAt: at(-600_000),
    now: BASE,
  });

  assert.deepEqual(report, { status: "up", expected: "local", ageSeconds: 8, httpStatus: 200 });
});

test("a fronteira dos 60s separa up de stale (59s ainda vivo, 61s já não)", () => {
  const alive = evaluateWorkerHealth({
    expected: "local",
    lastSuccessfulTickAt: at(-59_000),
    startedAt: at(-600_000),
    now: BASE,
  });
  const dead = evaluateWorkerHealth({
    expected: "local",
    lastSuccessfulTickAt: at(-61_000),
    startedAt: at(-600_000),
    now: BASE,
  });

  assert.equal(alive.status, "up");
  assert.equal(alive.httpStatus, 200);
  // Sinal velho num processo antigo é `stale`, e `stale` é 503 — inclusive com idade conhecida.
  assert.equal(dead.status, "stale");
  assert.equal(dead.httpStatus, 503);
  assert.equal(dead.ageSeconds, 61);
});

test("worker esperado sem nenhum tick, processo recém-subido ⇒ starting/200", () => {
  const report = evaluateWorkerHealth({
    expected: "local",
    lastSuccessfulTickAt: undefined,
    startedAt: at(-30_000),
    now: BASE,
  });

  assert.deepEqual(report, {
    status: "starting",
    expected: "local",
    ageSeconds: null,
    httpStatus: 200,
  });
});

test("worker esperado sem tick além da carência de boot ⇒ stale/503", () => {
  const report = evaluateWorkerHealth({
    expected: "local",
    lastSuccessfulTickAt: undefined,
    startedAt: at(-91_000),
    now: BASE,
  });

  assert.deepEqual(report, {
    status: "stale",
    expected: "local",
    ageSeconds: null,
    httpStatus: 503,
  });
});

test("worker não esperado nunca vira 503, por mais velho que seja o processo", () => {
  const report = evaluateWorkerHealth({
    expected: "none",
    lastSuccessfulTickAt: undefined,
    startedAt: at(-86_400_000),
    now: BASE,
  });

  assert.deepEqual(report, {
    status: "not_expected",
    expected: "none",
    ageSeconds: null,
    httpStatus: 200,
  });
});

test("processo sem fonte publicada (todo import de app.ts) responde not_expected/200", () => {
  resetWorkerHealthSourceForTests();

  assert.deepEqual(getWorkerHealthReport(BASE), {
    status: "not_expected",
    expected: "none",
    ageSeconds: null,
    httpStatus: 200,
  });
});

// ---------------------------------------------------------------------------------------------
// O carimbo do laço — a distinção que dá sentido ao sinal
// ---------------------------------------------------------------------------------------------

class EmptyQueue extends JobQueue {
  constructor() {
    super({ redis: getRedisClient() });
  }

  override async dequeue(): Promise<null> {
    return null;
  }
}

class RejectingQueue extends JobQueue {
  constructor(private readonly onCall: () => void) {
    super({ redis: getRedisClient() });
  }

  override async dequeue(): Promise<never> {
    this.onCall();
    throw new Error("redis_down");
  }
}

test("um tick que RESOLVE (fila vazia) carimba lastSuccessfulTickAt", async () => {
  const worker = new JobWorker({
    queue: new EmptyQueue(),
    registry: new JobRegistry(),
    logger: silentLogger,
  });

  assert.equal(worker.lastSuccessfulTickAt, undefined);

  const before = Date.now();
  assert.equal(await worker.processNextJob(), false);

  assert.ok(worker.lastSuccessfulTickAt instanceof Date);
  assert.ok((worker.lastSuccessfulTickAt as Date).getTime() >= before);
});

test("um tick que REJEITA (Redis fora) NÃO carimba — o worker inútil não pode parecer vivo", async () => {
  // MUTAÇÃO QUE ESTE TESTE MATA: mover o carimbo para o topo do callback do setInterval (ou para
  // o topo de processNextJob). Lá, um dequeue que lança contaria como tick vivo e o
  // /health/worker responderia "up" com a fila inalcançável.
  const worker = new JobWorker({
    queue: new RejectingQueue(() => {}),
    registry: new JobRegistry(),
    logger: silentLogger,
  });

  await assert.rejects(() => worker.processNextJob(), /redis_down/);

  assert.equal(worker.lastSuccessfulTickAt, undefined);
});

test("o LAÇO com a fila inalcançável gira e mesmo assim não renova o sinal", async () => {
  let sawCall = () => {};
  const seen = new Promise<void>((resolve) => {
    sawCall = resolve;
  });
  const worker = new JobWorker({
    queue: new RejectingQueue(() => sawCall()),
    registry: new JobRegistry(),
    logger: silentLogger,
  });

  worker.start(5);

  try {
    await seen;
    // Duas voltas do event loop para a rejeição terminar de propagar — não é espera de relógio.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(worker.lastSuccessfulTickAt, undefined);
  } finally {
    worker.stop();
  }
});

// ---------------------------------------------------------------------------------------------
// A escrita no Redis
// ---------------------------------------------------------------------------------------------

function recordingRedis() {
  const commands: string[][] = [];

  return {
    commands,
    async command(...args: string[]): Promise<string> {
      commands.push(args);

      return "OK";
    },
  };
}

test("invariante: o TTL do sinal cobre várias janelas de escrita (nenhuma constante anda sozinha)", () => {
  // MUTAÇÃO QUE ESTE TESTE MATA: baixar `WORKER_HEARTBEAT_TTL_SECONDS` de 45 para 5 (ou subir o
  // intervalo de escrita acima de um terço do TTL). Antes disto, a mutação SOBREVIVIA à suíte
  // inteira, porque todos os outros casos comparam contra a própria constante mutada — e o dano é
  // silencioso: com o TTL menor que o intervalo, a chave fica AUSENTE a maior parte do tempo com o
  // laço vivo, e o leitor do B-O6R-08 leria "worker morto" num worker sadio.
  assert.ok(
    WORKER_HEARTBEAT_TTL_SECONDS * 1_000 >=
      WORKER_HEARTBEAT_WRITE_INTERVAL_MS * WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL,
    `TTL de ${WORKER_HEARTBEAT_TTL_SECONDS}s não cobre ${WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL} ` +
      `renovações de ${WORKER_HEARTBEAT_WRITE_INTERVAL_MS}ms`,
  );
  assert.ok(WORKER_HEARTBEAT_MIN_RENEWALS_PER_TTL >= 2, "uma escrita que falha não pode apagar o sinal");
});

test("o writer grava SET … EX na chave namespeada, com ida real ao Redis", async () => {
  const redis = getRedisClient();
  assert.equal(await redis.ping(), true);

  await redis.command("DEL", WORKER_HEARTBEAT_KEY);

  try {
    const writer = new WorkerHeartbeatWriter({
      redis,
      now: () => BASE,
      getLastSuccessfulTickAt: () => at(-1_000),
    });

    assert.equal(writer.key, WORKER_HEARTBEAT_KEY);
    assert.equal(WORKER_HEARTBEAT_KEY, "erp:jobs:worker:heartbeat");
    assert.equal(await writer.writeOnce(), true);

    const raw = await redis.command("GET", WORKER_HEARTBEAT_KEY);
    assert.equal(typeof raw, "string");

    const value = JSON.parse(raw as string) as { at: string; instanceId: string };
    assert.equal(value.at, BASE.toISOString());
    assert.equal(typeof value.instanceId, "string");
    assert.ok(value.instanceId.length > 0);

    // Liveness TEM que expirar sozinha — sem TTL, um laço morto deixaria o sinal para sempre.
    const ttl = Number(await redis.command("TTL", WORKER_HEARTBEAT_KEY));
    assert.ok(ttl > 0 && ttl <= WORKER_HEARTBEAT_TTL_SECONDS, `TTL fora da faixa: ${ttl}`);
    // …e tem de sobreviver ao intervalo entre duas escritas. Aqui o TTL é o OBSERVADO no Redis, não
    // a constante: é o que o leitor do B-O6R-08 vai encontrar na chave.
    assert.ok(
      ttl * 1_000 > WORKER_HEARTBEAT_WRITE_INTERVAL_MS,
      `TTL observado (${ttl}s) não cobre o intervalo de escrita (${WORKER_HEARTBEAT_WRITE_INTERVAL_MS}ms): ` +
        `a chave ficaria ausente entre duas renovações, com o laço vivo`,
    );
  } finally {
    await redis.command("DEL", WORKER_HEARTBEAT_KEY);
  }
});

test("o throttle não deixa o writer escrever duas vezes dentro do intervalo", async () => {
  const redis = recordingRedis();
  let clock = BASE;
  const writer = new WorkerHeartbeatWriter({
    redis,
    now: () => clock,
    getLastSuccessfulTickAt: () => new Date(clock.getTime() - 1_000),
  });

  assert.equal(await writer.writeOnce(), true);

  clock = at(WORKER_HEARTBEAT_WRITE_INTERVAL_MS - 1);
  assert.equal(await writer.writeOnce(), false);

  clock = at(WORKER_HEARTBEAT_WRITE_INTERVAL_MS);
  assert.equal(await writer.writeOnce(), true);

  assert.equal(redis.commands.length, 2);
  assert.deepEqual(redis.commands[0], [
    "SET",
    WORKER_HEARTBEAT_KEY,
    JSON.stringify({ at: BASE.toISOString(), instanceId: instanceIdOf(redis.commands[0]) }),
    "EX",
    String(WORKER_HEARTBEAT_TTL_SECONDS),
  ]);
});

test("laço morto para de renovar o sinal (a chave expira sozinha)", async () => {
  const redis = recordingRedis();
  const frozenTick = at(-120_000);
  const writer = new WorkerHeartbeatWriter({
    redis,
    now: () => BASE,
    getLastSuccessfulTickAt: () => frozenTick,
  });

  assert.equal(await writer.writeOnce(), false);
  assert.equal(redis.commands.length, 0);
});

test("sem nenhum tick, o writer nunca escreve", async () => {
  const redis = recordingRedis();
  const writer = new WorkerHeartbeatWriter({
    redis,
    now: () => BASE,
    getLastSuccessfulTickAt: () => undefined,
  });

  assert.equal(await writer.writeOnce(), false);
  assert.equal(redis.commands.length, 0);
});

test("Redis fora avisa e devolve falso, sem derrubar o processo", async () => {
  const warnings: unknown[][] = [];
  const writer = new WorkerHeartbeatWriter({
    redis: {
      async command(): Promise<never> {
        throw new Error("connect ECONNREFUSED");
      },
    },
    now: () => BASE,
    getLastSuccessfulTickAt: () => at(-1_000),
    logger: {
      warn(...data: unknown[]) {
        warnings.push(data);
      },
    },
  });

  assert.equal(await writer.writeOnce(), false);
  assert.equal(warnings.length, 1);
});

function instanceIdOf(command: string[] | undefined): string {
  const payload = JSON.parse(String(command?.[2] ?? "{}")) as { instanceId?: string };

  return String(payload.instanceId);
}

// ---------------------------------------------------------------------------------------------
// O contrato HTTP — sempre lido no CORPO, nunca só no código de status
// ---------------------------------------------------------------------------------------------

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);

  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    resetWorkerHealthSourceForTests();
    await closeServer(server);
  }
}

test("GET /health/worker responde up/200 quando o laço deste processo bateu agora", async () => {
  await withApi(async (baseUrl) => {
    publishWorkerHealthSource({
      expected: "local",
      getLastSuccessfulTickAt: () => new Date(),
      startedAt: new Date(Date.now() - 600_000),
    });

    const response = await fetch(`${baseUrl}/api/v1/health/worker`);
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(response.status, 200);
    // O corpo é a fonte da verdade do smoke — não basta o 200.
    assert.equal(body.status, "up");
    assert.equal(body.expected, "local");
    assert.equal(body.service, "erp-techsolutions-api");
    assert.equal(body.measures, WORKER_HEALTH_MEASURE);
    assert.equal(typeof body.ageSeconds, "number");
  });
});

test("GET /health/worker responde stale/503 quando o laço morreu depois do boot", async () => {
  await withApi(async (baseUrl) => {
    publishWorkerHealthSource({
      expected: "local",
      getLastSuccessfulTickAt: () => undefined,
      startedAt: new Date(Date.now() - 120_000),
    });

    const response = await fetch(`${baseUrl}/api/v1/health/worker`);
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(response.status, 503);
    assert.equal(body.status, "stale");
    assert.equal(body.ageSeconds, null);
  });
});

test("GET /health/worker responde not_expected/200 onde ninguém prometeu worker", async () => {
  await withApi(async (baseUrl) => {
    resetWorkerHealthSourceForTests();

    const response = await fetch(`${baseUrl}/api/v1/health/worker`);
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(body.status, "not_expected");
    assert.equal(body.expected, "none");
  });
});

test("o corpo de /health/worker é MÍNIMO — nem version, nem commit, nem instanceId", async () => {
  await withApi(async (baseUrl) => {
    publishWorkerHealthSource({
      expected: "local",
      getLastSuccessfulTickAt: () => new Date(),
      startedAt: new Date(),
    });

    const response = await fetch(`${baseUrl}/api/v1/health/worker`);
    const body = (await response.json()) as Record<string, unknown>;

    // MUTAÇÃO QUE ESTE TESTE MATA: acrescentar buildInfo(), o instante do último sinal ou a
    // identidade da instância ao corpo público.
    assert.deepEqual(Object.keys(body).sort(), [
      "ageSeconds",
      "expected",
      "measures",
      "service",
      "status",
      "timestamp",
    ]);
  });
});

test("/health/ready REPORTA o worker e NÃO muda o veredito 200/503", async () => {
  await withApi(async (baseUrl) => {
    // Worker propositalmente morto: se alguém somar o worker ao cálculo, este teste cai.
    publishWorkerHealthSource({
      expected: "local",
      getLastSuccessfulTickAt: () => undefined,
      startedAt: new Date(Date.now() - 120_000),
    });

    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    const body = (await response.json()) as {
      status: string;
      checks: {
        postgres: { status: string };
        redis: { status: string };
        worker: { status: string; ageSeconds: number | null };
      };
    };

    assert.equal(body.checks.worker.status, "stale");
    assert.equal(body.checks.worker.ageSeconds, null);

    // Q2 — o veredito continua sendo SÓ Postgres ∧ Redis. Com as duas dependências de pé o
    // readiness é 200 APESAR do worker morto; sem elas é 503 pelo motivo de sempre.
    const ready = body.checks.postgres.status === "up" && body.checks.redis.status === "up";
    assert.equal(response.status, ready ? 200 : 503);
    assert.equal(body.status, ready ? "ready" : "not_ready");
  });
});

test("headers forjados não mudam a resposta de /health/worker", async () => {
  await withApi(async (baseUrl) => {
    publishWorkerHealthSource({
      expected: "local",
      getLastSuccessfulTickAt: () => new Date(),
      startedAt: new Date(),
    });

    const plain = await fetch(`${baseUrl}/api/v1/health/worker`);
    const forged = await fetch(`${baseUrl}/api/v1/health/worker`, {
      headers: {
        "x-tenant-id": "00000000-0000-0000-0000-000000000000",
        "x-user-id": "forjado",
        "x-role": "platform_admin",
        "x-permissions": "*",
        authorization: "Bearer forjado",
      },
    });

    const plainBody = (await plain.json()) as Record<string, unknown>;
    const forgedBody = (await forged.json()) as Record<string, unknown>;

    assert.equal(plain.status, forged.status);
    // Idêntica campo a campo; só o `timestamp` difere, porque é o relógio.
    delete plainBody.timestamp;
    delete forgedBody.timestamp;
    assert.deepEqual(forgedBody, plainBody);
  });
});

test("§2.8 — nem /health/worker nem /health/ready vazam URL, chave de fila ou instância", async () => {
  await withApi(async (baseUrl) => {
    publishWorkerHealthSource({
      expected: "local",
      getLastSuccessfulTickAt: () => new Date(),
      startedAt: new Date(),
    });

    const forbidden = [
      "postgresql://",
      "redis://",
      "password",
      "@localhost",
      "DATABASE_URL",
      "REDIS_URL",
      "erp:jobs",
      "instanceId",
      process.env.REDIS_URL ?? "redis://localhost:6379",
    ];

    for (const path of ["/api/v1/health/worker", "/api/v1/health/ready"]) {
      const response = await fetch(`${baseUrl}${path}`);
      const raw = JSON.stringify(await response.json());

      for (const secret of forbidden) {
        assert.equal(raw.includes(secret), false, `${path} não pode conter "${secret}"`);
      }
    }
  });
});

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
