import type { LocalAuthLoginService } from "./services/local-auth-login.service.js";
import type { AuthSessionService } from "./services/auth-session.service.js";
import type { LocalAuthLoginInput } from "./types/auth.types.js";
import type { verifyPassword } from "./services/password.service.js";

let localAuthLoginServicePromise: Promise<LocalAuthLoginService> | undefined;
let authSessionServicePromise: Promise<AuthSessionService> | undefined;

export function getLocalAuthLoginService(): Promise<LocalAuthLoginService> {
  localAuthLoginServicePromise ??= createLocalAuthLoginService();

  return localAuthLoginServicePromise;
}

export function getAuthSessionService(): Promise<AuthSessionService> {
  authSessionServicePromise ??= createAuthSessionService();

  return authSessionServicePromise;
}

async function createLocalAuthLoginService(): Promise<LocalAuthLoginService> {
  const [
    { prisma },
    { forEachTenantRls, withTenantRls },
    { LocalAuthCredentialRepository, normalizeCredentialEmail },
    { AuditLogRepository, TenantRepository, UserRepository, UserRoleRepository },
    { LocalAuthLoginService },
    { resolvePasswordFamilyPairs, uniqueTenantIdsFromPairs },
  ] = await Promise.all([
    import("../../database/prisma.js"),
    import("../../database/rls.js"),
    import("./repositories/local-auth-credential.repository.js"),
    import("../core-saas/repositories/index.js"),
    import("./services/local-auth-login.service.js"),
    import("./services/password-family.js"),
  ]);

  const buildService = (tx: Parameters<Parameters<typeof withTenantRls>[2]>[0]) =>
    new LocalAuthLoginService(
      new LocalAuthCredentialRepository(tx),
      new TenantRepository(tx),
      new UserRepository(tx),
      new UserRoleRepository(tx),
      new AuditLogRepository(tx),
    );

  const resolveTenantIdsDosPares = async (seedTenantId: string, seedUserId: string): Promise<readonly string[]> => {
    const pairs = await withTenantRls(prisma, seedTenantId, (tx) =>
      resolvePasswordFamilyPairs(tx, seedTenantId, seedUserId, { onlyActiveUsers: true }),
    );

    return uniqueTenantIdsFromPairs(pairs);
  };

  const runAcrossPairs = async (
    tenantIdsDosPares: readonly string[],
    work: (
      tx: Parameters<Parameters<typeof withTenantRls>[2]>[0],
      tenantId: string,
    ) => Promise<void>,
  ): Promise<void> => {
    await forEachTenantRls(prisma, tenantIdsDosPares, async (tx, tenantId) => {
      await work(tx, tenantId);

      return [];
    });
  };

  return {
    async authenticateLocalCredential(input: LocalAuthLoginInput) {
      const login = await withTenantRls(prisma, input.tenant_id, async (tx) =>
        buildService(tx).authenticateLocalCredential(input),
      );

      if (login.ok) {
        const tenantIdsDosPares = await resolveTenantIdsDosPares(input.tenant_id, login.user.id);

        await runAcrossPairs(tenantIdsDosPares, async (tx, tenantId) => {
          if (tenantId === input.tenant_id) {
            return;
          }

          const credential = await new LocalAuthCredentialRepository(tx).findByUserForTenant(login.user.id, tenantId);

          if (!credential) {
            return;
          }

          await new LocalAuthCredentialRepository(tx).markSuccessfulLogin(credential.id, tenantId);
        });

        return login;
      }

      if (login.reason !== "invalid_credentials") {
        return login;
      }

      const normalizedEmail = normalizeCredentialEmail(input.email);
      const seedCredential = await withTenantRls(prisma, input.tenant_id, async (tx) =>
        new LocalAuthCredentialRepository(tx).findByEmailForTenant(normalizedEmail, input.tenant_id),
      );

      if (!seedCredential) {
        return login;
      }

      const tenantIdsDosPares = await resolveTenantIdsDosPares(input.tenant_id, seedCredential.user_id);

      await runAcrossPairs(tenantIdsDosPares, async (tx, tenantId) => {
        if (tenantId === input.tenant_id) {
          return;
        }

        const credential = await new LocalAuthCredentialRepository(tx).findByUserForTenant(seedCredential.user_id, tenantId);

        if (!credential) {
          return;
        }

        await new LocalAuthCredentialRepository(tx).incrementFailedAttempts(credential.id, tenantId);
      });

      return login;
    },
    // B-O6R-01 — verificação anônima de UM candidato, na organização do candidato (withTenantRls
    // por candidato, §6.2). Sem efeito colateral em falha (§6.4.3).
    verifyAnonymousCandidate(input: Pick<LocalAuthLoginInput, "tenant_id" | "email" | "password">, verifyPasswordFn?: typeof verifyPassword) {
      return withTenantRls(prisma, input.tenant_id, async (tx) =>
        buildService(tx).verifyAnonymousCandidate(input, verifyPasswordFn),
      );
    },
    // B-O6R-01 — finalização do sucesso anônimo único (contadores + auditoria na organização
    // que autenticou).
    async finalizeAnonymousLogin(
      tenantId: string,
      credentialId: string,
      user: { readonly id: string; readonly email: string },
      roleCount: number,
      auditContext: { readonly ipAddress?: string; readonly userAgent?: string },
    ) {
      const tenantIdsDosPares = await resolveTenantIdsDosPares(tenantId, user.id);

      await runAcrossPairs(tenantIdsDosPares, async (tx, currentTenantId) => {
        const credential = await new LocalAuthCredentialRepository(tx).findByUserForTenant(user.id, currentTenantId);

        if (!credential) {
          return;
        }

        await buildService(tx).finalizeAnonymousLogin(
          currentTenantId,
          credential.id,
          user,
          roleCount,
          auditContext,
        );
      });
    },
    // B-O6R-07a CICLO 2 (C2·3) — cobrança única pós-veredicto da falha anônima, na organização do
    // candidato cobrado (ampliação NOMINAL do C2·5: só este espelho, na forma do método acima).
    async registerAnonymousFailure(
      tenantId: string,
      credentialId: string,
      email: string,
      auditContext: { readonly ipAddress?: string; readonly userAgent?: string },
    ) {
      const seedCredential = await withTenantRls(prisma, tenantId, async (tx) =>
        new LocalAuthCredentialRepository(tx).findByIdForTenant(credentialId, tenantId),
      );

      if (!seedCredential) {
        return;
      }

      const tenantIdsDosPares = await resolveTenantIdsDosPares(tenantId, seedCredential.user_id);

      await runAcrossPairs(tenantIdsDosPares, async (tx, currentTenantId) => {
        const credential = await new LocalAuthCredentialRepository(tx).findByUserForTenant(
          seedCredential.user_id,
          currentTenantId,
        );

        if (!credential) {
          return;
        }

        await buildService(tx).registerAnonymousFailure(currentTenantId, credential.id, email, auditContext);
      });
    },

    async finalizeAnonymousLoginAcrossPairs(
      tenantIdsDosPares: readonly string[],
      tenantId: string,
      credentialId: string,
      user: { readonly id: string; readonly email: string },
      roleCount: number,
      auditContext: { readonly ipAddress?: string; readonly userAgent?: string },
    ) {
      await runAcrossPairs(tenantIdsDosPares, async (tx, currentTenantId) => {
        const resolvedCredentialId =
          currentTenantId === tenantId
            ? credentialId
            : (await new LocalAuthCredentialRepository(tx).findByUserForTenant(user.id, currentTenantId))?.id;

        if (!resolvedCredentialId) {
          return;
        }

        await buildService(tx).finalizeAnonymousLogin(
          currentTenantId,
          resolvedCredentialId,
          user,
          roleCount,
          auditContext,
        );
      });
    },

    async changePasswordAcrossPairs(
      tenantIdsDosPares: readonly string[],
      userId: string,
      passwordData: { readonly password_hash: string; readonly password_algorithm: string },
    ) {
      await runAcrossPairs(tenantIdsDosPares, async (tx, tenantId) => {
        const credential = await new LocalAuthCredentialRepository(tx).findByUserForTenant(userId, tenantId);

        if (!credential) {
          return;
        }

        await new LocalAuthCredentialRepository(tx).updatePassword(userId, tenantId, passwordData);
      });
    },
  } as unknown as LocalAuthLoginService;
}

async function createAuthSessionService(): Promise<AuthSessionService> {
  const [{ prisma }, { withTenantRls }, { AuditLogRepository }, { AuthSessionService }] = await Promise.all([
    import("../../database/prisma.js"),
    import("../../database/rls.js"),
    import("../core-saas/repositories/index.js"),
    import("./services/auth-session.service.js"),
  ]);

  return new AuthSessionService(
    (tenantId, work) => withTenantRls(prisma, tenantId, work),
    (tx) => new AuditLogRepository(tx),
  );
}
