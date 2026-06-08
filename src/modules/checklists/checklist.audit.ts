export const CHECKLIST_AUDIT_ACTIONS = {
  templateCreated: "checklist_template.created",
  templateUpdated: "checklist_template.updated",
  templatePublished: "checklist_template.published",
  templateDeleted: "checklist_template.deleted",
  runCreated: "checklist_run.created",
  runUpdated: "checklist_run.updated",
  attachmentUploaded: "checklist_run.attachment_uploaded",
  runCompleted: "checklist_run.completed",
  runDivergenceRegistered: "checklist_run.divergence_reported",
  runAcknowledged: "checklist_run.acknowledgement_created",
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
