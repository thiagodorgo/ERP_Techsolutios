import { env } from "../../config/env.js";
import {
  AntiAbuse,
  AUTHORITY_ANTI_ABUSE_DEFAULTS,
  InMemoryChallengeStore,
  InMemoryPortalAccessLogRepository,
  POW_DEFAULT_TTL_MS,
  createPrismaPortalAccessLogRepository,
  type PortalAccessLogRepository,
} from "../portal-shared/index.js";
import {
  getMemoryAuthorityCredentialRepository,
  type AuthorityCredentialLoginPort,
} from "./authority-credential.repository.js";
import { AuthorityPortalService } from "./authority-portal.service.js";

// Ω5P PR-18a — wiring DEFAULT do authority-portal BFF (memory×prisma pelo mesmo env-gate das demais fatias). O
// tenant vem do BINDING de deploy (env.PORTAL_TENANT_ID); anti-abuso + challenge store são in-process (singleton do
// processo, para o rate-limit/dificuldade/lockout persistirem entre requisições). Secret da SESSÃO é o PRÓPRIO do
// authority (PORTAL_AUTHORITY_SESSION_SECRET ≠ owner ≠ ERP). Em memory a porta de credencial é o singleton
// compartilhado com o provisionamento (paridade com a 1 tabela do Prisma).

const AUTHORITY_MIN_LATENCY_MS = 250; // piso constante das respostas de login (normaliza timing)
const AUTHORITY_LOCK_THRESHOLD = 5; // 5 falhas consecutivas → lockout
const AUTHORITY_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 min de lockout

let singleton: Promise<AuthorityPortalService> | undefined;

async function buildAccessLog(): Promise<PortalAccessLogRepository> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    return createPrismaPortalAccessLogRepository();
  }
  return new InMemoryPortalAccessLogRepository();
}

async function buildCredentials(): Promise<AuthorityCredentialLoginPort> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    const { createPrismaAuthorityCredentialRepository } = await import("./authority-credential.repository.js");
    return createPrismaAuthorityCredentialRepository();
  }
  return getMemoryAuthorityCredentialRepository();
}

export async function createDefaultAuthorityPortalService(): Promise<AuthorityPortalService> {
  singleton ??= (async () => {
    const [credentials, accessLog] = await Promise.all([buildCredentials(), buildAccessLog()]);
    return new AuthorityPortalService({
      tenantId: env.PORTAL_TENANT_ID,
      credentials,
      accessLog,
      antiAbuse: new AntiAbuse(AUTHORITY_ANTI_ABUSE_DEFAULTS),
      challengeStore: new InMemoryChallengeStore(),
      logSecret: env.PORTAL_LOG_SECRET,
      sessionSecret: env.PORTAL_AUTHORITY_SESSION_SECRET,
      minLatencyMs: AUTHORITY_MIN_LATENCY_MS,
      challengeTtlMs: POW_DEFAULT_TTL_MS,
      lockThreshold: AUTHORITY_LOCK_THRESHOLD,
      lockDurationMs: AUTHORITY_LOCK_DURATION_MS,
    });
  })();
  return singleton;
}

export function resetAuthorityPortalRuntimeForTests(): void {
  singleton = undefined;
}
