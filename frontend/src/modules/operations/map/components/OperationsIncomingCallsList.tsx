import { CalendarClock, Clock, MapPinOff } from "lucide-react";
import type { CSSProperties } from "react";

import { Card, Chip, EmptyState } from "../../../../components/ui";
import { getWorkOrderPriorityColor } from "../map/mapMarkers";
import { formatIncomingCallSlaProxy } from "../operations-map.adapter";
import { getWorkOrderPriorityLabel, getWorkOrderPriorityTone } from "../../../work-orders/work-orders.adapter";
import type { OperationsIncomingCall } from "../operations-map.types";

/**
 * M-4 (J-MAPAS-6) — LISTA REAL de "chamados que chegam" (requisito 1 do dono). Substitui o placeholder
 * honesto do M-1: agora renderiza as OS abertas mapeáveis (withLocation + withoutLocation, já ordenadas
 * por `buildIncomingCalls`) como fila de triagem do operador de despacho. Cada item traz:
 *   • código + cliente da OS;
 *   • chip de PRIORIDADE (cor semântica via token do DS; acento lateral na MESMA cor do pin no mapa);
 *   • SLA-PROXY HONESTO ("Agendado para {data}" ou "Aberto há {tempo}") — NUNCA "vence em"/prazo fabricado.
 * Clicar seleciona o chamado (pan no mapa via o mecanismo de seleção existente). LGPD §12: o item NUNCA
 * mostra latitude/longitude — só código/cliente/prioridade/tempo.
 */
export function OperationsIncomingCallsList({
  calls,
  selectedId,
  onSelect,
  now,
}: {
  readonly calls: readonly OperationsIncomingCall[];
  readonly selectedId?: string;
  readonly onSelect: (call: OperationsIncomingCall) => void;
  readonly now?: Date;
}) {
  if (calls.length === 0) {
    return (
      <Card title="Chamados que chegam">
        <EmptyState
          title="Nenhum chamado aberto"
          detail="Quando houver ordens de serviço abertas, elas aparecem aqui em ordem de prioridade e prazo. A fila se atualiza sozinha."
        />
      </Card>
    );
  }

  const reference = now ?? new Date();

  return (
    <Card title="Chamados que chegam">
      <ul className="operations-calls-list" aria-label="Fila de chamados que chegam">
        {calls.map((call) => {
          const sla = formatIncomingCallSlaProxy(call, reference);
          const isSelected = call.id === selectedId;
          const priorityLabel = getWorkOrderPriorityLabel(call.priority);
          return (
            <li key={call.id}>
              <button
                type="button"
                className={`operations-call${isSelected ? " is-selected" : ""}`}
                data-priority={call.priority}
                style={{ "--call-priority": getWorkOrderPriorityColor(call.priority) } as CSSProperties}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`Chamado ${call.code}${call.customerName ? `, cliente ${call.customerName}` : ""}, prioridade ${priorityLabel}, ${sla.label}`}
                onClick={() => onSelect(call)}
              >
                <span className="operations-call__head">
                  <span className="operations-call__code">{call.code}</span>
                  <Chip tone={getWorkOrderPriorityTone(call.priority)}>{priorityLabel}</Chip>
                </span>
                <span className="operations-call__customer">{call.customerName ?? "Cliente não informado"}</span>
                <span className="operations-call__sla" data-kind={sla.kind}>
                  {sla.kind === "scheduled" ? (
                    <CalendarClock size={14} aria-hidden="true" />
                  ) : (
                    <Clock size={14} aria-hidden="true" />
                  )}
                  {sla.label}
                </span>
                {!call.hasLocation ? (
                  <span className="operations-call__nogps">
                    <MapPinOff size={12} aria-hidden="true" /> Sem GPS no mapa
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
