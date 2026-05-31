import pino from "pino";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createCoreSaasService } from "./modules/core-saas/index.js";

const logger = pino({ level: env.LOG_LEVEL });

async function main(): Promise<void> {
  const coreSaasRuntime = await createCoreSaasService();
  const app = createApp(coreSaasRuntime);

  app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        coreSaasPersistence: env.CORE_SAAS_PERSISTENCE,
      },
      "ERP Techsolutions API listening",
    );
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start ERP Techsolutions API");
  process.exitCode = 1;
});
