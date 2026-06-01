import type { LocalAuthLoginService } from "./services/local-auth-login.service.js";

let localAuthLoginServicePromise: Promise<LocalAuthLoginService> | undefined;

export function getLocalAuthLoginService(): Promise<LocalAuthLoginService> {
  localAuthLoginServicePromise ??= createLocalAuthLoginService();

  return localAuthLoginServicePromise;
}

async function createLocalAuthLoginService(): Promise<LocalAuthLoginService> {
  const [
    { prisma },
    { LocalAuthCredentialRepository },
    { AuditLogRepository, TenantRepository, UserRepository, UserRoleRepository },
    { LocalAuthLoginService },
  ] = await Promise.all([
    import("../../database/prisma.js"),
    import("./repositories/local-auth-credential.repository.js"),
    import("../core-saas/repositories/index.js"),
    import("./services/local-auth-login.service.js"),
  ]);

  return new LocalAuthLoginService(
    new LocalAuthCredentialRepository(prisma),
    new TenantRepository(prisma),
    new UserRepository(prisma),
    new UserRoleRepository(prisma),
    new AuditLogRepository(prisma),
  );
}
