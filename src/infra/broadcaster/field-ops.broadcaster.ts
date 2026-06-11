import { EventEmitter } from "node:events";

import type { DomainEventEnvelope } from "../events/domain-event.types.js";

export type FieldOpsEventListener = (event: DomainEventEnvelope) => void;

export class FieldOpsBroadcaster {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(tenantId: string, event: DomainEventEnvelope): void {
    this.emitter.emit(channelKey(tenantId), event);
  }

  subscribe(tenantId: string, listener: FieldOpsEventListener): () => void {
    const channel = channelKey(tenantId);
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  listenerCount(tenantId: string): number {
    return this.emitter.listenerCount(channelKey(tenantId));
  }
}

function channelKey(tenantId: string): string {
  return `tenant:${tenantId}`;
}

let defaultBroadcaster: FieldOpsBroadcaster | undefined;

export function getFieldOpsBroadcaster(): FieldOpsBroadcaster {
  defaultBroadcaster ??= new FieldOpsBroadcaster();
  return defaultBroadcaster;
}

export function resetFieldOpsBroadcasterForTests(): void {
  defaultBroadcaster = undefined;
}
