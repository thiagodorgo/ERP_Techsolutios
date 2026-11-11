import type { PrismaClient } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { env } from "../../../config/env.js";
import type { PersistentAuthorizationResult } from "../services/persistent-authorization.service.js";

export type PersistentAuthorizationResolver = (input: {
  readonly tenantId: string;
  readonly userId: string;
}) => Promise<PersistentAuthorizationResult>;

type PersistentRbacContextMiddlewareOptions = {
  readonly resolveAuthorization?: PersistentAuthorizationResolver;
  readonly allowPlatformControlPlaneContext?: boolean;
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

    // Opt-in exclusivo de superfícies do plano de controle. "platform" não é um
    // Tenant persistido (UUID); os demais consumidores permanecem fail-closed por padrão.
    if (
      options.allowPlatformControlPlaneContext &&
      request.actor.tenantId === "platform"
    ) {
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
  const { prisma } = await import("../../../database/prisma.js");

  return createPersistentAuthorizationResolver(prisma);
}

// B-USERS-ACESSO-SEG (S4) — a fiação do resolvedor, exportada para ser medida com o cliente que o
// teste escolher (o papel efêmero NOSUPERUSER NOBYPASSRLS). O padrão de produção é esta mesma
// função com o cliente global. O status do usuário é lido na MESMA transação RLS dos papéis. Os
// imports continuam preguiçosos (carregados uma vez, no primeiro uso): o modo memória não abre
// Prisma (tests/persistent-rbac-middleware.test.ts).
export function createPersistentAuthorizationResolver(
  client: PrismaClient,
): PersistentAuthorizationResolver {
  let dependencies:
    | Promise<
        [
          typeof import("../../../database/rls.js"),
          typeof import("../repositories/index.js"),
          typeof import("../services/persistent-authorization.service.js"),
        ]
      >
    | undefined;

  return async (input) => {
    const [{ withTenantRls }, { RoleRepository, UserRoleRepository }, { PersistentAuthorizationService }] =
      await (dependencies ??= Promise.all([
        import("../../../database/rls.js"),
        import("../repositories/index.js"),
        import("../services/persistent-authorization.service.js"),
      ]));

    return withTenantRls(client, input.tenantId, async (tx) => {
      const service = new PersistentAuthorizationService(
        new UserRoleRepository(tx),
        new RoleRepository(tx),
        {
          // Status do usuário e a marca da senha provisória (P-SEG-2), numa leitura só, sob o GUC da
          // organização do ator.
          findStatusForTenant: async (userId, tenantId) => {
            const user = await tx.user.findFirst({
              where: { id: userId, tenant_id: tenantId },
              select: { status: true, local_auth_credentials: { select: { must_change_password: true } } },
            });

            return user
              ? {
                  status: user.status,
                  mustChangePassword: user.local_auth_credentials.some((credential) => credential.must_change_password),
                }
              : null;
          },
        },
      );

      return service.resolveForActor(input);
    });
  };
}
