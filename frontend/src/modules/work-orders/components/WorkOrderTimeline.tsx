import { Clock } from "lucide-react";

import { Card, EmptyState } from "../../../components/ui";
import { formatWorkOrderDate, getWorkOrderStatusLabel } from "../work-orders.adapter";
import type { WorkOrderEvent } from "../work-orders.types";

export function WorkOrderTimeline({ events }: { readonly events: WorkOrderEvent[] }) {
  return (
    <Card title="Timeline">
      {events.length === 0 ? (
        <EmptyState title="Sem eventos" detail="A API ainda nao retornou eventos para esta OS." />
      ) : (
        <div className="work-order-timeline">
          {events.map((event) => (
            <article key={event.id}>
              <span><Clock size={14} /></span>
              <div>
                <strong>{formatEventType(event.eventType)}</strong>
                <p>{event.message}</p>
                {event.fromStatus || event.toStatus ? (
                  <small>
                    {event.fromStatus ? getWorkOrderStatusLabel(event.fromStatus) : "Inicial"} {"->"}{" "}
                    {event.toStatus ? getWorkOrderStatusLabel(event.toStatus) : "Sem status"}
                  </small>
                ) : null}
                <time>{formatWorkOrderDate(event.createdAt)}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatEventType(value: string): string {
  return value.replace(/^work_order_/, "").replaceAll("_", " ");
}
