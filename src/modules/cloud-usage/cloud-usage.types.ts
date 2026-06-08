export const CLOUD_USAGE_METRIC_KEYS = [
  "storage_bytes_current",
  "storage_gb_month",
  "checklist_attachment.uploaded.bytes",
  "checklist_attachment.downloaded.bytes",
  "checklist_attachment.uploaded.count",
  "checklist_attachment.downloaded.count",
  "s3_put_requests",
  "s3_get_requests",
  "checklist_runs_count",
  "checklist_run.created",
  "checklist_run.completed",
  "checklist_run.divergence_reported",
  "checklist_run.acknowledgement_created",
  "api_requests_count",
  "api_request.count",
  "notifications_count",
  "notification.created",
  "job_executions_count",
  "job.executed",
  "active_users_count",
] as const;

export type CloudUsageMetricKey = (typeof CLOUD_USAGE_METRIC_KEYS)[number];

export const CLOUD_USAGE_UNITS = ["bytes", "count", "gb_month"] as const;

export type CloudUsageUnit = (typeof CLOUD_USAGE_UNITS)[number];

export type CloudUsageMetadata = Record<string, unknown>;

export type CloudUsageEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly sourceType: string;
  readonly sourceId?: string;
  readonly metricKey: CloudUsageMetricKey;
  readonly quantity: number;
  readonly unit: CloudUsageUnit;
  readonly occurredAt: Date;
  readonly idempotencyKey?: string;
  readonly metadata: CloudUsageMetadata;
  readonly createdAt: Date;
};

export type CloudUsageDailyAggregate = {
  readonly id: string;
  readonly tenantId: string;
  readonly date: string;
  readonly metricKey: CloudUsageMetricKey;
  readonly quantity: number;
  readonly unit: CloudUsageUnit;
  readonly sourceType: string;
  readonly metadata: CloudUsageMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type RecordUsageEventInput = {
  readonly tenantId: string;
  readonly sourceType: string;
  readonly sourceId?: string;
  readonly metricKey: CloudUsageMetricKey;
  readonly quantity: number;
  readonly unit: CloudUsageUnit;
  readonly occurredAt?: Date;
  readonly idempotencyKey?: string;
  readonly metadata?: CloudUsageMetadata;
};

export type CloudUsageFilters = {
  readonly tenantId?: string;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly metricKey?: CloudUsageMetricKey;
};

export type CloudUsageMetricSummary = {
  readonly metricKey: CloudUsageMetricKey;
  readonly quantity: number;
  readonly unit: CloudUsageUnit;
  readonly sourceType?: string;
};

export type CloudUsageSummary = {
  readonly tenantId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly metrics: readonly CloudUsageMetricSummary[];
  readonly generatedAt: string;
};

export class CloudUsageError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CloudUsageError";
  }
}
