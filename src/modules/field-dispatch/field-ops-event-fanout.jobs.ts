import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { publishFieldOpsRealtimeEvent } from "../field-ops-realtime/field-ops-realtime.broker.js";

export function createFieldOpsEventFanoutJobHandler(): JobHandler {
  return async (payload) => {
    const event = payload.event as DomainEventEnvelope | undefined;

    if (!event?.name) {
      return;
    }

    publishFieldOpsRealtimeEvent(event);
  };
}
