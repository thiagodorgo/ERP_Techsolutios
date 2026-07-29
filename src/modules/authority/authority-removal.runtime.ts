import { env } from "../../config/env.js";
import {
  AntiAbuse,
  AUTHORITY_ANTI_ABUSE_DEFAULTS,
  InMemoryPortalAccessLogRepository,
  createPrismaPortalAccessLogRepository,
  type PortalAccessLogRepository,
} from "../portal-shared/index.js";
import { getMemoryWorkOrderRepositoryForTests } from "../work-orders/work-order.service.js";
import { getMemoryAuthorityCredentialRepository } from "./authority-credential.repository.js";
import {
  AuthorityRemovalConsumptionAdapter,
  InMemoryAuthorityRemovalRepository,
  PrismaAuthorityRemovalRepository,
  createPrismaRemovalCatalogResolver,
} from "./authority-removal.repository.js";
import { AuthorityRemovalService } from "./authority-removal.service.js";
import type {
  AuthorityRemovalConsumptionPort,
  AuthorityRemovalRepository,
} from "./authority-removal.types.js";

// Ω5P PR-18b — wiring DEFAULT do BFF de SOLICITAR REMOÇÃO (memory×prisma pelo mesmo env-gate). tenant do BINDING
// de deploy (PORTAL_TENANT_ID). anti-abuso + access log próprios (singleton do processo p/ o rate-limit persistir).
// Secret da SESSÃO = o PRÓPRIO do authority (PORTAL_AUTHORITY_SESSION_SECRET ≠ owner ≠ ERP). Em memory o catálogo
// de remoção NÃO é resolúvel (custody_profile_id só existe no Postgres, semeado por raw-SQL) → resolver fail-closed
// (null ⇒ ENFILEIRA): honesto para dev; a origem real da OS se prova nos testes DB-gated + no CI.
const AUTHORITY_REMOVAL_MIN_LATENCY_MS = 200; // piso constante (normaliza timing revogada×válida)

let singleton: Promise<AuthorityRemovalService> | undefined;

async function buildAccessLog(): Promise<PortalAccessLogRepository> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    return createPrismaPortalAccessLogRepository();
  }
  return new InMemoryPortalAccessLogRepository();
}

async function buildParts(): Promise<{
  consumption: AuthorityRemovalConsumptionPort;
  removals: AuthorityRemovalRepository;
}> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    const { prisma } = await import("../../database/prisma.js");
    const { createPrismaAuthorityCredentialRepository } = await import("./authority-credential.repository.js");
    const credentials = await createPrismaAuthorityCredentialRepository();
    const consumption = new AuthorityRemovalConsumptionAdapter(
      credentials,
      createPrismaRemovalCatalogResolver(prisma),
    );
    const removals = new PrismaAuthorityRemovalRepository(prisma);
    return { consumption, removals };
  }
  // memory/dev: credencial do singleton compartilhado; catálogo fail-closed (null ⇒ enfileira).
  const credentials = getMemoryAuthorityCredentialRepository();
  const consumption = new AuthorityRemovalConsumptionAdapter(credentials, async () => null);
  const removals = new InMemoryAuthorityRemovalRepository(getMemoryWorkOrderRepositoryForTests());
  return { consumption, removals };
}

export async function createDefaultAuthorityRemovalService(): Promise<AuthorityRemovalService> {
  singleton ??= (async () => {
    const [{ consumption, removals }, accessLog] = await Promise.all([buildParts(), buildAccessLog()]);
    return new AuthorityRemovalService({
      tenantId: env.PORTAL_TENANT_ID,
      consumption,
      removals,
      accessLog,
      antiAbuse: new AntiAbuse(AUTHORITY_ANTI_ABUSE_DEFAULTS),
      logSecret: env.PORTAL_LOG_SECRET,
      sessionSecret: env.PORTAL_AUTHORITY_SESSION_SECRET,
      minLatencyMs: AUTHORITY_REMOVAL_MIN_LATENCY_MS,
    });
  })();
  return singleton;
}

export function resetAuthorityRemovalRuntimeForTests(): void {
  singleton = undefined;
}
