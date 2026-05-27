export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  resource: string;
  occurredAt: string;
  reason: string;
};
