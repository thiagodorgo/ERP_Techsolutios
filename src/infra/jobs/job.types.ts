export const JOB_NAMES = [
  "aws-cur.import-cost-file",
  "cloud-charges.calculate",
  "cloud-cost-allocation.run",
  "checklist-attachment-postprocess",
  "cloud-usage.aggregate-daily",
  "notification-dispatch",
  "audit-log-fanout",
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
