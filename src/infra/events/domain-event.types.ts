export const DOMAIN_EVENT_NAMES = [
  "auth.session.created",
  "auth.session.revoked",
  "checklist_run.created",
  "checklist_run.completed",
  "checklist_run.attachment_uploaded",
  "checklist_run.divergence_reported",
  "notification.requested",
  "audit_log.created",
] as const;

export type DomainEventName = (typeof DOMAIN_EVENT_NAMES)[number];

export type DomainEventPayload = Record<string, unknown>;

export type DomainEventContext = {
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly correlationId?: string;
};

export type DomainEventEnvelope<TPayload extends DomainEventPayload = DomainEventPayload> = {
  readonly id: string;
  readonly name: DomainEventName;
  readonly payload: TPayload;
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly correlationId: string;
  readonly occurredAt: string;
};
