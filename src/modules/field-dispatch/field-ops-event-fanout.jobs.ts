import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";

export function createFieldOpsEventFanoutJobHandler(): JobHandler {
  return async (payload) => {
    const event = payload.event as DomainEventEnvelope | undefined;

    if (!event?.name) {
      return;
    }

    // Placeholder: future SSE/WebSocket transport will consume this job.
    // Envelope is preserved in the queue for downstream subscribers.
  };
}
