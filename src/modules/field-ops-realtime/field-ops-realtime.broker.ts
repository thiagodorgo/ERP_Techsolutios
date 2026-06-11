import type { DomainEventEnvelope, DomainEventName, DomainEventPayload } from "../../infra/events/domain-event.types.js";

export const FIELD_OPS_REALTIME_EVENT_NAMES = [
  "field_location.updated",
  "field_dispatch.created",
  "field_dispatch.status_changed",
  "field_dispatch.cancelled",
  "field_dispatch.reassigned",
  "work_order.status_changed",
] as const satisfies readonly DomainEventName[];

export type FieldOpsRealtimeEventName = (typeof FIELD_OPS_REALTIME_EVENT_NAMES)[number];

export type FieldOpsRealtimeEvent = DomainEventEnvelope<DomainEventPayload> & {
  readonly name: FieldOpsRealtimeEventName;
  readonly tenantId: string;
};

export type FieldOpsRealtimeSubscriber = (event: FieldOpsRealtimeEvent) => void;

const coordinateKeyPattern = /(^lat$|^lng$|^lon$|latitude|longitude)/i;
const maxRecentEventIds = 250;

export class FieldOpsRealtimeBroker {
  private readonly subscribersByTenant = new Map<string, Set<FieldOpsRealtimeSubscriber>>();
  private readonly recentEventIds: string[] = [];
  private readonly recentEventIdSet = new Set<string>();

  subscribe(tenantId: string, subscriber: FieldOpsRealtimeSubscriber): () => void {
    const tenantSubscribers = this.subscribersByTenant.get(tenantId) ?? new Set<FieldOpsRealtimeSubscriber>();
    tenantSubscribers.add(subscriber);
    this.subscribersByTenant.set(tenantId, tenantSubscribers);

    return () => {
      tenantSubscribers.delete(subscriber);
      if (tenantSubscribers.size === 0) {
        this.subscribersByTenant.delete(tenantId);
      }
    };
  }

  publish(event: DomainEventEnvelope): boolean {
    const sanitized = sanitizeFieldOpsRealtimeEvent(event);
    if (!sanitized || this.recentEventIdSet.has(sanitized.id)) return false;

    this.rememberEventId(sanitized.id);
    const subscribers = this.subscribersByTenant.get(sanitized.tenantId);
    if (!subscribers?.size) return true;

    for (const subscriber of subscribers) {
      try {
        subscriber(sanitized);
      } catch {
        // Realtime delivery is best-effort; domain operations must not fail
        // because a single stream disconnected while an event was being sent.
      }
    }

    return true;
  }

  subscriberCount(tenantId?: string): number {
    if (tenantId) return this.subscribersByTenant.get(tenantId)?.size ?? 0;

    let total = 0;
    for (const subscribers of this.subscribersByTenant.values()) {
      total += subscribers.size;
    }
    return total;
  }

  resetForTests(): void {
    this.subscribersByTenant.clear();
    this.recentEventIds.length = 0;
    this.recentEventIdSet.clear();
  }

  private rememberEventId(eventId: string): void {
    this.recentEventIds.push(eventId);
    this.recentEventIdSet.add(eventId);

    while (this.recentEventIds.length > maxRecentEventIds) {
      const expired = this.recentEventIds.shift();
      if (expired) this.recentEventIdSet.delete(expired);
    }
  }
}

export const fieldOpsRealtimeBroker = new FieldOpsRealtimeBroker();

export function publishFieldOpsRealtimeEvent(event: DomainEventEnvelope): boolean {
  return fieldOpsRealtimeBroker.publish(event);
}

export function isFieldOpsRealtimeEventName(name: DomainEventName): name is FieldOpsRealtimeEventName {
  return FIELD_OPS_REALTIME_EVENT_NAMES.includes(name as FieldOpsRealtimeEventName);
}

export function sanitizeFieldOpsRealtimeEvent(event: DomainEventEnvelope): FieldOpsRealtimeEvent | null {
  if (!isFieldOpsRealtimeEventName(event.name) || !event.tenantId) return null;

  return {
    ...event,
    name: event.name,
    tenantId: event.tenantId,
    payload: sanitizePayload(event.payload),
  };
}

function sanitizePayload(payload: DomainEventPayload): DomainEventPayload {
  return sanitizeValue(payload) as DomainEventPayload;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !coordinateKeyPattern.test(key))
      .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
