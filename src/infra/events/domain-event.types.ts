export const DOMAIN_EVENT_NAMES = [
  "auth.session.created",
  "auth.session.revoked",
  "checklist_run.created",
  "checklist_run.completed",
  "checklist_run.attachment_uploaded",
  "checklist_run.attachment_downloaded",
  // CHECKLIST P1 PR-03 — reabertura de vistoria concluída (nasce uma NOVA versão vinculada). Evento PRÓPRIO,
  // deliberadamente NÃO `checklist_run.created`: aquele alimenta a métrica FATURADA `checklist_runs_count`
  // (cloud-usage.events) e cobrar de novo pela correção seria cobrar duas vezes o mesmo trabalho de campo.
  "checklist_run.reopened",
  "checklist_run.divergence_reported",
  "checklist_run.acknowledgement_created",
  "notification.requested",
  "audit_log.created",
  "field_location.updated",
  "field_dispatch.created",
  "field_dispatch.status_changed",
  "field_dispatch.cancelled",
  "field_dispatch.reassigned",
  "work_order.status_changed",
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
