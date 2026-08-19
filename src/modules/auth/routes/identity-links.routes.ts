import { Router, type Response } from "express";

import { handleAsyncRoute, readRouteParam, readString } from "../../core-saas/routes/http.js";
import {
  attachAuthenticatedActor,
  getAuthenticatedActor,
} from "../middleware/authenticated-actor.middleware.js";
import {
  getIdentityLinkService,
  type IdentityLinkService,
} from "../services/identity-link.service.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§5 do plano) — rotas de vínculo de identidade (espelho de session-admin.routes.ts).
// Autenticação EXCLUSIVAMENTE por JWT (attachAuthenticatedActor → getAuthenticatedActor): uma
// requisição por header legado NÃO alcança os fluxos de identidade (§3.7/V2) — sem actor JWT a
// resposta é 401, em qualquer ambiente. Montado sob /api/v1/auth (app.ts).
//
// Contrato (API_CONTRACTS.md): GET lista os próprios vínculos (id + organização + data — NUNCA
// identity_id) · POST religa (201 · 200 already_linked · 401/423 da prova · 403 org suspensa ·
// 409 IDENTITY_LINK_CONFLICT) · DELETE desvincula (200 removed/already_standalone · 401 sem
// reautenticação · 403 REAUTH_CREDENTIAL_UNAVAILABLE · 404 vínculo alheio/inexistente). O
// DELETE revoga a RENOVAÇÃO e as rotas de identidade na hora; o access token em voo sobrevive
// até 15 min (janela do I3 — declarada no contrato).
// -----------------------------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type IdentityLinkServiceResolver = () => Promise<IdentityLinkService>;

export function createIdentityLinkRouter(
  resolveService: IdentityLinkServiceResolver = getIdentityLinkService,
): Router {
  const router = Router();

  // O middleware fica restrito a /identity-links para não interceptar rotas irmãs do prefixo
  // /api/v1/auth. O alcance desta linha é só a MONTAGEM (R-ciclo1, B-8): login/refresh/logout
  // não passam por este router — o que mudou NELES neste bloco (claim identity_id no token,
  // gravações do primeiro login pós-migração) vive em auth.routes.ts, não aqui.
  router.use("/identity-links", attachAuthenticatedActor());

  router.get(
    "/identity-links",
    handleAsyncRoute(async (request, response) => {
      const actor = getAuthenticatedActor(request);

      if (!actor) {
        sendUnauthorized(response);
        return;
      }

      const service = await resolveService();
      const links = await service.listLinks(actor);

      response.status(200).json({
        data: links.map((link) => ({
          id: link.id,
          tenant: link.tenant,
          attached_via: link.attachedVia,
          created_at: link.createdAt.toISOString(),
        })),
      });
    }),
  );

  router.post(
    "/identity-links",
    handleAsyncRoute(async (request, response) => {
      const actor = getAuthenticatedActor(request);

      if (!actor) {
        sendUnauthorized(response);
        return;
      }

      const body = isRecord(request.body) ? request.body : {};
      const tenantId = readString(body.tenantId ?? body.tenant_id).trim();
      const email = readString(body.email).trim().toLowerCase();
      const password = readString(body.password);

      if (!UUID_PATTERN.test(tenantId) || !email || !password) {
        response.status(400).json({
          error: {
            code: "BAD_REQUEST",
            reason: "invalid_payload",
            message: "tenantId (UUID), email and password are required.",
          },
        });
        return;
      }

      const service = await resolveService();
      const result = await service.relink(actor, {
        tenantId,
        email,
        password,
        ipAddress: request.ip,
        userAgent: readHeaderValue(request.headers["user-agent"]),
      });

      if (result.status === "already_linked") {
        response.status(200).json({ data: { status: "already_linked" } });
        return;
      }

      response.status(201).json({ data: { status: "linked" } });
    }),
  );

  router.delete(
    "/identity-links/:id",
    handleAsyncRoute(async (request, response) => {
      const actor = getAuthenticatedActor(request);

      if (!actor) {
        sendUnauthorized(response);
        return;
      }

      const linkId = readRouteParam(request.params.id);

      if (!UUID_PATTERN.test(linkId)) {
        response.status(404).json({
          error: {
            code: "NOT_FOUND",
            reason: "identity_link_not_found",
            message: "Identity link not found.",
          },
        });
        return;
      }

      const body = isRecord(request.body) ? request.body : {};
      const password = readString(body.password);
      const reauthTenantId = readString(body.reauthTenantId ?? body.reauth_tenant_id).trim() || undefined;

      if (!password) {
        response.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            reason: "reauthentication_required",
            message: "Password reauthentication is required.",
          },
        });
        return;
      }

      // B-7 (ciclo 2): a forma valida AQUI, antes de tocar o banco — sem isto o valor cru
      // alcançava o GUC e um cast ::uuid no serviço, e o fallback de sendRouteError devolvia a
      // mensagem do Postgres no corpo público (a classe inteira do fallback é a pendência
      // P-O6R-B01-ROUTE-ERROR-LEAK; esta rota fecha só a própria borda).
      if (reauthTenantId !== undefined && !UUID_PATTERN.test(reauthTenantId)) {
        response.status(400).json({
          error: {
            code: "BAD_REQUEST",
            reason: "invalid_payload",
            message: "reauthTenantId must be a UUID.",
          },
        });
        return;
      }

      const service = await resolveService();
      const result = await service.unlink(actor, linkId, { password, reauthTenantId });

      if (result.status === "already_standalone") {
        response.status(200).json({ data: { status: "already_standalone" } });
        return;
      }

      response.status(200).json({
        data: {
          status: "removed",
          revoked_sessions: result.revokedSessions,
        },
      });
    }),
  );

  return router;
}

function sendUnauthorized(response: Response): void {
  response.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      reason: "jwt_required",
      message: "Bearer token required.",
    },
  });
}

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
