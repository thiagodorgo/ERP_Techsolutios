import type { PrismaClient } from "@prisma/client";
import pino from "pino";

import { env } from "../../config/env.js";
import { createDefaultImpoundService, type ImpoundService } from "./impound.service.js";

// Ω5P PR-06 (D-Ω5P-REC-03) — SWEEP de reconciliação OS→custódia (a GARANTIA de durabilidade, RN-CUS-05). Espelha
// runScheduledNotificationScan: reenfileiramento de 60s pelo worker in-process (SEM node-cron). O transacional-
// na-conclusão-da-OS foi REJEITADO (acopla o caminho genérico work-order.changeStatus + barramento best-effort).
export const IMPOUND_RECONCILE_SCAN_INTERVAL_MS = 60_000;

const logger = pino({ level: env.LOG_LEVEL });

type RemovalCandidate = {
  readonly id: string;
  readonly code: string;
  readonly completed_at: Date | null;
  readonly custody_profile_id: string;
  // Ω-VID PR-05 — payload livre da OS (JSON): fonte dos hints do veículo {plate, vehicle, color} p/ semear a
  // identidade AGREGADORA na abertura. Pode ser null/qualquer forma (validado por extractVehicleHints).
  readonly service_details: unknown;
  // F-1(b) — se houver processo, seu id/estado: `null` = OS sem processo (abrir); IN_REMOVAL+entered_at NULL =
  // half-open pré-existente (curar).
  readonly process_id: string | null;
  readonly process_status: string | null;
};

// Ω-VID PR-05 — hints do veículo extraídos de WorkOrder.service_details (payload LIVRE, sem forma garantida).
// Só strings não-vazias entram; qualquer outra forma cai fora (o guard de placa e o ramo unidentified cobrem o resto).
type VehicleHints = { readonly plate?: string; readonly vehicle?: string; readonly color?: string };

function extractVehicleHints(serviceDetails: unknown): VehicleHints {
  if (serviceDetails === null || typeof serviceDetails !== "object" || Array.isArray(serviceDetails)) return {};
  const record = serviceDetails as Record<string, unknown>;
  return { plate: readStringHint(record.plate), vehicle: readStringHint(record.vehicle), color: readStringHint(record.color) };
}

function readStringHint(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Varredura recorrente: por tenant ATIVO, reconcilia as OS de remoção concluídas sem custódia. Só roda em modo
// prisma (o worker é gated por flag + persistence=prisma). O(tenants) v1 (poucos tenants). F-4: cada tenant é
// isolado por try/catch — um tenant que lance NÃO derruba a varredura dos demais.
export async function runImpoundReconcileScan(now: Date = new Date()): Promise<number> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") return 0;
  const { prisma } = await import("../../database/prisma.js");
  const tenants = await prisma.tenant.findMany({ where: { status: "active" }, select: { id: true } });
  const service = await createDefaultImpoundService();
  let opened = 0;
  for (const tenant of tenants) {
    try {
      opened += await reconcileTenantRemovals(prisma, tenant.id, service, now);
    } catch (error) {
      logger.warn({ tenantId: tenant.id, err: errorReason(error) }, "impound.reconcile-removals: tenant sweep failed; skipping");
    }
  }
  return opened;
}

// Reconcilia UM tenant (RLS-escopado). A abertura de custódia é 100% CONTINGENTE a `sc.custody_profile_id` — o
// ÚNICO marcador origem-agnóstico de "esta OS abre custódia" (D-Ω5P-REC-04). NÃO há sinal INDEPENDENTE de
// "remoção" no modelo (service_type é soft-enum configurável por org; WorkOrder não tem flag de remoção), então
// não existe "lacuna" observável a registrar: uma OS sem custody_profile_id simplesmente não é, por config, uma
// OS que abre custódia. O candidato cobre DOIS casos (F-1b): (i) OS sem processo → abre atômico; (ii) processo
// half-open (IN_REMOVAL sem entered_at) → cura para RECEPÇÃO com entered_at=OS.completed_at. Idempotência do (i)
// pelo índice PARCIAL único (tenant, service_order) → 409 ENGOLIDO. Ator = SISTEMA (fora do RBAC HTTP). F-4:
// try/catch POR candidato isola o raio de dano de um candidato que lance.
export async function reconcileTenantRemovals(
  prismaClient: PrismaClient,
  tenantId: string,
  service: ImpoundService,
  now: Date,
): Promise<number> {
  const { withTenantRls } = await import("../../database/rls.js");
  const candidates = await withTenantRls(prismaClient, tenantId, (tx) =>
    tx.$queryRaw<RemovalCandidate[]>`
      SELECT wo.id, wo.code, wo.completed_at, wo.service_details, sc.custody_profile_id, ip.id AS process_id, ip.status AS process_status
      FROM work_orders wo
      JOIN service_catalog sc ON sc.tenant_id = wo.tenant_id AND sc.id = wo.service_catalog_id
      LEFT JOIN impound_processes ip ON ip.tenant_id = wo.tenant_id AND ip.service_order_id = wo.id
      WHERE wo.tenant_id = ${tenantId}::uuid
        AND wo.status = 'completed'
        AND sc.custody_profile_id IS NOT NULL
        AND (ip.id IS NULL OR (ip.status = 'IN_REMOVAL' AND ip.entered_at IS NULL))
      ORDER BY wo.completed_at ASC NULLS LAST
      LIMIT 500
    `,
  );
  let opened = 0;
  for (const candidate of candidates) {
    const completedAt = candidate.completed_at ?? now; // t0 = chegada = OS.completed_at (art. 21 §1º)
    try {
      if (candidate.process_id === null) {
        // (i) OS sem processo → abre custódia ATÔMICA. Origem NEUTRA white-label (sem PII — só o código da OS).
        const originAuthority = `Solicitação de remoção (OS ${candidate.code})`;
        // Ω-VID PR-05 — hints do veículo p/ semear a identidade AGREGADORA na MESMA tx da abertura (o guard de
        // placa + o ramo unidentified vivem no repositório; aqui só extraímos e encaminhamos).
        const hints = extractVehicleHints(candidate.service_details);
        const result = await service.openFromRemoval({
          tenantId,
          serviceOrderId: candidate.id,
          profileId: candidate.custody_profile_id,
          originAuthority,
          completedAt,
          vehiclePlate: hints.plate,
          vehicleModel: hints.vehicle,
          vehicleColor: hints.color,
        });
        if (result.opened) opened += 1;
      } else {
        // (ii) half-open pré-existente → cura para RECEPÇÃO com entered_at=completed_at.
        const cured = await service.cureHalfOpenRemoval(tenantId, candidate.process_id, completedAt);
        if (cured) opened += 1;
      }
    } catch (error) {
      logger.warn(
        { tenantId, workOrderCode: candidate.code, processId: candidate.process_id, err: errorReason(error) },
        "impound.reconcile-removals: candidate failed; skipping",
      );
    }
  }
  return opened;
}

// Extrai um motivo/curto sem PII para o log (reason do ImpoundError ou o nome do erro).
function errorReason(error: unknown): string {
  if (error && typeof error === "object" && "reason" in error) {
    return String((error as { reason?: unknown }).reason ?? "error");
  }
  if (error instanceof Error) return error.name;
  return "error";
}
