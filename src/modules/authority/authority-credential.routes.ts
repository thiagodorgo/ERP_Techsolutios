import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { AuthorityCredentialController, type AuthorityCredentialServiceResolver } from "./authority-credential.controller.js";
import { createDefaultAuthorityCredentialService } from "./authority-credential.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Ω5P PR-18a — o PROVISIONAMENTO da credencial da autoridade vive sob a permissão NOVA `authority_credentials:manage`
// (D-Ω5P-AUTH-03). Distribuição: tenant_admin + super_admin/platform_admin (auto pelo filtro não-`platform:` do
// catálogo); NÃO manager/operator/finance/etc — SoD: quem OPERA o pátio não PROVISIONA a autoridade.
export const AUTHORITY_CREDENTIAL_PERMISSIONS = {
  manage: "authority_credentials:manage",
} as const;

export function createAuthorityCredentialRouter(
  resolveService: AuthorityCredentialServiceResolver = createDefaultAuthorityCredentialService,
): Router {
  const router = Router();
  const controller = new AuthorityCredentialController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/authority-credentials",
    requirePermission(AUTHORITY_CREDENTIAL_PERMISSIONS.manage),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/authority-credentials",
    requirePermission(AUTHORITY_CREDENTIAL_PERMISSIONS.manage),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  // Verbos dedicados (3 segmentos — não colidem com /authority-credentials nem entre si).
  router.post(
    "/authority-credentials/:credentialId/rotate-password",
    requirePermission(AUTHORITY_CREDENTIAL_PERMISSIONS.manage),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.rotatePassword(request));
    }),
  );
  router.post(
    "/authority-credentials/:credentialId/suspend",
    requirePermission(AUTHORITY_CREDENTIAL_PERMISSIONS.manage),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.suspend(request));
    }),
  );
  router.post(
    "/authority-credentials/:credentialId/revoke",
    requirePermission(AUTHORITY_CREDENTIAL_PERMISSIONS.manage),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.revoke(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
