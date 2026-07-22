import pino from "pino";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createCoreSaasService } from "./modules/core-saas/index.js";

const logger = pino({ level: env.LOG_LEVEL });

// Ω4C PR-04 (D-Ω4C-NOTIF-SCHEDULER) — sobe o worker in-process (setInterval → dequeue → registry) SÓ com a flag
// JOBS_WORKER_ENABLED ligada ∧ persistence=prisma, e enfileira o 1º `notifications.scan-due` (que se re-enfileira
// a cada 60s). Guardado AQUI (server.main), não em app.ts → CI/testes que importam app.ts NUNCA sobem o loop.
// Ligar a flag também drena a fila de jobs de evento pré-existente (notification-dispatch) — comportamento
// LATENTE do worker compartilhado, ativado deliberadamente (D-007 v), não é regressão.
async function startJobWorkerIfEnabled(): Promise<void> {
  if (!env.JOBS_WORKER_ENABLED || env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return;
  }
  const [{ startWorker }, { enqueueInitialScheduledNotificationScan }] = await Promise.all([
    import("./infra/jobs/job.worker.js"),
    import("./modules/notifications/scheduled-notification.jobs.js"),
  ]);
  startWorker();
  await enqueueInitialScheduledNotificationScan();
  logger.info({ pollIntervalMs: 1000 }, "In-process job worker started (JOBS_WORKER_ENABLED).");
}

async function main(): Promise<void> {
  const coreSaasRuntime = await createCoreSaasService();
  const app = createApp(coreSaasRuntime);

  await startJobWorkerIfEnabled();

  app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        coreSaasPersistence: env.CORE_SAAS_PERSISTENCE,
        jobsWorkerEnabled: env.JOBS_WORKER_ENABLED,
      },
      "ERP Techsolutions API listening",
    );
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start ERP Techsolutions API");
  process.exitCode = 1;
});
