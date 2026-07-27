import pino from "pino";

import { env } from "../../config/env.js";
import { createDefaultChargeService } from "./charge.service.js";

// Ω5P PR-07 — SWEEP de acumulação de diárias (I4). Espelha runImpoundReconcileScan: reenfileiramento pelo worker
// in-process (SEM node-cron). Correção INDEPENDE da cadência (backfill/catch-up pelo period_seq): worker caído não
// PULA diária — latência ≠ correção. Intervalo 1h (a diária vence 1×/dia; 1h dá margem sem custo). Ator = SISTEMA.
export const CHARGING_ACCRUAL_SCAN_INTERVAL_MS = 3_600_000;

const logger = pino({ level: env.LOG_LEVEL });

// Varredura recorrente: por tenant ATIVO, acumula as diárias faltantes. Só roda em modo prisma (o worker é gated
// por flag + persistence=prisma). O(tenants) v1. F-4: cada tenant isolado por try/catch — um tenant que lance NÃO
// derruba a varredura dos demais.
export async function runDailyAccrualScan(now: Date = new Date()): Promise<number> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") return 0;
  const { prisma } = await import("../../database/prisma.js");
  const tenants = await prisma.tenant.findMany({ where: { status: "active" }, select: { id: true } });
  const service = await createDefaultChargeService();
  let accrued = 0;
  for (const tenant of tenants) {
    try {
      const result = await service.accrueTenantScan(tenant.id, now);
      accrued += result.accrued;
    } catch (error) {
      logger.warn({ tenantId: tenant.id, err: errorReason(error) }, "charging.accrue-daily: tenant sweep failed; skipping");
    }
  }
  return accrued;
}

function errorReason(error: unknown): string {
  if (error && typeof error === "object" && "reason" in error) {
    return String((error as { reason?: unknown }).reason ?? "error");
  }
  if (error instanceof Error) return error.name;
  return "error";
}
