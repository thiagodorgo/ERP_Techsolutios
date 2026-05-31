import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import {
  coreSaasService,
  createCoreSaasRouter,
} from "./modules/core-saas/index.js";
import { MemoryCoreSaasAdapter } from "./modules/core-saas/services/memory-core-saas.adapter.js";
import type { ICoreSaasService } from "./modules/core-saas/services/core-saas-service.interface.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(service: ICoreSaasService): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  const logger = pinoHttp({
    level: env.LOG_LEVEL,
  });

  app.use(logger);
  app.use("/api/v1", healthRouter);
  app.use("/api/v1", createCoreSaasRouter(service));

  return app;
}

// Preserved for test compatibility: uses the same coreSaasService singleton
// that tests reference via coreSaasService.reset(), so resets affect this app.
export const app = createApp(new MemoryCoreSaasAdapter(coreSaasService));
