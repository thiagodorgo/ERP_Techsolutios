import { getWorkOrderPriorityKey } from "../map/mapMarkers";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import type { OperationsInServiceCall } from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL) — painel "Em Atendimento": cards .os do protótipo com a linha
 * "→ {técnico}" (tech-tag azul). O nome do técnico vem RESOLVIDO pelo adapter (assigned ids ↔
 * localizações; fallback despacho; sem match → "—" — nunca inventado). Clique = pan até a OS
 * (a página resolve a coordenada pelo id; a lista NUNCA trafega lat/lng — LGPD §12).
 */
export function OperationsInServiceList({
  calls,
  onPan,
}: {
  readonly calls: readonly OperationsInServiceCall[];
  readonly onPan: (call: OperationsInServiceCall) => void;
}) {
  if (calls.length === 0) {
    // Empty verbatim do protótipo.
    return <div className="opmap-empty">Nenhuma OS em atendimento</div>;
  }

  return (
    <ul className="opmap-os-list" aria-label="Ordens de serviço em atendimento">
      {calls.map((call) => {
        const priorityKey = getWorkOrderPriorityKey(call.priority);
        return (
          <li key={call.id}>
            <button
              type="button"
              className={`opmap-os opmap-os--atd p-${priorityKey}`}
              data-osatd={call.id}
              aria-label={`OS ${call.code} em atendimento por ${call.technicianName}${
                call.hasLocation ? ", localizar no mapa" : ""
              }`}
              onClick={() => onPan(call)}
            >
              <span className="opmap-os__r1">
                <b>{call.code}</b>
                <span className={`opmap-os__badge b-${priorityKey}`}>{getWorkOrderPriorityLabel(call.priority)}</span>
              </span>
              <span className="opmap-os__r2">
                <span className="opmap-os__customer">{call.customerName ?? "Cliente não informado"}</span>
                <span className="opmap-os__tech-tag">→ {call.technicianName}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
