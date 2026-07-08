import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import {
  attachAuthenticatedActor,
  createAuthRouter,
  createMeRouter,
} from "./modules/auth/index.js";
import {
  coreSaasService,
  createCoreSaasRouter,
} from "./modules/core-saas/index.js";
import { MemoryCoreSaasAdapter } from "./modules/core-saas/services/memory-core-saas.adapter.js";
import type { ICoreSaasService } from "./modules/core-saas/services/core-saas-service.interface.js";
import { createChecklistRouter } from "./modules/checklists/index.js";
import { createCommissionRouter } from "./modules/commissions/index.js";
import { createCustomerRouter } from "./modules/customers/index.js";
import { createDashboardRouter } from "./modules/dashboard/index.js";
import { createExpenseManagementRouter } from "./modules/expense-management/index.js";
import { createFieldDispatchRouter } from "./modules/field-dispatch/index.js";
import { createFieldLocationRouter } from "./modules/field-location/index.js";
import { createFieldOpsRealtimeRouter } from "./modules/field-ops-realtime/index.js";
import { createFuelLogRouter } from "./modules/fuel-logs/index.js";
import { createMaintenanceOrderRouter } from "./modules/maintenance-orders/index.js";
import { createFineRouter } from "./modules/fines/index.js";
import { createInsurancePolicyRouter } from "./modules/insurance-policies/index.js";
import { createMobileRouter } from "./modules/mobile/index.js";
import { createNotificationRouter } from "./modules/notifications/index.js";
import { createNavigationRouter } from "./modules/navigation/index.js";
import { createPlatformRouter } from "./modules/platform/index.js";
import { createServiceCatalogRouter } from "./modules/service-catalog/index.js";
import { createTeamRouter } from "./modules/teams/index.js";
import { createVehicleRouter } from "./modules/vehicles/index.js";
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
  app.use("/api/v1/auth", createAuthRouter({ getCoreSaasService: () => Promise.resolve(service) }));
  app.use("/api/v1", attachAuthenticatedActor(), createMeRouter(service));
  app.use("/api/v1/platform", attachAuthenticatedActor(), createPlatformRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createMobileRouter(service));
  app.use("/api/v1/navigation", attachAuthenticatedActor(), createNavigationRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createNotificationRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createChecklistRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createFieldOpsRealtimeRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createFieldLocationRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createWorkOrderRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createDashboardRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createCustomerRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createVehicleRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createFuelLogRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createMaintenanceOrderRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createFineRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createInsurancePolicyRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createServiceCatalogRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createTeamRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createFieldDispatchRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createCommissionRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createExpenseManagementRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createCoreSaasRouter(service));
  app.use("/api/v1", (_request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        reason: "route_not_found",
        message: "Route not found.",
      },
    });
  });

  return app;
}

// Preserved for test compatibility: uses the same coreSaasService singleton
// that tests reference via coreSaasService.reset(), so resets affect this app.
export const app = createApp(new MemoryCoreSaasAdapter(coreSaasService));
