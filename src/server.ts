import pino from "pino";

import { createApp } from "./app.js";
import { createPortalApp } from "./portal-app.js";
import { env } from "./config/env.js";
import { startJobWorkerIfEnabled } from "./infra/jobs/job-worker.bootstrap.js";
import { createCoreSaasService } from "./modules/core-saas/index.js";

const logger = pino({ level: env.LOG_LEVEL });

// Ω6R-DIN-006 — o bootstrap do worker de jobs mora em `src/infra/jobs/job-worker.bootstrap.ts`.
// Aqui ele era inalcançável por teste (função não exportada num módulo que executa `main()` ao ser
// importado). Os imports dinâmicos continuam lá dentro: quem importa `app.ts` não puxa o worker.

async function main(): Promise<void> {
  const coreSaasRuntime = await createCoreSaasService();
  const app = createApp(coreSaasRuntime);

  await startJobWorkerIfEnabled({ logger });

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

  // Ω5P PR-16 (D-Ω5P-PORTAL-01) — sobe TAMBÉM o portal PÚBLICO num app/porta SEPARADOS (aditivo; não quebra o
  // core na :3000). Deployável como container próprio. O binding de tenant vem de PORTAL_TENANT_ID (ausente em dev
  // = o app sobe, mas as consultas falham fechado — sem vazar). Superfície isolada: nenhum middleware de auth do ERP.
  const portalApp = createPortalApp();
  portalApp.listen(env.PORTAL_PORT, () => {
    logger.info(
      { port: env.PORTAL_PORT, env: env.NODE_ENV, tenantBound: env.PORTAL_TENANT_ID !== "" },
      "ERP Techsolutions owner-portal (public BFF) listening",
    );
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start ERP Techsolutions API");
  process.exitCode = 1;
});
