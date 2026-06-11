import { getFieldOpsBroadcaster } from "../../infra/broadcaster/field-ops.broadcaster.js";
import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";

export function createFieldOpsEventFanoutJobHandler(): JobHandler {
  return async (payload) => {
    const event = payload.event as DomainEventEnvelope | undefined;

    if (!event?.name || !event?.tenantId) {
      return;
    }

    try {
      getFieldOpsBroadcaster().publish(event.tenantId, event);
    } catch {
      // broadcast failure must not break the job
    }
  };
}
