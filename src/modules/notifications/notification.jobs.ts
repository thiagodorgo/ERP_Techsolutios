import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { createDefaultNotificationService } from "./notification.service.js";

export function createNotificationDispatchJobHandler(): JobHandler {
  return async (payload) => {
    const event = payload.event as DomainEventEnvelope | undefined;

    if (!event?.name) {
      return;
    }

    const service = await createDefaultNotificationService();
    await service.createFromDomainEvent(event);
  };
}
