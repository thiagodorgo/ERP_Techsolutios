import type { CommandEnvelope, DomainEvent } from "../../modules/events/types";

type Listener = (event: DomainEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();
  private commands: CommandEnvelope[] = [];

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: DomainEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  enqueueCommand(command: CommandEnvelope) {
    this.commands = [command, ...this.commands];
  }

  listCommands() {
    return this.commands;
  }
}

export const eventBus = new EventBus();
