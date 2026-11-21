import type { LocalAuthLoginService } from "./services/local-auth-login.service.js";
import type { AuthSessionService } from "./services/auth-session.service.js";
import type { SharedPasswordPair } from "./services/password-family.js";

// B-APP-ORG-2S (Emenda 1.8.3.2 §1; P3 do dono) — os espelhos da senha COMPARTILHADA. Com um login e uma senha
// em todos os pátios, o contador de tentativas, o bloqueio, o zerar no acerto e a troca de senha gravam em
// TODOS os pares da identidade. Cada espelho recebe a lista de pares (lida pelo leitor da família, nunca do
// pedido) e roda `forEachTenantRls` numa transação só: todos os pares mudam ou nenhum muda.
export type SharedPasswordMirrors = {
  registerAnonymousFailureAcrossPairs(pairs: readonly SharedPasswordPair[]): Promise<void>;
  finalizeAnonymousLoginAcrossPairs(pairs: readonly SharedPasswordPair[], ownCredentialId: string): Promise<void>;
};

let localAuthLoginServicePromise: Promise<LocalAuthLoginService & SharedPasswordMirrors> | undefined;
let authSessionServicePromise: Promise<AuthSessionService> | undefined;

export function getLocalAuthLoginService(): Promise<LocalAuthLoginService & SharedPasswordMirrors> {
  localAuthLoginServicePromise ??= createLocalAuthLoginService();

  return localAuthLoginServicePromise;
}

export function getAuthSessionService(): Promise<AuthSessionService> {
  authSessionServicePromise ??= createAuthSessionService();

  return authSessionServicePromise;
}

async function createLocalAuthLoginService(): Promise<LocalAuthLoginService & SharedPasswordMirrors> {
  const [
    { prisma },
    { forEachTenantRls, withTenantRls },
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

  // B-APP-ORG-2S (1.8.3.2 §1) — a porta da senha compartilhada do LOGIN: a leitura dos pares roda na
  // transação do login (a do espelho que chamou); as escritas, nos espelhos abaixo.
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
        registerFailureAcrossPairs: (pairs) => service.registerAnonymousFailureAcrossPairs(pairs),
        clearAcrossPairs: (pairs, ownCredentialId) => service.finalizeAnonymousLoginAcrossPairs(pairs, ownCredentialId),
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
    // B-APP-ORG-2S (1.8.3.2 §1) — a tentativa errada soma 1 em todos os pares da senha, numa transação só.
    async registerAnonymousFailureAcrossPairs(pairs: readonly SharedPasswordPair[]) {
      const tenantIdsDosPares = pairs.map((pair) => pair.tenantId);

      await forEachTenantRls(prisma, tenantIdsDosPares, async (tx, tenantId) => {
        const credentialId = credentialOfPair(pairs, tenantId);
        await buildService(tx).registerFailure(credentialId, tenantId);
        return [];
      });
    },
    // B-APP-ORG-2S (1.8.3.2 §1) — o acerto zera a conta em todos os pares da senha; o último acesso só no próprio.
    async finalizeAnonymousLoginAcrossPairs(pairs: readonly SharedPasswordPair[], ownCredentialId: string) {
      const tenantIdsDosPares = pairs.map((pair) => pair.tenantId);

      await forEachTenantRls(prisma, tenantIdsDosPares, async (tx, tenantId) => {
        const credentialId = credentialOfPair(pairs, tenantId);
        const credentials = new LocalAuthCredentialRepository(tx);
        await (credentialId === ownCredentialId
          ? credentials.markSuccessfulLogin(credentialId, tenantId)
          : credentials.resetFailedAttempts(credentialId, tenantId));
        return [];
      });
    },
  } as LocalAuthLoginService & SharedPasswordMirrors;

  return service;
}

function credentialOfPair(pairs: readonly SharedPasswordPair[], tenantId: string): string {
  const pair = pairs.find((candidate) => candidate.tenantId === tenantId);

  if (!pair) {
    throw new Error("shared_password_pair_missing");
  }

  return pair.credentialId;
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
