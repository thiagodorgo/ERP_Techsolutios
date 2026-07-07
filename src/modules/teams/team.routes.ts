import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { TeamController, type TeamServiceResolver } from "./team.controller.js";
import { createDefaultTeamService } from "./team.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const TEAM_PERMISSIONS = {
  read: "teams:read",
  create: "teams:create",
  update: "teams:update",
} as const;

export function createTeamRouter(resolveService: TeamServiceResolver = createDefaultTeamService): Router {
  const router = Router();
  const controller = new TeamController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/teams",
    requirePermission(TEAM_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/teams",
    requirePermission(TEAM_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/teams/:teamId",
    requirePermission(TEAM_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/teams/:teamId",
    requirePermission(TEAM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.post(
    "/teams/:teamId/members",
    requirePermission(TEAM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.addMember(request));
    }),
  );

  router.delete(
    "/teams/:teamId/members/:userId",
    requirePermission(TEAM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.removeMember(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
