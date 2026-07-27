export const JOB_NAMES = [
  "aws-cur.import-cost-file",
  "cloud-charges.calculate",
  "cloud-cost-allocation.run",
  "checklist-attachment-postprocess",
  "cloud-usage.aggregate-daily",
  "notification-dispatch",
  // Ω4C PR-04 — varredura recorrente auto-reenfileirante do motor de notificações agendáveis (reuso do
  // job.worker.ts; SEM node-cron). Só executa com o worker ligado (flag JOBS_WORKER_ENABLED, default OFF).
  "notifications.scan-due",
  "audit-log-fanout",
  "field-ops-event-fanout",
  // Ω5P PR-06 (D-Ω5P-REC-03 / D-Ω5P-RECON-B) — SWEEP de reconciliação OS→custódia (durabilidade): varre as OS de
  // remoção CONCLUÍDAS (service_catalog.custody_profile_id set) sem ImpoundProcess e ABRE a custódia em RECEPÇÃO.
  // Auto-reenfileirante, gated por JOBS_WORKER_ENABLED, catch-up (espelha notifications.scan-due). Ator = SISTEMA.
  "impound.reconcile-removals",
  // Ω5P PR-07 (D-Ω5P-CHG) — SWEEP do MOTOR DE DIÁRIAS (I4): varre os processos com t0 e AINDA acumulando
  // (frozen_at NULL) e cria as ProcessCharge DAILY faltantes + CustodyEvent CHARGE_ACCRUAL (I2). Idempotente
  // (period_seq)/DST-safe/catch-up. Auto-reenfileirante 1h, gated por JOBS_WORKER_ENABLED. Ator = SISTEMA.
  "charging.accrue-daily",
  // Ω5P PR-09 (D-Ω5P-NOTIF-02) — SWEEP da TRILHA DE NOTIFICAÇÕES LEGAIS (I6): varre os processos PÚBLICOS com t0,
  // AINDA correndo o rito (frozen_at NULL, status != JUDICIAL_HOLD) e MARCA como DEVIDAS (status=DUE) as
  // notificações vencidas (t0 + prazo do perfil) + CustodyEvent NOTIFICATION (I2). Idempotente ((tenant,process,
  // kind))/DST-imune/catch-up/fail-closed. Auto-reenfileirante 1h, gated por JOBS_WORKER_ENABLED. Ator = SISTEMA.
  "impound.notify-due",
] as const;

export type JobName = (typeof JOB_NAMES)[number];

export type JobPayload = Record<string, unknown>;

export type JobStatus = "queued" | "processing" | "retrying" | "completed" | "failed";

export type JobEnvelope<TPayload extends JobPayload = JobPayload> = {
  readonly id: string;
  readonly name: JobName;
  readonly payload: TPayload;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly correlationId: string;
  readonly runAfter: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastError?: string;
};

export type EnqueueJobOptions = {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly correlationId?: string;
  readonly delayMs?: number;
  readonly maxAttempts?: number;
  readonly backoffMs?: number;
};
