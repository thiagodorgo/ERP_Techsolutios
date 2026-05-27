import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { CommandEnvelope, DomainEvent } from "../modules/events/types";
import { eventBus } from "../services/realtime/eventBus";
import { createPollingClient, createSseEndpointUrl } from "../services/realtime/pollingClient";
import { useTenantContext } from "./TenantProvider";

type EventContextValue = {
  events: DomainEvent[];
  commands: CommandEnvelope[];
  enqueueCommand: (command: CommandEnvelope) => void;
  sseEndpoint: string | null;
};

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const { activeContext } = useTenantContext();
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [commands, setCommands] = useState<CommandEnvelope[]>([]);

  useEffect(() => {
    const unsubscribeBus = eventBus.subscribe((event) => {
      setEvents((current) => [event, ...current].slice(0, 20));
    });

    return unsubscribeBus;
  }, []);

  useEffect(() => {
    if (!activeContext) return undefined;

    const pollingClient = createPollingClient();
    return pollingClient.start((event) => eventBus.publish(event));
  }, [activeContext]);

  const value = useMemo<EventContextValue>(
    () => ({
      events,
      commands,
      enqueueCommand(command) {
        eventBus.enqueueCommand(command);
        setCommands(eventBus.listCommands());
      },
      sseEndpoint: activeContext ? createSseEndpointUrl(activeContext.tenantId, activeContext.branchId) : null,
    }),
    [activeContext, commands, events],
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) throw new Error("useEvents must be used within EventProvider");
  return context;
}
