import type { LocalAuthLoginService } from "./services/local-auth-login.service.js";
import type { AuthSessionService } from "./services/auth-session.service.js";

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
    { withTenantRls },
    { LocalAuthCredentialRepository },
    { AuditLogRepository, TenantRepository, UserRepository, UserRoleRepository },
    { LocalAuthLoginService },
  ] = await Promise.all([
    import("../../database/prisma.js"),
    import("../../database/rls.js"),
    import("./repositories/local-auth-credential.repository.js"),
    import("../core-saas/repositories/index.js"),
    import("./services/local-auth-login.service.js"),
  ]);

  return {
    authenticateLocalCredential(input) {
      return withTenantRls(prisma, input.tenant_id, async (tx) => {
        const service = new LocalAuthLoginService(
          new LocalAuthCredentialRepository(tx),
          new TenantRepository(tx),
          new UserRepository(tx),
          new UserRoleRepository(tx),
          new AuditLogRepository(tx),
        );

        return service.authenticateLocalCredential(input);
      });
    },
  } as LocalAuthLoginService;
}

async function createAuthSessionService(): Promise<AuthSessionService> {
  const [{ prisma }, { withTenantRls }, { AuthSessionService }] = await Promise.all([
    import("../../database/prisma.js"),
    import("../../database/rls.js"),
    import("./services/auth-session.service.js"),
  ]);

  return new AuthSessionService((tenantId, work) => withTenantRls(prisma, tenantId, work));
}
