// B-ASS-09 · F6 — R2 e R3, o câmbio do mês da plataforma (`/api/v1/platform/billing/fx-rates`), sob
// `requirePlatformPermission`. A taxa entra e sai como string decimal com 6 casas (`"5.400000"`); nunca número. Cada `PUT`
// acrescenta uma versão (P10, F5a) e grava a trilha de plataforma (`platform_audit_logs`) pela allowlist (§4.3).
// O 400 `invalid_json` é do app (`rejectMalformedJson`).

import { Router, type Request } from "express";

import { resolveRequestActor } from "../../auth/middleware/authenticated-actor.middleware.js";
import { handleAsyncRoute, readRouteParam } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { createDefaultOverviewRuntime } from "../overview/overview.factory.js";
import { trailMetadata } from "../overview/overview.trail.js";
import type { FxRate } from "./fx-rates.repository.js";
import type { FxRateMonthView } from "./fx-rates.service.js";

export function createFxRatesPlatformRouter(): Router {
  const router = Router();

  router.get("/fx-rates", requirePlatformPermission("platform:billing:read"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const views = await runtime.fx.listRates(queryText(request, "from"), queryText(request, "to"));
    response.status(200).json({ data: views.map(monthDto) });
  }));

  router.put("/fx-rates/:month", requirePlatformPermission("platform:billing:manage"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const body = bodyOf(request);
    const actorId = actorOf(request);
    const result = await runtime.fx.putRate(readRouteParam(request.params.month), {
      currencyFrom: typeof body.currencyFrom === "string" ? body.currencyFrom : "",
      ...(body.currencyTo === undefined ? {} : { currencyTo: typeof body.currencyTo === "string" ? body.currencyTo : "" }),
      rate: typeof body.rate === "string" ? body.rate : "",
      actorId,
    });
    const current = result.current;
    await runtime.platformAudit.record({
      action: "platform_fx_rate.recorded",
      entity: "platform_fx_rate",
      entityId: current.id,
      metadata: trailMetadata({
        actor_user_id: actorId,
        month: current.month,
        currency_from: current.currencyFrom,
        currency_to: current.currencyTo,
        rate: current.rate,
        version: current.version,
      }),
    });
    response.status(200).json({ data: { current: rateDto(current), history: result.history.map(rateDto) } });
  }));

  return router;
}

function rateDto(rate: FxRate) {
  return {
    month: rate.month,
    currencyFrom: rate.currencyFrom,
    currencyTo: rate.currencyTo,
    rate: rate.rate,
    version: rate.version,
    createdAt: rate.createdAt.toISOString(),
  };
}

function monthDto(view: FxRateMonthView) {
  return {
    month: view.month,
    currencyFrom: view.currencyFrom,
    currencyTo: view.currencyTo,
    rate: view.rate,
    version: view.version,
    createdAt: view.createdAt.toISOString(),
    history: view.history.map((item) => ({ rate: item.rate, version: item.version, createdAt: item.createdAt.toISOString() })),
  };
}

function queryText(request: Request, key: string): string {
  const value = (request.query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function bodyOf(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" && !Array.isArray(request.body) ? (request.body as Record<string, unknown>) : {};
}

/** O ator do pedido (token, ou os cabeçalhos do modo de desenvolvimento), como o resto da casa. */
function actorOf(request: Request): string | null {
  return resolveRequestActor(request)?.userId ?? null;
}
