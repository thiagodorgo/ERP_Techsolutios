import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import { normalizeModuleKeys } from "../platform/platform-modules.service.js";
import { classifyRoute } from "./route-modules.js";

// B-SAN3-18 (item 16 do portão) — o servidor RECUSA toda chamada a uma área que a organização não contratou.
//
// Montado UMA vez em `src/app.ts`, sob `/api/v1`, depois de `/auth` e antes da primeira montagem de organização, com
// `attachAuthenticatedActor()` à frente (o mesmo de todo roteador). Passo a passo (plano v2, §2.2):
//   1. sem `request.actor` (o ator do JWT): segue. O 401 do roteador e o 404 sem token ficam como estão. A credencial
//      legada (cabeçalhos `x-tenant-id`/`x-user-id`/`x-role`) NÃO é decidida aqui: fora de dev e test ela é recusada
//      com 403 `legacy_headers_disabled` pelo `tenantContextMiddleware` de cada roteador, antes de qualquer handler
//      (P1-legado, provado rota a rota em tests/san3-18-module-gate.test.ts). É a ÚNICA exceção por tipo de credencial;
//   2. a classe sai de `classifyRoute(req.method, req.path)` (minúscula, sem barra final, HEAD = GET — R-A1);
//   3. PLATAFORMA ou NÚCLEO: segue;
//   4. SEM CLASSE: 403 `route_module_unclassified` (fail-closed; com JWT, caminho inexistente de prefixo desconhecido
//      responde 403 em vez do 404 — declarado no plano, R9);
//   5. MÓDULO {S}: ator de plataforma → 403 `platform_actor_on_tenant_route`; senão lê a organização DO ATOR
//      (`getTenantForActor` com o tenant do ator nos dois argumentos, o mesmo lookup do menu) e exige pelo menos um
//      módulo de S. NUNCA lê organização do corpo, da query nem do `X-Tenant-Id`;
//   6. organização inexistente → 403 `tenant_not_found`; qualquer outra falha na leitura → 503
//      `tenant_modules_unavailable`. Nunca passa por falha.
// A resposta segue o envelope de `tenant-context.middleware.ts`, sem `tenant_id` e sem a lista de módulos (§2.8).
// Sem cache: uma leitura da organização por requisição de módulo.
export function createModuleGate(service: ICoreSaasService): RequestHandler {
  return async function moduleGate(request: Request, response: Response, next: NextFunction): Promise<void> {
    const actor = request.actor;
    if (!actor) {
      next();
      return;
    }

    const routeClass = classifyRoute(request.method, request.path);

    if (routeClass.kind === "PLATAFORMA" || routeClass.kind === "NUCLEO") {
      next();
      return;
    }

    if (routeClass.kind === "SEM_CLASSE") {
      deny(response, 403, "FORBIDDEN", "route_module_unclassified", "This route is not classified for any module.");
      return;
    }

    if (actor.tenantId === "platform") {
      deny(response, 403, "FORBIDDEN", "platform_actor_on_tenant_route", "Platform actors cannot use organization module routes.");
      return;
    }

    if (!actor.tenantId?.trim()) {
      deny(response, 403, "FORBIDDEN", "tenant_not_found", "The organization of the authenticated actor was not found.");
      return;
    }

    let enabledModules: readonly string[];
    try {
      const tenant = await service.getTenantForActor(actor.tenantId, actor.tenantId);
      enabledModules = normalizeModuleKeys(tenant.modules);
    } catch (error) {
      if (error instanceof CoreSaasError && error.statusCode === 404) {
        deny(response, 403, "FORBIDDEN", "tenant_not_found", "The organization of the authenticated actor was not found.");
        return;
      }
      deny(response, 503, "SERVICE_UNAVAILABLE", "tenant_modules_unavailable", "The modules of the organization could not be read.");
      return;
    }

    if (routeClass.modules.some((moduleKey) => enabledModules.includes(moduleKey))) {
      next();
      return;
    }

    deny(response, 403, "FORBIDDEN", "module_not_enabled", "This module is not enabled for the organization.");
  };
}

function deny(response: Response, status: number, code: string, reason: string, message: string): void {
  response.status(status).json({
    error: {
      code,
      reason,
      message,
    },
  });
}
