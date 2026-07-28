import { env } from "../../config/env.js";
import { createDefaultChargeService } from "../charging/charge.service.js";
import { createDefaultImpoundService } from "../impound/impound.service.js";
import {
  AntiAbuse,
  InMemoryChallengeStore,
  InMemoryPortalAccessLogRepository,
  OWNER_ANTI_ABUSE_DEFAULTS,
  POW_DEFAULT_TTL_MS,
  createPrismaPortalAccessLogRepository,
  type PortalAccessLogRepository,
} from "../portal-shared/index.js";
import { createDefaultYardService } from "../yard/yard.service.js";
import { OwnerPortalService } from "./owner-portal.service.js";

// Ω5P PR-16 — wiring DEFAULT do owner-portal (memory×prisma pelo mesmo env-gate das demais fatias). O tenant vem
// do BINDING de deploy (env.PORTAL_TENANT_ID); anti-abuso + challenge store são in-process (singleton do processo,
// para o rate-limit/dificuldade persistirem entre requisições). Secrets do PORTAL (nunca o JWT do ERP).

// Piso de latência constante das respostas de lookup (normaliza timing anti-enumeração).
const OWNER_MIN_LATENCY_MS = 250;

let singleton: Promise<OwnerPortalService> | undefined;

async function buildAccessLog(): Promise<PortalAccessLogRepository> {
  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    return createPrismaPortalAccessLogRepository();
  }
  return new InMemoryPortalAccessLogRepository();
}

export async function createDefaultOwnerPortalService(): Promise<OwnerPortalService> {
  singleton ??= (async () => {
    const [impound, charge, yard, accessLog] = await Promise.all([
      createDefaultImpoundService(),
      createDefaultChargeService(),
      createDefaultYardService(),
      buildAccessLog(),
    ]);
    return new OwnerPortalService({
      tenantId: env.PORTAL_TENANT_ID,
      impound,
      charge,
      yard,
      accessLog,
      antiAbuse: new AntiAbuse(OWNER_ANTI_ABUSE_DEFAULTS),
      challengeStore: new InMemoryChallengeStore(),
      logSecret: env.PORTAL_LOG_SECRET,
      sessionSecret: env.PORTAL_SESSION_SECRET,
      minLatencyMs: OWNER_MIN_LATENCY_MS,
      challengeTtlMs: POW_DEFAULT_TTL_MS,
    });
  })();
  return singleton;
}

export function resetOwnerPortalRuntimeForTests(): void {
  singleton = undefined;
}
