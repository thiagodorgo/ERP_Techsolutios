import { env } from "../../config/env.js";
import { getRedisClient } from "../redis/redis.client.js";
import {
  WorkerHeartbeatWriter,
  publishWorkerHealthSource,
  type HeartbeatRedis,
} from "./job.heartbeat.js";
import type { JobWorker } from "./job.worker.js";

/**
 * Ω4C PR-04 (D-Ω4C-NOTIF-SCHEDULER) — sobe o worker in-process (setInterval → dequeue → registry) SÓ com a flag
 * JOBS_WORKER_ENABLED ligada ∧ persistence=prisma, e enfileira o 1º `notifications.scan-due` (que se re-enfileira
 * a cada 60s). Guardado FORA de `app.ts` → CI/testes que importam app.ts NUNCA sobem o loop.
 * Ligar a flag também drena a fila de jobs de evento pré-existente (notification-dispatch) — comportamento
 * LATENTE do worker compartilhado, ativado deliberadamente (D-007 v), não é regressão.
 *
 * Ω6R-DIN-006 — este corpo saiu de `src/server.ts` para cá porque lá ele era INTESTÁVEL: não era exportado e
 * importar `server.ts` executa `main()`. Testar por leitura de texto seria guard-teatro. Três mudanças, e só
 * três: (1) dependências injetáveis; (2) o retorno MUDO de "flag ligada mas persistência não é prisma" agora
 * AVISA — o silêncio era o modo de falha; (3) publica o estado do worker que o `/health/worker` lê e liga a
 * escrita do sinal de vida. Os imports dinâmicos foram preservados VERBATIM: eles existem para que quem
 * importa `app.ts` não puxe o worker.
 */

export type JobWorkerBootstrapLogger = {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
};

/** As cinco peças que o boot do worker precisa. Injetáveis para o teste não exigir Redis/Postgres. */
export type JobWorkerModules = {
  readonly startWorker: () => JobWorker;
  readonly enqueueInitialScheduledNotificationScan: () => Promise<unknown>;
  readonly enqueueInitialImpoundReconcileScan: () => Promise<unknown>;
  readonly enqueueInitialChargingAccrueScan: () => Promise<unknown>;
  readonly enqueueInitialImpoundNotifyDueScan: () => Promise<unknown>;
};

export type JobWorkerBootstrapOptions = {
  readonly jobsWorkerEnabled?: boolean;
  readonly coreSaasPersistence?: string;
  readonly logger?: JobWorkerBootstrapLogger;
  readonly modules?: JobWorkerModules;
  readonly redis?: HeartbeatRedis;
  /** Só os testes desligam; em produção o sinal de vida sobe junto com o laço. */
  readonly startHeartbeat?: boolean;
};

export type JobWorkerBootstrapResult = {
  readonly started: boolean;
  /** Por que NÃO subiu — `undefined` quando subiu. */
  readonly reason?: "disabled" | "persistence_not_prisma";
  readonly worker?: JobWorker;
  readonly heartbeat?: WorkerHeartbeatWriter;
};

const noopLogger: JobWorkerBootstrapLogger = {
  info() {},
  warn() {},
};

/** Corpo VERBATIM do `server.ts:19-31` original — mesmos cinco imports dinâmicos, mesma ordem. */
async function loadJobWorkerModules(): Promise<JobWorkerModules> {
  const [
    { startWorker },
    { enqueueInitialScheduledNotificationScan },
    { enqueueInitialImpoundReconcileScan },
    { enqueueInitialChargingAccrueScan },
    { enqueueInitialImpoundNotifyDueScan },
  ] = await Promise.all([
    import("./job.worker.js"),
    import("../../modules/notifications/scheduled-notification.jobs.js"),
    import("../../modules/impound/impound.jobs.js"),
    import("../../modules/charging/charge.jobs.js"),
    import("../../modules/impound/impound.notifications.jobs.js"),
  ]);

  return {
    startWorker: () => startWorker(),
    enqueueInitialScheduledNotificationScan,
    enqueueInitialImpoundReconcileScan,
    enqueueInitialChargingAccrueScan,
    enqueueInitialImpoundNotifyDueScan,
  };
}

export async function startJobWorkerIfEnabled(
  options: JobWorkerBootstrapOptions = {},
): Promise<JobWorkerBootstrapResult> {
  const jobsWorkerEnabled = options.jobsWorkerEnabled ?? env.JOBS_WORKER_ENABLED;
  const coreSaasPersistence = options.coreSaasPersistence ?? env.CORE_SAAS_PERSISTENCE;
  const logger = options.logger ?? noopLogger;

  if (!jobsWorkerEnabled) {
    // Ninguém prometeu worker neste processo — `/health/worker` responde `not_expected`/200.
    publishWorkerHealthSource({ expected: "none", getLastSuccessfulTickAt: () => undefined });

    return { started: false, reason: "disabled" };
  }

  if (coreSaasPersistence !== "prisma") {
    // O CONSERTO DO SILÊNCIO: antes isto era um `return` mudo. A flag foi LIGADA, então o worker
    // É esperado — e não subiu. O log diz por quê, e o `/health/worker` deixa de responder 200
    // depois da carência de boot, em vez de fingir saúde.
    logger.warn(
      { coreSaasPersistence, jobsWorkerEnabled },
      "JOBS_WORKER_ENABLED está ligada, mas CORE_SAAS_PERSISTENCE não é 'prisma' — o worker de jobs NÃO subiu.",
    );
    publishWorkerHealthSource({ expected: "local", getLastSuccessfulTickAt: () => undefined });

    return { started: false, reason: "persistence_not_prisma" };
  }

  const modules = options.modules ?? (await loadJobWorkerModules());
  const worker = modules.startWorker();

  publishWorkerHealthSource({
    expected: "local",
    getLastSuccessfulTickAt: () => worker.lastSuccessfulTickAt,
  });

  let heartbeat: WorkerHeartbeatWriter | undefined;

  if (options.startHeartbeat ?? true) {
    heartbeat = new WorkerHeartbeatWriter({
      redis: options.redis ?? getRedisClient(),
      getLastSuccessfulTickAt: () => worker.lastSuccessfulTickAt,
      logger: {
        warn: (...data: unknown[]) => {
          const [payload, message] = data;
          logger.warn(
            (payload ?? {}) as Record<string, unknown>,
            typeof message === "string" ? message : "Falha no sinal de vida do worker de jobs.",
          );
        },
      },
    });
    heartbeat.start();
  }

  await modules.enqueueInitialScheduledNotificationScan();
  // Ω5P PR-06 — 1º tick do SWEEP de reconciliação OS→custódia (auto-reenfileirante 60s). Gated pela mesma flag.
  await modules.enqueueInitialImpoundReconcileScan();
  // Ω5P PR-07 — 1º tick do SWEEP do motor de diárias I4 (auto-reenfileirante 1h). Gated pela mesma flag.
  await modules.enqueueInitialChargingAccrueScan();
  // Ω5P PR-09 — 1º tick do SWEEP da trilha de notificações legais I6 (auto-reenfileirante 1h). Gated pela mesma flag.
  await modules.enqueueInitialImpoundNotifyDueScan();
  logger.info({ pollIntervalMs: 1000 }, "In-process job worker started (JOBS_WORKER_ENABLED).");

  return { started: true, worker, ...(heartbeat ? { heartbeat } : {}) };
}
