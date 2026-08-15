import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  startJobWorkerIfEnabled,
  type JobWorkerBootstrapLogger,
  type JobWorkerModules,
} from "../src/infra/jobs/job-worker.bootstrap.js";
import {
  WORKER_HEARTBEAT_KEY,
  getWorkerHealthReport,
  resetWorkerHealthSourceForTests,
} from "../src/infra/jobs/job.heartbeat.js";
import { JobQueue } from "../src/infra/jobs/job.queue.js";
import { JobRegistry } from "../src/infra/jobs/job.registry.js";
import { JobWorker } from "../src/infra/jobs/job.worker.js";
import { getRedisClient } from "../src/infra/redis/redis.client.js";

// B-O6R-05 (Ω6R-DIN-006) — o bootstrap do worker de jobs, agora ALCANÇÁVEL por teste.
//
// Enquanto ele morava em `src/server.ts` (função não exportada, num módulo que executa `main()`
// ao ser importado), a única "prova" possível era ler o texto do arquivo — guard-teatro. Estes
// testes exercitam o comportamento de verdade, sem Redis e sem Postgres, com as cinco peças
// injetadas.

class EmptyQueue extends JobQueue {
  constructor() {
    super({ redis: getRedisClient() });
  }

  override async dequeue(): Promise<null> {
    return null;
  }
}

function newWorker(): JobWorker {
  return new JobWorker({
    queue: new EmptyQueue(),
    registry: new JobRegistry(),
    logger: { info() {}, warn() {}, error() {} },
  });
}

function recordingModules(calls: string[], worker: JobWorker): JobWorkerModules {
  return {
    startWorker: () => {
      calls.push("startWorker");

      return worker;
    },
    enqueueInitialScheduledNotificationScan: async () => {
      calls.push("notifications.scan-due");
    },
    enqueueInitialImpoundReconcileScan: async () => {
      calls.push("impound.reconcile");
    },
    enqueueInitialChargingAccrueScan: async () => {
      calls.push("charging.accrue");
    },
    enqueueInitialImpoundNotifyDueScan: async () => {
      calls.push("impound.notify-due");
    },
  };
}

function recordingLogger() {
  const infos: unknown[][] = [];
  const warns: unknown[][] = [];
  const logger: JobWorkerBootstrapLogger = {
    info(payload, message) {
      infos.push([payload, message]);
    },
    warn(payload, message) {
      warns.push([payload, message]);
    },
  };

  return { logger, infos, warns };
}

test("produção válida sobe o worker E enfileira as QUATRO varreduras, uma vez cada", async () => {
  // MUTAÇÃO QUE ESTE TESTE MATA: apagar qualquer um dos quatro `enqueueInitial*`. Cada um é o 1º
  // tick de um sweep auto-reenfileirante — sem ele, diária de pátio, reconciliação OS→custódia,
  // notificação legal ou notificação agendada simplesmente nunca são materializadas.
  const calls: string[] = [];
  const worker = newWorker();
  const { logger, infos, warns } = recordingLogger();

  const result = await startJobWorkerIfEnabled({
    jobsWorkerEnabled: true,
    coreSaasPersistence: "prisma",
    modules: recordingModules(calls, worker),
    logger,
    startHeartbeat: false,
  });

  try {
    assert.equal(result.started, true);
    assert.equal(result.reason, undefined);
    assert.equal(result.worker, worker);
    assert.deepEqual(calls, [
      "startWorker",
      "notifications.scan-due",
      "impound.reconcile",
      "charging.accrue",
      "impound.notify-due",
    ]);
    assert.equal(warns.length, 0);
    assert.equal(infos.length, 1);
  } finally {
    resetWorkerHealthSourceForTests();
  }
});

test("o estado publicado segue o worker DE VERDADE, tick a tick", async () => {
  // MUTAÇÃO QUE ESTE TESTE MATA: publicar um carimbo estático no boot (o /health/worker diria
  // "up" para sempre, mesmo com o laço parado).
  const worker = newWorker();

  try {
    await startJobWorkerIfEnabled({
      jobsWorkerEnabled: true,
      coreSaasPersistence: "prisma",
      modules: recordingModules([], worker),
      startHeartbeat: false,
    });

    const beforeTick = getWorkerHealthReport();
    assert.equal(beforeTick.expected, "local");
    assert.equal(beforeTick.ageSeconds, null);

    await worker.processNextJob();

    const afterTick = getWorkerHealthReport();
    assert.equal(afterTick.status, "up");
    assert.equal(afterTick.expected, "local");
    assert.equal(afterTick.ageSeconds, 0);
  } finally {
    resetWorkerHealthSourceForTests();
  }
});

test("flag ligada com persistência em memória NÃO sobe o worker — e AVISA", async () => {
  // MUTAÇÃO QUE ESTE TESTE MATA: restaurar o `return` mudo do server.ts. O silêncio era o defeito:
  // a operação ligava a flag, o worker não subia, e nada em lugar nenhum dizia isso.
  const calls: string[] = [];
  const { logger, infos, warns } = recordingLogger();

  const result = await startJobWorkerIfEnabled({
    jobsWorkerEnabled: true,
    coreSaasPersistence: "memory",
    modules: recordingModules(calls, newWorker()),
    logger,
  });

  try {
    assert.equal(result.started, false);
    assert.equal(result.reason, "persistence_not_prisma");
    assert.equal(result.worker, undefined);
    assert.equal(result.heartbeat, undefined);
    assert.deepEqual(calls, []);
    assert.equal(infos.length, 0);
    assert.equal(warns.length, 1);
    assert.match(String(warns[0]?.[1]), /CORE_SAAS_PERSISTENCE/);
  } finally {
    resetWorkerHealthSourceForTests();
  }
});

test("flag ligada sem worker no ar envelhece para stale — não finge saúde", async () => {
  await startJobWorkerIfEnabled({
    jobsWorkerEnabled: true,
    coreSaasPersistence: "memory",
    modules: recordingModules([], newWorker()),
  });

  try {
    // A flag foi LIGADA: o worker É esperado neste processo. Passada a carência de boot, a
    // resposta honesta é 503 — não `not_expected`/200.
    const report = getWorkerHealthReport(new Date(Date.now() + 120_000));
    assert.equal(report.expected, "local");
    assert.equal(report.status, "stale");
    assert.equal(report.httpStatus, 503);
  } finally {
    resetWorkerHealthSourceForTests();
  }
});

test("flag desligada não sobe nada, não avisa, e o worker não é esperado", async () => {
  const calls: string[] = [];
  const { logger, infos, warns } = recordingLogger();

  const result = await startJobWorkerIfEnabled({
    jobsWorkerEnabled: false,
    coreSaasPersistence: "prisma",
    modules: recordingModules(calls, newWorker()),
    logger,
  });

  try {
    assert.equal(result.started, false);
    assert.equal(result.reason, "disabled");
    assert.deepEqual(calls, []);
    assert.equal(infos.length, 0);
    assert.equal(warns.length, 0);

    const report = getWorkerHealthReport(new Date(Date.now() + 86_400_000));
    assert.equal(report.expected, "none");
    assert.equal(report.status, "not_expected");
    assert.equal(report.httpStatus, 200);
  } finally {
    resetWorkerHealthSourceForTests();
  }
});

test("o sinal de vida sobe junto com o laço, na chave de produção — e só com ele", async () => {
  const commands: string[][] = [];
  const redis = {
    async command(...args: string[]): Promise<string> {
      commands.push(args);

      return "OK";
    },
  };

  const started = await startJobWorkerIfEnabled({
    jobsWorkerEnabled: true,
    coreSaasPersistence: "prisma",
    modules: recordingModules([], newWorker()),
    redis,
  });

  try {
    assert.ok(started.heartbeat, "o writer do sinal de vida precisa subir com o worker");
    assert.equal(started.heartbeat?.key, WORKER_HEARTBEAT_KEY);
  } finally {
    started.heartbeat?.stop();
    resetWorkerHealthSourceForTests();
  }

  const notStarted = await startJobWorkerIfEnabled({
    jobsWorkerEnabled: false,
    modules: recordingModules([], newWorker()),
    redis,
  });

  try {
    assert.equal(notStarted.heartbeat, undefined);
    // Sem laço, nenhuma escrita: um sinal renovado por um worker que não existe seria mentira.
    assert.deepEqual(commands, []);
  } finally {
    resetWorkerHealthSourceForTests();
  }
});

// ---------------------------------------------------------------------------------------------
// O BOOT DE VERDADE — a delegação que mora em `src/server.ts`
// ---------------------------------------------------------------------------------------------
//
// Tudo acima chama `startJobWorkerIfEnabled` diretamente. Nada disso prova que ALGUÉM a chama no
// boot: apagar `await startJobWorkerIfEnabled({ logger })` (e o import) de `src/server.ts` deixava
// a suíte inteira verde e o typecheck verde — e é a ÚNICA linha que liga o worker ao boot. Um
// revert acidental, ou uma limpeza de "import não usado", reintroduz o Ω6R-DIN-006 inteiro: o
// processo sobe, ninguém publica fonte de saúde, e o `/health/worker` responde `not_expected`/200 —
// um monitor afirmando que está tudo bem.
//
// Por processo filho (precedente: `tests/persistent-rbac-middleware.test.ts`): importar
// `server.ts` executa `main()`, então não há como observá-lo de dentro deste processo. Ambiente de
// DESENVOLVIMENTO, flag LIGADA e persistência em MEMÓRIA — o ramo que retorna antes de subir o
// laço, e por isso não precisa de Redis nem de Postgres.

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BOOT_TIMEOUT_MS = 60_000;

type BootLogLine = {
  readonly level?: number;
  readonly msg?: string;
  readonly coreSaasPersistence?: string;
  readonly jobsWorkerEnabled?: boolean;
};

/** Porta livre reservada pelo SO: o boot real precisa de `listen`, e 0 não passa no schema. */
async function reserveFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as AddressInfo;
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

/** O aviso do bootstrap, achado entre as linhas JSON do pino (linha parcial simplesmente não casa). */
function findWorkerWarn(stdout: string): BootLogLine | undefined {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.startsWith("{")) continue;

    try {
      const parsed = JSON.parse(line) as BootLogLine;
      if (typeof parsed.msg === "string" && parsed.msg.includes("JOBS_WORKER_ENABLED")) {
        return parsed;
      }
    } catch {
      // Linha ainda incompleta no buffer: a próxima leitura resolve.
    }
  }

  return undefined;
}

test("o boot REAL de `src/server.ts` passa pelo bootstrap do worker", async () => {
  const [port, portalPort] = [await reserveFreePort(), await reserveFreePort()];

  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NODE_ENV: "development",
      JOBS_WORKER_ENABLED: "true",
      CORE_SAAS_PERSISTENCE: "memory",
      LOG_LEVEL: "warn",
      PORT: String(port),
      PORTAL_PORT: String(portalPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const warn = await new Promise<BootLogLine | undefined>((resolve) => {
    const finish = (value: BootLogLine | undefined): void => {
      clearInterval(poll);
      clearTimeout(timer);
      resolve(value);
    };
    const poll = setInterval(() => {
      const found = findWorkerWarn(stdout);
      if (found) finish(found);
    }, 50);
    const timer = setTimeout(() => finish(undefined), BOOT_TIMEOUT_MS);

    // Se o processo morrer antes (erro de boot), não há o que esperar: decide com o que saiu.
    child.once("exit", () => setImmediate(() => finish(findWorkerWarn(stdout))));
  });

  child.kill();
  await closed;

  assert.ok(
    warn,
    `o boot real não passou pelo bootstrap do worker em ${BOOT_TIMEOUT_MS}ms — ` +
      `a delegação sumiu de src/server.ts?\nstdout: ${stdout}\nstderr: ${stderr}`,
  );
  // O payload é montado DENTRO do bootstrap: nenhuma outra linha do repositório produz este aviso.
  assert.equal(warn.level, 40, "o aviso tem de ser warn — o silêncio era o modo de falha");
  assert.equal(warn.coreSaasPersistence, "memory");
  assert.equal(warn.jobsWorkerEnabled, true);
  assert.match(String(warn.msg), /CORE_SAAS_PERSISTENCE/);
  assert.match(String(warn.msg), /worker de jobs NÃO subiu/);
});
