import type { NextFunction, Request, Response } from "express";

import { env } from "../../../config/env.js";
import type { PersistentAuthorizationResult } from "../services/persistent-authorization.service.js";

export type PersistentAuthorizationResolver = (input: {
  readonly tenantId: string;
  readonly userId: string;
}) => Promise<PersistentAuthorizationResult>;

type PersistentRbacContextMiddlewareOptions = {
  readonly resolveAuthorization?: PersistentAuthorizationResolver;
};

let defaultResolverPromise: Promise<PersistentAuthorizationResolver | null> | undefined;

export function createPersistentRbacContextMiddleware(
  options: PersistentRbacContextMiddlewareOptions = {},
) {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!request.actor) {
      next();
      return;
    }

    try {
      const resolver =
        options.resolveAuthorization ?? (await getDefaultPersistentAuthorizationResolver());

      if (!resolver) {
        next();
        return;
      }

      const authorization = await resolver({
        tenantId: request.actor.tenantId,
        userId: request.actor.userId,
      });

      request.tenantContext = {
        tenantId: request.actor.tenantId,
        userId: request.actor.userId,
        roles: [...authorization.roles],
        permissions: [...authorization.permissions],
        explicitPermissions: false,
      };

      next();
    } catch {
      response.status(500).json({
        error: {
          code: "AUTHORIZATION_CONTEXT_ERROR",
          message: "Unable to resolve authorization context.",
        },
      });
    }
  };
}

async function getDefaultPersistentAuthorizationResolver(): Promise<PersistentAuthorizationResolver | null> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return null;
  }

  defaultResolverPromise ??= createDefaultPersistentAuthorizationResolver();

  try {
    return await defaultResolverPromise;
  } catch (error) {
    defaultResolverPromise = undefined;
    throw error;
  }
}

async function createDefaultPersistentAuthorizationResolver(): Promise<PersistentAuthorizationResolver> {
  const [{ RoleRepository, UserRoleRepository }, { PersistentAuthorizationService }] =
    await Promise.all([
      import("../repositories/index.js"),
      import("../services/persistent-authorization.service.js"),
    ]);
  const service = new PersistentAuthorizationService(
    new UserRoleRepository(),
    new RoleRepository(),
  );

  return (input) => service.resolveForActor(input);
}
