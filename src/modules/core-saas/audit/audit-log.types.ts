export type AuditActorType = "user" | "system" | "service" | "anonymous";
export type AuditOutcome = "success" | "failure" | "denied";
export type AuditSeverity = "info" | "warning" | "critical";

export type EnterpriseAuditMetadata = Readonly<Record<string, unknown>>;

export type EnterpriseAuditLogInput = {
  readonly tenantId: string;
  readonly actorId?: string | null;
  readonly actorType?: AuditActorType;
  readonly actorEmail?: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string | null;
  readonly outcome?: AuditOutcome;
  readonly severity?: AuditSeverity;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly metadata?: EnterpriseAuditMetadata;
};

export type EnterpriseAuditLogRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly actorId?: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string | null;
  readonly outcome: AuditOutcome;
  readonly severity: AuditSeverity;
  readonly correlationId: string;
  readonly createdAt: Date;
};
