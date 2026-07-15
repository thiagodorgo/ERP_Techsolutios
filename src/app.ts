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
import { createDamageRouter } from "./modules/damages/index.js";
import { createCycleCountRouter, createInventoryItemRouter, createStockMovementRouter } from "./modules/inventory/index.js";
import { createMobileRouter } from "./modules/mobile/index.js";
import { createNotificationRouter } from "./modules/notifications/index.js";
import { createNavigationRouter } from "./modules/navigation/index.js";
import { createPlatformRouter } from "./modules/platform/index.js";
import { createServiceCatalogRouter } from "./modules/service-catalog/index.js";
import { createPriceTableRouter } from "./modules/price-tables/index.js";
import { createTariffRouter } from "./modules/tariffs/index.js";
import { createServiceQuoteRouter } from "./modules/service-quotes/index.js";
import { createServiceQuoteItemRouter } from "./modules/service-quote-items/index.js";
import { createWorkOrderFinancialRouter } from "./modules/work-order-financials/index.js";
import { createBranchRouter } from "./modules/branches/index.js";
import { createSupplierRouter } from "./modules/suppliers/index.js";
import { createTagRouter } from "./modules/tags/index.js";
import { createPoiRouter } from "./modules/pois/index.js";
import { createOperatorProfileRouter } from "./modules/operator-profiles/index.js";
import { createTenantSettingsRouter } from "./modules/tenant-settings/index.js";
import { createTeamRouter } from "./modules/teams/index.js";
import { createVehicleRouter } from "./modules/vehicles/index.js";
import { createWorkOrderRouter } from "./modules/work-orders/index.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(service: ICoreSaasService): Express {
  const app = express();

  app.use(helmet());
  // P-SAN-CORS (Ω-INFRA-3): allowlist por ambiente. Vazio (dev/test) → `origin: true` reflete a
  // origem da requisição; em produção o gate do env.ts garante array não-vazio e sem curinga.
  // Sem `credentials: true` — a autenticação é 100% Bearer, não usa cookie de sessão.
  app.use(cors({ origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : true }));
  app.use(express.json({ limit: "2mb" }));

  const logger = pinoHttp({
    level: env.LOG_LEVEL,
    redact: ["req.headers.authorization"],
  });

  app.use(logger);
  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", createAuthRouter({ getCoreSaasService: () => Promise.resolve(service) }));
  // Ω-GATE: a rota de plataforma vem ANTES do me-router. O me-router monta no prefixo largo
  // "/api/v1" e aplica tenantContextMiddleware no topo; em produção isso interceptaria
  // /api/v1/platform/* com o motivo genérico "legacy_headers_disabled" antes do guard de
  // plataforma emitir "platform_legacy_headers_disabled". Plataforma primeiro preserva o motivo.
  app.use("/api/v1/platform", attachAuthenticatedActor(), createPlatformRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createMeRouter(service));
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
  app.use("/api/v1", attachAuthenticatedActor(), createDamageRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createInventoryItemRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createStockMovementRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createCycleCountRouter(service));
  app.use("/api/v1", attachAuthenticatedActor(), createServiceCatalogRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createPriceTableRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createTariffRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createServiceQuoteRouter());
  // Ω3F-4a — Itens do Orçamento (/service-quotes/:id/items) em router próprio: o path não colide
  // com nenhuma rota do service-quotes router (que segue intocado neste bloco).
  app.use("/api/v1", attachAuthenticatedActor(), createServiceQuoteItemRouter());
  // Ω3F-3a — Financeiro da OS (/work-orders/:id/financial-items) em router próprio: o path não
  // colide com nenhuma rota do work-orders router (que segue intocado neste bloco).
  app.use("/api/v1", attachAuthenticatedActor(), createWorkOrderFinancialRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createBranchRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createSupplierRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createTagRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createPoiRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createOperatorProfileRouter());
  app.use("/api/v1", attachAuthenticatedActor(), createTenantSettingsRouter());
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
