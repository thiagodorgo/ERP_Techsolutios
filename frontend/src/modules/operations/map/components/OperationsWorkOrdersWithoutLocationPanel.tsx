import { MapPinOff } from "lucide-react";
import { Link } from "react-router-dom";

import { Chip } from "../../../../components/ui";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import type { OperationsMapWorkOrderWithoutLocation } from "../operations-map.types";

/**
 * Ω1b — chamados abertos COM endereço mas SEM coordenada. Ficam listados aqui (nunca somem do
 * mapa em silêncio — PD-002/R2). A geocodificação sob demanda ("Localizar no mapa") entra em Ω1b-2;
 * por ora cada item leva à OS para conferência do endereço. Não renderiza quando a lista é vazia.
 */
export function OperationsWorkOrdersWithoutLocationPanel({
  workOrders,
}: {
  workOrders: readonly OperationsMapWorkOrderWithoutLocation[];
}) {
  if (workOrders.length === 0) return null;

  return (
    <section className="operations-wo-nolocation" aria-label="Chamados sem localização no mapa">
      <header className="operations-wo-nolocation__header">
        <span>
          <MapPinOff size={16} /> Sem localização no mapa
        </span>
        <Chip tone="warning">{`${workOrders.length} sem GPS`}</Chip>
      </header>
      <p className="operations-wo-nolocation__hint">
        Chamados com endereço, mas ainda sem coordenada — não aparecem como pin até serem localizados.
      </p>
      <ul className="operations-wo-nolocation__list">
        {workOrders.map((workOrder) => (
          <li key={workOrder.id}>
            <Link to={`/work-orders/${workOrder.id}`} className="operations-wo-nolocation__item">
              <span className="operations-wo-nolocation__code">{workOrder.code}</span>
              <Chip tone="default">{getWorkOrderPriorityLabel(workOrder.priority)}</Chip>
              {workOrder.serviceAddress ? (
                <span className="operations-wo-nolocation__address">{workOrder.serviceAddress}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
