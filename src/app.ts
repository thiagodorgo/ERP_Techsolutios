import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import {
  attachAuthenticatedActor,
  createAuthRouter,
} from "./modules/auth/index.js";
import {
  coreSaasService,
  createCoreSaasRouter,
} from "./modules/core-saas/index.js";
import { MemoryCoreSaasAdapter } from "./modules/core-saas/services/memory-core-saas.adapter.js";
import type { ICoreSaasService } from "./modules/core-saas/services/core-saas-service.interface.js";
import { createChecklistRouter } from "./modules/checklists/index.js";
import { createFieldLocationRouter } from "./modules/field-location/index.js";
import { createNotificationRouter } from "./modules/notifications/index.js";
import { createNavigationRouter } from "./modules/navigation/index.js";
import { createPlatformRouter } from "./modules/platform/index.js";
import { createWorkOrderRouter } from "./modules/work-orders/index.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(service: ICoreSaasService): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  const logger = pinoHttp({
    level: env.LOG_LEVEL,
    redact: ["req.headers.authorization"],
  });

  app.use(logger);
  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/platform", attachAuthenticatedActor(), createPlatformRouter());
  app.use("/api/v1/navigation", attachAuthenticatedActor(), createNavigationRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createNotificationRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createChecklistRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createFieldLocationRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createWorkOrderRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createCoreSaasRouter(service));

  return app;
}

// Preserved for test compatibility: uses the same coreSaasService singleton
// that tests reference via coreSaasService.reset(), so resets affect this app.
export const app = createApp(new MemoryCoreSaasAdapter(coreSaasService));
