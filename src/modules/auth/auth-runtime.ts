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

  const buildService = (tx: Parameters<Parameters<typeof withTenantRls>[2]>[0]) =>
    new LocalAuthLoginService(
      new LocalAuthCredentialRepository(tx),
      new TenantRepository(tx),
      new UserRepository(tx),
      new UserRoleRepository(tx),
      new AuditLogRepository(tx),
    );

  return {
    authenticateLocalCredential(input) {
      return withTenantRls(prisma, input.tenant_id, async (tx) =>
        buildService(tx).authenticateLocalCredential(input),
      );
    },
    // B-O6R-01 — verificação anônima de UM candidato, na organização do candidato (withTenantRls
    // por candidato, §6.2). Sem efeito colateral em falha (§6.4.3).
    verifyAnonymousCandidate(input, verifyPasswordFn) {
      return withTenantRls(prisma, input.tenant_id, async (tx) =>
        buildService(tx).verifyAnonymousCandidate(input, verifyPasswordFn),
      );
    },
    // B-O6R-01 — finalização do sucesso anônimo único (contadores + auditoria na organização
    // que autenticou).
    finalizeAnonymousLogin(tenantId, credentialId, user, roleCount, auditContext) {
      return withTenantRls(prisma, tenantId, async (tx) =>
        buildService(tx).finalizeAnonymousLogin(tenantId, credentialId, user, roleCount, auditContext),
      );
    },
    // B-O6R-07a CICLO 2 (C2·3) — cobrança única pós-veredicto da falha anônima, na organização do
    // candidato cobrado (ampliação NOMINAL do C2·5: só este espelho, na forma do método acima).
    registerAnonymousFailure(tenantId, credentialId, email, auditContext) {
      return withTenantRls(prisma, tenantId, async (tx) =>
        buildService(tx).registerAnonymousFailure(tenantId, credentialId, email, auditContext),
      );
    },
  } as LocalAuthLoginService;
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
