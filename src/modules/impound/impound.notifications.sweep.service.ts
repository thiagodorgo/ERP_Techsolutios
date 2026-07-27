import pino from "pino";

import { env } from "../../config/env.js";
import { createDefaultNotificationService } from "./impound.notifications.service.js";

// Ω5P PR-09 — SWEEP da trilha de notificações legais (I6). Espelha runDailyAccrualScan (charging.accrue-daily):
// reenfileiramento pelo worker in-process (SEM node-cron). Correção INDEPENDE da cadência (catch-up após queda do
// worker: quando now >= due_at o marco é materializado — latência ≠ correção). Intervalo 1h. Ator = SISTEMA.
export const IMPOUND_NOTIFY_DUE_SCAN_INTERVAL_MS = 3_600_000;

const logger = pino({ level: env.LOG_LEVEL });

// Varredura recorrente: por tenant ATIVO, marca as notificações DEVIDAS faltantes. Só roda em modo prisma (o
// worker é gated por flag + persistence=prisma). O(tenants) v1. Cada tenant isolado por try/catch — um tenant que
// lance NÃO derruba a varredura dos demais.
export async function runImpoundNotifyDueScan(now: Date = new Date()): Promise<number> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") return 0;
  const { prisma } = await import("../../database/prisma.js");
  const tenants = await prisma.tenant.findMany({ where: { status: "active" }, select: { id: true } });
  const service = await createDefaultNotificationService();
  let marked = 0;
  for (const tenant of tenants) {
    try {
      const result = await service.markDueTenantScan(tenant.id, now);
      marked += result.marked;
    } catch (error) {
      logger.warn({ tenantId: tenant.id, err: errorReason(error) }, "impound.notify-due: tenant sweep failed; skipping");
    }
  }
  return marked;
}

function errorReason(error: unknown): string {
  if (error && typeof error === "object" && "reason" in error) {
    return String((error as { reason?: unknown }).reason ?? "error");
  }
  if (error instanceof Error) return error.name;
  return "error";
}
