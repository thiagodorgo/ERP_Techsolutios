import { env } from "../../config/env.js";
import {
  AntiAbuse,
  AUTHORITY_ANTI_ABUSE_DEFAULTS,
  InMemoryPortalAccessLogRepository,
  createPrismaPortalAccessLogRepository,
  type PortalAccessLogRepository,
} from "../portal-shared/index.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { getMemoryReleaseRepositoryForTests } from "../release/release.service.js";
import { getMemoryAuthorityCredentialRepository } from "./authority-credential.repository.js";
import type { AuthorityCredentialConsumptionReader } from "./authority-removal.repository.js";
import { getMemoryAuthorityRemovalRepositoryForTests } from "./authority-removal.runtime.js";
import { InMemoryAuthorityReleaseApprovalRepository, PrismaAuthorityReleaseApprovalRepository } from "./authority-release-approval.repository.js";
import { AuthorityReleaseApprovalService } from "./authority-release-approval.service.js";
import type { AuthorityReleaseApprovalRepository } from "./authority-release-approval.types.js";

// Ω5P PR-19 — wiring DEFAULT do BFF de APROVAÇÃO da liberação (memory×prisma pelo mesmo env-gate). tenant do
// BINDING de deploy (PORTAL_TENANT_ID). Secret/anti-abuso são os MESMOS do authority-portal (mesma superfície
// credenciada — 18a/18b). Em memory, o repositório da vinculação D-08 compõe o mesmo singleton do removals (18b)
// para que uma solicitação criada em dev seja visível pela fila de aprovações (paridade com o Prisma).
const AUTHORITY_RELEASE_APPROVAL_MIN_LATENCY_MS = 200;

let singleton: Promise<AuthorityReleaseApprovalService> | undefined;

async function buildAccessLog(): Promise<PortalAccessLogRepository> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    return createPrismaPortalAccessLogRepository();
  }
  return new InMemoryPortalAccessLogRepository();
}

async function buildApprovals(): Promise<AuthorityReleaseApprovalRepository> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    const { prisma } = await import("../../database/prisma.js");
    return new PrismaAuthorityReleaseApprovalRepository(prisma);
  }
  return new InMemoryAuthorityReleaseApprovalRepository(
    getMemoryAuthorityRemovalRepositoryForTests(),
    getMemoryImpoundRepositoryForTests(),
    getMemoryReleaseRepositoryForTests(),
  );
}

async function buildCredentials(): Promise<AuthorityCredentialConsumptionReader> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    const { createPrismaAuthorityCredentialRepository } = await import("./authority-credential.repository.js");
    return createPrismaAuthorityCredentialRepository();
  }
  return getMemoryAuthorityCredentialRepository();
}

export async function createDefaultAuthorityReleaseApprovalService(): Promise<AuthorityReleaseApprovalService> {
  singleton ??= (async () => {
    const [approvals, credentials, accessLog] = await Promise.all([buildApprovals(), buildCredentials(), buildAccessLog()]);
    return new AuthorityReleaseApprovalService({
      tenantId: env.PORTAL_TENANT_ID,
      credentials,
      approvals,
      accessLog,
      antiAbuse: new AntiAbuse(AUTHORITY_ANTI_ABUSE_DEFAULTS),
      logSecret: env.PORTAL_LOG_SECRET,
      sessionSecret: env.PORTAL_AUTHORITY_SESSION_SECRET,
      minLatencyMs: AUTHORITY_RELEASE_APPROVAL_MIN_LATENCY_MS,
    });
  })();
  return singleton;
}

export function resetAuthorityReleaseApprovalRuntimeForTests(): void {
  singleton = undefined;
}
