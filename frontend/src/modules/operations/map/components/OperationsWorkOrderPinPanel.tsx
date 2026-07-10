import { ExternalLink, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button, Chip } from "../../../../components/ui";
import { getWorkOrderPriorityLabel, getWorkOrderStatusLabel } from "../../../work-orders/work-orders.adapter";
import type { OperationsMapWorkOrderPin } from "../operations-map.types";
import type { WorkOrderPriority } from "../../../work-orders/work-orders.types";

// Tom do chip por prioridade (mesma semântica das cores dos pins).
const PRIORITY_TONE: Record<WorkOrderPriority, "default" | "info" | "warning" | "danger"> = {
  low: "default",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

/**
 * Ω1b — painel do chamado selecionado no mapa. Card vivo: mostra código, prioridade, cliente,
 * título e endereço, e leva para a OS (`/work-orders/:id`) — nunca é decorativo.
 */
export function OperationsWorkOrderPinPanel({ pin }: { pin: OperationsMapWorkOrderPin }) {
  const navigate = useNavigate();

  return (
    <section className="operations-wo-panel" aria-label={`Chamado ${pin.code}`}>
      <header className="operations-wo-panel__header">
        <div>
          <strong>{pin.code}</strong>
          <Chip tone={PRIORITY_TONE[pin.priority]}>{getWorkOrderPriorityLabel(pin.priority)}</Chip>
        </div>
        <Chip tone="info">{getWorkOrderStatusLabel(pin.status)}</Chip>
      </header>
      <p className="operations-wo-panel__title">{pin.title}</p>
      {pin.customerName ? <p className="operations-wo-panel__customer">{pin.customerName}</p> : null}
      {pin.serviceAddress ? (
        <p className="operations-wo-panel__address">
          <MapPin size={14} /> {pin.serviceAddress}
        </p>
      ) : null}
      <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/work-orders/${pin.id}`)}>
        <ExternalLink size={16} /> Abrir OS
      </Button>
    </section>
  );
}
