import { useState, type DragEvent } from "react";

import { beginWorkOrderDrag } from "../map/dnd";
import { getWorkOrderPriorityKey } from "../map/mapMarkers";
import { formatIncomingCallSlaProxy, formatLastSeen, incomingCallSlaTone } from "../operations-map.adapter";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import type { OperationsIncomingCall } from "../operations-map.types";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL) — painel "Chamados recebidos": cards .os VERBATIM do protótipo
 * (r1 código+badge de prioridade; r2 cliente+relógio; r2 pino+endereço; borda-esquerda 3px por
 * prioridade; estado selecionado; drag nativo). Substitui a lista M-4 baseada em Card/Chip do DS.
 *
 * HONESTIDADE preservada (M-7/D-007): o relógio usa o countdown REAL quando `slaDueAt` existe
 * ("vence em"/"vencido há" + data-tone); senão "há X" derivado de createdAt (ou "Agendado para…").
 * Nunca um prazo fabricado. LGPD §12: o card NUNCA mostra latitude/longitude (endereço textual é
 * a linha "📍" do protótipo). Payload do drag = SÓ o id da OS ("text/os").
 *
 * Gating: `draggableEnabled` (field_dispatch:create) liga o drag; `onGeocode`
 * (work_orders:update) liga o CTA "Localizar no mapa" do chamado sem GPS (migra o painel Ω1b-2).
 */

type GeocodeState = { readonly status: "idle" | "loading" | "error"; readonly reason?: string };

export function OperationsIncomingCallsList({
  calls,
  selectedId,
  onSelect,
  now,
  newIds,
  draggableEnabled = false,
  onGeocode,
}: {
  readonly calls: readonly OperationsIncomingCall[];
  readonly selectedId?: string;
  readonly onSelect: (call: OperationsIncomingCall, options?: { readonly pan?: boolean }) => void;
  readonly now?: Date;
  readonly newIds?: ReadonlySet<string>;
  readonly draggableEnabled?: boolean;
  readonly onGeocode?: (id: string) => Promise<{ geocoded: boolean; reason?: string }>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [geocodeStates, setGeocodeStates] = useState<Record<string, GeocodeState>>({});

  if (calls.length === 0) {
    // Empty verbatim do protótipo (inclusive o emoji) — lista vazia jamais fabrica OS.
    return <div className="opmap-empty">Nenhum chamado aguardando alocação 🎉</div>;
  }

  const reference = now ?? new Date();

  const runGeocode = async (id: string) => {
    if (!onGeocode) return;
    setGeocodeStates((current) => ({ ...current, [id]: { status: "loading" } }));
    try {
      const result = await onGeocode(id);
      if (!result.geocoded) {
        setGeocodeStates((current) => ({
          ...current,
          [id]: { status: "error", reason: result.reason ?? "Endereço não localizado." },
        }));
      }
      // Sucesso: o refresh do pai transforma o chamado em pin — nada a fazer aqui.
    } catch {
      setGeocodeStates((current) => ({
        ...current,
        [id]: { status: "error", reason: "Falha ao localizar. Tente de novo." },
      }));
    }
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, call: OperationsIncomingCall) => {
    // Payload mínimo (LGPD): só o id da OS ("text/os"). Seleciona sem pan (verbatim do protótipo).
    beginWorkOrderDrag(event.dataTransfer, call.id);
    setDraggingId(call.id);
    if (call.id !== selectedId) onSelect(call, { pan: false });
  };

  return (
    <ul className="opmap-os-list" aria-label="Chamados recebidos aguardando alocação">
      {calls.map((call) => {
        const sla = formatIncomingCallSlaProxy(call, reference);
        const slaTone = incomingCallSlaTone(call, reference);
        // Relógio do card: countdown real (vence em/vencido há) > agenda > "há X" (protótipo).
        const clockLabel =
          sla.kind === "due_future" || sla.kind === "due_past" || sla.kind === "scheduled"
            ? sla.label
            : sla.kind === "opened"
              ? formatLastSeen(call.createdAt ?? undefined, reference)
              : "Sem data de abertura";
        const isSelected = call.id === selectedId;
        const isNew = newIds?.has(call.id) ?? false;
        const priorityKey = getWorkOrderPriorityKey(call.priority);
        const priorityLabel = getWorkOrderPriorityLabel(call.priority);
        const geocodeState = geocodeStates[call.id];
        return (
          <li key={call.id}>
            <div
              className={`opmap-os p-${priorityKey}${isSelected ? " sel" : ""}${isNew ? " is-new" : ""}${
                draggingId === call.id ? " dragging" : ""
              }`}
              data-os={call.id}
              data-new={isNew ? "true" : undefined}
              draggable={draggableEnabled || undefined}
              onDragStart={draggableEnabled ? (event) => handleDragStart(event, call) : undefined}
              onDragEnd={draggableEnabled ? () => setDraggingId(null) : undefined}
            >
              <button
                type="button"
                className="opmap-os__hit"
                aria-current={isSelected ? "true" : undefined}
                aria-label={`${isNew ? "Novo chamado" : "Chamado"} ${call.code}${
                  call.customerName ? `, cliente ${call.customerName}` : ""
                }, prioridade ${priorityLabel}, ${sla.label}${call.hasLocation ? "" : ", sem localização no mapa"}`}
                onClick={() => onSelect(call)}
              >
                <span className="opmap-os__r1">
                  <b>{call.code}</b>
                  {isNew ? (
                    <span className="opmap-os__new" data-testid="operations-call-new">
                      Novo
                    </span>
                  ) : null}
                  <span className={`opmap-os__badge b-${priorityKey}`}>{priorityLabel}</span>
                </span>
                <span className="opmap-os__r2">
                  <span className="opmap-os__customer">{call.customerName ?? "Cliente não informado"}</span>
                  <span className="opmap-os__clock" data-kind={sla.kind} data-tone={slaTone} aria-hidden="false">
                    <span aria-hidden="true">⏱</span> {clockLabel}
                  </span>
                </span>
                {call.serviceAddress ? (
                  <span className="opmap-os__r2">
                    <span className="opmap-os__address">
                      <span aria-hidden="true">📍</span> {call.serviceAddress}
                    </span>
                  </span>
                ) : null}
                {!call.hasLocation ? <span className="opmap-os__nogps">Sem GPS no mapa</span> : null}
              </button>
              {!call.hasLocation && onGeocode ? (
                <span className="opmap-os__geocode">
                  <button
                    type="button"
                    className="opmap-os__geocode-btn"
                    disabled={geocodeState?.status === "loading"}
                    onClick={() => void runGeocode(call.id)}
                  >
                    {geocodeState?.status === "loading" ? "Localizando…" : "Localizar no mapa"}
                  </button>
                  {geocodeState?.status === "error" ? (
                    <span className="opmap-os__geocode-error" role="status">
                      {geocodeState.reason}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
