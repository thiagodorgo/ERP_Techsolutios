import type { LocalAuthLoginService } from "./services/local-auth-login.service.js";
import type { AuthSessionService } from "./services/auth-session.service.js";
import type { SharedPasswordPair } from "./services/password-family.js";

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
    { setTenantRlsContext, withTenantRls },
    { LocalAuthCredentialRepository },
    { AuditLogRepository, TenantRepository, UserRepository, UserRoleRepository },
    { LocalAuthLoginService },
    { resolveIdentityIdForPair },
    { readLoginPasswordPairs },
  ] = await Promise.all([
    import("../../database/prisma.js"),
    import("../../database/rls.js"),
    import("./repositories/local-auth-credential.repository.js"),
    import("../core-saas/repositories/index.js"),
    import("./services/local-auth-login.service.js"),
    import("./services/identity-resolver.js"),
    import("./services/password-family.js"),
  ]);

  // B-APP-ORG-2S (1.8.3.2 §1; 1.8.3.17 §2.2, C2-04) — a porta da senha compartilhada do LOGIN: a leitura E a escrita
  // nos pares rodam na MESMA transação do login que as pediu (a `tx`), par a par, em ordem de pátio, com o GUC do
  // par no começo de cada volta e o do pátio do login reposto no fim. O login usa UMA conexão; todos os pares mudam
  // junto com o login ou nenhum muda. Nada de transação nova no cliente global de dentro da do login.
  const acrossPairsInTx = async (
    tx: Parameters<Parameters<typeof withTenantRls>[2]>[0],
    restoreTenantId: string,
    pairs: readonly SharedPasswordPair[],
    work: (pair: SharedPasswordPair) => Promise<void>,
  ): Promise<void> => {
    try {
      for (const pair of pairs) {
        await setTenantRlsContext(tx, pair.tenantId);
        await work(pair);
      }
    } finally {
      await setTenantRlsContext(tx, restoreTenantId);
    }
  };

  const buildService = (tx: Parameters<Parameters<typeof withTenantRls>[2]>[0]) =>
    new LocalAuthLoginService(
      new LocalAuthCredentialRepository(tx),
      new TenantRepository(tx),
      new UserRepository(tx),
      new UserRoleRepository(tx),
      new AuditLogRepository(tx),
      async (_tenantId, work) => work(),
      (tenantId, userId) => resolveIdentityIdForPair(tx, tenantId, userId),
      {
        pairsOf: (tenantId, credentialId, email) => readLoginPasswordPairs(tx, tenantId, credentialId, email),
        registerFailureAcrossPairs: (tenantId, pairs) =>
          acrossPairsInTx(tx, tenantId, pairs, async (pair) => {
            await buildService(tx).registerFailure(pair.credentialId, pair.tenantId);
          }),
        clearAcrossPairs: (tenantId, pairs, ownCredentialId) =>
          acrossPairsInTx(tx, tenantId, pairs, async (pair) => {
            const credentials = new LocalAuthCredentialRepository(tx);
            await (pair.credentialId === ownCredentialId
              ? credentials.markSuccessfulLogin(pair.credentialId, pair.tenantId)
              : credentials.resetFailedAttempts(pair.credentialId, pair.tenantId));
          }),
      },
    );

  const service = {
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

  return service;
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
