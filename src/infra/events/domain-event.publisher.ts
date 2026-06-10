import { randomUUID } from "node:crypto";

import { getDefaultJobQueue, type JobQueue } from "../jobs/job.queue.js";
import { recordCloudUsageForDomainEvent } from "../../modules/cloud-usage/cloud-usage.events.js";
import type { JobName, JobPayload } from "../jobs/job.types.js";
import type {
  DomainEventContext,
  DomainEventEnvelope,
  DomainEventName,
  DomainEventPayload,
} from "./domain-event.types.js";

export type PublishDomainEventOptions = {
  readonly queue?: JobQueue;
  readonly failOnError?: boolean;
  readonly logger?: Pick<Console, "warn">;
};

export type PublishDomainEventResult = {
  readonly event: DomainEventEnvelope;
  readonly enqueuedJobId?: string;
  readonly published: boolean;
  readonly error?: string;
};

const eventJobMap: Partial<Record<DomainEventName, JobName>> = {
  "checklist_run.completed": "notification-dispatch",
  "checklist_run.attachment_uploaded": "checklist-attachment-postprocess",
  "checklist_run.divergence_reported": "notification-dispatch",
  "checklist_run.acknowledgement_created": "notification-dispatch",
  "notification.requested": "notification-dispatch",
  "audit_log.created": "audit-log-fanout",
  "field_location.updated": "field-ops-event-fanout",
  "field_dispatch.created": "field-ops-event-fanout",
  "field_dispatch.status_changed": "field-ops-event-fanout",
  "field_dispatch.cancelled": "field-ops-event-fanout",
  "field_dispatch.reassigned": "field-ops-event-fanout",
  "work_order.status_changed": "field-ops-event-fanout",
};

export async function publishDomainEvent<TPayload extends DomainEventPayload>(
  name: DomainEventName,
  payload: TPayload,
  context: DomainEventContext = {},
  options: PublishDomainEventOptions = {},
): Promise<PublishDomainEventResult> {
  const event: DomainEventEnvelope<TPayload> = {
    id: randomUUID(),
    name,
    payload,
    tenantId: context.tenantId,
    actorId: context.actorId,
    correlationId: context.correlationId ?? randomUUID(),
    occurredAt: new Date().toISOString(),
  };
  const jobName = eventJobMap[name];

  recordCloudUsageForDomainEvent(event);

  if (!jobName) {
    return {
      event,
      published: true,
    };
  }

  try {
    const queue = options.queue ?? getDefaultJobQueue();
    const job = await queue.enqueue(
      jobName,
      {
        event,
      } satisfies JobPayload,
      {
        tenantId: context.tenantId,
        userId: context.actorId,
        correlationId: event.correlationId,
      },
    );

    return {
      event,
      enqueuedJobId: job.id,
      published: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Redis publish error.";

    if (options.failOnError) {
      throw error;
    }

    (options.logger ?? console).warn(
      {
        eventName: name,
        tenantId: context.tenantId,
        correlationId: event.correlationId,
        error: message,
      },
      "Domain event was not enqueued.",
    );

    return {
      event,
      published: false,
      error: message,
    };
  }
}
