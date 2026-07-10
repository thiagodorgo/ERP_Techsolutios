import { MapPin, MapPinOff } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button, Chip } from "../../../../components/ui";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import type { OperationsMapWorkOrderWithoutLocation } from "../operations-map.types";

type GeocodeState = { readonly status: "idle" | "loading" | "error"; readonly reason?: string };

/**
 * Ω1b — chamados abertos COM endereço mas SEM coordenada. Ficam listados aqui (nunca somem do
 * mapa em silêncio — PD-002/R2). Quando `onGeocode` é fornecido (papel com work_orders:update e
 * fora do modo mock), cada item ganha o botão "Localizar no mapa" que geocodifica sob demanda e,
 * em sucesso, o pai atualiza o mapa (o item vira pin e sai da lista). Não renderiza quando vazio.
 */
export function OperationsWorkOrdersWithoutLocationPanel({
  workOrders,
  onGeocode,
}: {
  workOrders: readonly OperationsMapWorkOrderWithoutLocation[];
  onGeocode?: (id: string) => Promise<{ geocoded: boolean; reason?: string }>;
}) {
  const [states, setStates] = useState<Record<string, GeocodeState>>({});
  if (workOrders.length === 0) return null;

  const runGeocode = async (id: string) => {
    setStates((current) => ({ ...current, [id]: { status: "loading" } }));
    try {
      const result = await onGeocode!(id);
      if (!result.geocoded) {
        setStates((current) => ({
          ...current,
          [id]: { status: "error", reason: result.reason ?? "Endereço não localizado." },
        }));
      }
      // Sucesso: o refresh do pai remove o item da lista — não precisa mexer no estado local.
    } catch {
      setStates((current) => ({ ...current, [id]: { status: "error", reason: "Falha ao localizar. Tente de novo." } }));
    }
  };

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
        {workOrders.map((workOrder) => {
          const state = states[workOrder.id];
          return (
            <li key={workOrder.id} className="operations-wo-nolocation__row">
              <Link to={`/work-orders/${workOrder.id}`} className="operations-wo-nolocation__item">
                <span className="operations-wo-nolocation__code">{workOrder.code}</span>
                <Chip tone="default">{getWorkOrderPriorityLabel(workOrder.priority)}</Chip>
                {workOrder.serviceAddress ? (
                  <span className="operations-wo-nolocation__address">{workOrder.serviceAddress}</span>
                ) : null}
              </Link>
              {onGeocode ? (
                <div className="operations-wo-nolocation__action">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={state?.status === "loading"}
                    onClick={() => void runGeocode(workOrder.id)}
                  >
                    <MapPin size={14} /> {state?.status === "loading" ? "Localizando…" : "Localizar no mapa"}
                  </Button>
                  {state?.status === "error" ? (
                    <span className="operations-wo-nolocation__error">{state.reason}</span>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
