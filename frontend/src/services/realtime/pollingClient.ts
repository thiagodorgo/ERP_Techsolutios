import type { DomainEvent } from "../../modules/events/types";
import { mockEvents } from "../../mocks/events/events";

export type PollingClient = {
  start: (onEvent: (event: DomainEvent) => void) => () => void;
};

export function createPollingClient(intervalMs = 9000): PollingClient {
  return {
    start(onEvent) {
      let index = 0;
      const timer = window.setInterval(() => {
        onEvent(mockEvents[index % mockEvents.length]);
        index += 1;
      }, intervalMs);

      return () => window.clearInterval(timer);
    },
  };
}

export function createSseEndpointUrl(tenantId: string, branchId: string) {
  return `/api/v1/events/stream?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`;
}
