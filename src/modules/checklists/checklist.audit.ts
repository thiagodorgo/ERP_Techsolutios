export const CHECKLIST_AUDIT_ACTIONS = {
  templateCreated: "tenant_checklist.created",
  templateUpdated: "tenant_checklist.updated",
  templatePublished: "tenant_checklist.published",
  templateDeleted: "tenant_checklist.deleted",
  runCreated: "checklist_run.created",
  runUpdated: "checklist_run.updated",
  runCompleted: "checklist_run.completed",
  runDivergenceRegistered: "checklist_run.divergence_registered",
  runAcknowledged: "checklist_run.acknowledged",
} as const;

export type ChecklistAuditAction =
  (typeof CHECKLIST_AUDIT_ACTIONS)[keyof typeof CHECKLIST_AUDIT_ACTIONS];

export type ChecklistAuditEvent = {
  readonly tenantId: string;
  readonly actorUserId?: string;
  readonly action: ChecklistAuditAction;
  readonly entity: string;
  readonly entityId: string;
  readonly metadata?: Record<string, unknown>;
};
